/**
 * Clear Assessment Data Script
 * Removes all AI-generated questions and answers from the database
 * This prepares the database for the new transient question system
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function clearAssessmentData() {
  try {
    console.log("🗑️  Starting assessment data cleanup...");

    // 1. Delete all assessment answers
    const deletedAnswers = await prisma.assessment_answers.deleteMany({});
    console.log(`✅ Deleted ${deletedAnswers.count} assessment answers`);

    // 2. Delete all AI-generated assessment questions
    // Keep only template questions if any (those without student_assessment_id)
    const deletedQuestions = await prisma.assessment_questions.deleteMany({
      where: {
        generated_by_ai: true,
      },
    });
    console.log(`✅ Deleted ${deletedQuestions.count} AI-generated questions`);

    // 3. Update student assessments to remove question references
    // Reset status to allow new attempts
    const updatedAssessments = await prisma.student_assessments.updateMany({
      where: {
        status: {
          in: ["in_progress", "completed"],
        },
      },
      data: {
        status: "not_started",
        started_at: null,
        completed_at: null,
        score: null,
        total_points: null,
        earned_points: null,
        time_taken_minutes: null,
      },
    });
    console.log(`✅ Reset ${updatedAssessments.count} student assessments`);

    // 4. Keep career recommendations (these are outcomes, not questions)
    console.log("✅ Career recommendations preserved (these are outcomes)");

    console.log("\n✨ Assessment data cleanup completed successfully!");
    console.log("\n📋 Summary:");
    console.log(`   - Deleted ${deletedAnswers.count} answers`);
    console.log(`   - Deleted ${deletedQuestions.count} AI-generated questions`);
    console.log(`   - Reset ${updatedAssessments.count} student assessments`);
    console.log("\n💡 The database is now ready for the new transient question system.");
  } catch (error: any) {
    console.error("❌ Error clearing assessment data:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
clearAssessmentData()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });

