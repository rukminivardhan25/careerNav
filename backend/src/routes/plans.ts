import express from "express";
import { authenticateToken } from "../middlewares/auth.middleware";
import { plansService } from "../services/plans.service";

const router = express.Router();

/**
 * GET /api/plans?skill=JavaScript
 * Fetch plans for a specific skill
 * Public endpoint (students need to see plans before requesting)
 */
router.get("/", async (req, res) => {
  try {
    const skillName = req.query.skill as string;

    if (!skillName) {
      return res.status(400).json({
        error: "Missing required parameter: skill",
      });
    }

    const plans = await plansService.getPlansBySkill(skillName);

    res.json(plans);
  } catch (error: any) {
    console.error("[Plans] Error fetching plans:", error);
    res.status(500).json({
      error: "Failed to fetch plans",
      message: error?.message || "Internal server error",
    });
  }
});

/**
 * GET /api/plans/:planId/topics
 * Fetch topics for a specific plan
 * Public endpoint
 */
router.get("/:planId/topics", async (req, res) => {
  try {
    const planId = parseInt(req.params.planId);

    if (isNaN(planId)) {
      return res.status(400).json({
        error: "Invalid plan ID",
      });
    }

    const topics = await plansService.getPlanTopics(planId);

    res.json(topics);
  } catch (error: any) {
    console.error("[Plans] Error fetching plan topics:", error);
    res.status(500).json({
      error: "Failed to fetch plan topics",
      message: error?.message || "Internal server error",
    });
  }
});

export default router;

