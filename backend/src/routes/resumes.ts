/**
 * Resume routes
 * For students to create and manage resumes
 */
import express, { Request, Response } from "express";
import { PrismaClient, Role, SessionStatus, PaymentStatus, ReviewStatus, ScheduleStatus } from "@prisma/client";
import { authenticateToken, requireRole, AuthRequest } from "../middlewares/auth.middleware";
import { ROLES } from "../config/constants";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/resumes
 * Get all resumes for the current student
 */
router.get(
  "/",
  authenticateToken,
  requireRole(ROLES.STUDENT),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;

      const resumes = await prisma.resumes.findMany({
        where: { student_id: userId },
        orderBy: { updated_at: "desc" },
      });

      res.json({ resumes });
    } catch (error: any) {
      console.error("[Get Resumes] Error:", error);
      res.status(500).json({
        error: "Failed to fetch resumes",
        message: error?.message,
      });
    }
  }
);

/**
 * GET /api/resumes/:id
 * Get a specific resume
 */
router.get(
  "/:id",
  authenticateToken,
  requireRole(ROLES.STUDENT),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const resumeId = parseInt(req.params.id);

      const resume = await prisma.resumes.findFirst({
        where: {
          id: resumeId,
          student_id: userId,
        },
      });

      if (!resume) {
        return res.status(404).json({
          error: "Resume not found",
        });
      }

      res.json({ resume });
    } catch (error: any) {
      console.error("[Get Resume] Error:", error);
      res.status(500).json({
        error: "Failed to fetch resume",
        message: error?.message,
      });
    }
  }
);

/**
 * POST /api/resumes
 * Create or update a resume
 */
router.post(
  "/",
  authenticateToken,
  requireRole(ROLES.STUDENT),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { resumeData, title, isPrimary } = req.body;

      if (!resumeData) {
        return res.status(400).json({
          error: "Resume data is required",
        });
      }

      // If setting as primary, unset other primary resumes
      if (isPrimary) {
        await prisma.resumes.updateMany({
          where: {
            student_id: userId,
            is_primary: true,
          },
          data: {
            is_primary: false,
          },
        });
      }

      // Check if resume exists (by title or primary status)
      let existingResume = null;
      if (isPrimary) {
        existingResume = await prisma.resumes.findFirst({
          where: {
            student_id: userId,
            is_primary: true,
          },
        });
      }

      let resume;
      if (existingResume) {
        // Update existing resume
        resume = await prisma.resumes.update({
          where: { id: existingResume.id },
          data: {
            resume_data: resumeData,
            title: title || existingResume.title,
            is_primary: isPrimary !== undefined ? isPrimary : existingResume.is_primary,
            updated_at: new Date(),
          },
        });
      } else {
        // Create new resume
        resume = await prisma.resumes.create({
          data: {
            student_id: userId,
            resume_data: resumeData,
            title: title || "My Resume",
            is_primary: isPrimary || false,
          },
        });
      }

      res.json({
        success: true,
        resume,
      });
    } catch (error: any) {
      console.error("[Save Resume] Error:", error);
      res.status(500).json({
        error: "Failed to save resume",
        message: error?.message,
      });
    }
  }
);

/**
 * POST /api/resumes/ai-improve
 * AI improve resume content
 */
router.post(
  "/ai-improve",
  authenticateToken,
  requireRole(ROLES.STUDENT),
  async (req: AuthRequest, res: Response) => {
    try {
      const { content, type } = req.body; // type: 'summary' | 'bullet' | 'description'

      if (!content || !type) {
        return res.status(400).json({
          error: "Content and type are required",
        });
      }

      // Import Groq utility
      const { generateWithGroq } = await import("../utils/groq");

      let prompt = "";
      if (type === "summary") {
        prompt = `Improve this professional summary for a resume. Make it more impactful, ATS-friendly, and highlight key skills and achievements. Keep it concise (3-4 lines). Return only the improved text, no explanations:\n\n${content}`;
      } else if (type === "bullet") {
        prompt = `Improve this resume bullet point. Use strong action verbs, add measurable impact/quantifiable results if possible, and make it more professional. Return only the improved bullet point, no explanations:\n\n${content}`;
      } else if (type === "description") {
        prompt = `Improve this project description for a resume. Make it clearer, more technical, and highlight key achievements. Return only the improved description, no explanations:\n\n${content}`;
      }

      try {
        const systemMessage = "You are an expert resume writer. Improve the given content to make it more professional, impactful, and ATS-friendly. Return only the improved text without any explanations or markdown formatting.";
        const improvedContent = await generateWithGroq(prompt, "llama-3.3-70b-versatile", systemMessage);
        res.json({
          success: true,
          improvedContent: improvedContent.trim(),
        });
      } catch (aiError: any) {
        console.error("[AI Improve] Groq error:", aiError);
        // Fallback to simple improvement
        let improvedContent = content;
        if (type === "summary") {
          improvedContent = `${content}. Optimized for ATS with key skills and achievements highlighted.`;
        } else if (type === "bullet") {
          improvedContent = `Enhanced: ${content}. Added measurable impact and action verbs.`;
        } else if (type === "description") {
          improvedContent = `Enhanced: ${content}. Improved clarity and technical details.`;
        }
        res.json({
          success: true,
          improvedContent,
        });
      }
    } catch (error: any) {
      console.error("[AI Improve Resume] Error:", error);
      res.status(500).json({
        error: "Failed to improve content",
        message: error?.message,
      });
    }
  }
);

