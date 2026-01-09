/**
 * Session Status Cron Job
 * Automatically updates session statuses based on time
 * Runs every 5 minutes
 */

import { PrismaClient, SessionStatus, ScheduleStatus } from "@prisma/client";
import { getSessionStatusTransition } from "../utils/sessionVisibility";
import { notificationService } from "../services/notification.service";
import { getISTNow, getISTTodayStart, getISTTodayEnd, createISTDate, getISTTimeComponents, getISTDateComponents } from "../utils/istTime";
import { unlockTodaySessions } from "../utils/sessionSchedule";

const prisma = new PrismaClient();

/**
 * Update session statuses based on time (SCHEDULED → ONGOING → COMPLETED)
 * Runs every 5 minutes
 * 
 * Lifecycle rules:
 * - Before startTime (scheduled_at) → SCHEDULED
 * - Between startTime and endTime → ONGOING (if status is SCHEDULED)
 * - After endTime → COMPLETED
 */
export async function updateSessionStatusesByTime(): Promise<void> {
  try {
    const now = getISTNow(); // Use IST time
    let updatedCount = 0;

    // Get all SCHEDULED sessions that need status updates
    const scheduledSessions = await prisma.sessions.findMany({
      where: {
        status: SessionStatus.SCHEDULED,
      },
      select: {
        id: true,
        scheduled_at: true,
        end_time: true,
      },
    });

    for (const session of scheduledSessions) {
      // Calculate end time if not set (default: 1 hour duration)
      const endTime = session.end_time || new Date(session.scheduled_at.getTime() + 60 * 60 * 1000);
      
      let newStatus: SessionStatus | null = null;

      // After endTime → COMPLETED
      if (now >= endTime) {
        newStatus = SessionStatus.COMPLETED;
      }
      // Between startTime and endTime → Keep as SCHEDULED (this is the "ONGOING" state)
      // Note: Our enum doesn't have ONGOING, so SCHEDULED represents active sessions
      else if (now >= session.scheduled_at && now < endTime) {
        // Session is currently happening - keep as SCHEDULED
        // Just ensure end_time is set if not already set
        if (!session.end_time) {
          await prisma.sessions.update({
            where: { id: session.id },
            data: {
              end_time: endTime,
              updated_at: now,
            },
          });
        }
        continue; // Keep as SCHEDULED during the session
      }
      // Before startTime → Keep as SCHEDULED
      else {
        // Session hasn't started yet - ensure end_time is set if not already set
        if (!session.end_time) {
          await prisma.sessions.update({
            where: { id: session.id },
            data: {
              end_time: endTime,
              updated_at: now,
            },
          });
        }
        continue; // No status change needed
      }

      if (newStatus) {
        await prisma.sessions.update({
          where: { id: session.id },
          data: {
            status: newStatus,
            completed_at: newStatus === SessionStatus.COMPLETED ? endTime : null,
            end_time: endTime, // Ensure end_time is set
            updated_at: now,
          },
        });
        updatedCount++;
        console.log(`[SessionStatusCron] Updated session ${session.id} to ${newStatus}`);
      }
    }

    if (updatedCount > 0) {
      console.log(`[SessionStatusCron] Updated ${updatedCount} session statuses by time`);
    }
  } catch (error) {
    console.error("[SessionStatusCron] Error updating session statuses by time:", error);
  }
}

/**
 * Auto-complete expired sessions (legacy - kept for backward compatibility)
 * Marks sessions as COMPLETED when scheduled_at has passed
 * Runs every 5 minutes
 */
export async function autoCompleteExpiredSessions(): Promise<void> {
  // This function is now handled by updateSessionStatusesByTime
  // Keeping it for backward compatibility but delegating to the new function
  await updateSessionStatusesByTime();
}

/**
 * Update session statuses based on time rules
 * 
 * Transitions:
 * - APPROVED → SCHEDULED (UPCOMING) when: currentTime >= (startTime - 1 hour) AND currentTime < startTime AND sessionDate === today
 * - SCHEDULED (UPCOMING) → SCHEDULED (ONGOING) when: currentTime >= startTime
 */
