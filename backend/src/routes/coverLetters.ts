/**
 * Cover Letter routes
 * For students to generate and manage cover letters
 */
import express, { Request, Response } from "express";
import { PrismaClient, Role, SessionStatus, PaymentStatus, ReviewStatus, ScheduleStatus } from "@prisma/client";
import { authenticateToken, requireRole, AuthRequest } from "../middlewares/auth.middleware";
import { ROLES } from "../config/constants";
import { generateWithGroq } from "../utils/groq";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/cover-letters
 * Get all cover letters for the current student
 */
router.get(
  "/",
  authenticateToken,
  requireRole(ROLES.STUDENT),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;

      const coverLetters = await prisma.cover_letters.findMany({
        where: { student_id: userId },
        orderBy: { created_at: "desc" },
        take: 20, // Limit to recent 20
      });

      res.json({ coverLetters });
    } catch (error: any) {
      console.error("[Get Cover Letters] Error:", error);
      res.status(500).json({
        error: "Failed to fetch cover letters",
        message: error?.message,
      });
    }
  }
);

/**
 * POST /api/cover-letters/generate
 * Generate a new cover letter using AI
 */
router.post(
  "/generate",
  authenticateToken,
  requireRole(ROLES.STUDENT),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { companyName, position, jobDescription } = req.body;

      if (!companyName || !position) {
        return res.status(400).json({
          error: "Company name and position are required",
        });
      }

      // Fetch user profile and resume data
      const [userProfile, primaryResume] = await Promise.all([
        prisma.student_profiles.findUnique({
          where: { user_id: userId },
        }),
        prisma.resumes.findFirst({
          where: {
            student_id: userId,
            is_primary: true,
          },
        }),
      ]);

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      // Build candidate profile data
      const candidateProfile = {
        fullName: userProfile?.full_name || user?.name || "Candidate",
        education: userProfile
          ? `${userProfile.education_type || ""} ${userProfile.branch || ""}`.trim() || "Student"
          : "Student",
        yearOrExperience: userProfile?.grade_or_year || userProfile?.experience_level || "Student",
        skills: (Array.isArray(userProfile?.existing_skills) ? (userProfile.existing_skills as string[]).join(", ") : null) || (primaryResume?.resume_data && typeof primaryResume.resume_data === 'object' && 'skills' in primaryResume.resume_data && Array.isArray((primaryResume.resume_data as any).skills) ? ((primaryResume.resume_data as any).skills as string[]).join(", ") : null) || "General skills",
        experienceSummary: buildExperienceSummary(primaryResume?.resume_data, userProfile),
      };

      // Build AI prompt using the provided template
      const prompt = buildCoverLetterPrompt(
        candidateProfile,
        companyName,
        position,
        jobDescription || null
      );

      // Generate cover letter using Groq
      let generatedLetter: string;
      try {
        const systemMessage = `You are an expert career assistant and professional resume writer. Generate personalized, ATS-friendly cover letters. Use ONLY the information provided. Do not invent details.`;
        generatedLetter = await generateWithGroq(prompt, "llama-3.3-70b-versatile", systemMessage);
        
        // Clean up the response (remove markdown, extra formatting)
        generatedLetter = generatedLetter.trim();
        // Remove markdown code blocks if present
        generatedLetter = generatedLetter.replace(/```[\s\S]*?```/g, "").trim();
        // Remove any leading/trailing quotes
        generatedLetter = generatedLetter.replace(/^["']|["']$/g, "").trim();
      } catch (aiError: any) {
        console.error("[AI Generate Cover Letter] Error:", aiError);
        // Fallback to template-based generation
        generatedLetter = generateFallbackCoverLetter(
          candidateProfile,
          companyName,
          position,
          jobDescription
        );
      }

      // Save cover letter to database
      // Note: If Prisma Client hasn't been regenerated, job_description and has_job_description
      // fields may not be available. We'll try with them first, then fallback.
      let coverLetter;
      try {
        coverLetter = await prisma.cover_letters.create({
          data: {
            student_id: userId,
            company_name: companyName,
            job_title: position,
            job_description: jobDescription || null,
            has_job_description: !!jobDescription,
            cover_letter_text: generatedLetter,
            title: `${position} at ${companyName}`,
          } as any, // Type assertion to allow new fields
        });
      } catch (schemaError: any) {
        // Fallback if new fields don't exist yet (Prisma Client not regenerated)
        if (schemaError.message?.includes("job_description") || schemaError.message?.includes("has_job_description")) {
          console.warn("[Cover Letter] New fields not available, using fallback schema");
          coverLetter = await prisma.cover_letters.create({
            data: {
              student_id: userId,
              company_name: companyName,
              job_title: position,
              cover_letter_text: generatedLetter,
              title: `${position} at ${companyName}`,
            },
          });
        } else {
          throw schemaError;
        }
      }

      res.json({
        success: true,
        coverLetter,
        letterText: generatedLetter,
      });
    } catch (error: any) {
      console.error("[Generate Cover Letter] Error:", error);
      res.status(500).json({
        error: "Failed to generate cover letter",
        message: error?.message,
      });
    }
  }
);

