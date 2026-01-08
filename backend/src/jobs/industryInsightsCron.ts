/**
 * Industry Insights Weekly Cron Job
 * Automatically generates weekly industry insights for all students
 * Runs every Monday at 12:00 AM
 */

import { PrismaClient } from "@prisma/client";
import { IndustryInsightsService } from "../services/industry.service";

const prisma = new PrismaClient();
const service = new IndustryInsightsService();

/**
 * Generate weekly insights for all students with completed profiles
 * Runs every Monday at 12:00 AM
 */
export async function generateWeeklyIndustryInsights(): Promise<void> {
  try {
    console.log("[Industry Insights Cron] Starting weekly insights generation...");
    const now = new Date();
    const currentWeek = getWeekNumber(now);
    const currentYear = now.getFullYear();

    // Get all students with completed profiles
    const students = await prisma.student_profiles.findMany({
      where: {
        branch: { not: null },
      },
      select: {
        user_id: true,
        branch: true,
        grade_or_year: true,
        education_type: true,
        existing_skills: true,
      },
    });

    console.log(`[Industry Insights Cron] Found ${students.length} students with profiles`);

    let successCount = 0;
    let errorCount = 0;

    for (const student of students) {
      try {
        // Get selected career path
        const selectedCareer = await prisma.selected_careers.findFirst({
          where: { student_id: student.user_id },
          select: {
            career_title: true,
          },
        });

        // Check if insights already exist for this week
        const existingInsights = await prisma.student_industry_insights.findFirst({
          where: {
            user_id: student.user_id,
            week_number: currentWeek,
            year: currentYear,
          },
        });

        // Skip if already generated this week
        if (existingInsights) {
          console.log(
            `[Industry Insights Cron] Insights already exist for user ${student.user_id} (Week ${currentWeek})`
          );
          continue;
        }

        // Generate insights
        await service.getOrGenerateStudentInsights(
          student.user_id,
          student.branch!,
          student.grade_or_year || undefined,
          student.education_type || undefined,
          student.existing_skills && student.existing_skills.length > 0
            ? student.existing_skills
            : undefined,
          selectedCareer?.career_title || undefined
        );

        successCount++;
        console.log(
          `[Industry Insights Cron] Generated insights for user ${student.user_id} (${successCount}/${students.length})`
        );
      } catch (error: any) {
        errorCount++;
        console.error(
          `[Industry Insights Cron] Failed to generate insights for user ${student.user_id}:`,
          error.message
        );
      }
    }

    console.log(
      `[Industry Insights Cron] Completed. Success: ${successCount}, Errors: ${errorCount}`
    );
  } catch (error: any) {
    console.error("[Industry Insights Cron] Error:", error);
  }
}

/**
 * Get week number of the year (1-52)
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Check if it's Monday 12:00 AM
 */
function isMondayMidnight(): boolean {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 1 = Monday
  const hour = now.getHours();
  const minute = now.getMinutes();

  return day === 1 && hour === 0 && minute === 0;
}

/**
 * Start the weekly industry insights cron job
 * Checks every minute if it's Monday 12:00 AM
 */
export function startIndustryInsightsCron(): void {
  console.log("[Industry Insights Cron] Weekly cron job started. Will run every Monday at 12:00 AM");

  // Check every minute
  setInterval(() => {
    if (isMondayMidnight()) {
      console.log("[Industry Insights Cron] Monday 12:00 AM detected. Generating weekly insights...");
      generateWeeklyIndustryInsights().catch((error) => {
        console.error("[Industry Insights Cron] Error in scheduled job:", error);
      });
    }
  }, 60 * 1000); // Check every minute
}








