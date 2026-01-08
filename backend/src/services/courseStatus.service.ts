/**
 * Course Status Service
 * 
 * SINGLE SOURCE OF TRUTH for course status calculation
 * Updates course_enrollments.course_status based on:
 * - Payment status (SUCCESS required for ONGOING/COMPLETED)
 * - Schedule items completion status
 * 
 * Course is defined as: student_id + mentor_id + skill_name
 */

import { PrismaClient, PaymentStatus, CourseStatus } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Recalculate and update course status for a specific course
 * 
 * @param studentId - Student ID
 * @param mentorId - Mentor ID
 * @param skillName - Skill name
 * @returns Updated course status
 */
export async function recalculateCourseStatus(
  studentId: string,
  mentorId: string,
  skillName: string
): Promise<CourseStatus> {
  // Step 1: Get all sessions for this course (excluding CANCELLED/REJECTED)
  const sessions = await prisma.sessions.findMany({
    where: {
      student_id: studentId,
      mentor_id: mentorId,
      skill_name: skillName,
      status: {
        notIn: ["CANCELLED", "REJECTED"],
      },
    },
    select: {
      id: true,
      payments: {
        select: {
          status: true,
        },
      },
      session_schedule: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (sessions.length === 0) {
    // No sessions = PAYMENT_PENDING (or could be deleted, but keep as pending)
    await upsertCourseEnrollment(studentId, mentorId, skillName, CourseStatus.PAYMENT_PENDING);
    return CourseStatus.PAYMENT_PENDING;
  }

  // Step 2: Check payment status
  // Course needs at least ONE session with SUCCESS payment
  const hasSuccessfulPayment = sessions.some((session) => {
    const payment = session.payments;
    if (!payment) return false;
    
    // Handle Prisma returning payments as object, array, or null
    if (Array.isArray(payment)) {
      return payment.some((p) => p.status === PaymentStatus.SUCCESS);
    }
    return payment.status === PaymentStatus.SUCCESS;
  });

  if (!hasSuccessfulPayment) {
    // No successful payment = PAYMENT_PENDING
    await upsertCourseEnrollment(studentId, mentorId, skillName, CourseStatus.PAYMENT_PENDING);
    return CourseStatus.PAYMENT_PENDING;
  }

  // Step 3: Check schedule items completion
  const allScheduleItems = sessions.flatMap((s) => s.session_schedule || []);

  let allCompleted = false;

  if (allScheduleItems.length > 0) {
    // Check if ALL schedule items are COMPLETED (string comparison)
    allCompleted = allScheduleItems.every((item) => item.status === "COMPLETED");
  } else {
    // Fallback: if no schedule items, check session status
    const SessionStatus = await import("@prisma/client").then((m) => m.SessionStatus);
    allCompleted = sessions.every((s: any) => (s as any).status === SessionStatus.COMPLETED);
  }

  // Step 4: Determine final status
  const finalStatus = allCompleted ? CourseStatus.COMPLETED : CourseStatus.ONGOING;

  // Step 5: Update or create enrollment record
  await upsertCourseEnrollment(studentId, mentorId, skillName, finalStatus);

  return finalStatus;
}

/**
 * Upsert course enrollment with status
 * Creates enrollment if it doesn't exist, updates if it does
 */
async function upsertCourseEnrollment(
  studentId: string,
  mentorId: string,
  skillName: string,
  status: CourseStatus
): Promise<void> {
  await prisma.course_enrollments.upsert({
    where: {
      student_id_mentor_id_skill_name: {
        student_id: studentId,
        mentor_id: mentorId,
        skill_name: skillName,
      },
    },
    update: {
      course_status: status,
      last_status_calculated_at: new Date(),
    },
    create: {
      student_id: studentId,
      mentor_id: mentorId,
      skill_name: skillName,
      course_status: status,
      last_status_calculated_at: new Date(),
    },
  });
}

/**
 * Recalculate course status for all courses affected by a session
 * Called when a session's payment or schedule changes
 */
export async function recalculateCourseStatusForSession(sessionId: string): Promise<void> {
  const session = await prisma.sessions.findUnique({
    where: { id: sessionId },
    select: {
      student_id: true,
      mentor_id: true,
      skill_name: true,
    },
  });

  if (!session) {
    console.warn(`[CourseStatus] Session ${sessionId} not found`);
    return;
  }

  await recalculateCourseStatus(
    session.student_id,
    session.mentor_id,
    session.skill_name
  );
}

/**
 * Recalculate course status for all courses affected by a payment
 */
export async function recalculateCourseStatusForPayment(paymentId: string): Promise<void> {
  const payment = await prisma.payments.findUnique({
    where: { id: paymentId },
    select: {
      session_id: true,
    },
  });

  if (!payment) {
    console.warn(`[CourseStatus] Payment ${paymentId} not found`);
    return;
  }

  await recalculateCourseStatusForSession(payment.session_id);
}

/**
 * Recalculate course status for all courses affected by a schedule item
 */
export async function recalculateCourseStatusForScheduleItem(scheduleItemId: number): Promise<void> {
  const scheduleItem = await prisma.session_schedule.findUnique({
    where: { id: scheduleItemId },
    select: {
      session_id: true,
    },
  });

  if (!scheduleItem) {
    console.warn(`[CourseStatus] Schedule item ${scheduleItemId} not found`);
    return;
  }

  await recalculateCourseStatusForSession(scheduleItem.session_id);
}

/**
 * Batch recalculate all course enrollments
 * Useful for initial migration or fixing data inconsistencies
 */
export async function recalculateAllCourseStatuses(): Promise<void> {
  console.log("[CourseStatus] Starting batch recalculation of all course statuses...");

  // Get all unique course combinations from sessions
  const courses = await prisma.sessions.groupBy({
    by: ["student_id", "mentor_id", "skill_name"],
    where: {
      status: {
        notIn: ["CANCELLED", "REJECTED"],
      },
    },
  });

  console.log(`[CourseStatus] Found ${courses.length} unique courses to recalculate`);

  let processed = 0;
  for (const course of courses) {
    try {
      await recalculateCourseStatus(
        course.student_id,
        course.mentor_id,
        course.skill_name
      );
      processed++;
      if (processed % 10 === 0) {
        console.log(`[CourseStatus] Processed ${processed}/${courses.length} courses...`);
      }
    } catch (error) {
      console.error(
        `[CourseStatus] Error recalculating course ${course.student_id}/${course.mentor_id}/${course.skill_name}:`,
        error
      );
    }
  }

  console.log(`[CourseStatus] Batch recalculation complete. Processed ${processed}/${courses.length} courses`);
}








