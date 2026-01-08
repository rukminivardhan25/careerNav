/**
 * Learning Path Controller
 * Handles HTTP requests for learning paths
 */
import { Request, Response } from "express";
import { learningService } from "../services/learning.service";
import { AuthRequest } from "../middlewares/auth.middleware";

export class LearningController {
  /**
   * GET /api/learning-paths/my
   * Get current user's learning path based on selected career
   */
  async getMyLearningPath(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const learningPath = await learningService.getOrGenerateLearningPath(userId);
      res.json(learningPath);
    } catch (error: any) {
      console.error("[LearningController] Error:", error);
      res.status(500).json({
        error: "Failed to fetch learning path. Please try again.",
        message: error?.message,
      });
    }
  }

  /**
   * GET /api/learning-paths/:careerId
   * Get learning path by career ID
   */
  async getLearningPath(req: Request, res: Response): Promise<void> {
    try {
      const { careerId } = req.params;
      const learningPath = await learningService.getLearningPathByCareerId(careerId);

      if (!learningPath) {
        res.status(404).json({
          error: `Learning path for career '${careerId}' not found`,
        });
        return;
      }

      const skills = await learningService.getLearningPathSkills(learningPath.id);
      res.json({ learning_path: learningPath, skills });
    } catch (error) {
      console.error("[LearningController] Error:", error);
      res.status(500).json({
        error: "Failed to fetch learning path. Please try again.",
      });
    }
  }

  /**
   * GET /api/learning-paths/skill/:skillId
   * Get skill detail by skill ID
   */
  async getSkillDetail(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { skillId } = req.params;
      const userId = req.user!.userId;
      
      const skillDetail = await learningService.getSkillDetail(userId, skillId);
      
      if (!skillDetail) {
        res.status(404).json({
          error: "Skill not found",
          message: `Skill with ID '${skillId}' not found in your learning path.`,
        });
        return;
      }

      res.json(skillDetail);
    } catch (error: any) {
      console.error("[LearningController] Error:", error);
      res.status(500).json({
        error: "Failed to fetch skill detail. Please try again.",
        message: error?.message,
      });
    }
  }

  /**
   * GET /api/learning-paths/my/progress
   * Get current user's learning progress
   */
  async getMyProgress(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const progress = await learningService.getStudentProgress(userId);
      res.json({ progress });
    } catch (error) {
      console.error("[LearningController] Error:", error);
      res.status(500).json({
        error: "Failed to fetch learning progress. Please try again.",
      });
    }
  }
}

export const learningController = new LearningController();


