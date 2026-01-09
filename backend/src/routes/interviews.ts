/**
 * Interview routes
 * Handles mock interview generation and management
 */
import express, { Request, Response } from "express";
import { PrismaClient, SessionStatus } from "@prisma/client";
import { authenticateToken, requireRole, AuthRequest } from "../middlewares/auth.middleware";
import { ROLES } from "../config/constants";
import { generateWithGroq } from "../utils/groq";
import { getISTNow } from "../utils/istTime";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/interviews/student-data
 * Get student data for personalized interview generation
 */
router.get(
  "/student-data",
  authenticateToken,
  requireRole(ROLES.STUDENT),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;

      // Fetch student profile
      const profile = await prisma.student_profiles.findUnique({
        where: { user_id: userId },
      });

      // Fetch selected career
      const selectedCareer = await prisma.selected_careers.findUnique({
        where: { student_id: userId },
      });

      // Fetch latest career recommendations
      const careerRecommendations = await prisma.career_recommendations.findMany({
        where: { student_id: userId },
        orderBy: { match_percentage: "desc" },
        take: 5,
      });

      // Fetch latest assessments
      const assessments = await prisma.student_assessments.findMany({
        where: { student_id: userId },
        orderBy: { completed_at: "desc" },
        take: 2,
      });

      res.json({
        profile: profile || null,
        selectedCareer: selectedCareer || null,
        careerRecommendations: careerRecommendations || [],
        assessments: assessments || [],
      });
    } catch (error: any) {
      console.error("[Get Student Data] Error:", error);
      res.status(500).json({
        error: "Failed to fetch student data",
        message: error?.message,
      });
    }
  }
);

/**
 * POST /api/interviews/generate
 * Generate personalized interview questions using AI (Groq)
 * 
 * This endpoint uses Groq AI to generate interview questions based on:
 * - Student's profile (branch, year, skills)
 * - Selected filters (skill, role, difficulty, interview type)
 * - Number of questions requested
 * 
 * The AI generates questions that are relevant to the student's background
 * and the specific role/interview type they're practicing for.
 */
router.post(
  "/generate",
  authenticateToken,
  requireRole(ROLES.STUDENT),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      // Filters include: skill, role, difficulty, type (technical/behavioral), questionCount
      const { filters } = req.body;

      // Fetch student data
      const profile = await prisma.student_profiles.findUnique({
        where: { user_id: userId },
      });

      const selectedCareer = await prisma.selected_careers.findUnique({
        where: { student_id: userId },
      });

      const careerRecommendations = await prisma.career_recommendations.findMany({
        where: { student_id: userId },
        orderBy: { match_percentage: "desc" },
        take: 3,
      });

      const assessments = await prisma.student_assessments.findMany({
        where: { student_id: userId, status: "completed" },
        orderBy: { completed_at: "desc" },
        take: 2,
      });

      // Build AI prompt
      const prompt = buildInterviewGenerationPrompt(
        profile,
        selectedCareer,
        careerRecommendations,
        assessments,
        filters
      );

      const systemMessage = `You are an expert interview coach and career counselor. Generate personalized mock interview options based on student profiles, career choices, and assessment results. Return only valid JSON array.`;

      console.log("[Interview Generation] Calling Groq AI...");
      const response = await generateWithGroq(
        prompt,
        "llama-3.3-70b-versatile",
        systemMessage
      );

      console.log("[Interview Generation] Parsing response...");
      const interviews = parseInterviewsFromResponse(response);

      // Generate dynamic filter options from interviews
      const filterOptions = generateFilterOptions(interviews);

      res.json({
        interviews,
        filterOptions,
      });
    } catch (error: any) {
      console.error("[Generate Interviews] Error:", error);
      res.status(500).json({
        error: "Failed to generate interviews",
        message: error?.message,
      });
    }
  }
);

/**
 * Build AI prompt for interview generation
 */
