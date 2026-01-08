/**
 * Career routes
 */
import express from "express";
import { careerController } from "../controllers/career.controller";
import { authenticateToken, requireRole } from "../middlewares/auth.middleware";
import { ROLES } from "../config/constants";

const router = express.Router();

// Protected routes (student only)
router.get(
  "/recommendations",
  authenticateToken,
  requireRole(ROLES.STUDENT),
  careerController.getRecommendations.bind(careerController)
);

router.post(
  "/recommendations",
  authenticateToken,
  requireRole(ROLES.STUDENT),
  careerController.generateRecommendations.bind(careerController)
);

router.post(
  "/select",
  authenticateToken,
  requireRole(ROLES.STUDENT),
  careerController.selectCareer.bind(careerController)
);

router.post(
  "/select-and-generate-path",
  authenticateToken,
  requireRole(ROLES.STUDENT),
  careerController.selectAndGeneratePath.bind(careerController)
);

router.get(
  "/selected",
  authenticateToken,
  requireRole(ROLES.STUDENT),
  careerController.getSelectedCareer.bind(careerController)
);

export default router;


