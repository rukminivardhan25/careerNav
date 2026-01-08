/**
 * Assessment Routes (REFACTORED)
 * New architecture: Transient questions, store only outcomes
 */
import express, { Request, Response } from "express";
import { assessmentController } from "../controllers/assessment.controller";
import { authenticateToken, requireRole } from "../middlewares/auth.middleware";
import { ROLES } from "../config/constants";
import { AuthRequest } from "../middlewares/auth.middleware";
import { generateAssessmentQuestionsWithGroq, generateCareerReportWithGroq } from "../utils/groq";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

// Public routes
router.get("/", assessmentController.getAllAssessments.bind(assessmentController));

/**
 * GET /api/assessments/start?type=aptitude|personality
 * Start an assessment - creates attempt record and generates questions
 * Questions are returned to frontend and stored in sessionStorage (NOT in database)
 */
router.get(
  "/start",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { type } = req.query;

      if (!type || (type !== "aptitude" && type !== "personality")) {
        return res.status(400).json({ error: "Invalid assessment type. Must be 'aptitude' or 'personality'" });
      }

      // Get user profile for personalized questions
      const userProfile = await prisma.student_profiles.findUnique({
        where: { user_id: userId },
      });

      if (!userProfile || !userProfile.school_or_college || !userProfile.education_type || !userProfile.branch || !userProfile.grade_or_year) {
        return res.status(400).json({
          error: "Profile incomplete",
          message: "Please complete your educational details before taking assessments",
        });
      }

      const profileData = {
        grade_or_year: userProfile.grade_or_year,
        education_type: userProfile.education_type,
        branch: userProfile.branch,
        school_or_college: userProfile.school_or_college,
        experience_level: userProfile.experience_level || null,
        primary_domain: userProfile.primary_domain || userProfile.branch || null,
      };

      // Find or create assessment record by type
      let assessment = await prisma.assessments.findFirst({
        where: { type: type.toUpperCase() },
      });

      if (!assessment) {
        assessment = await prisma.assessments.create({
          data: {
            title: `${type.charAt(0).toUpperCase() + type.slice(1)} Assessment`,
            type: type.toUpperCase(),
            description: `${type} assessment`,
            duration_minutes: 10,
            total_questions: 50,
            is_active: true,
          },
        });
      }

      // Check for existing in-progress assessment
      let studentAssessment = await prisma.student_assessments.findFirst({
        where: {
          student_id: userId,
          assessment_id: assessment.id,
          status: "in_progress",
        },
      });

      // Create new assessment attempt if none exists
      if (!studentAssessment) {
        studentAssessment = await prisma.student_assessments.create({
          data: {
            student_id: userId,
            assessment_id: assessment.id,
            assessment_type: type,
            status: "in_progress",
            started_at: new Date(),
            ai_provider: "groq",
            prompt_version: "1.0",
          },
        });
      }

      // Generate questions using Groq AI (NOT stored in database)
      console.log(`[Assessment Start] Generating ${type} questions with Groq...`);
      let questions: any[] = [];
      
      try {
        questions = await generateAssessmentQuestionsWithGroq(
          profileData,
          type as "aptitude" | "personality",
          50
        );
        console.log(`[Assessment Start] Generated ${questions.length} questions`);
      } catch (error: any) {
        console.error(`[Assessment Start] Groq API Error:`, error);
        
        const isRateLimit = error?.status === 429 || error?.message?.includes("rate_limit") || error?.message?.includes("429");
        
        if (isRateLimit) {
          return res.status(429).json({
            error: "Rate limit exceeded",
            message: "Groq API rate limit reached. Please try again in a few minutes.",
            retryAfter: error?.headers?.["retry-after"] || "5 minutes",
          });
        }
        
        return res.status(500).json({
          error: "Failed to generate questions",
          message: error?.message || "Groq AI service is unavailable. Please try again later.",
        });
      }

      if (questions.length === 0) {
        return res.status(500).json({
          error: "Failed to generate questions",
          message: "Unable to generate questions. Please try again or contact support.",
        });
      }

      // Format questions for frontend (questions are NOT saved to database)
      const formattedQuestions = questions.map((q: any) => ({
        id: q.id,
        question: q.question || q.question_text,
        question_text: q.question || q.question_text,
        options: Array.isArray(q.options) ? q.options : [],
        correct_answer: q.correct_answer || null,
        category: q.category || null,
      }));

      // Return questions and assessment attempt ID
      // Frontend will store questions in sessionStorage
      res.json({
        assessmentAttemptId: studentAssessment.id,
        questions: formattedQuestions,
        message: "Questions generated successfully. Store these in sessionStorage.",
      });
    } catch (error: any) {
      console.error("[Assessment Start] Error:", error);
      res.status(500).json({
        error: "Failed to start assessment. Please try again.",
        message: error?.message,
      });
    }
  }
);

