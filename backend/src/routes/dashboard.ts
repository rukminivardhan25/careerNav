import express, { Request, Response } from "express";
import { authenticateToken } from "../middlewares/auth.middleware";
import { PrismaClient } from "@prisma/client";
import { dashboardService } from "../services/dashboard.service";
import { getISTNow, getISTTodayStart, getISTDateComponents } from "../utils/istTime";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/dashboard
 * Get dashboard data for student
 */
router.get("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    if (userRole !== "STUDENT") {
      return res.status(403).json({
        error: "Only students can access this dashboard",
      });
    }

    // Get user data including account creation date
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    // Get account creation date and normalize to IST date (YYYY-MM-DD)
    // This ensures we don't count activities before the account was created
    const accountCreatedAt = new Date(user.createdAt);
    const accountCreatedComponents = getISTDateComponents(accountCreatedAt);
    const accountCreatedDateStr = `${accountCreatedComponents.year}-${String(accountCreatedComponents.month).padStart(2, "0")}-${String(accountCreatedComponents.day).padStart(2, "0")}`;
    
    // Create a date object for account creation (midnight IST)
    const accountCreatedDate = getISTTodayStart(); // We'll use today's start as reference, but we need the actual account creation date
    // For filtering, we can use the UTC date directly since we're comparing timestamps

    // Get activity dates for streak calendar (last 90 days)
    // Normalize to IST time (12:00 AM - 11:59 PM)
    const todayStart = getISTTodayStart();
    const ninetyDaysAgo = new Date(todayStart.getTime() - 90 * 24 * 60 * 60 * 1000);

    const activities = await prisma.user_activity.findMany({
      where: {
        user_id: userId,
        activity_date: {
          gte: accountCreatedDate, // Only get activities from account creation onwards
        },
      },
      select: {
        activity_date: true,
      },
      orderBy: {
        activity_date: "desc",
      },
    });

    // Normalize dates to YYYY-MM-DD format (IST time)
    // Convert activity_date (Date object) to IST date string
    // Use IST time methods consistently
    const activityDates = new Set<string>();
    activities.forEach((a) => {
      const date = new Date(a.activity_date);
      // Use IST time components
      const components = getISTDateComponents(date);
      const dateStr = `${components.year}-${String(components.month).padStart(2, "0")}-${String(components.day).padStart(2, "0")}`;
      
      // Only include dates that are on or after account creation date
      if (dateStr >= accountCreatedDateStr) {
        activityDates.add(dateStr);
      }
    });

    // Calculate current streak (consecutive days from today backwards)
    // A day = 12:00 AM - 11:59 PM (IST time)
    const todayComponents = getISTDateComponents(getISTNow());
    const todayStr = `${todayComponents.year}-${String(todayComponents.month).padStart(2, "0")}-${String(todayComponents.day).padStart(2, "0")}`;

    // Calculate streak: count consecutive green days ending today
    // Don't count days before account creation
    let streakCount = 0;
    const todayDate = getISTNow();
    let checkDate = new Date(todayDate);
    
    // Start from today and count backwards, but stop at account creation date
    while (true) {
      const year = checkDate.getFullYear();
      const month = checkDate.getMonth();
      const day = checkDate.getDate();
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      
      // Stop if we've gone before account creation date
      if (dateStr < accountCreatedDateStr) {
        break;
      }
      
      if (activityDates.has(dateStr)) {
        streakCount++;
        // Move to previous day (using local time to maintain consistency)
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // Stop when we hit a missed day
        break;
      }
    }

    // Get current learning skill
    const learningProgress = await prisma.student_learning_progress.findFirst({
      where: {
        student_id: userId,
        status: {
          in: ["in_progress", "not_started"],
        },
      },
      include: {
        learning_paths: {
          include: {
            learning_skills: {
              orderBy: {
                skill_order: "asc",
              },
            },
          },
        },
      },
      orderBy: {
        last_accessed_at: "desc",
      },
    });

    let currentSkill = null;
    if (learningProgress && learningProgress.learning_paths) {
      const currentSkillId = learningProgress.current_skill_id;
      const allSkills = learningProgress.learning_paths.learning_skills;
      
      const currentSkillData = currentSkillId
        ? allSkills.find((skill) => skill.skill_id === currentSkillId)
        : allSkills[0];

      if (currentSkillData) {
        const totalSkills = learningProgress.total_skills || allSkills.length;
        currentSkill = {
          name: currentSkillData.name,
          completed: learningProgress.skills_completed || 0,
          total: totalSkills,
          skillId: currentSkillData.skill_id,
        };
      }
    }

    // Record dashboard view as activity (if not already recorded today)
    // Only record if today is on or after account creation date
    const todayWasAlreadyRecorded = activityDates.has(todayStr);
    if (!todayWasAlreadyRecorded && todayStr >= accountCreatedDateStr) {
      // Create date using IST components to match how we're normalizing dates
      const todayDateForDB = new Date(todayComponents.year, todayComponents.month - 1, todayComponents.day);
      await prisma.user_activity.upsert({
        where: {
          user_id_activity_date: {
            user_id: userId,
            activity_date: todayDateForDB,
          },
        },
        create: {
          user_id: userId,
          activity_date: todayDateForDB,
          activity_type: "dashboard_view",
        },
        update: {},
      });
      // Add today to activityDates for response
      activityDates.add(todayStr);
      
      // Recalculate streak now that today is included
      streakCount = 0;
      let checkDate = new Date(todayDate);
      
      // Start from today and count backwards, but stop at account creation date
      while (true) {
        const year = checkDate.getFullYear();
        const month = checkDate.getMonth();
        const day = checkDate.getDate();
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        
        // Stop if we've gone before account creation date
        if (dateStr < accountCreatedDateStr) {
          break;
        }
        
        if (activityDates.has(dateStr)) {
          streakCount++;
          // Move to previous day (using local time to maintain consistency)
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          // Stop when we hit a missed day
          break;
        }
      }
    }

    // Convert Set to Array for response
    const activityDatesArray = Array.from(activityDates).sort();

    res.json({
      userName: user.name,
      streakCount,
      activityDates: activityDatesArray,
      currentSkill,
    });
  } catch (error: any) {
    console.error("[Dashboard] Error:", error);
    res.status(500).json({
      error: "Failed to fetch dashboard data",
      message: error?.message || "Internal server error",
    });
  }
});

/**
 * GET /api/dashboard/metrics
 * Get computed dashboard metrics (all values derived from database)
 */
router.get("/metrics", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    if (userRole !== "STUDENT") {
      return res.status(403).json({
        error: "Only students can access dashboard metrics",
      });
    }

    // Get computed metrics (all derived from database)
    const metrics = await dashboardService.getDashboardMetrics(userId);

    res.json(metrics);
  } catch (error: any) {
    console.error("[Dashboard Metrics] Error:", error);
    res.status(500).json({
      error: "Failed to fetch dashboard metrics",
      message: error?.message || "Internal server error",
    });
  }
});

export default router;

