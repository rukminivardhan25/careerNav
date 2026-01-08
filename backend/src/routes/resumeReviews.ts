/**
 * Resume Review routes
 * For students to request resume reviews and view feedback
 */
import express, { Request, Response } from "express";
import { PrismaClient, SessionStatus, PaymentStatus, ReviewStatus } from "@prisma/client";
import { authenticateToken, requireRole, AuthRequest } from "../middlewares/auth.middleware";
import { ROLES } from "../config/constants";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/resume-reviews/mentors
 * Get mentors with ongoing courses for the current student
 * 
 * Uses COURSE-LEVEL ONGOING definition (same as Sessions page):
 * - paymentStatus = PAID
 * - AND NOT all sessions in the course are COMPLETED
 * 
 * This means: Even if no session today, if course has unfinished sessions, mentor is ONGOING
 */
router.get(
  "/mentors",
  authenticateToken,
  requireRole(ROLES.STUDENT),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;

      // Step 1: Find all sessions for this student (excluding CANCELLED and REJECTED)
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

      // Step 2: Group sessions by course (mentor_id + skill_name)
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

      // Step 3: Filter to ONGOING courses (same logic as Sessions page)
      // A course is ONGOING if:
      // - paymentStatus = PAID
      // - AND NOT all sessions/schedule items are COMPLETED
      const ongoingMentors = new Map<string, {
        mentorId: string;
        mentorName: string;
        mentorEmail: string;
      }>();

      for (const [courseKey, course] of courseMap.entries()) {
        // Check payment status: if payment is NOT PAID, exclude
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
          allCompleted = allScheduleItems.every(item => item.status === "COMPLETED");
        } else {
          // Fallback: if no schedule items exist, check session status
          allCompleted = course.sessions.every(s => s.status === SessionStatus.COMPLETED);
        }

        // If course is NOT completed, mentor is ONGOING
        // This matches the "Ongoing Learning" card logic exactly
        if (!allCompleted) {
          ongoingMentors.set(course.mentorId, {
            mentorId: course.mentorId,
            mentorName: course.mentorName,
            mentorEmail: course.mentorEmail,
          });
        }
      }

      // Step 4: Return unique mentors
      const mentors = Array.from(ongoingMentors.values()).map(mentor => ({
        mentorId: mentor.mentorId,
        mentorName: mentor.mentorName,
        mentorEmail: mentor.mentorEmail,
      }));

      res.json(mentors);
    } catch (error: any) {
      console.error("[Get Resume Review Mentors] Error:", error);
      res.status(500).json({
        error: "Failed to fetch mentors",
        message: error?.message,
      });
    }
  }
);

/**
 * POST /api/resume-reviews/request
 * Create resume review requests
 */
router.post(
  "/request",
  authenticateToken,
  requireRole(ROLES.STUDENT),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { resumeId, mentorIds } = req.body;

      if (!resumeId || !Array.isArray(mentorIds) || mentorIds.length === 0) {
        return res.status(400).json({
          error: "Resume ID and at least one mentor ID are required",
        });
      }

      // Verify resume belongs to student
      const resume = await prisma.resumes.findFirst({
        where: {
          id: parseInt(resumeId),
          student_id: userId,
        },
      });

      if (!resume) {
        return res.status(404).json({
          error: "Resume not found",
        });
      }

      // Verify mentors have ongoing sessions with student
      const validMentors = await prisma.sessions.findMany({
        where: {
          student_id: userId,
          mentor_id: { in: mentorIds },
          status: {
            in: [SessionStatus.SCHEDULED, SessionStatus.PAID, SessionStatus.APPROVED],
          },
        },
        distinct: ["mentor_id"],
      });

      const validMentorIds = validMentors.map((s) => s.mentor_id);

      if (validMentorIds.length === 0) {
        return res.status(400).json({
          error: "No valid mentors found. Mentors must have ongoing sessions with you.",
        });
      }

      // Check for existing reviews to prevent duplicates
      const existingReviews = await prisma.resume_review_requests.findMany({
        where: {
          resume_id: parseInt(resumeId),
          student_id: userId,
          mentor_id: { in: validMentorIds },
        },
        select: {
          mentor_id: true,
          status: true,
        },
      });

      // Filter out mentors who already have a review (even if pending)
      const existingMentorIds = new Set(existingReviews.map(r => r.mentor_id));
      const newMentorIds = validMentorIds.filter(id => !existingMentorIds.has(id));

      if (newMentorIds.length === 0) {
        return res.status(400).json({
          error: "Review requests already exist for all selected mentors. You cannot request review again from the same mentor.",
        });
      }

      // Create review requests only for mentors without existing reviews
      const requests = await Promise.all(
        newMentorIds.map((mentorId) =>
          prisma.resume_review_requests.create({
            data: {
              resume_id: parseInt(resumeId),
              student_id: userId,
              mentor_id: mentorId,
              status: ReviewStatus.PENDING,
            },
          })
        )
      );

      res.json({
        success: true,
        requests,
        message: `Resume review requested from ${requests.length} mentor(s)`,
      });
    } catch (error: any) {
      console.error("[Create Resume Review Request] Error:", error);
      res.status(500).json({
        error: "Failed to create review request",
        message: error?.message,
      });
    }
  }
);

/**
 * GET /api/resume-reviews/:resumeId
 * Get all reviews for a specific resume
 */
router.get(
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

      // Get all review requests for this resume
      const reviews = await prisma.resume_review_requests.findMany({
        where: {
          resume_id: resumeId,
          student_id: userId,
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
        orderBy: {
          created_at: "desc",
        },
      });

      // Format reviews for frontend
      // Ensure status is returned as string for frontend compatibility
      const formattedReviews = reviews.map(review => {
        // Convert enum to string explicitly
        const statusString = review.status === ReviewStatus.PENDING 
          ? "PENDING" 
          : review.status === ReviewStatus.VERIFIED 
          ? "VERIFIED" 
          : String(review.status);
        
        return {
          mentorId: review.mentor_id,
          mentorName: review.users_mentor?.name || "Unknown Mentor",
          rating: review.rating ? Number(review.rating) : null,
          feedback: review.mentor_feedback || null,
          status: statusString, // Explicitly convert to string
          reviewedAt: review.reviewed_at,
          createdAt: review.created_at,
        };
      });

      res.json({ reviews: formattedReviews });
    } catch (error: any) {
      console.error("[Get Resume Reviews] Error:", error);
      res.status(500).json({
        error: "Failed to fetch reviews",
        message: error?.message,
      });
    }
  }
);

export default router;

