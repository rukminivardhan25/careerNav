/**
 * Diagnostic script to check why eligible mentors API returns empty
 * Run: npx tsx scripts/diagnose-eligible-mentors.ts <studentId> <resumeId>
 */

import { PrismaClient, SessionStatus, PaymentStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function diagnose(studentId: string, resumeId: string) {
  console.log("=== DIAGNOSTIC: Eligible Mentors ===\n");
  console.log("Student ID:", studentId);
  console.log("Resume ID:", resumeId);
  console.log("\n");

  // Step 1: Check sessions
  console.log("=== STEP 1: Fetching Sessions ===");
  const sessions = await prisma.sessions.findMany({
    where: {
      student_id: studentId,
      status: {
        notIn: [SessionStatus.CANCELLED, SessionStatus.REJECTED],
      },
    },
    select: {
      id: true,
      mentor_id: true,
      skill_name: true,
      status: true,
      payments: {
        select: {
          status: true,
        },
      },
      users_mentor: {
        select: {
          id: true,
          name: true,
          email: true,
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

  console.log(`Total sessions found: ${sessions.length}\n`);

  if (sessions.length === 0) {
    console.log("❌ NO SESSIONS FOUND - This is why no mentors appear");
    return;
  }

  // Step 2: Log raw session data
  console.log("=== STEP 2: Raw Session Data ===");
  sessions.forEach((s, i) => {
    console.log(`\nSession ${i + 1}:`);
    console.log("  ID:", s.id);
    console.log("  Mentor ID:", s.mentor_id);
    console.log("  Skill Name:", s.skill_name);
    console.log("  Session Status:", s.status);
    console.log("  Payment:", s.payments ? {
      status: s.payments.status,
      isSuccess: s.payments.status === PaymentStatus.SUCCESS
    } : "NULL (NO PAYMENT)");
    console.log("  Schedule Items:", s.session_schedule.length);
    if (s.session_schedule.length > 0) {
      console.log("  Schedule Statuses:", s.session_schedule.map(i => i.status));
    }
    console.log("  Mentor:", s.users_mentor?.name || "NOT FOUND");
  });

  // Step 3: Group by course
  console.log("\n=== STEP 3: Grouping by Course ===");
  const courseMap = new Map<string, any>();

  for (const session of sessions) {
    const courseKey = `${session.mentor_id}_${session.skill_name}`;
    
    if (!courseMap.has(courseKey)) {
      courseMap.set(courseKey, {
        mentorId: session.mentor_id,
        mentorName: session.users_mentor?.name || "Unknown",
        skillName: session.skill_name,
        sessions: [],
      });
    }

    const course = courseMap.get(courseKey)!;
    const hasPayment = session.payments?.status === PaymentStatus.SUCCESS || false;
    course.sessions.push({
      id: session.id,
      status: session.status,
      hasPayment,
      scheduleItems: session.session_schedule || [],
    });
  }

  console.log(`Total courses grouped: ${courseMap.size}\n`);

  // Step 4: Check payment status
  console.log("=== STEP 4: Payment Check ===");
  for (const [courseKey, course] of courseMap.entries()) {
    const hasPayment = course.sessions.some((s: any) => s.hasPayment);
    console.log(`\nCourse: ${courseKey}`);
    console.log("  Mentor:", course.mentorName);
    console.log("  Skill:", course.skillName);
    console.log("  Has Payment (SUCCESS):", hasPayment);
    console.log("  Session Payment Details:", course.sessions.map((s: any) => ({
      sessionId: s.id,
      hasPayment: s.hasPayment,
      paymentStatus: sessions.find(ss => ss.id === s.id)?.payments?.status || "NULL"
    })));

    if (!hasPayment) {
      console.log("  ❌ SKIPPED - No payment");
    }
  }

  // Step 5: Check completion status
  console.log("\n=== STEP 5: Completion Check ===");
  const ongoingCourses: any[] = [];

  for (const [courseKey, course] of courseMap.entries()) {
    const hasPayment = course.sessions.some((s: any) => s.hasPayment);
    if (!hasPayment) continue;

    const allScheduleItems = course.sessions.flatMap((s: any) => s.scheduleItems);
    
    let allCompleted = false;
    if (allScheduleItems.length > 0) {
      allCompleted = allScheduleItems.every((item: any) => item.status === "COMPLETED");
    } else {
      allCompleted = course.sessions.every((s: any) => s.status === SessionStatus.COMPLETED);
    }

    console.log(`\nCourse: ${courseKey}`);
    console.log("  Schedule Items:", allScheduleItems.length);
    console.log("  Schedule Statuses:", allScheduleItems.map((i: any) => i.status));
    console.log("  All Completed:", allCompleted);
    console.log("  Will be Ongoing:", !allCompleted);

    if (!allCompleted) {
      ongoingCourses.push(course);
      console.log("  ✅ ONGOING");
    } else {
      console.log("  ❌ SKIPPED - All completed");
    }
  }

  // Step 6: Check already shared
  console.log("\n=== STEP 6: Already Shared Check ===");
  const existingReviews = await prisma.resume_review_requests.findMany({
    where: {
      resume_id: parseInt(resumeId),
      student_id: studentId,
    },
    select: {
      mentor_id: true,
    },
  });

  const reviewedMentorIds = new Set(existingReviews.map(r => r.mentorId));
  console.log(`Already shared with ${reviewedMentorIds.size} mentors:`, Array.from(reviewedMentorIds));

  // Step 7: Final eligible mentors
  console.log("\n=== STEP 7: Final Eligible Mentors ===");
  const uniqueMentors = new Map<string, any>();
  for (const course of ongoingCourses) {
    if (!uniqueMentors.has(course.mentorId)) {
      uniqueMentors.set(course.mentorId, {
        mentorId: course.mentorId,
        mentorName: course.mentorName,
      });
    }
  }

  const eligibleMentors = Array.from(uniqueMentors.values())
    .filter(m => !reviewedMentorIds.has(m.mentorId));

  console.log(`Ongoing courses: ${ongoingCourses.length}`);
  console.log(`Unique mentors: ${uniqueMentors.size}`);
  console.log(`Eligible mentors (after exclusion): ${eligibleMentors.length}`);

  if (eligibleMentors.length > 0) {
    console.log("\n✅ Eligible Mentors:");
    eligibleMentors.forEach(m => {
      console.log(`  - ${m.mentorName} (${m.mentorId})`);
    });
  } else {
    console.log("\n❌ NO ELIGIBLE MENTORS");
    console.log("\nPossible reasons:");
    if (sessions.length === 0) {
      console.log("  - No sessions found");
    } else if (Array.from(courseMap.values()).every(c => !c.sessions.some((s: any) => s.hasPayment))) {
      console.log("  - No sessions with payment status = SUCCESS");
    } else if (ongoingCourses.length === 0) {
      console.log("  - All courses are completed (all schedule items = COMPLETED)");
    } else if (eligibleMentors.length === 0 && reviewedMentorIds.size > 0) {
      console.log("  - All ongoing mentors already shared with this resume");
    }
  }

  await prisma.$disconnect();
}

// Get command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Usage: npx tsx scripts/diagnose-eligible-mentors.ts <studentId> <resumeId>");
  process.exit(1);
}

diagnose(args[0], args[1]).catch(console.error);
















