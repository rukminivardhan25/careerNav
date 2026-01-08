import express, { Response } from "express";
import { authenticateToken, AuthRequest } from "../middlewares/auth.middleware";
import { IndustryInsightsController } from "../controllers/industry.controller";

const router = express.Router();
const controller = new IndustryInsightsController();

/**
 * GET /api/industry/insights
 * Get industry insights for the authenticated student's branch
 * Updates automatically if older than 7 days
 */
router.get("/insights", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Extract userId from req.user.id first, then fallback to req.user.userId
    // This ensures we get the user ID regardless of which field is used
    const userId = (req.user as any)?.id || req.user?.userId;
    
    if (!userId) {
      console.error("[Industry Insights Route] User ID not found. req.user:", JSON.stringify(req.user, null, 2));
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in request. Please sign in again.",
      });
    }
    
    console.log("[Industry Insights Route] Extracted userId:", userId);
    const result = await controller.getBranchInsights(userId);
    res.json(result);
  } catch (error: any) {
    console.error("[Industry Insights Route] Error:", error);
    console.error("[Industry Insights Route] Error stack:", error.stack);
    console.error("[Industry Insights Route] Error details:", JSON.stringify(error, null, 2));
    res.status(error.status || 500).json({
      error: error.message || "Failed to fetch industry insights",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

export default router;