/**
 * GET /api/resumes/:resumeId/eligible-mentors
 * Get eligible mentors for sharing a resume
 * 
 * Rules:
 * - Only mentors with ONGOING sessions (paid, not all completed)
 * - Exclude mentor with PENDING review for this resume (if exists)
 * - VERIFIED reviews do NOT block sharing
 */
router.get(
  "/:resumeId/eligible-mentors",
  authenticateToken,
  requireRole(ROLES.STUDENT),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const resumeId = parseInt(req.params.resumeId);

      // Step 1: Verify resume belongs to student
      const resume = await prisma.resumes.findFirst({
        where: {
          id: resumeId,
          student_id: userId,
        },
      });

      if (!resume) {
        return res.status(404).json({
          error: "Resume not found",
        });
      }

      // Step 2: Check if resume has an ACTIVE (PENDING) review
      const activeReview = await prisma.resume_review_requests.findFirst({
        where: {
          resume_id: resumeId,
          status: ReviewStatus.PENDING, // Only check PENDING reviews
        },
        include: {
          users_mentor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // CRITICAL: If PENDING review exists, return empty list immediately
      // Frontend will show "This resume is currently under review"
      if (activeReview) {
        return res.json({
          mentors: [], // Empty list
          hasActiveReview: true,
          pendingReviewMentor: {
            mentorId: activeReview.mentor_id,
            mentorName: activeReview.users_mentor?.name || "Unknown Mentor",
            mentorEmail: activeReview.users_mentor?.email || "",
          },
        });
      }

      // Step 3: Find all sessions for this student (excluding CANCELLED and REJECTED)
      const allSessions = await prisma.sessions.findMany({
        where: {
          student_id: userId,
          status: {
            notIn: [SessionStatus.CANCELLED, SessionStatus.REJECTED],
          },
        },
        include: {
          payments: {
            select: {
              status: true,
            },
          },
          users_mentor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          session_schedule: {
            select: {
              id: true,
              status: true,
              scheduled_date: true,
            },
          },
        },
      });

      console.log("[Get Eligible Mentors] Sessions found:", {
        totalSessions: allSessions.length,
        sessions: allSessions.map(s => ({
          id: s.id,
          mentorId: s.mentor_id,
          mentorName: s.users_mentor?.name,
          skill: s.skill_name,
          sessionStatus: s.status,
          paymentStatus: s.payments?.status,
          scheduleCount: s.session_schedule?.length || 0,
          scheduleStatuses: s.session_schedule?.map(sc => sc.status) || [],
        })),
      });

      // Step 4: Group sessions by course (mentor_id + skill_name)
      const courseMap = new Map<string, {
        mentorId: string;
        mentorName: string;
        mentorEmail: string;
        sessions: typeof allSessions;
      }>();

      for (const session of allSessions) {
        const courseKey = `${session.mentor_id}_${session.skill_name}`;
        
        if (!courseMap.has(courseKey)) {
          courseMap.set(courseKey, {
            mentorId: session.mentor_id,
            mentorName: session.users_mentor?.name || "Unknown Mentor",
            mentorEmail: session.users_mentor?.email || "",
            sessions: [],
          });
        }

        courseMap.get(courseKey)!.sessions.push(session);
      }

      // Step 5: Filter to ONGOING courses
      // A course is ONGOING if:
      // - paymentStatus = SUCCESS
      // - AND NOT all sessions/schedule items are COMPLETED
      const ongoingMentors = new Map<string, {
        mentorId: string;
        mentorName: string;
        mentorEmail: string;
      }>();

      for (const [courseKey, course] of courseMap.entries()) {
        // Check payment status: if payment is NOT SUCCESS, exclude
        const hasPayment = course.sessions.some(s => s.payments?.status === PaymentStatus.SUCCESS);
        if (!hasPayment) {
          continue; // Skip payment-pending courses
        }

        // Get all schedule items across all sessions in this course
        const allScheduleItems = course.sessions.flatMap(s => s.session_schedule || []);
        
        // Check if ALL schedule items are COMPLETED
        let allCompleted = false;
        
        if (allScheduleItems.length > 0) {
          // Course is completed only when ALL schedule items are COMPLETED
          allCompleted = allScheduleItems.every(item => item.status === ScheduleStatus.COMPLETED);
        } else {
          // Fallback: if no schedule items exist, check session status
          allCompleted = course.sessions.every(s => s.status === SessionStatus.COMPLETED);
        }

        // If course is NOT completed, mentor is ONGOING
        if (!allCompleted) {
          ongoingMentors.set(course.mentorId, {
            mentorId: course.mentorId,
            mentorName: course.mentorName,
            mentorEmail: course.mentorEmail,
          });
        }
      }

      // Step 6: Get unique mentors (no PENDING review exists, so return all eligible)
      const eligibleMentors = Array.from(ongoingMentors.values());

      // Debug logging
      console.log("[Get Eligible Mentors] Debug:", {
        resumeId,
        studentId: userId,
        totalSessions: allSessions.length,
        coursesFound: courseMap.size,
        ongoingMentorsCount: eligibleMentors.length,
        eligibleMentors: eligibleMentors.map(m => ({ id: m.mentorId, name: m.mentorName })),
      });

      // Step 7: Return result (no PENDING review, so return eligible mentors)
      res.json({
        mentors: eligibleMentors,
        hasActiveReview: false, // No PENDING review
        pendingReviewMentor: null, // No pending review
      });
    } catch (error: any) {
      console.error("[Get Eligible Mentors] Error:", error);
      res.status(500).json({
        error: "Failed to fetch eligible mentors",
        message: error?.message,
      });
    }
  }
);

/**
 * POST /api/resumes/:resumeId/share
 * Share resume with multiple mentors (create review requests)
 */
router.post(
  "/:resumeId/share",
  authenticateToken,
  requireRole(ROLES.STUDENT),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const resumeId = parseInt(req.params.resumeId);
      const { mentorIds } = req.body;

      // Verify resume belongs to student
      const resume = await prisma.resumes.findFirst({
        where: {
          id: resumeId,
          student_id: userId,
        },
      });

      if (!resume) {
        return res.status(404).json({
          error: "Resume not found",
        });
      }

      // CRITICAL: Check for ACTIVE (PENDING) review only
      // VERIFIED reviews do NOT block sharing
      const activeReview = await prisma.resume_review_requests.findFirst({
        where: {
          resume_id: resumeId,
          status: ReviewStatus.PENDING, // Only check PENDING reviews
        },
      });

      if (activeReview) {
        return res.status(400).json({
          error: "This resume already has an active review",
        });
      }

      // Validate: Exactly ONE mentor must be selected
      if (!Array.isArray(mentorIds) || mentorIds.length !== 1) {
        return res.status(400).json({
          error: "Please select exactly one mentor to share your resume with.",
        });
      }

      const mentorId = mentorIds[0];

      // Verify mentor exists and has MENTOR role
      const mentor = await prisma.user.findFirst({
        where: {
          id: mentorId,
          role: Role.MENTOR,
        },
      });

      if (!mentor) {
        return res.status(400).json({
          error: "Selected mentor not found or is not a valid mentor.",
        });
      }

      // Create review request (ONE resume → ONE mentor)
      const request = await prisma.resume_review_requests.create({
        data: {
          resume_id: resumeId,
          student_id: userId,
          mentor_id: mentorId,
          status: ReviewStatus.PENDING,
        },
      });

      res.json({
        success: true,
        request,
        message: `Resume shared with ${mentor.name}`,
      });
    } catch (error: any) {
      console.error("[Share Resume] Error:", error);
      res.status(500).json({
        error: "Failed to share resume",
        message: error?.message,
      });
    }
  }
);