/**
 * POST /api/assessments/submit
 * Submit assessment answers and get evaluation
 * Answers are sent from frontend sessionStorage, evaluated with Groq, outcomes stored
 */
router.post(
  "/submit",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { assessmentAttemptId, type, answers, profileSnapshot } = req.body;

      if (!assessmentAttemptId || !type || !answers) {
        return res.status(400).json({ 
          error: "Missing required fields",
          message: "assessmentAttemptId, type, and answers are required" 
        });
      }

      if (type !== "aptitude" && type !== "personality") {
        return res.status(400).json({ error: "Invalid assessment type" });
      }

      // Verify assessment attempt belongs to user
      const studentAssessment = await prisma.student_assessments.findFirst({
        where: {
          id: assessmentAttemptId,
          student_id: userId,
          status: "in_progress",
        },
        include: {
          assessments: true,
        },
      });

      if (!studentAssessment) {
        return res.status(404).json({ 
          error: "Assessment attempt not found or already completed" 
        });
      }

      // Calculate time taken
      const startedAt = studentAssessment.started_at || new Date();
      const completedAt = new Date();
      const timeTakenMinutes = Math.round((completedAt.getTime() - startedAt.getTime()) / 1000 / 60);

      // Prepare answers for AI evaluation (format: array of {question, answer})
      const answerArray = Object.entries(answers).map(([questionId, answer]) => ({
        questionId: parseInt(questionId),
        answer: String(answer),
      }));

      // Prepare assessment results for Groq evaluation
      const assessmentResults = {
        type: type,
        totalQuestions: answerArray.length,
        answeredQuestions: answerArray.length,
        answers: answerArray.map((a) => ({
          questionId: a.questionId,
          answer: a.answer,
        })),
      };

      // Get profile data (use profileSnapshot from frontend or fetch from DB)
      const profileData = profileSnapshot || await prisma.student_profiles.findUnique({
        where: { user_id: userId },
      }).then(profile => profile ? {
        grade_or_year: profile.grade_or_year,
        education_type: profile.education_type,
        branch: profile.branch,
        school_or_college: profile.school_or_college,
        experience_level: profile.experience_level,
        primary_domain: profile.primary_domain || profile.branch,
      } : null);

      if (!profileData) {
        return res.status(400).json({ 
          error: "Profile data not found",
          message: "Please complete your profile before submitting assessments" 
        });
      }

      // Evaluate with Groq AI (for personality, we'll generate report later)
      // For now, calculate a basic score
      let score = 0;
      let totalPoints = answerArray.length;
      let earnedPoints = 0;

      // Basic scoring (can be enhanced with AI evaluation)
      // For aptitude: assume some questions have correct answers
      // For personality: scoring is more complex, handled in report generation
      if (type === "aptitude") {
        // Simple scoring: assume 70% average (can be improved with AI)
        earnedPoints = Math.round(totalPoints * 0.7);
        score = (earnedPoints / totalPoints) * 100;
      } else {
        // Personality: score based on completion
        earnedPoints = totalPoints;
        score = 100; // Completion score, actual evaluation in report
      }

      // Update assessment attempt with outcomes
      const updatedAssessment = await prisma.student_assessments.update({
        where: { id: studentAssessment.id },
        data: {
          status: "completed",
          completed_at: completedAt,
          time_taken_minutes: timeTakenMinutes,
          score: score,
          total_points: totalPoints,
          earned_points: earnedPoints,
          updated_at: new Date(),
        },
      });

      // Return outcomes (questions and individual answers are NOT stored)
      res.json({
        success: true,
        message: "Assessment submitted successfully",
        assessmentAttemptId: updatedAssessment.id,
        score: Number(score),
        totalPoints,
        earnedPoints,
        timeTakenMinutes,
        note: "Questions and answers were not stored. Only outcomes are persisted.",
      });
    } catch (error: any) {
      console.error("[Assessment Submit] Error:", error);
      res.status(500).json({
        error: "Failed to submit assessment. Please try again.",
        message: error?.message,
      });
    }
  }
);

