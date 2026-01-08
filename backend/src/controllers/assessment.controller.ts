/**
 * Assessment Controller
 * Handles HTTP requests for assessments
 */
import { Request, Response } from "express";
import { assessmentService } from "../services/assessment.service";
import { AuthRequest } from "../middlewares/auth.middleware";

export class AssessmentController {
  /**
   * GET /api/assessments
   * Get all active assessments
   */
  async getAllAssessments(req: Request, res: Response): Promise<void> {
    try {
      const assessments = await assessmentService.getAllAssessments();
      res.json({ assessments });
    } catch (error) {
      console.error("[AssessmentController] Error:", error);
      res.status(500).json({
        error: "Failed to fetch assessments. Please try again.",
      });
    }
  }

  /**
   * GET /api/assessments/:id
   * Get assessment by ID with questions
   */
  async getAssessmentById(req: Request, res: Response): Promise<void> {
    try {
      const assessmentId = parseInt(req.params.id);
      if (isNaN(assessmentId)) {
        res.status(400).json({ error: "Invalid assessment ID" });
        return;
      }

      const assessment = await assessmentService.getAssessmentById(assessmentId);
      if (!assessment) {
        res.status(404).json({ error: "Assessment not found" });
        return;
      }

      const questions = await assessmentService.getAssessmentQuestions(assessmentId);
      res.json({ assessment, questions });
    } catch (error) {
      console.error("[AssessmentController] Error:", error);
      res.status(500).json({
        error: "Failed to fetch assessment. Please try again.",
      });
    }
  }

  /**
   * POST /api/assessments/:id/start
   * Start an assessment for the current user
   */
  async startAssessment(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const assessmentId = parseInt(req.params.id);

      if (isNaN(assessmentId)) {
        res.status(400).json({ error: "Invalid assessment ID" });
        return;
      }

      const studentAssessment = await assessmentService.createStudentAssessment(
        userId,
        assessmentId
      );

      res.json({ studentAssessment });
    } catch (error) {
      console.error("[AssessmentController] Error:", error);
      res.status(500).json({
        error: "Failed to start assessment. Please try again.",
      });
    }
  }
}

export const assessmentController = new AssessmentController();





