import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkPriyaSessions() {
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
        email: true,
        role: true,
      },
    });

    if (!priya) {
      console.log("❌ Priya (mentor) not found in database");
      return;
    }

    console.log("\n✅ Found Priya:");
    console.log(`   ID: ${priya.id}`);
    console.log(`   Name: ${priya.name}`);
    console.log(`   Email: ${priya.email}`);
    console.log(`   Role: ${priya.role}`);

    // Get today's date range
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    console.log(`\n📅 Today's date range:`);
    console.log(`   Start: ${todayStart.toISOString()}`);
    console.log(`   End: ${todayEnd.toISOString()}`);
    console.log(`   Current time: ${now.toISOString()}`);

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
        scheduled_at: true,
        payments: {
          select: {
            status: true,
          },
        },
        users_student: {
          select: {
            name: true,
            email: true,
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
          },
          orderBy: [
            { scheduled_date: "asc" },
            { scheduled_time: "asc" },
          ],
        },
      },
    });

    console.log(`\n📊 Total sessions for Priya: ${allSessions.length}`);

    // Check sessions with today's schedule items
    const sessionsWithTodaySchedule = allSessions.filter(
      (s) => s.session_schedule && s.session_schedule.length > 0
    );

    console.log(`\n📅 Sessions with schedule items for TODAY: ${sessionsWithTodaySchedule.length}`);

    if (sessionsWithTodaySchedule.length === 0) {
      console.log("\n⚠️  No sessions have schedule items for today!");
      
      // Check if there are any schedule items at all
      const allScheduleItems = await prisma.session_schedule.findMany({
        where: {
          sessions: {
            mentor_id: priya.id,
          },
        },
        select: {
          id: true,
          scheduled_date: true,
          scheduled_time: true,
          status: true,
          sessions: {
            select: {
              id: true,
              skill_name: true,
            },
          },
        },
        orderBy: [
          { scheduled_date: "desc" },
          { scheduled_time: "desc" },
        ],
        take: 10,
      });

      console.log(`\n📋 Recent schedule items (last 10):`);
      allScheduleItems.forEach((item) => {
        console.log(`   - ${item.scheduled_date.toISOString().split("T")[0]} ${item.scheduled_time} (${item.status}) - Session: ${item.sessions.skill_name}`);
      });
    } else {
      sessionsWithTodaySchedule.forEach((session, idx) => {
        console.log(`\n📝 Session ${idx + 1}:`);
        console.log(`   ID: ${session.id}`);
        console.log(`   Skill: ${session.skill_name}`);
        console.log(`   Status: ${session.status}`);
        console.log(`   Payment Status: ${session.payments?.status || "No payment"}`);
        console.log(`   Student: ${session.users_student.name} (${session.users_student.email})`);
        console.log(`   Today's Schedule Items: ${session.session_schedule.length}`);

        session.session_schedule.forEach((item, itemIdx) => {
          const scheduledDateTime = new Date(item.scheduled_date);
          const [hours, minutes] = item.scheduled_time.split(":").map(Number);
          scheduledDateTime.setHours(hours || 0, minutes || 0, 0, 0);
          const endTime = new Date(scheduledDateTime.getTime() + 60 * 60 * 1000);

          const isCompleted = now >= endTime || item.status === "COMPLETED";

          console.log(`\n   Schedule Item ${itemIdx + 1}:`);
          console.log(`      Date: ${item.scheduled_date.toISOString().split("T")[0]}`);
          console.log(`      Time: ${item.scheduled_time}`);
          console.log(`      Status: ${item.status}`);
          console.log(`      Start: ${scheduledDateTime.toISOString()}`);
          console.log(`      End: ${endTime.toISOString()}`);
          console.log(`      Is Completed: ${isCompleted} (now: ${now.toISOString()})`);
          console.log(`      Topic: ${item.topic_title || "N/A"}`);
        });

        // Check payment status
        const hasPayment =
          session.status === "PAID" ||
          session.status === "SCHEDULED" ||
          (session.status === "APPROVED" && session.payments?.status === "SUCCESS");

        console.log(`\n   ✅ Has valid payment: ${hasPayment}`);
      });
    }

    // Check payment pending sessions
    const paymentPendingSessions = allSessions.filter((session) => {
      return (
        session.status === "APPROVED" &&
        (!session.payments || session.payments.status !== "SUCCESS")
      );
    });

    console.log(`\n💰 Payment Pending Sessions: ${paymentPendingSessions.length}`);
  } catch (error) {
    console.error("❌ Error checking Priya's sessions:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPriyaSessions();








