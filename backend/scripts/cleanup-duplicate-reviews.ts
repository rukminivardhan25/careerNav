import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanupDuplicates() {
  try {
    console.log("Finding duplicate resume review requests...");
    
    // Find duplicates
    const duplicates = await prisma.$queryRaw<Array<{ resume_id: number; mentor_id: string; count: bigint }>>`
      SELECT resume_id, mentor_id, COUNT(*) as count
      FROM resume_review_requests
      GROUP BY resume_id, mentor_id
      HAVING COUNT(*) > 1
    `;

    console.log(`Found ${duplicates.length} duplicate pairs`);

    for (const dup of duplicates) {
      console.log(`Processing: resume_id=${dup.resume_id}, mentor_id=${dup.mentor_id}`);
      
      // Get all reviews for this pair, keep the most recent one
      const reviews = await prisma.resume_review_requests.findMany({
        where: {
          resume_id: dup.resume_id,
          mentor_id: dup.mentor_id,
        },
        orderBy: {
          created_at: "desc",
        },
      });

      // Keep the first (most recent) one, delete the rest
      const toDelete = reviews.slice(1);
      console.log(`  Keeping review ID ${reviews[0].id}, deleting ${toDelete.length} duplicates`);

      for (const review of toDelete) {
        await prisma.resume_review_requests.delete({
          where: { id: review.id },
        });
        console.log(`  Deleted review ID ${review.id}`);
      }
    }

    console.log("Cleanup complete!");
  } catch (error) {
    console.error("Error cleaning up duplicates:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDuplicates();







