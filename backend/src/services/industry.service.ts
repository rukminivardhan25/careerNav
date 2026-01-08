import { PrismaClient } from "@prisma/client";
import { generateBranchInsightsWithGroq, generateStudentInsightsWithGroq } from "../utils/groq";

const prisma = new PrismaClient();

export class IndustryInsightsService {
  /**
   * Get existing student-specific insights or generate new ones if older than 7 days
   */
  async getOrGenerateStudentInsights(
    userId: string,
    branch: string,
    year?: string,
    educationType?: string,
    skills?: string[],
    careerPath?: string
  ) {
    try {
      const now = new Date();
      const currentWeek = this.getWeekNumber(now);
      const currentYear = now.getFullYear();

      let insights = null;
      let shouldSave = true;

      // Try to check if insights exist for this student and week
      try {
        insights = await prisma.student_industry_insights.findFirst({
          where: {
            user_id: userId,
            week_number: currentWeek,
            year: currentYear,
          },
        });

        // If insights exist and are fresh (less than 7 days old), return them
        if (insights && !this.isOlderThan7Days(insights.last_updated)) {
          console.log(
            `[Industry Insights] Using cached student insights for user ${userId} (Week ${currentWeek})`
          );
          return {
            branch: branch,
            content: insights.content,
            summary: insights.summary,
            last_updated: insights.last_updated,
          };
        }
      } catch (dbError: any) {
        // Table doesn't exist or other DB error - generate insights without saving
        console.error("[Industry Insights Service] Database error:", dbError);
        console.error("[Industry Insights Service] Error code:", dbError.code);
        console.error("[Industry Insights Service] Error message:", dbError.message);
        
        if (dbError.code === 'P2021' || 
            dbError.message?.includes('does not exist') || 
            dbError.message?.includes('Unknown model') ||
            dbError.message?.includes('student_industry_insights')) {
          console.log(
            `[Industry Insights] Table/model not found. Generating insights without saving to database.`
          );
          shouldSave = false;
        } else {
          // Log the error but continue - we'll generate insights anyway
          console.warn("[Industry Insights Service] Database error, but continuing:", dbError.message);
          shouldSave = false;
        }
      }

      // Generate new student-specific insights using Groq
      console.log(
        `[Industry Insights] Generating new student-specific insights for user: ${userId}, branch: ${branch} (Week ${currentWeek}, ${currentYear})`
      );

      const generatedInsights = await generateStudentInsightsWithGroq(
        branch,
        year,
        educationType,
        skills,
        careerPath
      );
      
      console.log(`[Industry Insights] Groq generated student insights successfully. Trends: ${generatedInsights.content?.trends?.length || 0}, Opportunities: ${generatedInsights.content?.opportunities?.length || 0}`);

      // Try to save to database if table exists
      if (shouldSave) {
        try {
          const existing = await prisma.student_industry_insights.findFirst({
            where: {
              user_id: userId,
              week_number: currentWeek,
              year: currentYear,
            },
          });

          if (existing) {
            // Update existing
            insights = await prisma.student_industry_insights.update({
              where: { id: existing.id },
              data: {
                content: generatedInsights.content,
                summary: generatedInsights.summary,
                last_updated: now,
                updated_at: now,
              },
            });
          } else {
            // Create new
            insights = await prisma.student_industry_insights.create({
              data: {
                user_id: userId,
                week_number: currentWeek,
                year: currentYear,
                content: generatedInsights.content,
                summary: generatedInsights.summary,
                last_updated: now,
              },
            });
          }

          console.log(
            `[Industry Insights] Saved student insights for user ${userId} (Week ${currentWeek})`
          );
        } catch (saveError: any) {
          // If save fails, still return the generated insights
          console.error("[Industry Insights Service] Save error:", saveError);
          console.error("[Industry Insights Service] Save error code:", saveError.code);
          console.error("[Industry Insights Service] Save error message:", saveError.message);
          console.warn(
            `[Industry Insights] Failed to save student insights to database: ${saveError.message}. Returning generated insights.`
          );
        }
      }

      // Return generated insights (either from DB or freshly generated)
      return {
        branch: branch,
        content: insights?.content || generatedInsights.content,
        summary: insights?.summary || generatedInsights.summary,
        last_updated: insights?.last_updated || now,
      };
    } catch (error: any) {
      console.error("[Industry Insights Service] Error:", error);
      throw error;
    }
  }

