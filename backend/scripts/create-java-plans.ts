import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function createJavaPlans() {
  try {
    const skillName = "Java Programming";

    // Check if plans already exist
    const existing = await prisma.plans.findMany({
      where: {
        skill_name: skillName,
      },
    });

    if (existing.length > 0) {
      console.log(`Plans for "${skillName}" already exist (${existing.length} plans)`);
      existing.forEach((plan) => {
        console.log(`  - ${plan.plan_title} (${plan.plan_key})`);
      });
      return;
    }

    console.log(`Creating plans for "${skillName}"...\n`);

    // Create Basic Plan
    const basicPlan = await prisma.plans.create({
      data: {
        skill_name: skillName,
        plan_key: "BASIC",
        plan_title: "Basic Plan",
        price: 2999,
        duration_weeks: 4,
        sessions_per_week: 3,
        description: "Perfect for beginners. Learn Java fundamentals with 3 sessions per week.",
        is_active: true,
      },
    });
    console.log(`✅ Created Basic Plan (ID: ${basicPlan.id})`);

    // Create Standard Plan
    const standardPlan = await prisma.plans.create({
      data: {
        skill_name: skillName,
        plan_key: "STANDARD",
        plan_title: "Standard Plan",
        price: 4999,
        duration_weeks: 8,
        sessions_per_week: 5,
        description: "Most popular choice. Comprehensive Java learning with 5 sessions per week.",
        is_active: true,
      },
    });
    console.log(`✅ Created Standard Plan (ID: ${standardPlan.id})`);

    // Create Pro Plan
    const proPlan = await prisma.plans.create({
      data: {
        skill_name: skillName,
        plan_key: "PRO",
        plan_title: "Pro Plan",
        price: 7999,
        duration_weeks: 12,
        sessions_per_week: 5,
        description: "Advanced learning path. Master Java with intensive 5 sessions per week.",
        is_active: true,
      },
    });
    console.log(`✅ Created Pro Plan (ID: ${proPlan.id})`);

    console.log(`\n✅ Successfully created 3 plans for "${skillName}"!`);
  } catch (error) {
    console.error("Error creating plans:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createJavaPlans();











