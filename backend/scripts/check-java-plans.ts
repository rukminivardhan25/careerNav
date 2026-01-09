import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkJavaPlans() {
  try {
    // Get all Java-related plans
    const javaPlans = await prisma.plans.findMany({
      where: {
        skill_name: {
          contains: "Java",
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        skill_name: true,
        plan_key: true,
        plan_title: true,
        price: true,
        is_active: true,
      },
    });

    console.log(`Found ${javaPlans.length} Java-related plans:\n`);
    javaPlans.forEach((plan) => {
      console.log(`Skill Name: "${plan.skill_name}"`);
      console.log(`  Plan: ${plan.plan_title} (${plan.plan_key})`);
      console.log(`  Price: ₹${plan.price.toNumber()}`);
      console.log(`  Active: ${plan.is_active}\n`);
    });

    // Check exact match
    const exactMatch = await prisma.plans.findMany({
      where: {
        skill_name: "Java Programming",
        is_active: true,
      },
    });

    console.log(`\nExact match for "Java Programming": ${exactMatch.length} plans`);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkJavaPlans();
















