import express, { Request, Response } from "express";
import { authenticateToken } from "../middlewares/auth.middleware";
import { PrismaClient } from "@prisma/client";
import { dashboardService } from "../services/dashboard.service";

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

    // Get account creation date and normalize to local date (YYYY-MM-DD)
    // This ensures we don't count activities before the account was created
    const accountCreatedAt = new Date(user.createdAt);
    const accountCreatedYear = accountCreatedAt.getFullYear();
    const accountCreatedMonth = accountCreatedAt.getMonth();
    const accountCreatedDay = accountCreatedAt.getDate();
    const accountCreatedDateStr = `${accountCreatedYear}-${String(accountCreatedMonth + 1).padStart(2, "0")}-${String(accountCreatedDay).padStart(2, "0")}`;
    
    // Create a date object for account creation (midnight local time)
    const accountCreatedDate = new Date(accountCreatedYear, accountCreatedMonth, accountCreatedDay);

    // Get activity dates for streak calendar (last 90 days)
    // Normalize to local time (12:00 AM - 11:59 PM)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    ninetyDaysAgo.setHours(0, 0, 0, 0);

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

    // Normalize dates to YYYY-MM-DD format (local time)
    // Convert activity_date (Date object) to local date string
    // Use local time methods consistently to match account creation date normalization
    const activityDates = new Set<string>();
    activities.forEach((a) => {
      const date = new Date(a.activity_date);
      // Use local time methods to match how we normalized account creation date
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;
      
      // Only include dates that are on or after account creation date
      if (dateStr >= accountCreatedDateStr) {
        activityDates.add(dateStr);
      }
    });

    // Calculate current streak (consecutive days from today backwards)
    // A day = 12:00 AM - 11:59 PM (local time)
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();
    const todayStr = `${todayYear}-${String(todayMonth + 1).padStart(2, "0")}-${String(todayDay).padStart(2, "0")}`;

    // Calculate streak: count consecutive green days ending today
    // Don't count days before account creation
    let streakCount = 0;
    let checkDate = new Date(today);
    
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
      // Create date using local time to match how we're normalizing dates
      const todayDate = new Date(todayYear, todayMonth, todayDay);
      await prisma.user_activity.upsert({
        where: {
          user_id_activity_date: {
            user_id: userId,
            activity_date: todayDate,
          },
        },
        create: {
          user_id: userId,
          activity_date: todayDate,
          activity_type: "dashboard_view",
        },
        update: {},
      });
      // Add today to activityDates for response
      activityDates.add(todayStr);
      
      // Recalculate streak now that today is included
      streakCount = 0;
      let checkDate = new Date(today);
      
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

