import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkStudent1Discrepancy() {
  try {
    // Find Student 1
    const student1 = await prisma.user.findFirst({
      where: {
        name: {
          contains: "Student 1",
          mode: "insensitive",
        },
        role: "STUDENT",
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!student1) {
      console.log("❌ Student 1 not found");
      return;
    }

    console.log(`\n✅ Found: ${student1.name} (${student1.id})`);

    // Get today's date range
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    console.log(`\n📅 Today: ${todayStart.toISOString().split("T")[0]}`);

    // 1. Check Ongoing Learning (course_enrollments)
    const ongoingEnrollments = await prisma.course_enrollments.findMany({
      where: {
        student_id: student1.id,
        course_status: "ONGOING",
      },
      select: {
        id: true,
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

    console.log(`\n📚 ONGOING LEARNING (Courses): ${ongoingEnrollments.length}`);
    ongoingEnrollments.forEach((enrollment, idx) => {
      console.log(`   ${idx + 1}. ${enrollment.skill_name} with ${enrollment.users_mentor?.name || "Unknown"}`);
    });

    // 2. Check sessions for today
    const allSessions = await prisma.sessions.findMany({
      where: {
        student_id: student1.id,
        status: {
          notIn: ["CANCELLED", "REJECTED"],
        },
      },
      select: {
        id: true,
        skill_name: true,
        status: true,
        mentor_id: true,
        payments: {
          select: {
            status: true,
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
          },
        },
      },
    });

    // Filter to sessions with successful payments
    const paidSessions = allSessions.filter((session) => {
      if (session.status === "PAID" || session.status === "SCHEDULED") {
        return true;
      }
      if (session.payments && session.payments.status === "SUCCESS") {
        return true;
      }
      return false;
    });

    // Count ongoing and completed sessions for today
    let ongoingCount = 0;
    let completedCount = 0;

    for (const session of paidSessions) {
      const todayScheduleItems = session.session_schedule || [];
      
      if (todayScheduleItems.length === 0) {
        continue;
      }

      // Check if at least one is not completed
      const hasOngoing = todayScheduleItems.some((item) => {
        const scheduledDateTime = new Date(item.scheduled_date);
        const [hours, minutes] = item.scheduled_time.split(":").map(Number);
        scheduledDateTime.setHours(hours || 0, minutes || 0, 0, 0);
        const endTime = new Date(scheduledDateTime.getTime() + 60 * 60 * 1000);
        const isCompleted = now >= endTime || item.status === "COMPLETED";
        return !isCompleted;
      });

      if (hasOngoing) {
        ongoingCount++;
      } else {
        // All completed
        completedCount++;
      }
    }

    console.log(`\n📊 TODAY'S SESSIONS:`);
    console.log(`   Ongoing: ${ongoingCount}`);
    console.log(`   Completed: ${completedCount}`);
    console.log(`   Total: ${ongoingCount + completedCount}`);

    console.log(`\n🔍 DISCREPANCY ANALYSIS:`);
    console.log(`   Ongoing Learning (Courses): ${ongoingEnrollments.length}`);
    console.log(`   Total Sessions Today: ${ongoingCount + completedCount}`);
    console.log(`   Difference: ${ongoingEnrollments.length - (ongoingCount + completedCount)}`);

    // Check if some courses don't have sessions today
    console.log(`\n📋 Courses without sessions today:`);
    for (const enrollment of ongoingEnrollments) {
      const hasSessionToday = paidSessions.some((session) => {
        return (
          session.mentor_id === enrollment.mentor_id &&
          session.skill_name === enrollment.skill_name &&
          session.session_schedule &&
          session.session_schedule.length > 0
        );
      });

      if (!hasSessionToday) {
        console.log(`   - ${enrollment.skill_name} with ${enrollment.users_mentor?.name || "Unknown"}`);
      }
    }

    // Check if some courses have multiple sessions
    console.log(`\n📋 Courses with multiple sessions today:`);
    for (const enrollment of ongoingEnrollments) {
      const sessionsForCourse = paidSessions.filter((session) => {
        return (
          session.mentor_id === enrollment.mentor_id &&
          session.skill_name === enrollment.skill_name &&
          session.session_schedule &&
          session.session_schedule.length > 0
        );
      });

      if (sessionsForCourse.length > 1) {
        console.log(`   - ${enrollment.skill_name} with ${enrollment.users_mentor?.name || "Unknown"}: ${sessionsForCourse.length} sessions`);
      }
    }

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStudent1Discrepancy();





