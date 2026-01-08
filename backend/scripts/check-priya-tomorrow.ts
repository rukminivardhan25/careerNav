import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkPriyaTomorrow() {
  try {
    // Find Priya user
    const priya = await prisma.user.findFirst({
      where: {
        name: {
          contains: "Priya",
          mode: "insensitive",
        },
        role: "MENTOR",
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!priya) {
      console.log("❌ Priya (mentor) not found");
      return;
    }

    console.log(`\n✅ Found: ${priya.name} (${priya.id})`);

    // Get tomorrow's date range (simulating 12:00 AM tomorrow)
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const tomorrowStart = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
    const tomorrowEnd = new Date(tomorrowStart.getTime() + 24 * 60 * 60 * 1000);

    console.log(`\n📅 Tomorrow's date range (at 12:00 AM):`);
    console.log(`   Start: ${tomorrowStart.toISOString()}`);
    console.log(`   End: ${tomorrowEnd.toISOString()}`);
    console.log(`   Date: ${tomorrowStart.toISOString().split("T")[0]}`);

    // Get all sessions for Priya
    const allSessions = await prisma.sessions.findMany({
      where: {
        mentor_id: priya.id,
        status: {
          notIn: ["CANCELLED", "REJECTED"],
        },
      },
      select: {
        id: true,
        skill_name: true,
        status: true,
        payments: {
          select: {
            status: true,
          },
        },
        users_student: {
          select: {
            name: true,
          },
        },
        session_schedule: {
          where: {
            scheduled_date: {
              gte: tomorrowStart,
              lt: tomorrowEnd,
            },
          },
          select: {
            id: true,
            scheduled_date: true,
            scheduled_time: true,
            status: true,
            topic_title: true,
          },
          orderBy: [
            { scheduled_date: "asc" },
            { scheduled_time: "asc" },
          ],
        },
      },
    });

    console.log(`\n📊 Total sessions for Priya: ${allSessions.length}`);

    // Filter sessions with successful payments
    const paidSessions = allSessions.filter((session) => {
      if (session.status === "PAID" || session.status === "SCHEDULED") {
        return true;
      }
      if (session.payments && session.payments.status === "SUCCESS") {
        return true;
      }
      return false;
    });

    console.log(`💰 Sessions with successful payment: ${paidSessions.length}`);

    // Check sessions with tomorrow's schedule items
    const sessionsWithTomorrowSchedule = paidSessions.filter(
      (s) => s.session_schedule && s.session_schedule.length > 0
    );

    console.log(`\n📅 Sessions with schedule items for TOMORROW: ${sessionsWithTomorrowSchedule.length}`);

    if (sessionsWithTomorrowSchedule.length === 0) {
      console.log("\n⚠️  No sessions have schedule items for tomorrow!");
      console.log("   → Ongoing: 0");
      console.log("   → Completed: 0");
      console.log("   → Payment Pending: 0");
    } else {
      // Simulate 12:00 AM tomorrow (start of day)
      const simulatedNow = new Date(tomorrowStart);
      
      console.log(`\n⏰ Simulating 12:00 AM tomorrow (${simulatedNow.toISOString()})`);

      const sessionsWithCompletion = sessionsWithTomorrowSchedule.map((session) => {
        const scheduleItemsWithCompletion = session.session_schedule.map((item) => {
          const scheduledDateTime = new Date(item.scheduled_date);
          const [hours, minutes] = item.scheduled_time.split(":").map(Number);
          scheduledDateTime.setHours(hours || 0, minutes || 0, 0, 0);
          const endTime = new Date(scheduledDateTime.getTime() + 60 * 60 * 1000);
          
          // At 12:00 AM, all sessions haven't started yet, so none are completed
          const isCompleted = simulatedNow >= endTime || item.status === "COMPLETED";
          
          return {
            ...item,
            scheduledDateTime,
            endTime,
            isCompleted,
          };
        });

        return {
          ...session,
          todayScheduleItems: scheduleItemsWithCompletion,
        };
      });

      // ONGOING: At least one schedule item not completed
      const ongoingSessions = sessionsWithCompletion.filter((session) => {
        const todayScheduleItems = session.todayScheduleItems || [];
        if (todayScheduleItems.length === 0) {
          return false;
        }
        return todayScheduleItems.some(item => !item.isCompleted);
      });

      // COMPLETED: All schedule items completed
      const completedSessions = sessionsWithCompletion.filter((session) => {
        const todayScheduleItems = session.todayScheduleItems || [];
        if (todayScheduleItems.length === 0) {
          return false;
        }
        return todayScheduleItems.every(item => item.isCompleted);
      });

      console.log(`\n📊 Results at 12:00 AM tomorrow:`);
      console.log(`   ✅ Ongoing: ${ongoingSessions.length}`);
      console.log(`   ✅ Completed: ${completedSessions.length}`);

      if (ongoingSessions.length > 0) {
        console.log(`\n🟦 ONGOING SESSIONS:`);
        ongoingSessions.forEach((session, idx) => {
          console.log(`\n   ${idx + 1}. ${session.skill_name}`);
          console.log(`      Student: ${session.users_student.name}`);
          session.todayScheduleItems.forEach((item) => {
            console.log(`      - ${item.scheduled_time} (End: ${item.endTime.toISOString()}) - ${item.isCompleted ? "Completed" : "Ongoing"}`);
          });
        });
      }

      if (completedSessions.length > 0) {
        console.log(`\n🟩 COMPLETED SESSIONS:`);
        completedSessions.forEach((session, idx) => {
          console.log(`\n   ${idx + 1}. ${session.skill_name}`);
          console.log(`      Student: ${session.users_student.name}`);
        });
      }
    }

    // Check what day of week tomorrow is
    const dayOfWeek = tomorrowStart.getDay();
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    console.log(`\n📆 Tomorrow is: ${dayNames[dayOfWeek]}`);
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      console.log(`   ⚠️  This is a WEEKEND`);
    }

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPriyaTomorrow();






