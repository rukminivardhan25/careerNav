import { PrismaClient } from "@prisma/client";
import { paymentService } from "../src/services/payment.service";

const prisma = new PrismaClient();

async function fixSessionSchedules() {
  try {
    console.log("=".repeat(60));
    console.log("Fixing Session Schedules");
    console.log("=".repeat(60));

    // Get all SCHEDULED sessions with plans
    const sessions = await prisma.sessions.findMany({
      where: {
        status: {
          in: ["SCHEDULED", "PAID"],
        },
        plan_id: {
          not: null,
        },
      },
      include: {
        plans: true,
        session_schedule: {
          orderBy: [
            { scheduled_date: "asc" },
            { scheduled_time: "asc" },
          ],
          take: 1, // Just check first one
        },
      },
    });

    console.log(`\nFound ${sessions.length} sessions to check\n`);

    let fixedCount = 0;

    for (const session of sessions) {
      if (!session.plan_id || !session.plans) {
        console.log(`⚠️  Session ${session.id} has no plan, skipping...`);
        continue;
      }

      const courseStartDate = session.scheduled_at;
      const firstScheduleItem = session.session_schedule[0];

      if (!firstScheduleItem) {
        console.log(`⚠️  Session ${session.id} has no schedule items, skipping...`);
        continue;
      }

      // Check if first session date matches course start date (within same day)
      const courseStartDay = new Date(courseStartDate);
      courseStartDay.setHours(0, 0, 0, 0);

      const firstSessionDay = new Date(firstScheduleItem.scheduled_date);
      firstSessionDay.setHours(0, 0, 0, 0);

      // If dates don't match, regenerate schedule
      if (firstSessionDay.getTime() !== courseStartDay.getTime()) {
        console.log(`\n🔧 Fixing session ${session.id}:`);
        console.log(`   Course Start: ${courseStartDate.toISOString()}`);
        console.log(`   First Session: ${firstScheduleItem.scheduled_date.toISOString()}`);
        console.log(`   Dates don't match - regenerating schedule...`);

        // Delete existing schedule
        await prisma.session_schedule.deleteMany({
          where: {
            session_id: session.id,
          },
        });

        // Regenerate schedule with correct start date
        await paymentService.generateSessionSchedule(
          session.id,
          session.plan_id,
          courseStartDate
        );

        fixedCount++;
        console.log(`   ✅ Schedule regenerated`);
      } else {
        console.log(`✓ Session ${session.id} - dates match, no fix needed`);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log(`✅ Fixed ${fixedCount} session schedules`);
    console.log("=".repeat(60));

  } catch (error) {
    console.error("\n❌ Error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixSessionSchedules()
  .then(() => {
    console.log("\nScript completed successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nScript failed:", error);
    process.exit(1);
  });