/**
 * Build the AI prompt for cover letter generation
 */
function buildCoverLetterPrompt(
  candidateProfile: any,
  companyName: string,
  position: string,
  jobDescription: string | null
): string {
  return `You are an expert career assistant and professional resume writer.

Your task is to generate a personalized, ATS-friendly cover letter.

Use ONLY the information provided. Do not invent details.

====================
CANDIDATE PROFILE
====================
Name: ${candidateProfile.fullName}
Education: ${candidateProfile.education}
Current Year / Experience Level: ${candidateProfile.yearOrExperience}
Skills: ${candidateProfile.skills}
Projects / Experience Summary: ${candidateProfile.experienceSummary}

====================
JOB DETAILS
====================
Company Name: ${companyName}
Position: ${position}
Job Description:
${jobDescription || "Not provided"}

====================
INSTRUCTIONS
====================

1. Write a professional cover letter in a confident but polite tone.
2. Length: 3–4 short paragraphs (no long blocks).
3. Always mention:
   - Company name
   - Position title
4. If job description is provided:
   - Match keywords naturally
   - Align skills and experience to the role
5. If job description is NOT provided:
   - Infer responsibilities based on the role
   - Focus on transferable skills and learning ability
6. Do NOT use placeholders like [Company Name].
7. Do NOT repeat the resume word-for-word.
8. End with a strong, professional closing.

Structure the letter as follows:
- Opening (personalized greeting with company name and role)
- Why this company (generic but clean reason)
- Skills match paragraph (pull from candidate profile, match role requirements)
- Experience / academic strength (mention projects/internships/learning path, include metrics if possible)
- Strong closing (express interest, call to action)
- Professional sign-off

====================
OUTPUT FORMAT
====================

Return ONLY the cover letter text.
No headings.
No markdown.
No bullet points.
No explanations.`;
}

/**
 * Build experience summary from resume data
 */
function buildExperienceSummary(resumeData: any, profile: any): string {
  if (!resumeData && !profile) {
    return "Eager to learn and contribute";
  }

  const parts: string[] = [];

  if (resumeData?.experience && Array.isArray(resumeData.experience) && resumeData.experience.length > 0) {
    const latestExp = resumeData.experience[0];
    if (latestExp.company && latestExp.jobTitle) {
      parts.push(`${latestExp.jobTitle} at ${latestExp.company}`);
    }
  }

  if (resumeData?.projects && Array.isArray(resumeData.projects) && resumeData.projects.length > 0) {
    const projectCount = resumeData.projects.length;
    parts.push(`${projectCount} project${projectCount > 1 ? "s" : ""} completed`);
  }

  if (profile?.experience_level) {
    parts.push(profile.experience_level);
  }

  return parts.length > 0 ? parts.join(", ") : "Student with strong learning ability";
}

/**
 * Fallback cover letter generator (if AI fails)
 */
function generateFallbackCoverLetter(
  candidateProfile: any,
  companyName: string,
  position: string,
  jobDescription: string | null
): string {
  return `Dear Hiring Manager,

I am writing to express my strong interest in the ${position} position at ${companyName}. As a ${candidateProfile.yearOrExperience} with a background in ${candidateProfile.education}, I am excited about the opportunity to contribute to your team.

Throughout my academic journey, I have developed a solid foundation in ${candidateProfile.skills}. ${candidateProfile.experienceSummary}. I am confident that my technical skills, combined with my ability to learn quickly and collaborate effectively, make me an ideal candidate for this role.

What particularly excites me about ${companyName} is your commitment to innovation and your impact on the industry. I am eager to bring my dedication, creativity, and problem-solving skills to your team.

Thank you for considering my application. I look forward to the opportunity to discuss how I can contribute to ${companyName}'s continued success.

Best regards,
${candidateProfile.fullName}`;
}

