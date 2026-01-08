/**
 * Learning Path routes
 */
import express from "express";
import { learningController } from "../controllers/learning.controller";
import { authenticateToken, requireRole } from "../middlewares/auth.middleware";
import { ROLES } from "../config/constants";
import { AuthRequest } from "../middlewares/auth.middleware";

const router = express.Router();

// Protected routes (student only)
// More specific routes must come before generic ones
router.get(
  "/my",
  authenticateToken,
  requireRole(ROLES.STUDENT),
  learningController.getMyLearningPath.bind(learningController)
);

router.get(
  "/my/progress",
  authenticateToken,
  requireRole(ROLES.STUDENT),
  learningController.getMyProgress.bind(learningController)
);

router.get(
  "/skill/:skillId",
  authenticateToken,
  requireRole(ROLES.STUDENT),
  learningController.getSkillDetail.bind(learningController)
);

// Public routes (must be last to avoid conflicts)
router.get("/:careerId", learningController.getLearningPath.bind(learningController));

export default router;


