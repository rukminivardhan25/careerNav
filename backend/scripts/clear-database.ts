/**
 * Script to delete all rows from all tables in the database
 * WARNING: This will permanently delete all data!
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function clearDatabase() {
  try {
    console.log("🗑️  Starting database cleanup...");
    
    // Delete in order to respect foreign key constraints
    // Start with child tables, then parent tables
    
    console.log("Deleting assessment_answers...");
    await prisma.assessment_answers.deleteMany({});
    
    console.log("Deleting skill_completions...");
    await prisma.skill_completions.deleteMany({});
    
    console.log("Deleting assessment_questions...");
    await prisma.assessment_questions.deleteMany({});
    
    console.log("Deleting student_assessments...");
    await prisma.student_assessments.deleteMany({});
    
    console.log("Deleting student_learning_progress...");
    await prisma.student_learning_progress.deleteMany({});
    
    console.log("Deleting learning_skills...");
    await prisma.learning_skills.deleteMany({});
    
    console.log("Deleting learning_paths...");
    await prisma.learning_paths.deleteMany({});
    
    console.log("Deleting career_recommendations...");
    await prisma.career_recommendations.deleteMany({});
    
    console.log("Deleting selected_careers...");
    await prisma.selected_careers.deleteMany({});
    
    console.log("Deleting cover_letters...");
    await prisma.cover_letters.deleteMany({});
    
    console.log("Deleting resumes...");
    await prisma.resumes.deleteMany({});
    
    console.log("Deleting user_activity...");
    await prisma.user_activity.deleteMany({});
    
    console.log("Deleting student_profiles...");
    await prisma.student_profiles.deleteMany({});
    
    console.log("Deleting mentor_profiles...");
    await prisma.mentor_profiles.deleteMany({});
    
    console.log("Deleting assessments...");
    await prisma.assessments.deleteMany({});
    
    console.log("Deleting industry_insights...");
    await prisma.industry_insights.deleteMany({});
    
    console.log("Deleting users...");
    await prisma.user.deleteMany({});
    
    console.log("✅ Database cleared successfully!");
    
    // Verify all tables are empty
    const counts = {
      users: await prisma.user.count(),
      assessment_answers: await prisma.assessment_answers.count(),
      assessment_questions: await prisma.assessment_questions.count(),
      assessments: await prisma.assessments.count(),
      career_recommendations: await prisma.career_recommendations.count(),
      cover_letters: await prisma.cover_letters.count(),
      industry_insights: await prisma.industry_insights.count(),
      learning_paths: await prisma.learning_paths.count(),
      learning_skills: await prisma.learning_skills.count(),
      mentor_profiles: await prisma.mentor_profiles.count(),
      resumes: await prisma.resumes.count(),
      selected_careers: await prisma.selected_careers.count(),
      skill_completions: await prisma.skill_completions.count(),
      student_assessments: await prisma.student_assessments.count(),
      student_learning_progress: await prisma.student_learning_progress.count(),
      student_profiles: await prisma.student_profiles.count(),
      user_activity: await prisma.user_activity.count(),
    };
    
    console.log("\n📊 Final row counts:");
    console.log(counts);
    
    const totalRows = Object.values(counts).reduce((sum, count) => sum + count, 0);
    if (totalRows === 0) {
      console.log("\n✅ All tables are empty!");
    } else {
      console.log(`\n⚠️  Warning: ${totalRows} rows still remain in the database.`);
    }
    
  } catch (error: any) {
    console.error("❌ Error clearing database:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
clearDatabase()
  .then(() => {
    console.log("\n✨ Script completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Script failed:", error);
    process.exit(1);
  });




