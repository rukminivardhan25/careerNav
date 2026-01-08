/**
 * Mentor routes
 * All routes require authentication
 */
import express from "express";
import { mentorController } from "../controllers/mentor.controller";
import { authenticateToken } from "../middlewares/auth.middleware";
import { uploadProfilePhoto, getFileURL } from "../utils/fileUpload";

const router = express.Router();

// ============================================
// PUBLIC ROUTES (for student discovery)
// ============================================
router.get("/", mentorController.getAllMentors.bind(mentorController));
router.get("/top", mentorController.getTopMentors.bind(mentorController));
router.get("/course/:courseId", mentorController.getMentorsByCourse.bind(mentorController));

// ============================================
// PROTECTED ROUTES (mentor only)
// ============================================

// Dashboard
router.get(
  "/dashboard/stats",
  authenticateToken,
  mentorController.getDashboardStats.bind(mentorController)
);
router.get(
  "/dashboard/pending-requests",
  authenticateToken,
  mentorController.getPendingSessionRequests.bind(mentorController)
);
router.get(
  "/dashboard/payment-pending-sessions",
  authenticateToken,
  mentorController.getPaymentPendingSessions.bind(mentorController)
);
router.get(
  "/dashboard/ongoing-sessions",
  authenticateToken,
  mentorController.getOngoingSessions.bind(mentorController)
);
router.get(
  "/dashboard/scheduled-sessions",
  authenticateToken,
  mentorController.getScheduledSessions.bind(mentorController)
);
router.get(
  "/dashboard/completed-sessions",
  authenticateToken,
  mentorController.getCompletedSessions.bind(mentorController)
);

// Students Management
router.get(
  "/students",
  authenticateToken,
  mentorController.getStudents.bind(mentorController)
);
router.get(
  "/students/:studentId",
  authenticateToken,
  mentorController.getStudentDetails.bind(mentorController)
);
router.get(
  "/students/:studentId/progress",
  authenticateToken,
  mentorController.getStudentProgress.bind(mentorController)
);

// Reviews Management
router.get(
  "/reviews",
  authenticateToken,
  mentorController.getReviews.bind(mentorController)
);
router.get(
  "/reviews/:reviewId",
  authenticateToken,
  mentorController.getReviewDetails.bind(mentorController)
);
router.post(
  "/reviews/:reviewId/complete",
  authenticateToken,
  mentorController.completeReview.bind(mentorController)
);

// Insights & Analytics
router.get(
  "/insights/metrics",
  authenticateToken,
  mentorController.getInsightsMetrics.bind(mentorController)
);
router.get(
  "/insights/performance",
  authenticateToken,
  mentorController.getPerformanceData.bind(mentorController)
);
router.get(
  "/insights/student-joins",
  authenticateToken,
  mentorController.getStudentJoins.bind(mentorController)
);
router.get(
  "/insights/weekly-schedule",
  authenticateToken,
  mentorController.getWeeklySchedule.bind(mentorController)
);
router.get(
  "/insights/students",
  authenticateToken,
  mentorController.getTopStudents.bind(mentorController)
);
router.get(
  "/insights/course-distribution",
  authenticateToken,
  mentorController.getCourseDistribution.bind(mentorController)
);
router.get(
  "/insights/quick-stats",
  authenticateToken,
  mentorController.getQuickStats.bind(mentorController)
);

// Messages & Chat
router.get(
  "/messages/conversations",
  authenticateToken,
  mentorController.getConversations.bind(mentorController)
);
router.get(
  "/messages/session/:sessionId",
  authenticateToken,
  mentorController.getSessionMessages.bind(mentorController)
);
router.post(
  "/messages/send",
  authenticateToken,
  mentorController.sendMessage.bind(mentorController)
);
router.post(
  "/messages/mark-read",
  authenticateToken,
  mentorController.markMessagesRead.bind(mentorController)
);

// Skill Test
router.get(
  "/skill-test/courses",
  authenticateToken,
  mentorController.getAvailableCourses.bind(mentorController)
);
router.get(
  "/skill-test/results",
  authenticateToken,
  mentorController.getTestResults.bind(mentorController)
);
router.post(
  "/skill-test/generate",
  authenticateToken,
  mentorController.generateTest.bind(mentorController)
);
router.post(
  "/skill-test/submit",
  authenticateToken,
  mentorController.submitTest.bind(mentorController)
);
router.get(
  "/skill-test/:testId",
  authenticateToken,
  mentorController.getTestDetails.bind(mentorController)
);

// Profile Management
router.get(
  "/profile",
  authenticateToken,
  mentorController.getProfile.bind(mentorController)
);
router.put(
  "/profile",
  authenticateToken,
  mentorController.updateProfile.bind(mentorController)
);
router.post(
  "/profile/photo",
  authenticateToken,
  uploadProfilePhoto.single("photo"),
  mentorController.uploadProfilePhoto.bind(mentorController)
);
router.delete(
  "/profile/photo",
  authenticateToken,
  mentorController.deleteProfilePhoto.bind(mentorController)
);
router.get(
  "/profile/verified-courses",
  authenticateToken,
  mentorController.getVerifiedCourses.bind(mentorController)
);

// Experience Management
router.get(
  "/profile/experiences",
  authenticateToken,
  mentorController.getExperiences.bind(mentorController)
);
router.post(
  "/profile/experiences",
  authenticateToken,
  mentorController.addExperience.bind(mentorController)
);
router.put(
  "/profile/experiences/:experienceId",
  authenticateToken,
  mentorController.updateExperience.bind(mentorController)
);
router.delete(
  "/profile/experiences/:experienceId",
  authenticateToken,
  mentorController.deleteExperience.bind(mentorController)
);

// Session Management
router.get(
  "/sessions",
  authenticateToken,
  mentorController.getSessions.bind(mentorController)
);
router.get(
  "/sessions/:sessionId",
  authenticateToken,
  mentorController.getSessionDetails.bind(mentorController)
);
router.post(
  "/sessions/:sessionId/approve",
  authenticateToken,
  mentorController.approveSession.bind(mentorController)
);
router.post(
  "/sessions/:sessionId/reject",
  authenticateToken,
  mentorController.rejectSession.bind(mentorController)
);
router.post(
  "/sessions/:sessionId/cancel",
  authenticateToken,
  mentorController.cancelSession.bind(mentorController)
);
router.post(
  "/sessions/:sessionId/complete",
  authenticateToken,
  mentorController.completeSession.bind(mentorController)
);
router.post(
  "/sessions/:sessionId/zoom-link",
  authenticateToken,
  mentorController.addZoomLink.bind(mentorController)
);

// ============================================
// PUBLIC ROUTE - Must be LAST (catch-all parameter route)
// ============================================
// This route must come AFTER all specific routes to avoid route conflicts
router.get("/:id", mentorController.getMentorById.bind(mentorController));

export default router;
