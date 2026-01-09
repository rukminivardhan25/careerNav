import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verifyPlans() {
  try {
    const skills = ["Android Development", "Data Structures", "Machine Learning", "System Design"];

    for (const skill of skills) {
      const plans = await prisma.plans.findMany({
        where: { skill_name: skill },
        include: { plan_topics: true },
        orderBy: { plan_key: "asc" },
      });

      console.log(`\n${skill}:`);
      plans.forEach((plan) => {
        console.log(`  ${plan.plan_title} (${plan.plan_key}): ${plan.plan_topics.length} topics`);
      });
    }

    // Summary
    const allPlans = await prisma.plans.findMany({
      where: {
        skill_name: {
          in: skills,
        },
      },
      include: { plan_topics: true },
    });

    console.log(`\n${"=".repeat(60)}`);
    console.log(`Total Plans Created: ${allPlans.length}`);
    console.log(`Total Topics Created: ${allPlans.reduce((sum, p) => sum + p.plan_topics.length, 0)}`);
    console.log("=".repeat(60));
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyPlans();
















