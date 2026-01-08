/**
 * Shared helper functions for course-level logic
 * SINGLE SOURCE OF TRUTH for determining ongoing courses
 * 
 * This logic is used by:
 * - /api/students/dashboard/summary (Ongoing Learning card)
 * - /api/resumes/:resumeId/eligible-mentors (Share Resume modal)
 */

import { SessionStatus, PaymentStatus } from "@prisma/client";

/**
 * Type definitions matching the Prisma query result
 */
export interface SessionWithRelations {
  id: string;
  mentor_id: string;
  skill_name: string;
  status: SessionStatus;
  scheduled_at: Date | null;
  end_time: Date | null;
  // Prisma may return payments as object, array, or null depending on context
  payments?: {
    status: string;
  } | Array<{
    status: string;
  }> | null;
  users_mentor?: {
    id: string;
    name: string;
    email?: string;
  } | null;
  session_schedule?: Array<{
    id: number;
    status: string;
    scheduled_date: Date | null;
  }>;
}

export interface Course {
  mentorId: string;
  mentorName: string;
  mentorEmail?: string;
  skillName: string;
  sessions: Array<{
    id: string;
    status: SessionStatus;
    hasPayment: boolean;
    scheduleItems: Array<{
      id: number;
      status: string;
    }>;
  }>;
}

export interface OngoingCourse {
  mentorId: string;
  mentorName: string;
  mentorEmail?: string;
  skillName: string;
}

/**
 * Get ongoing courses from sessions
 * EXACT COPY of logic from /api/students/dashboard/summary
 * 
 * A course is ONGOING if:
 * - paymentStatus = SUCCESS
 * - AND NOT (all schedule items are COMPLETED)
 * 
 * @param sessions - Array of sessions with relations (from Prisma query)
 * @returns Map of ongoing courses keyed by courseKey (mentor_id + skill_name)
 */