/**
 * GET /api/cover-letters/:coverLetterId/eligible-mentors
 * Get eligible mentors for sharing a cover letter
 * 
 * Rules:
 * - Only mentors with ONGOING sessions (paid, not all completed)
 * - Exclude mentor with PENDING review for this cover letter (if exists)
 * - VERIFIED reviews do NOT block sharing
 */
router.get(
  "/:coverLetterId/eligible-mentors",
  authenticateToken,
  requireRole(ROLES.STUDENT),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const coverLetterId = parseInt(req.params.coverLetterId);

      // Step 1: Verify cover letter belongs to student
      const coverLetter = await prisma.cover_letters.findFirst({
        where: {
          id: coverLetterId,
          student_id: userId,
        },
      });

      if (!coverLetter) {
        return res.status(404).json({
          error: "Cover letter not found",
        });
      }

      // Step 2: Check if cover letter has an ACTIVE (PENDING) review
      const activeReview = await prisma.cover_letter_review_requests.findFirst({
        where: {
          cover_letter_id: coverLetterId,
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
      // Frontend will show "This cover letter is currently under review"
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
 * POST /api/cover-letters/:coverLetterId/share
 * Share cover letter with a mentor (create review request)
 */
router.post(
  "/:coverLetterId/share",
  authenticateToken,
  requireRole(ROLES.STUDENT),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const coverLetterId = parseInt(req.params.coverLetterId);
      const { mentorIds } = req.body;

      // Verify cover letter belongs to student
      const coverLetter = await prisma.cover_letters.findFirst({
        where: {
          id: coverLetterId,
          student_id: userId,
        },
      });

      if (!coverLetter) {
        return res.status(404).json({
          error: "Cover letter not found",
        });
      }

      // CRITICAL: Check for ACTIVE (PENDING) review only
      // VERIFIED reviews do NOT block sharing
      const activeReview = await prisma.cover_letter_review_requests.findFirst({
        where: {
          cover_letter_id: coverLetterId,
          status: ReviewStatus.PENDING, // Only check PENDING reviews
        },
      });

      if (activeReview) {
        return res.status(400).json({
          error: "This cover letter already has an active review",
        });
      }

      // Validate: Exactly ONE mentor must be selected
      if (!Array.isArray(mentorIds) || mentorIds.length !== 1) {
        return res.status(400).json({
          error: "Please select exactly one mentor to share your cover letter with.",
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

      // Create review request (ONE cover letter → ONE mentor)
      const request = await prisma.cover_letter_review_requests.create({
        data: {
          cover_letter_id: coverLetterId,
          student_id: userId,
          mentor_id: mentorId,
          status: ReviewStatus.PENDING,
        },
      });

      res.json({
        success: true,
        request,
        message: "Cover letter shared with mentor successfully",
      });
    } catch (error: any) {
      console.error("[Share Cover Letter] Error:", error);
      res.status(500).json({
        error: "Failed to share cover letter",
        message: error?.message,
      });
    }
  }
);

/**
 * GET /api/cover-letters/:id
 * Get a specific cover letter
 * Must come AFTER specific routes to avoid conflicts
 */
router.get(
  "/:id",
  authenticateToken,
  requireRole(ROLES.STUDENT),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const letterId = parseInt(req.params.id);

      const coverLetter = await prisma.cover_letters.findFirst({
        where: {
          id: letterId,
          student_id: userId,
        },
      });

      if (!coverLetter) {
        return res.status(404).json({
          error: "Cover letter not found",
        });
      }

      res.json({ coverLetter });
    } catch (error: any) {
      console.error("[Get Cover Letter] Error:", error);
      res.status(500).json({
        error: "Failed to fetch cover letter",
        message: error?.message,
      });
    }
  }
);

/**
 * GET /api/cover-letters/:coverLetterId/reviews
 * Get all reviews for a specific cover letter
 */
router.get(
  "/:coverLetterId/reviews",
  authenticateToken,
  requireRole(ROLES.STUDENT),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const coverLetterId = parseInt(req.params.coverLetterId);

      // Verify cover letter belongs to student
      const coverLetter = await prisma.cover_letters.findFirst({
        where: {
          id: coverLetterId,
          student_id: userId,
        },
      });

      if (!coverLetter) {
        return res.status(404).json({
          error: "Cover letter not found",
        });
      }

      // Get all review requests for this cover letter
      const reviews = await prisma.cover_letter_review_requests.findMany({
        where: {
          cover_letter_id: coverLetterId,
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
      console.error("[Get Cover Letter Reviews] Error:", error);
      res.status(500).json({
        error: "Failed to fetch reviews",
        message: error?.message,
      });
    }
  }
);

export default router;