function buildInterviewGenerationPrompt(
  profile: any,
  selectedCareer: any,
  careerRecommendations: any[],
  assessments: any[],
  filters?: any
): string {
  const careerTitle = selectedCareer?.career_title || "General";
  const branch = profile?.branch || "Not specified";
  const year = profile?.grade_or_year || "Not specified";
  const educationType = profile?.education_type || "Not specified";
  const skills = profile?.existing_skills || [];
  const experienceLevel = profile?.experience_level || "Student";

  // Determine difficulty based on year and experience
  let defaultDifficulty = "Easy";
  if (year.match(/3|third|fourth|final/i) || experienceLevel.match(/experienced|professional/i)) {
    defaultDifficulty = "Intermediate";
  }
  if (year.match(/4|fourth|final/i) || experienceLevel.match(/senior|expert/i)) {
    defaultDifficulty = "Hard";
  }

  // Build assessment insights
  let assessmentInsights = "";
  if (assessments.length > 0) {
    const aptitudeScores = assessments.filter((a) => a.assessment_type === "aptitude");
    const personalityScores = assessments.filter((a) => a.assessment_type === "personality");
    
    if (aptitudeScores.length > 0) {
      assessmentInsights += `\n- Aptitude Assessment: Completed (Score: ${aptitudeScores[0].score || "N/A"})`;
    }
    if (personalityScores.length > 0) {
      assessmentInsights += `\n- Personality Assessment: Completed`;
    }
  }

  // Build career context
  let careerContext = `Career Focus: ${careerTitle}`;
  if (careerRecommendations.length > 0) {
    const topRecommendations = careerRecommendations
      .slice(0, 3)
      .map((r) => r.career_title)
      .join(", ");
    careerContext += `\nTop Career Recommendations: ${topRecommendations}`;
  }

  // Apply filters if provided
  const filterContext = filters
    ? `\n\nFILTER REQUIREMENTS:
- Skill: ${filters.skill || "Any"}
- Role: ${filters.role || "Any"}
- Difficulty: ${filters.difficulty || defaultDifficulty}
- Interview Type: ${filters.type || "Any"}`
    : "";

  return `Generate personalized mock interview options for a student.

STUDENT PROFILE:
- Career Choice: ${careerTitle}
- Branch/Field: ${branch}
- Year/Grade: ${year}
- Education Type: ${educationType}
- Experience Level: ${experienceLevel}
- Skills: ${skills.length > 0 ? skills.join(", ") : "Not specified"}${assessmentInsights}

${careerContext}${filterContext}

Generate 8-15 interview options that are:
1. Relevant to the student's career path (${careerTitle})
2. Appropriate for their education level (${year}, ${branch})
3. Include a mix of difficulty levels: Easy, Intermediate, and Hard (default: ${defaultDifficulty} if no filter)
4. Cover different interview types (Technical, Behavioral, System Design, HR)
5. Include various roles related to ${careerTitle}

OUTPUT FORMAT (JSON array only, no markdown):
[
  {
    "id": "interview-1",
    "title": "<Interview Title>",
    "skill": "<Primary Skill>",
    "role": "<Job Role>",
    "interviewType": "Technical" | "Behavioral" | "System Design" | "HR",
    "difficulty": "Easy" | "Intermediate" | "Hard",
    "questionCount": <number 5-15>,
    "estimatedDuration": <number in minutes>,
    "description": "<2-3 sentence description explaining why this interview is relevant for this student>"
  }
]

REQUIREMENTS:
- Interview titles should be specific (e.g., "Frontend Developer - React Technical Interview")
- Skills should be derived from career and profile (e.g., "Web Development", "Java", "Python", "DSA", "Machine Learning")
- Roles should match career path (e.g., "Frontend Developer", "Backend Developer", "Full Stack Developer", "Data Analyst")
- Descriptions must explain why this interview is relevant for ${careerTitle} student with ${branch} background
- Question counts: 5-8 for Easy, 8-12 for Intermediate, 10-15 for Hard
- Duration: ~2-3 minutes per question
- Include at least 2-3 interviews of each type (Technical, Behavioral, System Design, HR)
- Include interviews with different difficulty levels (Easy, Intermediate, Hard)
- Prioritize interviews that match ${careerTitle} career path

${filters ? `Apply filters strictly. Only generate interviews matching:
- Skill: ${filters.skill || "Any"}
- Role: ${filters.role || "Any"}
- Difficulty: ${filters.difficulty || "Any"}
- Type: ${filters.type || "Any"}` : ""}

Return ONLY the JSON array, no markdown, no explanations.`;
}

