import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkSessionDates() {
  try {
    // Get a sample session with schedule
    const session = await prisma.sessions.findFirst({
      where: {
        status: "SCHEDULED",
      },
      include: {
        session_schedule: {
          orderBy: [
            { scheduled_date: "asc" },
            { scheduled_time: "asc" },
          ],
          take: 5,
        },
      },
    });

    if (!session) {
      console.log("No SCHEDULED sessions found");
      return;
    }

    console.log(`\nSession ID: ${session.id}`);
    console.log(`Course Start Date (scheduled_at): ${session.scheduled_at?.toISOString()}`);
    console.log(`\nFirst 5 Schedule Items:`);
    
    session.session_schedule.forEach((item, index) => {
      const scheduledDate = new Date(item.scheduled_date);
      const courseStartDate = new Date(session.scheduled_at!);
      
      console.log(`\n  ${index + 1}. Session ${item.session_number} (Week ${item.week_number})`);
      console.log(`     Scheduled Date: ${scheduledDate.toISOString()}`);
      console.log(`     Course Start: ${courseStartDate.toISOString()}`);
      console.log(`     Should Show: ${scheduledDate >= courseStartDate}`);
      console.log(`     Topic: ${item.topic_title}`);
    });

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSessionDates();









