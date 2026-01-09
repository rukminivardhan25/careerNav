import express from "express";
import { authenticateToken } from "../middlewares/auth.middleware";
import { PrismaClient, SessionStatus, PaymentStatus, ScheduleStatus } from "@prisma/client";
import { getOngoingCoursesFromSessions, type SessionWithRelations } from "../utils/courseHelpers";
import { getISTTodayStart, getISTTodayEnd, getISTNow } from "../utils/istTime";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/students/dashboard/summary
 * Get student dashboard summary using PERSISTED course_status
 * SINGLE SOURCE OF TRUTH: course_enrollments.course_status
 */
router.get("/dashboard/summary", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    if (userRole !== "STUDENT") {
      return res.status(403).json({
        error: "Only students can access this endpoint",
      });
    }

    // Query persisted course enrollments - NO COMPUTATION AT REQUEST TIME
    const enrollments = await prisma.course_enrollments.findMany({
      where: {
        student_id: userId,
        course_status: {
          in: ["ONGOING", "COMPLETED"],
        },
      },
      select: {
        mentor_id: true,
        skill_name: true,
        course_status: true,
        users_mentor: {
          select: {
            name: true,
          },
        },
      },
    });

    // Separate ongoing and completed
    const ongoingSkills: Array<{
      mentorName: string;
      skillName: string;
      startDate: string | null;
      endDate: string | null;
      startTime: string | null;
      endTime: string | null;
      sessionsPerWeek: number | null;
    }> = [];
    const completedSkills: Array<{
      mentorName: string;
      skillName: string;
      startDate: string | null;
      endDate: string | null;
      startTime: string | null;
      endTime: string | null;
      sessionsPerWeek: number | null;
    }> = [];

    for (const enrollment of enrollments) {
      // Get session data for this course to extract dates, times, and sessions per week
      const sessions = await prisma.sessions.findMany({
        where: {
          student_id: userId,
          mentor_id: enrollment.mentor_id,
          skill_name: enrollment.skill_name,
          status: {
            notIn: ["CANCELLED", "REJECTED"],
          },
        },
        select: {
          id: true,
          scheduled_at: true,
          plans: {
            select: {
              sessions_per_week: true,
            },
          },
          session_schedule: {
            select: {
              scheduled_date: true,
              scheduled_time: true,
            },
            orderBy: [
              { scheduled_date: "asc" },
              { scheduled_time: "asc" },
            ],
          },
        },
      });

      // Calculate start date, end date, start time, end time, and sessions per week
      let startDate: string | null = null;
      let endDate: string | null = null;
      let startTime: string | null = null;
      let endTime: string | null = null;
      let sessionsPerWeek: number | null = null;

      // Get all schedule items across all sessions
      const allScheduleItems = sessions.flatMap((s) => s.session_schedule || []);

      if (allScheduleItems.length > 0) {
        // Start date: earliest scheduled_date
        const firstItem = allScheduleItems[0];
        startDate = firstItem.scheduled_date?.toISOString() || null;
        startTime = firstItem.scheduled_time || null;

        // End date: latest scheduled_date
        const lastItem = allScheduleItems[allScheduleItems.length - 1];
        endDate = lastItem.scheduled_date?.toISOString() || null;

        // End time: calculate from last item's scheduled_time + 1 hour
        if (lastItem.scheduled_time) {
          const [hours, minutes] = lastItem.scheduled_time.split(':').map(Number);
          const endDateTime = new Date(lastItem.scheduled_date || getISTNow());
          endDateTime.setHours(hours || 0, minutes || 0, 0, 0);
          endDateTime.setTime(endDateTime.getTime() + 60 * 60 * 1000); // Add 1 hour
          const endHours = endDateTime.getHours();
          const endMinutes = endDateTime.getMinutes();
          endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
        }
      } else if (sessions.length > 0 && sessions[0].scheduled_at) {
        // Fallback: use session scheduled_at if no schedule items
        startDate = sessions[0].scheduled_at.toISOString();
        const startDateTime = new Date(sessions[0].scheduled_at);
        startTime = `${startDateTime.getHours().toString().padStart(2, '0')}:${startDateTime.getMinutes().toString().padStart(2, '0')}`;
        
        // Calculate end time (start + 1 hour)
        const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
        endTime = `${endDateTime.getHours().toString().padStart(2, '0')}:${endDateTime.getMinutes().toString().padStart(2, '0')}`;
        endDate = startDate; // Same day if single session
      }

      // Get sessions per week from plan
      const plan = sessions.find((s) => s.plans?.sessions_per_week)?.plans;
      sessionsPerWeek = plan?.sessions_per_week || null;

      const skill = {
        mentorName: enrollment.users_mentor?.name || "Unknown Mentor",
        skillName: enrollment.skill_name,
        startDate,
        endDate,
        startTime,
        endTime,
        sessionsPerWeek,
      };

      if (enrollment.course_status === "ONGOING") {
        ongoingSkills.push(skill);
      } else if (enrollment.course_status === "COMPLETED") {
        completedSkills.push(skill);
      }
    }

    res.json({
      ongoingSkills,
      completedSkills,
    });
  } catch (error: any) {
    console.error("[Students] Error fetching dashboard summary:", error);
    res.status(500).json({
      error: "Failed to fetch dashboard summary",
      message: error?.message || "Internal server error",
    });
  }
});

