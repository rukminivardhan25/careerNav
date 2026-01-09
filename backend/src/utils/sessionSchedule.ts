/**
 * Session Schedule Utility
 * Handles unlocking sessions based on scheduled date/time
 */
import { PrismaClient, ScheduleStatus, SessionStatus } from "@prisma/client";
import { getISTNow, getISTTodayStart, getISTTodayEnd, createISTDateTimeFromSchedule } from "./istTime";

const prisma = new PrismaClient();

/**
 * Update session schedule status based on current date/time
 * 
 * Rules:
 * - All sessions scheduled for TODAY unlock at 1:25 AM IST and become UPCOMING
 * - Sessions are marked COMPLETED when end time (start time + 1 hour) has passed
 * - Sessions scheduled for future dates remain LOCKED
 * - COMPLETED sessions are never changed
 * - Multiple sessions can be UPCOMING if they're all scheduled for today
 * - Sessions are sorted by scheduled_date + scheduled_time ASC
 * 
 * @param sessionId - The session ID to update
 * @returns Updated schedule list
 */
export async function updateSessionScheduleStatus(sessionId: string): Promise<any[]> {
  try {
    // Fetch all session_schedule rows for this session
    const scheduleItems = await prisma.session_schedule.findMany({
      where: { session_id: sessionId },
      orderBy: [
        { scheduled_date: "asc" },
        { scheduled_time: "asc" },
      ],
    });

    if (scheduleItems.length === 0) {
      return [];
    }

    const now = getISTNow(); // Use IST time

    // Get today's date at midnight (start of day) in IST for comparison
    const todayStart = getISTTodayStart();

    // Update each schedule item
    for (const item of scheduleItems) {
      // Skip COMPLETED items - never change them
      if (item.status === ScheduleStatus.COMPLETED) {
        continue;
      }

      // Get IST date components from scheduled_date for comparison
      const scheduledDateIST = getISTTodayStart(); // We'll compare dates in IST
      const scheduledDateOnly = new Date(item.scheduled_date);
      // Normalize to midnight for date comparison
      scheduledDateOnly.setUTCHours(0, 0, 0, 0);
      const todayStartNormalized = new Date(todayStart);
      todayStartNormalized.setUTCHours(0, 0, 0, 0);

      // Create IST datetime from scheduled_date and scheduled_time
      const scheduledDateTimeIST = createISTDateTimeFromSchedule(item.scheduled_date, item.scheduled_time);

      // Calculate end time (default duration: 1 hour)
      const endTimeIST = new Date(scheduledDateTimeIST.getTime() + 60 * 60 * 1000);

      // Check if end time has passed → mark as COMPLETED
      if (now >= endTimeIST) {
        await prisma.session_schedule.update({
          where: { id: item.id },
          data: { status: ScheduleStatus.COMPLETED },
        });
      }
      // Check if session is scheduled for today (at 1:25 AM IST, all today's sessions unlock)
      else if (scheduledDateOnly.getTime() === todayStartNormalized.getTime()) {
        // Session is scheduled for today → mark as UPCOMING (unlocked at midnight)
        await prisma.session_schedule.update({
          where: { id: item.id },
          data: { status: ScheduleStatus.UPCOMING },
        });
      }
      // Session is in the future → mark as LOCKED
      else if (scheduledDateOnly.getTime() > todayStartNormalized.getTime()) {
        await prisma.session_schedule.update({
          where: { id: item.id },
          data: { status: ScheduleStatus.LOCKED },
        });
      }
      // Session is in the past but end time hasn't passed (shouldn't happen, but handle it)
      else {
        await prisma.session_schedule.update({
          where: { id: item.id },
          data: { status: ScheduleStatus.LOCKED },
        });
      }
    }

    // Fetch updated schedule
    const updatedSchedule = await prisma.session_schedule.findMany({
      where: { session_id: sessionId },
      orderBy: [
        { scheduled_date: "asc" },
        { scheduled_time: "asc" },
      ],
      select: {
        id: true,
        week_number: true,
        session_number: true,
        topic_title: true,
        scheduled_date: true,
        scheduled_time: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    });

    return updatedSchedule;
  } catch (error) {
    console.error("[SessionSchedule] Error updating schedule status:", error);
    throw error;
  }
}

/**
 * Evaluate mentorship session status based on all scheduled sub-sessions
 * 
 * Rules:
 * - Session is COMPLETED ONLY if ALL session_schedule rows are COMPLETED
 * - Session is SCHEDULED (ONGOING) if at least one session_schedule row is NOT COMPLETED
 * - Never mark session as COMPLETED based on date/time
 * - Only mentor actions affect completion
 * 
 * @param sessionId - The session ID to evaluate
 * @returns Updated session status
 */
export async function evaluateMentorshipSessionStatus(sessionId: string): Promise<{ status: SessionStatus; completedAt: Date | null }> {
  try {
    // Fetch all session_schedule rows for this session
    const scheduleItems = await prisma.session_schedule.findMany({
      where: { session_id: sessionId },
      select: { id: true, status: true },
    });

    // If no schedule items exist, keep session as SCHEDULED (ONGOING)
    if (scheduleItems.length === 0) {
      const session = await prisma.sessions.findUnique({
        where: { id: sessionId },
        select: { status: true, completed_at: true },
      });

      // Only update if status is COMPLETED (shouldn't be if no schedule items)
      if (session && session.status === SessionStatus.COMPLETED) {
        await prisma.sessions.update({
          where: { id: sessionId },
          data: {
            status: SessionStatus.SCHEDULED,
            completed_at: null,
            updated_at: getISTNow(),
          },
        });
        return { status: SessionStatus.SCHEDULED, completedAt: null };
      }
      return { status: session?.status || SessionStatus.SCHEDULED, completedAt: session?.completed_at || null };
    }

    // Check if ALL schedule items are COMPLETED
    const allCompleted = scheduleItems.every((item) => item.status === ScheduleStatus.COMPLETED);

    // Get current session status
    const session = await prisma.sessions.findUnique({
      where: { id: sessionId },
      select: { status: true, completed_at: true },
    });

    if (!session) {
      throw new Error("Session not found");
    }

    if (allCompleted) {
      // ALL scheduled sessions are completed → mark mentorship session as COMPLETED
      if (session.status !== SessionStatus.COMPLETED) {
        await prisma.sessions.update({
          where: { id: sessionId },
          data: {
            status: SessionStatus.COMPLETED,
            completed_at: new Date(),
            updated_at: getISTNow(),
          },
        });
        return { status: SessionStatus.COMPLETED, completedAt: new Date() };
      }
      return { status: SessionStatus.COMPLETED, completedAt: session.completed_at || new Date() };
    } else {
      // At least one scheduled session is NOT completed → ensure mentorship session is SCHEDULED (ONGOING)
      if (session.status === SessionStatus.COMPLETED) {
        await prisma.sessions.update({
          where: { id: sessionId },
          data: {
            status: SessionStatus.SCHEDULED,
            completed_at: null,
            updated_at: getISTNow(),
          },
        });
        return { status: SessionStatus.SCHEDULED, completedAt: null };
      }
      // Ensure completed_at is null if status is not COMPLETED
      if (session.completed_at) {
        await prisma.sessions.update({
          where: { id: sessionId },
          data: {
            completed_at: null,
            updated_at: getISTNow(),
          },
        });
      }
      return { status: session.status, completedAt: null };
    }
  } catch (error) {
    console.error("[SessionSchedule] Error evaluating mentorship session status:", error);
    throw error;
  }
}

/**
 * Unlock all sessions scheduled for today at 1:25 AM IST
 * This function should be called by the cron job at 1:25 AM IST
 * to unlock all today's sessions and make them UPCOMING
 */
export async function unlockTodaySessions(): Promise<void> {
  try {
    const todayStart = getISTTodayStart();
    const todayEnd = getISTTodayEnd();
    
    console.log(`[SessionSchedule] Unlocking sessions for today (IST): ${todayStart.toISOString()} to ${todayEnd.toISOString()}`);
    
    // Find all LOCKED session_schedule items scheduled for today
    const todayLockedSessions = await prisma.session_schedule.findMany({
      where: {
        scheduled_date: {
          gte: todayStart,
          lt: todayEnd,
        },
        status: ScheduleStatus.LOCKED,
      },
      select: {
        id: true,
        session_id: true,
      },
    });
    
    // Unlock all today's sessions
    if (todayLockedSessions.length > 0) {
      await prisma.session_schedule.updateMany({
        where: {
          id: {
            in: todayLockedSessions.map(s => s.id),
          },
        },
        data: {
          status: ScheduleStatus.UPCOMING,
        },
      });
      
      console.log(`[SessionSchedule] Unlocked ${todayLockedSessions.length} session(s) scheduled for today`);
      
      // Update session status for each affected session
      const uniqueSessionIds = [...new Set(todayLockedSessions.map(s => s.session_id))];
      for (const sessionId of uniqueSessionIds) {
        try {
          await evaluateMentorshipSessionStatus(sessionId);
        } catch (error) {
          console.error(`[SessionSchedule] Error evaluating session ${sessionId} status:`, error);
        }
      }
    } else {
      console.log(`[SessionSchedule] No locked sessions found for today`);
    }
  } catch (error) {
    console.error("[SessionSchedule] Error unlocking today's sessions:", error);
    throw error;
  }
}