export function getOngoingCoursesFromSessions(
  sessions: SessionWithRelations[],
  debugContext?: string
): Map<string, OngoingCourse> {
  // Step 1: Group sessions by course (mentor_id + skill_name)
  const courseMap = new Map<string, Course>();

  for (const session of sessions) {
    const courseKey = `${session.mentor_id}_${session.skill_name}`;
    
    if (!courseMap.has(courseKey)) {
      courseMap.set(courseKey, {
        mentorId: session.mentor_id,
        mentorName: session.users_mentor?.name || "Unknown Mentor",
        mentorEmail: session.users_mentor?.email,
        skillName: session.skill_name,
        sessions: [],
      });
    }

    const course = courseMap.get(courseKey)!;
    
    // PRISMA-SAFE PAYMENT CHECK: Handle object, array, or null
    // Prisma may return payments as object, array, or null depending on context
    const hasSuccessfulPayment = Array.isArray(session.payments)
      ? session.payments.some(p => p.status === PaymentStatus.SUCCESS)
      : session.payments?.status === PaymentStatus.SUCCESS || false;
    
    course.sessions.push({
      id: session.id,
      status: session.status,
      hasPayment: hasSuccessfulPayment,
      scheduleItems: session.session_schedule || [],
    });
  }

  // STEP 2: LOG PAYMENT CHECK RESULT
  if (debugContext) {
    console.log(`==== PAYMENT CHECK (${debugContext}) ====`);
    for (const [courseKey, course] of courseMap.entries()) {
      const hasPayment = course.sessions.some(s => s.hasPayment);
      const paymentDetails = course.sessions.map(s => {
        const originalSession = sessions.find(ss => ss.id === s.id);
        return {
          sessionId: s.id,
          paymentStatus: s.hasPayment,
          rawPayment: originalSession?.payments,
          paymentStatusRaw: originalSession?.payments && !Array.isArray(originalSession.payments) ? originalSession.payments.status : undefined,
          expectedStatus: PaymentStatus.SUCCESS
        };
      });
      console.log({
        courseKey,
        mentorId: course.mentorId,
        skillName: course.skillName,
        hasPayment,
        paymentDetails,
        sessionCount: course.sessions.length
      });
    }
  }

  // Step 3: Determine ongoing courses (EXACT same logic as dashboard summary)
  const ongoingCoursesMap = new Map<string, OngoingCourse>();

  for (const [courseKey, course] of courseMap.entries()) {
    // Check payment status: if payment is NOT PAID, exclude from top cards
    // EXACT same check as dashboard summary (line 108 in students.ts)
    const hasPayment = course.sessions.some(s => s.hasPayment);
    if (!hasPayment) {
      // Payment Pending - do NOT show
      if (debugContext) {
        console.log(`[${debugContext}] Skipping course ${courseKey} - NO PAYMENT`);
      }
      continue;
    }

    // Get all schedule items across all sessions in this course
    // EXACT same logic as dashboard summary (line 115 in students.ts)
    const allScheduleItems = course.sessions.flatMap(s => s.scheduleItems);
    
    // Check if ALL schedule items are COMPLETED
    // EXACT same logic as dashboard summary (lines 121-129 in students.ts)
    let allCompleted = false;
    
    if (allScheduleItems.length > 0) {
      // Check if all schedule items are COMPLETED
      // This includes previously locked sessions that have been unlocked and completed
      // Use string comparison "COMPLETED" (same as dashboard summary)
      allCompleted = allScheduleItems.every(item => item.status === "COMPLETED");
    } else {
      // Fallback: if no schedule items exist, check session status
      // A course is completed only when ALL sessions are COMPLETED
      allCompleted = course.sessions.every(s => s.status === SessionStatus.COMPLETED);
    }
    
    // STEP 3: LOG COMPLETION DECISION
    if (debugContext) {
      console.log(`==== COMPLETION CHECK (${debugContext}) ====`);
      console.log({
        courseKey,
        mentorId: course.mentorId,
        skillName: course.skillName,
        scheduleItemCount: allScheduleItems.length,
        scheduleItemStatuses: allScheduleItems.map(i => i.status),
        sessionStatuses: course.sessions.map(s => s.status),
        allCompleted,
        willBeOngoing: !allCompleted
      });
    }
    
    // If any schedule item is not COMPLETED, course is still ONGOING
    // Same logic as dashboard summary
    if (!allCompleted) {
      // Course is ONGOING
      ongoingCoursesMap.set(courseKey, {
        mentorId: course.mentorId,
        mentorName: course.mentorName,
        mentorEmail: course.mentorEmail,
        skillName: course.skillName,
      });
    } else {
      if (debugContext) {
        console.log(`[${debugContext}] Skipping course ${courseKey} - ALL COMPLETED`);
      }
    }
  }

  // STEP 4: LOG COURSE MAP SIZE
  if (debugContext) {
    console.log(`==== COURSE MAP (${debugContext}) ====`);
    console.log("Total courses grouped:", courseMap.size);
    console.log("Ongoing courses:", ongoingCoursesMap.size);
    console.log("Courses with payment:", Array.from(courseMap.values()).filter(c => 
      c.sessions.some(s => s.hasPayment)
    ).length);
  }

  return ongoingCoursesMap;
}

/**
 * Get unique mentors from ongoing courses
 * Deduplicates by mentor_id (a mentor can have multiple ongoing courses)
 * 
 * @param ongoingCourses - Map of ongoing courses
 * @returns Map of unique mentors keyed by mentorId
 */
export function getUniqueMentorsFromOngoingCourses(
  ongoingCourses: Map<string, OngoingCourse>
): Map<string, { mentorId: string; mentorName: string; mentorEmail?: string }> {
  const mentorsMap = new Map<string, { mentorId: string; mentorName: string; mentorEmail?: string }>();

  for (const course of ongoingCourses.values()) {
    if (!mentorsMap.has(course.mentorId)) {
      mentorsMap.set(course.mentorId, {
        mentorId: course.mentorId,
        mentorName: course.mentorName,
        mentorEmail: course.mentorEmail,
      });
    }
  }

  return mentorsMap;
}

