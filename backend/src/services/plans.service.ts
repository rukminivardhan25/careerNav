import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const plansService = {
  /**
   * Get all active plans for a specific skill
   */
  async getPlansBySkill(skillName: string): Promise<any[]> {
    try {
      // Check if plans model exists (Prisma client may need regeneration)
      if (!prisma.plans) {
        console.error("[PlansService] Prisma client not regenerated. Run: npm run prisma:generate");
        throw new Error("Database models not available. Please regenerate Prisma client.");
      }

      const plans = await prisma.plans.findMany({
        where: {
          skill_name: skillName,
          is_active: true,
        },
        orderBy: [
          { price: "asc" }, // Sort by price (Basic, Standard, Pro)
        ],
        select: {
          id: true,
          skill_name: true,
          plan_key: true,
          plan_title: true,
          price: true,
          duration_weeks: true,
          sessions_per_week: true,
          description: true,
          is_active: true,
        },
      });

      return plans.map((plan) => ({
        id: plan.id,
        skillName: plan.skill_name,
        planKey: plan.plan_key,
        planTitle: plan.plan_title,
        price: plan.price.toNumber(), // Convert Decimal to number
        durationWeeks: plan.duration_weeks,
        sessionsPerWeek: plan.sessions_per_week,
        description: plan.description,
        isActive: plan.is_active,
      }));
    } catch (error) {
      console.error("[PlansService] Error fetching plans by skill:", error);
      throw error;
    }
  },

  /**
   * Get all topics for a specific plan
   */
  async getPlanTopics(planId: number): Promise<any[]> {
    try {
      // Check if plan_topics model exists
      if (!prisma.plan_topics) {
        console.error("[PlansService] Prisma client not regenerated. Run: npm run prisma:generate");
        throw new Error("Database models not available. Please regenerate Prisma client.");
      }

      const topics = await prisma.plan_topics.findMany({
        where: {
          plan_id: planId,
        },
        orderBy: [
          { week_number: "asc" },
          { session_number: "asc" },
        ],
        select: {
          id: true,
          week_number: true,
          session_number: true,
          topic_title: true,
        },
      });

      return topics.map((topic) => ({
        id: topic.id,
        weekNumber: topic.week_number,
        sessionNumber: topic.session_number,
        topicTitle: topic.topic_title,
      }));
    } catch (error) {
      console.error("[PlansService] Error fetching plan topics:", error);
      throw error;
    }
  },

  /**
   * Get plan by ID
   */
  async getPlanById(planId: number): Promise<any | null> {
    try {
      // Check if plans model exists
      if (!prisma.plans) {
        console.error("[PlansService] Prisma client not regenerated. Run: npm run prisma:generate");
        throw new Error("Database models not available. Please regenerate Prisma client.");
      }

      const plan = await prisma.plans.findUnique({
        where: {
          id: planId,
        },
        include: {
          plan_topics: {
            orderBy: [
              { week_number: "asc" },
              { session_number: "asc" },
            ],
          },
        },
      });

      if (!plan) {
        return null;
      }

      return {
        id: plan.id,
        skillName: plan.skill_name,
        planKey: plan.plan_key,
        planTitle: plan.plan_title,
        price: plan.price.toNumber(),
        durationWeeks: plan.duration_weeks,
        sessionsPerWeek: plan.sessions_per_week,
        description: plan.description,
        isActive: plan.is_active,
        topics: plan.plan_topics.map((topic) => ({
          id: topic.id,
          weekNumber: topic.week_number,
          sessionNumber: topic.session_number,
          topicTitle: topic.topic_title,
        })),
      };
    } catch (error) {
      console.error("[PlansService] Error fetching plan by ID:", error);
      throw error;
    }
  },
};