export async function updateSessionStatuses(): Promise<void> {
  try {
    const now = getISTNow(); // Use IST time
    const todayStart = getISTTodayStart(); // IST today start
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const tomorrowEnd = new Date(todayStart.getTime() + 48 * 60 * 60 * 1000);

    // Get all sessions that might need status updates
    // Only check APPROVED and SCHEDULED sessions
    // Convert IST boundaries to UTC for DB query
    const sessions = await prisma.sessions.findMany({
      where: {
        status: {
          in: [SessionStatus.APPROVED, SessionStatus.SCHEDULED],
        },
        scheduled_at: {
          gte: yesterdayStart, // Yesterday in IST (already UTC Date object)
          lte: tomorrowEnd, // Tomorrow in IST (already UTC Date object)
        },
      },
      select: {
        id: true,
        scheduled_at: true,
        status: true,
      },
    });

    let updatedCount = 0;

    for (const session of sessions) {
      const newStatus = getSessionStatusTransition(
        session.scheduled_at,
        session.scheduled_at, // startTime is same as scheduled_at (courseStartDate)
        session.status
      );

      if (newStatus && newStatus !== session.status) {
        await prisma.sessions.update({
          where: { id: session.id },
          data: {
            status: newStatus,
            updated_at: now,
          },
        });
        updatedCount++;
        console.log(`[SessionStatusCron] Updated session ${session.id} from ${session.status} to ${newStatus}`);
      }
    }

    if (updatedCount > 0) {
      console.log(`[SessionStatusCron] Updated ${updatedCount} session statuses`);
    }
  } catch (error) {
    console.error("[SessionStatusCron] Error updating session statuses:", error);
  }
}

/**
 * Check for sessions starting soon (1 hour before) and create notifications
 * Uses reminder_sent flag to ensure each session only triggers one reminder
 * Runs every 10 minutes
 */