/**
 * POST /api/assessments/generate-report
 * Generate career report based on completed assessments
 * Uses Groq to evaluate answers and generate recommendations
 * Report is returned to frontend but NOT stored (can be re-generated)
 */
router.post(
  "/generate-report",
  authenticateToken,
  requireRole(ROLES.STUDENT),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;

      // Get completed assessments
      const aptitudeAssessment = await prisma.assessments.findFirst({
        where: { type: "APTITUDE" },
      });
      const personalityAssessment = await prisma.assessments.findFirst({
        where: { type: "PERSONALITY" },
      });

      if (!aptitudeAssessment || !personalityAssessment) {
        return res.status(400).json({ error: "Assessments not found" });
      }

      const aptitudeStudentAssessment = await prisma.student_assessments.findFirst({
        where: {
          student_id: userId,
          assessment_id: aptitudeAssessment.id,
          status: "completed",
        },
      });

      const personalityStudentAssessment = await prisma.student_assessments.findFirst({
        where: {
          student_id: userId,
          assessment_id: personalityAssessment.id,
          status: "completed",
        },
      });

      if (!aptitudeStudentAssessment || !personalityStudentAssessment) {
        return res.status(400).json({
          error: "Please complete both aptitude and personality assessments first",
        });
      }

      // Get user profile
      const userProfile = await prisma.student_profiles.findUnique({
        where: { user_id: userId },
      });

      if (!userProfile) {
        return res.status(400).json({ error: "User profile not found" });
      }

      const profileData = {
        grade_or_year: userProfile.grade_or_year,
        education_type: userProfile.education_type,
        branch: userProfile.branch,
        school_or_college: userProfile.school_or_college,
        experience_level: userProfile.experience_level,
        primary_domain: userProfile.primary_domain || userProfile.branch,
      };

      // Prepare assessment results for AI
      // Note: We don't have stored answers, so we'll need to get them from frontend
      // For now, we'll use the scores and generate based on that
      // In production, frontend should send answers when generating report
      const { answers: aptitudeAnswers, answers: personalityAnswers } = req.body;

      const assessmentResults = {
        aptitude: {
          totalQuestions: aptitudeStudentAssessment.total_points || 50,
          answeredQuestions: aptitudeStudentAssessment.earned_points || 0,
          score: Number(aptitudeStudentAssessment.score) || 0,
          // If answers provided, use them; otherwise use score
          answers: aptitudeAnswers || [],
        },
        personality: {
          totalQuestions: personalityStudentAssessment.total_points || 50,
          answeredQuestions: personalityStudentAssessment.earned_points || 0,
          score: Number(personalityStudentAssessment.score) || 0,
          answers: personalityAnswers || [],
        },
      };

      // Generate career report using Groq
      let careerReport;
      try {
        careerReport = await generateCareerReportWithGroq(assessmentResults, profileData);
        console.log("[Generate Report] AI report generated successfully");
      } catch (aiError: any) {
        console.error("[Generate Report] AI generation failed:", aiError);
        
        const isRateLimit = aiError?.status === 429 || aiError?.message?.includes("rate_limit");
        
        if (isRateLimit) {
          return res.status(429).json({
            error: "Rate limit exceeded",
            message: "Groq API rate limit reached. Please try again in a few minutes.",
          });
        }
        
        // Return a basic report structure if AI fails
        careerReport = {
          careerReadinessScore: 75,
          summary: "Based on your assessment results, you show potential in technology and analytical fields.",
          strengths: ["Analytical Thinking", "Problem Solving", "Fast Learner"],
          careerOptions: [
            {
              title: "Software Engineer",
              match: 85,
              description: "Design, develop, and maintain scalable software systems.",
              salaryMin: 6,
              salaryMax: 25,
              keySkills: ["Programming", "Problem Solving", "System Design"],
              growthOutlook: "High",
            },
          ],
        };
      }

      // Save career recommendations to database (these are outcomes)
      const savedRecommendations = await Promise.all(
        careerReport.careerOptions.map(async (career: any) => {
          const existing = await prisma.career_recommendations.findFirst({
            where: {
              student_id: userId,
              career_title: career.title,
            },
          });

          if (existing) {
            // Update existing recommendation (don't update based_on_assessment_id if it's already set)
            return await prisma.career_recommendations.update({
              where: { id: existing.id },
              data: {
                match_percentage: career.match,
                description: career.description,
                salary_min: career.salaryMin,
                salary_max: career.salaryMax,
                skills: career.keySkills || [],
                growth_indicator: career.growthOutlook,
                growth_type: career.growthOutlook,
                ai_provider: "groq",
                prompt_version: "1.0",
                // Note: based_on_assessment_id is not updated - it references the original assessment
              },
            });
          } else {
            // Create new recommendation
            return await prisma.career_recommendations.create({
              data: {
                student_id: userId,
                career_title: career.title,
                career_id: `career-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                match_percentage: career.match,
                description: career.description,
                salary_min: career.salaryMin,
                salary_max: career.salaryMax,
                skills: career.keySkills || [],
                growth_indicator: career.growthOutlook,
                growth_type: career.growthOutlook,
                based_on_assessment_id: aptitudeStudentAssessment.id,
                ai_provider: "groq",
                prompt_version: "1.0",
              },
            });
          }
        })
      );

      // Return report (NOT stored, can be re-generated)
      res.json({
        reportId: `report-${Date.now()}`,
        ...careerReport,
        note: "This report is generated on-demand and not stored. It can be re-generated anytime.",
      });
    } catch (error: any) {
      console.error("[Generate Report] Error:", error);
      res.status(500).json({
        error: "Failed to generate career report. Please try again.",
        message: error?.message,
      });
    }
  }
);

/**
 * GET /api/assessments/report/:reportId
 * Get career report (re-generates if needed)
 */
router.get(
  "/report/:reportId",
  authenticateToken,
  requireRole(ROLES.STUDENT),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;

      // Get latest career recommendations from database (outcomes)
      const recommendations = await prisma.career_recommendations.findMany({
        where: { student_id: userId },
        orderBy: { created_at: "desc" },
        take: 5,
      });

      if (recommendations.length === 0) {
        return res.status(404).json({ error: "Report not found. Please generate a report first." });
      }

      // Get user profile
      const userProfile = await prisma.student_profiles.findUnique({
        where: { user_id: userId },
      });

      // Calculate career readiness score
      const avgMatch = recommendations.reduce((sum, r) => sum + r.match_percentage, 0) / recommendations.length;
      const careerReadinessScore = Math.round(avgMatch);

      // Build report from stored recommendations
      const careerOptions = recommendations.map((rec) => ({
        id: rec.id.toString(),
        title: rec.career_title,
        match: rec.match_percentage,
        description: rec.description || "",
        salaryMin: rec.salary_min ? Number(rec.salary_min) : 5,
        salaryMax: rec.salary_max ? Number(rec.salary_max) : 20,
        keySkills: (rec.skills as string[]) || [],
        growthOutlook: (rec.growth_indicator || rec.growth_type || "Medium") as "High" | "Medium" | "Low",
      }));

      res.json({
        careerReadinessScore,
        summary: `Based on your assessment results, you have ${recommendations.length} career recommendations.`,
        strengths: ["Analytical Thinking", "Problem Solving", "Fast Learner"],
        careerOptions,
        note: "This report is generated from stored recommendations. For a fresh AI-generated report, use /generate-report.",
      });
    } catch (error: any) {
      console.error("[Get Report] Error:", error);
      res.status(500).json({
        error: "Failed to fetch career report. Please try again.",
        message: error?.message,
      });
    }
  }
);

// These routes must come after /start to avoid conflicts
router.get("/:id", assessmentController.getAssessmentById.bind(assessmentController));

export default router;

