/**
 * Backfill skill_name for existing sessions with NULL values
 * Run this BEFORE making skill_name NOT NULL in the schema
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function backfillSkillName() {
  try {
    console.log("Starting skill_name backfill...");

    // Step 1: Update from plans table (if plan_id exists)
    const result1 = await prisma.$executeRaw`
      UPDATE sessions s
      SET skill_name = p.skill_name
      FROM plans p
      WHERE s.skill_name IS NULL
        AND s.plan_id IS NOT NULL
        AND s.plan_id = p.id
        AND p.skill_name IS NOT NULL
    `;
    console.log(`Updated ${result1} sessions from plans table`);

    // Step 2: Update from courses table (if course_id exists and skill_name still NULL)
    const result2 = await prisma.$executeRaw`
      UPDATE sessions s
      SET skill_name = c.title
      FROM courses c
      WHERE s.skill_name IS NULL
        AND s.course_id = c.id
        AND c.title IS NOT NULL
    `;
    console.log(`Updated ${result2} sessions from courses table`);

    // Step 3: Set to "Unknown (Legacy)" for any remaining NULL values
    const result3 = await prisma.$executeRaw`
      UPDATE sessions
      SET skill_name = 'Unknown (Legacy)'
      WHERE skill_name IS NULL
    `;
    console.log(`Updated ${result3} sessions to 'Unknown (Legacy)'`);

    // Verify no NULL values remain
    const nullCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM sessions
      WHERE skill_name IS NULL
    `;
    console.log(`Remaining NULL values: ${nullCount[0].count}`);

    if (nullCount[0].count === BigInt(0)) {
      console.log("✅ All skill_name values have been backfilled!");
    } else {
      console.log(`⚠️ Warning: ${nullCount[0].count} NULL values still exist`);
    }
  } catch (error) {
    console.error("Error backfilling skill_name:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

backfillSkillName()
  .then(() => {
    console.log("Backfill completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Backfill failed:", error);
    process.exit(1);
  });