/**
 * DELETE /api/resumes/:resumeId
 * Delete a resume (only if no PENDING review requests exist)
 */
router.delete(
  "/:resumeId",
  authenticateToken,
  requireRole(ROLES.STUDENT),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const resumeId = parseInt(req.params.resumeId);

      // Verify resume belongs to student
      const resume = await prisma.resumes.findFirst({
        where: {
          id: resumeId,
          student_id: userId,
        },
      });

      if (!resume) {
        return res.status(404).json({
          error: "Resume not found",
        });
      }

      // Check for PENDING review requests
      const pendingReviews = await prisma.resume_review_requests.findFirst({
        where: {
          resume_id: resumeId,
          student_id: userId,
          status: ReviewStatus.PENDING,
        },
      });

      if (pendingReviews) {
        return res.status(400).json({
          error: "Cannot delete resume with pending review requests. Please wait for reviews to be completed or cancelled.",
        });
      }

      // Delete all review requests (completed ones can be deleted)
      await prisma.resume_review_requests.deleteMany({
        where: {
          resume_id: resumeId,
          student_id: userId,
        },
      });

      // Delete the resume
      await prisma.resumes.delete({
        where: {
          id: resumeId,
        },
      });

      res.json({
        success: true,
        message: "Resume deleted successfully",
      });
    } catch (error: any) {
      console.error("[Delete Resume] Error:", error);
      res.status(500).json({
        error: "Failed to delete resume",
        message: error?.message,
      });
    }
  }
);

export default router;