/**
 * Parse interviews from AI response
 */
function parseInterviewsFromResponse(response: string): any[] {
  try {
    let jsonText = response.trim();
    jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");

    const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }

    // Try parsing the whole text
    const directParse = JSON.parse(jsonText);
    if (Array.isArray(directParse)) {
      return directParse;
    }

    console.warn("[Interview Generation] Could not parse interviews from response");
    return [];
  } catch (error: any) {
    console.error("[Interview Generation] Error parsing interviews:", error);
    console.error("[Interview Generation] Response (first 500 chars):", response.substring(0, 500));
    return [];
  }
}

/**
 * Generate filter options from interviews
 */
function generateFilterOptions(interviews: any[]): {
  skills: string[];
  roles: string[];
  difficulties: string[];
  interviewTypes: string[];
} {
  const skills = Array.from(new Set(interviews.map((i) => i.skill).filter(Boolean)));
  const roles = Array.from(new Set(interviews.map((i) => i.role).filter(Boolean)));
  // Always include all difficulty levels, regardless of what interviews were generated
  const difficulties = ["Easy", "Intermediate", "Hard"];
  const interviewTypes = Array.from(
    new Set(interviews.map((i) => i.interviewType).filter(Boolean))
  );

  return {
    skills: skills.sort(),
    roles: roles.sort(),
    difficulties: difficulties, // Always return all three difficulty levels
    interviewTypes: interviewTypes.sort(),
  };
}

/**
 * POST /api/interviews/complete
 * Save mock interview completion as a session record
 */
router.post(
  "/complete",
  authenticateToken,
  requireRole(ROLES.STUDENT),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const {
        interviewTitle,
        skill,
        role,
        interviewType,
        difficulty,
        questionCount,
        answers,
      } = req.body;

      // Validate required fields
      if (!interviewTitle || !skill || !interviewType) {
        return res.status(400).json({
          error: "Missing required fields: interviewTitle, skill, interviewType",
        });
      }

      // Find or create a system mentor for mock interviews
      // Use a placeholder mentor ID - in production, you might want a dedicated system mentor
      const PLACEHOLDER_COURSE_ID = 1; // Same as used in sessions.ts
      
      // Try to find a mentor with email containing "system" or "mock" for mock interviews
      // If not found, we'll use the first available mentor as placeholder
      let mentorId: string;
      const systemMentor = await prisma.user.findFirst({
        where: {
          role: "MENTOR",
          email: {
            contains: "system",
            mode: "insensitive",
          },
        },
        select: { id: true },
      });

      if (systemMentor) {
        mentorId = systemMentor.id;
      } else {
        // Use first available mentor as placeholder
        const firstMentor = await prisma.user.findFirst({
          where: { role: "MENTOR" },
          select: { id: true },
        });

        if (!firstMentor) {
          return res.status(500).json({
            error: "No mentor found in system. Please contact administrator.",
          });
        }
        mentorId = firstMentor.id;
      }

      // Create session record for mock interview
      const sessionId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = getISTNow(); // Use IST time
      
      const session = await prisma.sessions.create({
        data: {
          id: sessionId,
          student_id: userId,
          mentor_id: mentorId, // Placeholder mentor for mock interviews
          course_id: PLACEHOLDER_COURSE_ID,
          session_type: "Mock Interview",
          scheduled_at: now,
          end_time: now,
          status: SessionStatus.COMPLETED,
          completed_at: now,
          skill_name: skill || "Mock Interview",
          skill_id: null,
        },
      });

      res.status(201).json({
        success: true,
        sessionId: session.id,
        message: "Mock interview completed and saved successfully",
      });
    } catch (error: any) {
      console.error("[Complete Mock Interview] Error:", error);
      res.status(500).json({
        error: "Failed to save mock interview completion",
        message: error?.message || "Internal server error",
      });
    }
  }
);

export default router;



