import { PrismaClient } from "@prisma/client";
import { IndustryInsightsService } from "../services/industry.service";

const prisma = new PrismaClient();

export class IndustryInsightsController {
  private service: IndustryInsightsService;

  constructor() {
    this.service = new IndustryInsightsService();
  }

  /**
   * Get industry insights for student's branch
   * Automatically updates if older than 7 days
   * Now uses student-specific insights
   */
  async getBranchInsights(userId: string) {
    try {
      // Validate userId
      if (!userId || userId === undefined || userId === null || userId === "") {
        console.error("[Industry Insights Controller] Invalid userId:", userId);
        throw {
          status: 400,
          message: "Invalid user ID provided",
        };
      }
      
      console.log("[Industry Insights Controller] Getting profile for userId:", userId);
      
      // Get student profile to find branch, year, skills, and career
      const profile = await prisma.student_profiles.findUnique({
        where: { user_id: userId },
        select: {
          branch: true,
          grade_or_year: true,
          education_type: true,
          existing_skills: true,
        },
      });
      
      console.log("[Industry Insights Controller] Profile found:", profile ? "Yes" : "No");

      if (!profile || !profile.branch) {
        return {
          error: true,
          message: "Please complete your profile with educational details to view industry insights.",
        };
      }

      // Get selected career path
      const selectedCareer = await prisma.selected_careers.findFirst({
        where: { student_id: userId },
        select: {
          career_title: true,
        },
      });

      const branch = profile.branch;
      const skills = profile.existing_skills || [];
      const careerPath = selectedCareer?.career_title || undefined;
      
      console.log(`[Industry Insights] Fetching student-specific insights for branch: ${branch}, career: ${careerPath}`);

      // Get or generate student-specific insights
      const insights = await this.service.getOrGenerateStudentInsights(
        userId,
        branch,
        profile.grade_or_year || undefined,
        profile.education_type || undefined,
        skills.length > 0 ? skills : undefined,
        careerPath
      );

      return {
        error: false,
        data: insights,
      };
    } catch (error: any) {
      console.error("[Industry Insights Controller] Error:", error);
      throw {
        status: 500,
        message: error.message || "Failed to fetch industry insights",
      };
    }
  }
}