/**
 * GET /api/students/sessions
 * Get all sessions for the logged-in student
 * DAY-BASED LOGIC: Returns only TODAY's scheduled sessions grouped by ongoing/completed
 * 
 * NEW BEHAVIOR:
 * - Ongoing: session_schedule items where scheduled_date === today AND current_time < end_time
 * - Completed: session_schedule items where scheduled_date === today AND current_time >= end_time
 * - Pending Approval/Payment: Still based on session.status (course-level)
 */
router.get("/sessions", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    if (userRole !== "STUDENT") {
      return res.status(403).json({
        error: "Only students can access this endpoint",
      });
    }

    // Use IST time for business logic
    const todayStart = getISTTodayStart();
    const todayEnd = getISTTodayEnd();

    // Get all sessions for this student (excluding CANCELLED and REJECTED)
    const sessions = await prisma.sessions.findMany({
      where: {
        student_id: userId,
        status: {
          notIn: [SessionStatus.CANCELLED, SessionStatus.REJECTED],
        },
      },
      select: {
        id: true,
        student_id: true,
        mentor_id: true,
        course_id: true,
        skill_name: true,
        skill_id: true,
        session_type: true,
        status: true,
        scheduled_at: true,
        created_at: true,
        updated_at: true,
        users_mentor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        payments: {
          select: {
            id: true,
            status: true,
            completed_at: true,
          },
        },
        courses: {
          select: {
            id: true,
            title: true,
            career_id: true,
          },
        },
        session_schedule: {
          where: {
            scheduled_date: {
              gte: todayStart,
              lt: todayEnd,
            },
          },
          select: {
            id: true,
            scheduled_date: true,
            scheduled_time: true,
            status: true,
            topic_title: true,
            week_number: true,
            session_number: true,
          },
        },
      },
      orderBy: {
        updated_at: "desc",
      },
    });

    console.log(`[Students] Found ${sessions.length} sessions for student ${userId}`);

    // Format response - DAY-BASED LOGIC
    const formattedSessions = sessions.map((session) => {
      const mentorName = session.users_mentor?.name || "Unknown Mentor";
      const skillName = session.skill_name || "Unknown (Legacy)";
      
      // Get today's schedule items for this session
      const todayScheduleItems = session.session_schedule || [];
      
      // Calculate end_time for each schedule item (scheduled_date + scheduled_time + 1 hour default)
      const now = getISTNow();
      const scheduleItemsWithEndTime = todayScheduleItems.map((item) => {
        const scheduledDateTime = new Date(item.scheduled_date);
        const [hours, minutes] = item.scheduled_time.split(':').map(Number);
        scheduledDateTime.setHours(hours, minutes || 0, 0, 0);
        
        // Default duration: 1 hour
        const endTime = new Date(scheduledDateTime.getTime() + 60 * 60 * 1000);
        
        return {
          ...item,
          scheduledDateTime: scheduledDateTime.toISOString(),
          endTime: endTime.toISOString(),
          isCompleted: now >= endTime || item.status === "COMPLETED",
        };
      });

      return {
        sessionId: session.id,
        mentorId: session.users_mentor?.id || null,
        mentorName: mentorName,
        skillName: skillName,
        courseName: session.courses?.title || session.session_type || "Session",
        sessionType: session.session_type || null,
        status: session.status, // Keep original DB status for pending/payment logic
        lastUpdated: session.updated_at?.toISOString() || session.created_at?.toISOString() || null,
        scheduledAt: session.scheduled_at?.toISOString() || null,
        hasPayment: Array.isArray(session.payments)
          ? session.payments.some(p => p.status === PaymentStatus.SUCCESS)
          : session.payments?.status === PaymentStatus.SUCCESS || false,
        // NEW: Today's schedule items with completion status
        todayScheduleItems: scheduleItemsWithEndTime,
      };
    });

    // Group sessions by status (DAY-BASED)
    const pendingApproval = formattedSessions.filter(
      (s) => s.status === SessionStatus.PENDING
    );
    
    const pendingPayment = formattedSessions.filter(
      (s) => s.status === SessionStatus.APPROVED && !s.hasPayment
    );
    
    // ONGOING: Sessions with today's schedule items that haven't ended yet
    const ongoing = formattedSessions
      .filter((s) => {
        // Must have today's schedule items
        if (s.todayScheduleItems.length === 0) return false;
        // Must have at least one schedule item that hasn't completed
        return s.todayScheduleItems.some(item => !item.isCompleted);
      })
      .map((s) => {
        // Return only the ongoing schedule items
        const ongoingItems = s.todayScheduleItems.filter(item => !item.isCompleted);
        return {
          ...s,
          todayScheduleItems: ongoingItems, // Only ongoing items
        };
      });
    
    // COMPLETED: Sessions with today's schedule items that have all ended
    const completed = formattedSessions
      .filter((s) => {
        // Must have today's schedule items
        if (s.todayScheduleItems.length === 0) return false;
        // All schedule items must be completed
        return s.todayScheduleItems.length > 0 && s.todayScheduleItems.every(item => item.isCompleted);
      })
      .map((s) => {
        // Return only the completed schedule items
        const completedItems = s.todayScheduleItems.filter(item => item.isCompleted);
        return {
          ...s,
          todayScheduleItems: completedItems, // Only completed items
        };
      });

    console.log(`[Students] Day-based grouping: ${ongoing.length} ongoing, ${completed.length} completed for today`);

    res.json({
      pendingApproval,
      pendingPayment,
      ongoing,
      completed,
    });
  } catch (error: any) {
    console.error("[Students] Error fetching sessions:", error);
    res.status(500).json({
      error: "Failed to fetch sessions",
      message: error?.message || "Internal server error",
    });
  }
});

export default router;

