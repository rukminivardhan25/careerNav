import express, { Request, Response } from "express";
import { PrismaClient, Role } from "@prisma/client";
import { authenticateToken, AuthRequest } from "../middlewares/auth.middleware";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/ratings/careernav
 * Submit a rating for CareerNav
 */
router.post(
  "/careernav",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { rating, comment } = req.body;

      // Validate rating
      if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
        res.status(400).json({
          error: "Rating is required and must be between 1 and 5",
        });
        return;
      }

      // Validate comment length
      if (comment && comment.length > 500) {
        res.status(400).json({
          error: "Comment must be 500 characters or less",
        });
        return;
      }

      // Save rating to database
      await prisma.career_nav_ratings.create({
        data: {
          user_id: userId,
          user_role: userRole as Role,
          rating: rating,
          comment: comment || null,
        },
      });

      res.json({
        success: true,
        message: "Thank you for your feedback!",
      });
    } catch (error) {
      console.error("[Ratings] Error submitting rating:", error);
      res.status(500).json({
        error: "Failed to submit rating. Please try again.",
      });
    }
  }
);

export default router;

