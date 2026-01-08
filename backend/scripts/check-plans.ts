import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkPlans() {
  try {
    console.log("Checking plans in database...\n");

    // Get all plans
    const allPlans = await prisma.plans.findMany({
      select: {
        id: true,
        skill_name: true,
        plan_key: true,
        plan_title: true,
        price: true,
        is_active: true,
      },
      orderBy: {
        skill_name: "asc",
      },
    });

    console.log(`Total plans in database: ${allPlans.length}\n`);

    if (allPlans.length === 0) {
      console.log("❌ No plans found in database!");
      console.log("You need to create plans for each skill.\n");
    } else {
      console.log("Plans by skill:");
      const plansBySkill = allPlans.reduce((acc, plan) => {
        if (!acc[plan.skill_name]) {
          acc[plan.skill_name] = [];
        }
        acc[plan.skill_name].push(plan);
        return acc;
      }, {} as Record<string, typeof allPlans>);

      Object.entries(plansBySkill).forEach(([skill, plans]) => {
        console.log(`\n📚 ${skill}:`);
        plans.forEach((plan) => {
          console.log(
            `   - ${plan.plan_title} (${plan.plan_key}): ₹${plan.price.toNumber()} - ${plan.is_active ? "✅ Active" : "❌ Inactive"}`
          );
        });
      });
    }

    // Check for Java Programming specifically
    const javaPlans = await prisma.plans.findMany({
      where: {
        skill_name: {
          contains: "Java",
          mode: "insensitive",
        },
      },
    });

    console.log(`\n\nJava-related plans: ${javaPlans.length}`);
    if (javaPlans.length === 0) {
      console.log("❌ No plans found for Java Programming!");
      console.log("This is why you're seeing the error message.\n");
    }
  } catch (error) {
    console.error("Error checking plans:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPlans();












