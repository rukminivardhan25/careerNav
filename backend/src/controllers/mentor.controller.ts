/**
 * Mentor Controller
 * Handles HTTP requests for mentor operations
 */
import { Request, Response } from "express";
import { mentorService } from "../services/mentor.service";
import { AuthRequest } from "../middlewares/auth.middleware";
import { getFileURL } from "../utils/fileUpload";

export class MentorController {
  // ============================================
  // PUBLIC ROUTES
  // ============================================

  /**
   * GET /api/mentors
   * Get all mentors (for student discovery)
   */
  async getAllMentors(req: Request, res: Response): Promise<void> {
    try {
      const { courseId, search } = req.query;
      const mentors = await mentorService.getAllMentors(
        courseId as string | undefined,
        search as string | undefined
      );
      res.json({ mentors });
    } catch (error) {
      console.error("[MentorController] getAllMentors error:", error);
      res.status(500).json({
        error: "Failed to fetch mentors. Please try again.",
      });
    }
  }

  /**
   * GET /api/mentors/:id
   * Get mentor by ID
   */
  async getMentorById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const mentor = await mentorService.getMentorById(id);

      if (!mentor) {
        res.status(404).json({ error: "Mentor not found" });
        return;
      }

      res.json({ mentor });
    } catch (error) {
      console.error("[MentorController] getMentorById error:", error);
      res.status(500).json({
        error: "Failed to fetch mentor. Please try again.",
      });
    }
  }

  /**
   * GET /api/mentors/course/:courseId
   * Get mentors for a specific course
   */
  async getMentorsByCourse(req: Request, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;
      const mentors = await mentorService.getMentorsByCourse(courseId);
      res.json({ mentors });
    } catch (error) {
      console.error("[MentorController] getMentorsByCourse error:", error);
      res.status(500).json({
        error: "Failed to fetch mentors for course. Please try again.",
      });
    }
  }

  /**
   * GET /api/mentors/top
   * Get top mentors grouped by course (for student sidebar)
   */
  async getTopMentors(req: Request, res: Response): Promise<void> {
    try {
      const mentorsByCourse = await mentorService.getTopMentors();
      res.json(mentorsByCourse);
    } catch (error) {
      console.error("[MentorController] getTopMentors error:", error);
      res.status(500).json({
        error: "Failed to fetch top mentors. Please try again.",
      });
    }
  }

  // ============================================
  // DASHBOARD
  // ============================================

  /**
   * GET /api/mentors/dashboard/stats
   * Get dashboard statistics
   */
  async getDashboardStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const stats = await mentorService.getDashboardStats(mentorId);
      res.json({ stats });
    } catch (error) {
      console.error("[MentorController] getDashboardStats error:", error);
      res.status(500).json({
        error: "Failed to fetch dashboard stats. Please try again.",
      });
    }
  }

  /**
   * GET /api/mentors/dashboard/pending-requests
   * Get pending session requests
   */
  async getPendingSessionRequests(
    req: AuthRequest,
    res: Response
  ): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const requests = await mentorService.getPendingSessionRequests(mentorId);
      res.json({ requests });
    } catch (error) {
      console.error(
        "[MentorController] getPendingSessionRequests error:",
        error
      );
      res.status(500).json({
        error: "Failed to fetch pending requests. Please try again.",
      });
    }
  }

  /**
   * GET /api/mentors/dashboard/payment-pending-sessions
   * Get payment pending sessions (APPROVED with no payment)
   */
  async getPaymentPendingSessions(
    req: AuthRequest,
    res: Response
  ): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const sessions = await mentorService.getPaymentPendingSessions(mentorId);
      res.json(sessions); // Return array directly
    } catch (error) {
      console.error(
        "[MentorController] getPaymentPendingSessions error:",
        error
      );
      res.status(500).json({
        error: "Failed to fetch payment pending sessions. Please try again.",
      });
    }
  }

  /**
   * GET /api/mentors/dashboard/ongoing-sessions
   * Get ongoing sessions (with payment completed)
   */
  async getOngoingSessions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const sessions = await mentorService.getOngoingSessions(mentorId);
      res.json(sessions); // Return array directly
    } catch (error) {
      console.error("[MentorController] getOngoingSessions error:", error);
      res.status(500).json({
        error: "Failed to fetch ongoing sessions. Please try again.",
      });
    }
  }

  /**
   * GET /api/mentors/dashboard/scheduled-sessions
   * Get scheduled sessions
   */
  async getScheduledSessions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { upcoming } = req.query;
      // Check if this is for dashboard (apply strict visibility rules)
      const isDashboard = req.path.includes("/dashboard/scheduled-sessions");
      const sessions = await mentorService.getScheduledSessions(
        mentorId,
        upcoming === "true",
        isDashboard
      );
      res.json({ sessions });
    } catch (error) {
      console.error("[MentorController] getScheduledSessions error:", error);
      res.status(500).json({
        error: "Failed to fetch scheduled sessions. Please try again.",
      });
    }
  }

  /**
   * GET /api/mentors/dashboard/completed-sessions
   * Get completed sessions
   */
  async getCompletedSessions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const sessions = await mentorService.getCompletedSessions(mentorId);
      res.json(sessions); // Return array directly
    } catch (error) {
      console.error("[MentorController] getCompletedSessions error:", error);
      res.status(500).json({
        error: "Failed to fetch completed sessions. Please try again.",
      });
    }
  }

  // ============================================
  // STUDENTS MANAGEMENT
  // ============================================

  /**
   * GET /api/mentors/students
   * Get list of students
   */
  async getStudents(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { search, status, courseId } = req.query;
      const students = await mentorService.getStudents(mentorId, {
        search: search as string | undefined,
        status: status as string | undefined,
        courseId: courseId as string | undefined,
      });
      res.json({ students });
    } catch (error) {
      console.error("[MentorController] getStudents error:", error);
      res.status(500).json({
        error: "Failed to fetch students. Please try again.",
      });
    }
  }

  /**
   * GET /api/mentors/students/:studentId
   * Get student details
   */
  async getStudentDetails(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      const { studentId } = req.params;

      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const student = await mentorService.getStudentDetails(
        mentorId,
        studentId
      );

      if (!student) {
        res.status(404).json({ error: "Student not found" });
        return;
      }

      res.json({ student });
    } catch (error) {
      console.error("[MentorController] getStudentDetails error:", error);
      res.status(500).json({
        error: "Failed to fetch student details. Please try again.",
      });
    }
  }

  /**
   * GET /api/mentors/students/:studentId/progress
   * Get student learning progress
   */
  async getStudentProgress(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      const { studentId } = req.params;

      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const progress = await mentorService.getStudentProgress(
        mentorId,
        studentId
      );
      res.json({ progress });
    } catch (error) {
      console.error("[MentorController] getStudentProgress error:", error);
      res.status(500).json({
        error: "Failed to fetch student progress. Please try again.",
      });
    }
  }

  // ============================================
  // REVIEWS MANAGEMENT
  // ============================================

  /**
   * GET /api/mentors/reviews
   * Get reviews (pending/completed)
   */
  async getReviews(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { status, type, priority } = req.query;
      const reviews = await mentorService.getReviews(mentorId, {
        status: status as string | undefined,
        type: type as string | undefined,
        priority: priority as string | undefined,
      });
      res.json({ reviews });
    } catch (error) {
      console.error("[MentorController] getReviews error:", error);
      res.status(500).json({
        error: "Failed to fetch reviews. Please try again.",
      });
    }
  }

  /**
   * GET /api/mentors/reviews/:reviewId
   * Get review details
   */
  async getReviewDetails(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      const { reviewId } = req.params;

      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const review = await mentorService.getReviewDetails(mentorId, reviewId);
      if (!review) {
        res.status(404).json({ error: "Review not found" });
        return;
      }

      res.json({ review });
    } catch (error) {
      console.error("[MentorController] getReviewDetails error:", error);
      res.status(500).json({
        error: "Failed to fetch review details. Please try again.",
      });
    }
  }

  /**
   * POST /api/mentors/reviews/:reviewId/complete
   * Complete a review
   */
  async completeReview(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      const { reviewId } = req.params;
      const { feedback, rating } = req.body;

      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      // Validate rating for resume reviews (required, 1-5)
      if (reviewId.startsWith("resume_")) {
        if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
          return res.status(400).json({
            error: "Rating is required and must be an integer between 1 and 5",
          });
        }
      }

      const review = await mentorService.completeReview(mentorId, reviewId, {
        feedback,
        rating,
      });
      res.json({ review });
    } catch (error: any) {
      console.error("[MentorController] completeReview error:", error);
      const statusCode = error?.message?.includes("already been completed") ? 400 : 500;
      res.status(statusCode).json({
        error: error?.message || "Failed to complete review. Please try again.",
      });
    }
  }

  // ============================================
  // INSIGHTS & ANALYTICS
  // ============================================

  /**
   * GET /api/mentors/insights/metrics
   * Get insights metrics
   */
  async getInsightsMetrics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { timeRange } = req.query;
      const metrics = await mentorService.getInsightsMetrics(
        mentorId,
        timeRange as string | undefined
      );
      res.json({ metrics });
    } catch (error) {
      console.error("[MentorController] getInsightsMetrics error:", error);
      res.status(500).json({
        error: "Failed to fetch insights metrics. Please try again.",
      });
    }
  }

  /**
   * GET /api/mentors/insights/performance
   * Get performance data
   */
  async getPerformanceData(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { timeRange } = req.query;
      const performance = await mentorService.getPerformanceData(
        mentorId,
        timeRange as string | undefined
      );
      res.json({ performance });
    } catch (error) {
      console.error("[MentorController] getPerformanceData error:", error);
      res.status(500).json({
        error: "Failed to fetch performance data. Please try again.",
      });
    }
  }

  /**
   * GET /api/mentors/insights/student-joins
   * Get student joins for a specific month/year
   */
  async getStudentJoins(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { year, month } = req.query;
      
      if (!year || !month) {
        res.status(400).json({ error: "Year and month are required" });
        return;
      }

      const yearNum = parseInt(year as string);
      const monthNum = parseInt(month as string);

      if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        res.status(400).json({ error: "Invalid year or month" });
        return;
      }

      const data = await mentorService.getStudentJoins(mentorId, yearNum, monthNum);
      res.json(data);
    } catch (error) {
      console.error("[MentorController] getStudentJoins error:", error);
      res.status(500).json({
        error: "Failed to fetch student joins. Please try again.",
      });
    }
  }

  /**
   * GET /api/mentors/insights/weekly-schedule
   * Get weekly schedule for weekly timetable
   */
  async getWeeklySchedule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const weekStart = req.query.weekStart as string;
      const weekEnd = req.query.weekEnd as string;

      if (!weekStart || !weekEnd) {
        res.status(400).json({ error: "weekStart and weekEnd query parameters are required" });
        return;
      }

      const schedule = await mentorService.getWeeklySchedule(mentorId, weekStart, weekEnd);
      res.json(schedule);
    } catch (error) {
      console.error("[MentorController] getWeeklySchedule error:", error);
      res.status(500).json({
        error: "Failed to fetch weekly schedule. Please try again.",
      });
    }
  }

  /**
   * GET /api/mentors/insights/students
   * Get top performing students
   */
  async getTopStudents(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { limit } = req.query;
      const students = await mentorService.getTopStudents(
        mentorId,
        limit ? parseInt(limit as string) : 3
      );
      res.json({ students });
    } catch (error) {
      console.error("[MentorController] getTopStudents error:", error);
      res.status(500).json({
        error: "Failed to fetch top students. Please try again.",
      });
    }
  }

  /**
   * GET /api/mentors/insights/course-distribution
   * Get course distribution
   */
  async getCourseDistribution(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const distribution = await mentorService.getCourseDistribution(mentorId);
      res.json({ distribution });
    } catch (error) {
      console.error("[MentorController] getCourseDistribution error:", error);
      res.status(500).json({
        error: "Failed to fetch course distribution. Please try again.",
      });
    }
  }

  /**
   * GET /api/mentors/insights/quick-stats
   * Get quick stats
   */
  async getQuickStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const stats = await mentorService.getQuickStats(mentorId);
      res.json({ stats });
    } catch (error) {
      console.error("[MentorController] getQuickStats error:", error);
      res.status(500).json({
        error: "Failed to fetch quick stats. Please try again.",
      });
    }
  }

  // ============================================
  // MESSAGES & CHAT
  // ============================================

  /**
   * GET /api/mentors/messages/conversations
   * Get all conversations
   */
  async getConversations(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { search } = req.query;
      const conversations = await mentorService.getConversations(
        mentorId,
        search as string | undefined
      );
      res.json({ conversations });
    } catch (error) {
      console.error("[MentorController] getConversations error:", error);
      res.status(500).json({
        error: "Failed to fetch conversations. Please try again.",
      });
    }
  }

  /**
   * GET /api/mentors/messages/session/:sessionId
   * Get messages for a session
   */
  async getSessionMessages(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      const { sessionId } = req.params;

      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const messages = await mentorService.getSessionMessages(
        mentorId,
        sessionId
      );
      res.json({ messages });
    } catch (error) {
      console.error("[MentorController] getSessionMessages error:", error);
      res.status(500).json({
        error: "Failed to fetch messages. Please try again.",
      });
    }
  }

  /**
   * POST /api/mentors/messages/send
   * Send a message
   */
  async sendMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      const { sessionId, content, messageType } = req.body;

      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      if (!sessionId || !content) {
        res.status(400).json({ error: "sessionId and content are required" });
        return;
      }

      const message = await mentorService.sendMessage(mentorId, {
        sessionId,
        content,
        messageType: messageType || "text",
      });
      res.json({ message });
    } catch (error) {
      console.error("[MentorController] sendMessage error:", error);
      res.status(500).json({
        error: "Failed to send message. Please try again.",
      });
    }
  }

  /**
   * POST /api/mentors/messages/mark-read
   * Mark messages as read
   */
  async markMessagesRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      const { sessionId, messageIds } = req.body;

      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      await mentorService.markMessagesRead(mentorId, sessionId, messageIds);
      res.json({ success: true });
    } catch (error) {
      console.error("[MentorController] markMessagesRead error:", error);
      res.status(500).json({
        error: "Failed to mark messages as read. Please try again.",
      });
    }
  }

  // ============================================
  // SKILL TEST
  // ============================================

  /**
   * GET /api/mentors/skill-test/courses
   * Get available courses for skill test
   */
  async getAvailableCourses(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const courses = await mentorService.getAvailableCourses(mentorId);
      res.json({ courses });
    } catch (error) {
      console.error("[MentorController] getAvailableCourses error:", error);
      res.status(500).json({
        error: "Failed to fetch available courses. Please try again.",
      });
    }
  }

  /**
   * GET /api/mentors/skill-test/results
   * Get test results (passed/failed/pending)
   */
  async getTestResults(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const results = await mentorService.getTestResults(mentorId);
      res.json({ results });
    } catch (error) {
      console.error("[MentorController] getTestResults error:", error);
      res.status(500).json({
        error: "Failed to fetch test results. Please try again.",
      });
    }
  }

  /**
   * POST /api/mentors/skill-test/generate
   * Generate a skill test for a course (DB-driven, no AI)
   */
  async generateTest(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      let { courseId } = req.body;

      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      // Ensure courseId is a number (might come as string from JSON)
      courseId = typeof courseId === "string" ? parseInt(courseId, 10) : courseId;

      if (!courseId || isNaN(courseId) || typeof courseId !== "number") {
        res.status(400).json({ error: "Valid course ID is required" });
        return;
      }

      console.log(`[MentorController] Generating test for courseId: ${courseId} (type: ${typeof courseId})`);

      const test = await mentorService.generateTest(mentorId, {
        courseId,
      });
      res.json({ test });
    } catch (error: any) {
      console.error("[MentorController] generateTest error:", error);
      res.status(500).json({
        error: error.message || "Failed to generate test. Please try again.",
      });
    }
  }

  /**
   * POST /api/mentors/skill-test/submit
   * Submit test answers
   */
  async submitTest(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      let { testId, answers } = req.body;

      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      if (!testId || !answers) {
        res.status(400).json({ error: "testId and answers are required" });
        return;
      }

      // Ensure testId is a number (might come as string from JSON)
      testId = typeof testId === "string" ? parseInt(testId, 10) : testId;

      if (isNaN(testId) || typeof testId !== "number") {
        res.status(400).json({ error: "Invalid test ID" });
        return;
      }

      console.log(`[MentorController] Submitting test ${testId} (type: ${typeof testId})`);

      const result = await mentorService.submitTest(mentorId, testId, answers);
      res.json({ result });
    } catch (error: any) {
      console.error("[MentorController] submitTest error:", error);
      res.status(500).json({
        error: error.message || "Failed to submit test. Please try again.",
      });
    }
  }

  /**
   * GET /api/mentors/skill-test/:testId
   * Get test details
   */
  async getTestDetails(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      const { testId } = req.params;

      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const test = await mentorService.getTestDetails(mentorId, testId);
      if (!test) {
        res.status(404).json({ error: "Test not found" });
        return;
      }

      res.json({ test });
    } catch (error) {
      console.error("[MentorController] getTestDetails error:", error);
      res.status(500).json({
        error: "Failed to fetch test details. Please try again.",
      });
    }
  }

  // ============================================
  // PROFILE MANAGEMENT
  // ============================================

  /**
   * GET /api/mentors/profile
   * Get mentor profile
   */
  async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const profile = await mentorService.getProfile(mentorId);
      if (!profile) {
        res.status(404).json({ error: "Profile not found" });
        return;
      }

      res.json({ profile });
    } catch (error) {
      console.error("[MentorController] getProfile error:", error);
      res.status(500).json({
        error: "Failed to fetch profile. Please try again.",
      });
    }
  }

  /**
   * PUT /api/mentors/profile
   * Update mentor profile
   */
  async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const profile = await mentorService.updateProfile(mentorId, req.body);
      res.json({ profile });
    } catch (error) {
      console.error("[MentorController] updateProfile error:", error);
      res.status(500).json({
        error: "Failed to update profile. Please try again.",
      });
    }
  }

  /**
   * POST /api/mentors/profile/photo
   * Upload profile photo
   */
  async uploadProfilePhoto(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      // Get file URL
      const fileURL = getFileURL(req.file.path);

      // Update profile with photo URL
      const profile = await mentorService.updateProfile(mentorId, {
        profilePhotoUrl: fileURL,
      });

      res.json({ profile, photoUrl: fileURL });
    } catch (error) {
      console.error("[MentorController] uploadProfilePhoto error:", error);
      res.status(500).json({
        error: "Failed to upload profile photo. Please try again.",
      });
    }
  }

  /**
   * DELETE /api/mentors/profile/photo
   * Delete profile photo
   */
  async deleteProfilePhoto(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      // Get current profile to find photo path
      const currentProfile = await mentorService.getProfile(mentorId);
      if (currentProfile?.basicInfo?.photoUrl) {
        // Delete file from filesystem (optional - can be handled by cleanup job)
        // For now, just clear the URL in database
      }

      // Update profile to remove photo URL
      const profile = await mentorService.updateProfile(mentorId, {
        profilePhotoUrl: null,
      });

      res.json({ profile, message: "Profile photo deleted successfully" });
    } catch (error) {
      console.error("[MentorController] deleteProfilePhoto error:", error);
      res.status(500).json({
        error: "Failed to delete profile photo. Please try again.",
      });
    }
  }

  /**
   * GET /api/mentors/profile/verified-courses
   * Get verified courses
   */
  async getVerifiedCourses(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const courses = await mentorService.getVerifiedCourses(mentorId);
      res.json({ courses });
    } catch (error) {
      console.error("[MentorController] getVerifiedCourses error:", error);
      res.status(500).json({
        error: "Failed to fetch verified courses. Please try again.",
      });
    }
  }

  // ============================================
  // EXPERIENCE MANAGEMENT
  // ============================================

  /**
   * GET /api/mentors/profile/experiences
   * Get mentor experiences
   */
  async getExperiences(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const experiences = await mentorService.getExperiences(mentorId);
      res.json({ experiences });
    } catch (error) {
      console.error("[MentorController] getExperiences error:", error);
      res.status(500).json({
        error: "Failed to fetch experiences. Please try again.",
      });
    }
  }

  /**
   * POST /api/mentors/profile/experiences
   * Add experience
   */
  async addExperience(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const experience = await mentorService.addExperience(
        mentorId,
        req.body
      );
      res.json({ experience });
    } catch (error) {
      console.error("[MentorController] addExperience error:", error);
      res.status(500).json({
        error: "Failed to add experience. Please try again.",
      });
    }
  }

  /**
   * PUT /api/mentors/profile/experiences/:experienceId
   * Update experience
   */
  async updateExperience(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      const { experienceId } = req.params;

      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const experience = await mentorService.updateExperience(
        mentorId,
        parseInt(experienceId),
        req.body
      );
      res.json({ experience });
    } catch (error) {
      console.error("[MentorController] updateExperience error:", error);
      res.status(500).json({
        error: "Failed to update experience. Please try again.",
      });
    }
  }

  /**
   * DELETE /api/mentors/profile/experiences/:experienceId
   * Delete experience
   */
  async deleteExperience(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      const { experienceId } = req.params;

      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      await mentorService.deleteExperience(mentorId, parseInt(experienceId));
      res.json({ success: true });
    } catch (error) {
      console.error("[MentorController] deleteExperience error:", error);
      res.status(500).json({
        error: "Failed to delete experience. Please try again.",
      });
    }
  }

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  /**
   * GET /api/mentors/sessions
   * Get all sessions
   */
  async getSessions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { status } = req.query;
      const sessions = await mentorService.getSessions(
        mentorId,
        status as string | undefined
      );
      res.json({ sessions });
    } catch (error) {
      console.error("[MentorController] getSessions error:", error);
      res.status(500).json({
        error: "Failed to fetch sessions. Please try again.",
      });
    }
  }

  /**
   * GET /api/mentors/sessions/:sessionId
   * Get session details
   */
  async getSessionDetails(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      const { sessionId } = req.params;

      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const sessionData = await mentorService.getSessionDetails(
        mentorId,
        sessionId
      );
      if (!sessionData) {
        res.status(404).json({ error: "Session not found" });
        return;
      }

      // Service returns: { id, student, skillName, status, zoomLink }
      // Frontend expects: { student: {...}, session: { id, skillName, status, zoomLink } }
      res.json({
        student: sessionData.student,
        session: {
          id: sessionData.id,
          skillName: sessionData.skillName,
          status: sessionData.status,
          zoomLink: sessionData.zoomLink || null,
        },
      });
    } catch (error) {
      console.error("[MentorController] getSessionDetails error:", error);
      res.status(500).json({
        error: "Failed to fetch session details. Please try again.",
      });
    }
  }

  /**
   * POST /api/mentors/sessions/:sessionId/approve
   * Approve a session request
   */
  async approveSession(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      const { sessionId } = req.params;

      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const session = await mentorService.approveSession(mentorId, sessionId);
      res.json({ session });
    } catch (error) {
      console.error("[MentorController] approveSession error:", error);
      res.status(500).json({
        error: "Failed to approve session. Please try again.",
      });
    }
  }

  /**
   * POST /api/mentors/sessions/:sessionId/reject
   * Reject a session request
   */
  async rejectSession(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      const { sessionId } = req.params;
      const { reason } = req.body;

      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const session = await mentorService.rejectSession(mentorId, sessionId, reason);
      res.json({ session });
    } catch (error) {
      console.error("[MentorController] rejectSession error:", error);
      res.status(500).json({
        error: "Failed to reject session. Please try again.",
      });
    }
  }

  /**
   * POST /api/mentors/sessions/:sessionId/complete
   * Mark session as completed
   */
  async completeSession(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      const { sessionId } = req.params;

      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const session = await mentorService.completeSession(mentorId, sessionId);
      res.json({ session });
    } catch (error) {
      console.error("[MentorController] completeSession error:", error);
      res.status(500).json({
        error: "Failed to complete session. Please try again.",
      });
    }
  }

  /**
   * DELETE /api/mentors/sessions/:sessionId
   * Cancel/delete a session
   */
  async cancelSession(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      const { sessionId } = req.params;

      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      await mentorService.cancelSession(mentorId, sessionId);
      res.json({ success: true, message: "Session cancelled successfully" });
    } catch (error: any) {
      console.error("[MentorController] cancelSession error:", error);
      if (error.message === "Session not found") {
        res.status(404).json({ error: "Session not found" });
      } else {
        res.status(500).json({
          error: "Failed to cancel session. Please try again.",
        });
      }
    }
  }

  /**
   * POST /api/mentors/sessions/:sessionId/zoom-link
   * Add/update zoom link
   */
  async addZoomLink(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mentorId = req.user?.userId;
      const { sessionId } = req.params;
      const { zoomLink, expiresAt } = req.body;

      if (!mentorId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      if (!zoomLink) {
        res.status(400).json({ error: "zoomLink is required" });
        return;
      }

      const session = await mentorService.addZoomLink(
        mentorId,
        sessionId,
        zoomLink,
        expiresAt
      );
      res.json({ session });
    } catch (error) {
      console.error("[MentorController] addZoomLink error:", error);
      res.status(500).json({
        error: "Failed to add zoom link. Please try again.",
      });
    }
  }
}

export const mentorController = new MentorController();