export async function checkSessionsStartingSoon(): Promise<void> {
  try {
    const now = getISTNow(); // Use IST time
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now in IST
    const oneHourAndTenMinutesFromNow = new Date(now.getTime() + 70 * 60 * 1000); // 1 hour 10 min from now in IST

    // Find sessions starting in ~1 hour (within 10 minute window)
    // Only sessions where reminder_sent = false
    const upcomingSessions = await prisma.sessions.findMany({
      where: {
        status: {
          in: [SessionStatus.APPROVED, SessionStatus.SCHEDULED, SessionStatus.PAID],
        },
        scheduled_at: {
          gte: oneHourFromNow,
          lte: oneHourAndTenMinutesFromNow,
        },
        reminder_sent: false, // Only sessions that haven't received reminder yet
      },
      include: {
        users_student: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    let reminderCount = 0;

    for (const session of upcomingSessions) {
      const sessionTime = new Date(session.scheduled_at);
      const timeString = sessionTime.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      // Create notification for mentor
      await notificationService.createNotification(
        session.mentor_id,
        "session_starting_soon",
        "Session Starting Soon",
        `Your session with ${session.users_student.name} starts in 1 hour`,
        session.id
      );

      // Mark reminder as sent
      await prisma.sessions.update({
        where: { id: session.id },
        data: {
          reminder_sent: true,
          updated_at: now,
        },
      });

      reminderCount++;
      console.log(`[SessionStatusCron] Sent reminder for session ${session.id} (starts at ${timeString})`);
    }

    if (reminderCount > 0) {
      console.log(`[SessionStatusCron] Sent ${reminderCount} session reminder(s)`);
    }
  } catch (error) {
    console.error("[SessionStatusCron] Error checking sessions starting soon:", error);
  }
}

/**
 * Clear yesterday's completed sessions from student view
 * Runs at 12:00 AM (midnight) every day
 * This implements the day-based session lifecycle
 */
export async function clearYesterdayCompletedSessions(): Promise<void> {
  try {
    const now = getISTNow();
    const todayStart = getISTTodayStart(); // IST today start
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayEnd = new Date(yesterdayStart.getTime() + 24 * 60 * 60 * 1000);

    console.log(`[SessionStatusCron] Clearing completed sessions from ${yesterdayStart.toISOString()} to ${yesterdayEnd.toISOString()}`);

    // Find all session_schedule items from yesterday that are COMPLETED
    const yesterdayCompletedSchedules = await prisma.session_schedule.findMany({
      where: {
        scheduled_date: {
          gte: yesterdayStart,
          lt: yesterdayEnd,
        },
        status: ScheduleStatus.COMPLETED,
      },
      select: {
        id: true,
        session_id: true,
      },
    });

    // Note: We don't actually delete these from the database
    // They remain in the database for audit/history purposes
    // The frontend API will filter them out by only showing today's sessions
    // This function is here for logging and potential future cleanup if needed

    console.log(`[SessionStatusCron] Found ${yesterdayCompletedSchedules.length} completed schedule items from yesterday (kept for history)`);
    
    // Optional: You could add a flag to mark these as "archived" if you want soft-delete
    // For now, we rely on date filtering in the API
    
  } catch (error) {
    console.error("[SessionStatusCron] Error clearing yesterday's completed sessions:", error);
  }
}

/**
 * Auto-complete session schedule items when end time is reached
 * Marks session_schedule items as COMPLETED when current time >= end time
 * End time = scheduled_date + scheduled_time + duration (default 1 hour)
 * Runs every 5 minutes
 */
export async function autoCompleteSessionScheduleItems(): Promise<void> {
  try {
    const now = getISTNow(); // Use IST time
    let updatedCount = 0;

    // Get all UPCOMING session_schedule items (not LOCKED, not already COMPLETED)
    const upcomingScheduleItems = await prisma.session_schedule.findMany({
      where: {
        status: ScheduleStatus.UPCOMING,
      },
      select: {
        id: true,
        scheduled_date: true,
        scheduled_time: true,
        status: true,
      },
    });

    for (const item of upcomingScheduleItems) {
      // Calculate start time: scheduled_date + scheduled_time in IST
      // scheduled_date is a Date object (UTC), we need to construct IST datetime
      const scheduledDate = new Date(item.scheduled_date);
      const [hours, minutes] = item.scheduled_time.split(':').map(Number);
      
      // Get IST date components from scheduled_date
      const istComponents = getISTTimeComponents(scheduledDate);
      const istDateComponents = getISTDateComponents(scheduledDate);
      
      // Create IST datetime for the scheduled time
      const scheduledDateTimeIST = createISTDate(
        istDateComponents.year,
        istDateComponents.month,
        istDateComponents.day,
        hours || 0,
        minutes || 0
      );

      // Calculate end time: start time + 1 hour (default duration)
      const endTimeIST = new Date(scheduledDateTimeIST.getTime() + 60 * 60 * 1000); // 1 hour

      // If current IST time >= end time, mark as COMPLETED
      if (now >= endTimeIST) {
        await prisma.session_schedule.update({
          where: { id: item.id },
          data: {
            status: ScheduleStatus.COMPLETED,
            updated_at: now,
          },
        });
        
        // Recalculate course status (may move course from ONGOING to COMPLETED)
        try {
          const { recalculateCourseStatusForScheduleItem } = await import("../services/courseStatus.service");
          await recalculateCourseStatusForScheduleItem(item.id);
        } catch (err) {
          console.error(`[SessionStatusCron] Error updating course status for schedule item ${item.id}:`, err);
          // Don't fail auto-completion if course status update fails
        }
        
        updatedCount++;
        console.log(`[SessionStatusCron] Auto-completed session schedule item ${item.id} (end time IST: ${endTimeIST.toISOString()})`);
      }
    }

    if (updatedCount > 0) {
      console.log(`[SessionStatusCron] Auto-completed ${updatedCount} session schedule item(s)`);
    }
  } catch (error) {
    console.error("[SessionStatusCron] Error auto-completing session schedule items:", error);
  }
}

/**
 * Check if it's midnight (12:00 AM IST) and run daily cleanup + unlock today's sessions
 * This should be called frequently (every minute) to catch midnight IST
 */
export async function checkAndRunMidnightCleanup(): Promise<void> {
  const now = getISTNow();
  const istComponents = getISTTimeComponents(now);
  
  // Check if it's between 12:00 AM and 12:01 AM IST
  if (istComponents.hour === 0 && istComponents.minute === 0) {
    console.log(`[SessionStatusCron] Detected 12:00 AM IST. Running daily cleanup and unlocking today's sessions at ${now.toISOString()}`);
    
    // 1. Clear yesterday's completed sessions (for logging/history)
    await clearYesterdayCompletedSessions();
    
    // 2. Unlock all sessions scheduled for today
    await unlockTodaySessions();
  }
}

/**
 * Start the cron jobs
 * - Auto-complete expired sessions: every 5 minutes
 * - Session reminders: every 10 minutes
 * - Update session statuses: every 5 minutes
 * - Midnight cleanup check: every minute
 */
export function startSessionStatusCron(): void {
  // Run immediately on startup
  autoCompleteExpiredSessions();
  updateSessionStatuses();
  checkSessionsStartingSoon();
  autoCompleteSessionScheduleItems();

  // Update session statuses by time (SCHEDULED → ONGOING → COMPLETED): every 5 minutes
  setInterval(() => {
    updateSessionStatusesByTime();
    updateSessionStatuses();
    autoCompleteSessionScheduleItems(); // Auto-complete schedule items when end time is reached
  }, 5 * 60 * 1000); // 5 minutes

  // Session reminders: every 10 minutes
  setInterval(() => {
    checkSessionsStartingSoon();
  }, 10 * 60 * 1000); // 10 minutes

  // Midnight cleanup check: every minute (to catch 12:00 AM)
  setInterval(() => {
    checkAndRunMidnightCleanup();
  }, 60 * 1000); // 1 minute

  console.log("[SessionStatusCron] Started:");
  console.log("  - Auto-complete expired sessions: every 5 minutes");
  console.log("  - Auto-complete session schedule items (when end time reached): every 5 minutes");
  console.log("  - Session reminders (1 hour before): every 10 minutes");
  console.log("  - Update session statuses: every 5 minutes");
  console.log("  - Midnight cleanup check: every minute");
}