  /**
   * Get existing insights or generate new ones if older than 7 days
   */
  async getOrGenerateInsights(
    branch: string,
    year?: string,
    educationType?: string
  ) {
    try {
      const now = new Date();
      const currentWeek = this.getWeekNumber(now);
      const currentYear = now.getFullYear();

      let insights = null;
      let shouldSave = true;

      // Try to check if insights exist for this week (only if table exists)
      try {
        insights = await prisma.branch_industry_insights.findFirst({
          where: {
            branch: branch.toUpperCase(),
            week_number: currentWeek,
            year: currentYear,
          },
        });

        // If insights exist and are fresh (less than 7 days old), return them
        if (insights && !this.isOlderThan7Days(insights.last_updated)) {
          console.log(
            `[Industry Insights] Using cached insights for ${branch} (Week ${currentWeek})`
          );
          return {
            branch: insights.branch,
            week_number: insights.week_number,
            year: insights.year,
            content: insights.content,
            summary: insights.summary,
            last_updated: insights.last_updated,
          };
        }
      } catch (dbError: any) {
        // Table doesn't exist or other DB error - generate insights without saving
        if (dbError.code === 'P2021' || dbError.message?.includes('does not exist')) {
          console.log(
            `[Industry Insights] Table not found. Generating insights without saving to database.`
          );
          shouldSave = false;
        } else {
          throw dbError;
        }
      }

      // Generate new insights using Groq
      console.log(
        `[Industry Insights] Generating new insights for branch: ${branch} (Week ${currentWeek}, ${currentYear})`
      );

      const generatedInsights = await generateBranchInsightsWithGroq(
        branch,
        year,
        educationType
      );
      
      console.log(`[Industry Insights] Groq generated insights successfully. Trends: ${generatedInsights.content?.trends?.length || 0}, Opportunities: ${generatedInsights.content?.opportunities?.length || 0}`);

      // Try to save to database if table exists
      if (shouldSave) {
        try {
          const existing = await prisma.branch_industry_insights.findFirst({
            where: {
              branch: branch.toUpperCase(),
              week_number: currentWeek,
              year: currentYear,
            },
          });

          if (existing) {
            // Update existing
            insights = await prisma.branch_industry_insights.update({
              where: { id: existing.id },
              data: {
                content: generatedInsights.content,
                summary: generatedInsights.summary,
                last_updated: now,
                updated_at: now,
              },
            });
          } else {
            // Create new
            insights = await prisma.branch_industry_insights.create({
              data: {
                branch: branch.toUpperCase(),
                week_number: currentWeek,
                year: currentYear,
                content: generatedInsights.content,
                summary: generatedInsights.summary,
                last_updated: now,
              },
            });
          }

          console.log(
            `[Industry Insights] Saved insights for ${branch} (Week ${currentWeek})`
          );
        } catch (saveError: any) {
          // If save fails, still return the generated insights
          console.warn(
            `[Industry Insights] Failed to save insights to database: ${saveError.message}. Returning generated insights.`
          );
        }
      }

      // Return generated insights (either from DB or freshly generated)
      return {
        branch: branch.toUpperCase(),
        week_number: currentWeek,
        year: currentYear,
        content: insights?.content || generatedInsights.content,
        summary: insights?.summary || generatedInsights.summary,
        last_updated: insights?.last_updated || now,
      };
    } catch (error: any) {
      console.error("[Industry Insights Service] Error:", error);
      throw error;
    }
  }

  /**
   * Get week number of the year (1-52)
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  /**
   * Check if date is older than 7 days
   */
  private isOlderThan7Days(date: Date): boolean {
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays > 7;
  }
}

