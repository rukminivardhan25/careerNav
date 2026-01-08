/**
 * Career Controller
 * Handles HTTP requests for career recommendations
 */
import { Response } from "express";
import { careerService } from "../services/career.service";
import { AuthRequest } from "../middlewares/auth.middleware";

export class CareerController {
  /**
   * GET /api/careers/recommendations
   * Get career recommendations for current user
   */
  async getRecommendations(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const recommendations = await careerService.getCareerRecommendations(userId);
      res.json({ recommendations });
    } catch (error) {
      console.error("[CareerController] Error:", error);
      res.status(500).json({
        error: "Failed to fetch career recommendations. Please try again.",
      });
    }
  }

  /**
   * POST /api/careers/recommendations
   * Generate career recommendations for current user
   */
  async generateRecommendations(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { assessmentResults, profileData } = req.body;

      const recommendations = await careerService.generateCareerRecommendations(
        userId,
        assessmentResults,
        profileData
      );

      res.json({ recommendations });
    } catch (error) {
      console.error("[CareerController] Error:", error);
      res.status(500).json({
        error: "Failed to generate career recommendations. Please try again.",
      });
    }
  }

  /**
   * POST /api/careers/select
   * Select a career for the current user
   */
  async selectCareer(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { careerId } = req.body;

      if (!careerId) {
        res.status(400).json({ error: "careerId is required" });
        return;
      }

      const selectedCareer = await careerService.selectCareer(userId, careerId);
      res.json({ selectedCareer });
    } catch (error) {
      console.error("[CareerController] Error:", error);
      res.status(500).json({
        error: "Failed to select career. Please try again.",
      });
    }
  }

  /**
   * POST /api/careers/select-and-generate-path
   * Select a career and generate learning path
   */
  async selectAndGeneratePath(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { careerId, careerTitle } = req.body;

      if (!careerId && !careerTitle) {
        res.status(400).json({ error: "careerId or careerTitle is required" });
        return;
      }

      // Use careerTitle if provided, otherwise try to find from recommendations
      let title = careerTitle;
      if (!title && careerId) {
        const { PrismaClient } = await import("@prisma/client");
        const prisma = new PrismaClient();
        
        // Try to find by ID (if it's a number)
        const careerIdNum = parseInt(careerId);
        if (!isNaN(careerIdNum)) {
          const recommendation = await prisma.career_recommendations.findFirst({
            where: {
              student_id: userId,
              id: careerIdNum,
            },
          });
          if (recommendation) {
            title = recommendation.career_title;
          }
        }
        
        // If still no title, use careerId as title (for mock data)
        if (!title) {
          title = careerId;
        }
      }

      // Select the career (use title as the identifier)
      const selectedCareer = await careerService.selectCareer(userId, title || careerId || "");

      // Generate learning path (this will be handled by the learning path generation)
      // For now, just return success - the learning path will be generated when user visits /learning-path
      res.json({
        success: true,
        selectedCareer,
        message: "Career selected successfully. Learning path will be generated.",
      });
    } catch (error: any) {
      console.error("[CareerController] Error selecting career:", error);
      res.status(500).json({
        error: "Failed to select career. Please try again.",
        message: error?.message,
      });
    }
  }

  /**
   * GET /api/careers/selected
   * Get selected career for current user
   */
  async getSelectedCareer(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const selectedCareer = await careerService.getSelectedCareer(userId);
      
      if (!selectedCareer) {
        res.status(404).json({
          error: "No career selected",
          message: "Please select a career from your career report.",
        });
        return;
      }

      res.json({ career: selectedCareer });
    } catch (error: any) {
      console.error("[CareerController] Error:", error);
      res.status(500).json({
        error: "Failed to fetch selected career. Please try again.",
        message: error?.message,
      });
    }
  }
}

export const careerController = new CareerController();


