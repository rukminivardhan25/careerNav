/**
 * Session routes
 * For students to create session requests
 */
import express from "express";
import { authenticateToken } from "../middlewares/auth.middleware";
import { PrismaClient, SessionStatus, PaymentStatus } from "@prisma/client";
import { notificationService } from "../services/notification.service";
import { uploadFile, getFileURL, uploadSessionResource } from "../utils/fileUpload";
import { getIO } from "../config/socket";
import { updateSessionScheduleStatus, evaluateMentorshipSessionStatus } from "../utils/sessionSchedule";
import path from "path";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/sessions/request
 * Student creates a session request
 * 
 * Note: Uses mentor skills from mentor_tests, not course fields
 */
router.post("/request", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    if (userRole !== "STUDENT") {
      return res.status(403).json({
        error: "Only students can create session requests",
      });
    }

    const { mentorId, skillId, skillName, sessionType, scheduledAt, studentMessage, planId } = req.body;

    // Validate required fields
    if (!mentorId || !sessionType || !scheduledAt) {
      return res.status(400).json({
        error: "Missing required fields: mentorId, sessionType, scheduledAt",
      });
    }

    // Validate mentor skill is provided
    if (!skillId && !skillName) {
      return res.status(400).json({
        error: "Missing required field: skillId or skillName (mentor skill)",
      });
    }

    // Validate plan_id if provided
    if (planId) {
      const plan = await prisma.plans.findUnique({
        where: { id: parseInt(planId) },
        select: { id: true, skill_name: true, is_active: true },
      });

      if (!plan) {
        return res.status(400).json({
          error: "Invalid plan ID. Plan not found.",
        });
      }

      if (!plan.is_active) {
        return res.status(400).json({
          error: "Selected plan is not active.",
        });
      }

      // Validate plan belongs to the requested skill
      if (plan.skill_name !== skillName) {
        return res.status(400).json({
          error: `Plan does not belong to skill "${skillName}". Plan is for "${plan.skill_name}".`,
        });
      }
    } else {
      // Plan is now mandatory
      return res.status(400).json({
        error: "Missing required field: planId. Please select a mentorship plan.",
      });
    }

    // Safety check: reject if student course fields are present
    if (req.body.courseId || req.body.courseName || req.body.learningPathId || req.body.studentCourse) {
      console.error(
        "INVALID DATA: Student course leaked into session request",
        { courseId: req.body.courseId, courseName: req.body.courseName, learningPathId: req.body.learningPathId }
      );
      return res.status(400).json({
        error: "Invalid request: Student course fields are not allowed. Use mentor skill instead.",
      });
    }

    // Validate mentor skill using mentor_test table ONLY
    // Do NOT lookup courses table - mentor skills are separate from student learning courses
    const orConditions: any[] = [
      {
        course_name: {
          contains: skillName,
          mode: "insensitive",
        },
      },
    ];
    if (skillId) {
      orConditions.push({
        course_name: {
          contains: skillId,
          mode: "insensitive",
        },
      });
    }
    const mentorTest = await prisma.mentor_tests.findFirst({
      where: {
        mentor_id: mentorId,
        OR: orConditions,
        status: "PASSED",
      },
      orderBy: {
        score: "desc",
      },
    });

    if (!mentorTest) {
      return res.status(400).json({
        error: "Mentor skill verification not found. Mentor has not passed the test for this skill.",
      });
    }

    // Schema requires course_id but we use mentor skills - using placeholder for now
    // TODO: Refactor schema to add mentor_test_id and make course_id nullable
    // Using a default/placeholder value since sessions are based on mentor skills, not courses
    const PLACEHOLDER_COURSE_ID = 1; // Temporary workaround until schema is updated

    // Create session request
    // Store skill_name and skill_id directly in sessions table (snapshot at connection time)
    if (!skillName || skillName.trim().length === 0) {
      return res.status(400).json({
        error: "skillName is required and cannot be empty",
      });
    }

    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const scheduledAtDate = new Date(scheduledAt);
    // Calculate end time (default: 1 hour duration)
    const endTime = new Date(scheduledAtDate.getTime() + 60 * 60 * 1000);
    
    // Create session with skill_name and skill_id saved at connection time
    const session = await prisma.sessions.create({
      data: {
        id: sessionId,
        student_id: userId,
        mentor_id: mentorId,
        course_id: PLACEHOLDER_COURSE_ID, // Temporary - schema needs mentor_test_id field
        plan_id: parseInt(planId), // Store selected plan
        session_type: sessionType,
        scheduled_at: scheduledAtDate,
        end_time: endTime, // Set end time (scheduled_at + 1 hour)
        status: SessionStatus.PENDING,
        student_message: studentMessage || null,
        skill_id: skillId || null, // Store skill_id if provided
        skill_name: skillName.trim(), // SNAPSHOT: Save skill name at connection time (NOT NULL)
      },
      include: {
        users_student: {
          select: {
            name: true,
          },
        },
      },
    });

    // Create notification for mentor
    await notificationService.createNotification(
      mentorId,
      "session_request",
      "New Session Request",
      `🧑‍🎓 New session request from ${session.users_student.name}`,
      sessionId // Store session ID for reference
    );

    res.status(201).json({
      id: sessionId,
      message: "Session request created successfully",
      skillName: skillName,
      skillId: skillId,
      mentorTestId: mentorTest.id,
    });
  } catch (error: any) {
    console.error("[Sessions] Error creating request:", error);
    res.status(500).json({
      error: "Failed to create session request",
      message: error?.message || "Internal server error",
    });
  }
});

/**
 * GET /api/sessions/:sessionId/messages
 * Get all messages for a session
 */
router.get("/:sessionId/messages", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const sessionId = req.params.sessionId;

    // Verify session exists and user has access (student or mentor)
    const session = await prisma.sessions.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        student_id: true,
        mentor_id: true,
        status: true,
      },
    });

    if (!session) {
      return res.status(404).json({
        error: "Session not found",
      });
    }

    // Check authorization: only session student or mentor can access
    if (session.student_id !== userId && session.mentor_id !== userId) {
      return res.status(403).json({
        error: "You don't have access to this session's messages",
      });
    }

    // Get messages ordered by created_at ascending
    // Always return array, even if empty or on error
    let messages: any[] = [];
    try {
      messages = await prisma.session_messages.findMany({
        where: { session_id: sessionId },
        orderBy: { created_at: "asc" },
        select: {
          id: true,
          sender_id: true,
          sender_role: true,
          content: true,
          message_type: true,
          created_at: true,
        },
      });
    } catch (queryError: any) {
      // If query fails (table doesn't exist, etc.), log but return empty array
      console.error("[Sessions] Error querying messages:", queryError);
      // Return empty array instead of crashing
      messages = [];
    }

    // Format response - always return array
    const formattedMessages = (messages || []).map((msg) => {
      const isFile = msg.message_type === "file";
      const isZoomLink = msg.message_type === "zoom_link";
      let fileData = null;
      let zoomLink = null;
      let messageText = null;
      
      if (isFile) {
        try {
          fileData = JSON.parse(msg.content || "{}");
        } catch {
          fileData = null;
        }
        messageText = null;
      } else if (isZoomLink) {
        try {
          const zoomData = JSON.parse(msg.content || "{}");
          zoomLink = zoomData.zoomLink || null;
          messageText = zoomData.message || "Video call link shared";
        } catch {
          zoomLink = null;
          messageText = "Video call link shared";
        }
      } else {
        messageText = msg.content || "";
      }

      return {
        id: msg.id,
        senderId: msg.sender_id,
        senderRole: msg.sender_role,
        message: messageText,
        messageType: msg.message_type || "text",
        fileData: fileData,
        zoomLink: zoomLink,
        createdAt: msg.created_at?.toISOString() || new Date().toISOString(),
      };
    });

    res.json(formattedMessages);
  } catch (error: any) {
    // On any error, return empty array instead of 500
    // This ensures UI always renders without breaking
    console.error("[Sessions] Error fetching messages:", error);
    // Return empty array instead of error to prevent UI breakage
    res.json([]);
  }
});

/**
 * POST /api/sessions/:sessionId/messages
 * Send a message in a session
 */
router.post("/:sessionId/messages", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const sessionId = req.params.sessionId;
    const { message } = req.body;

    // Validate message
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({
        error: "Message is required and cannot be empty",
      });
    }

    // Verify session exists and user has access (student or mentor)
    const session = await prisma.sessions.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        student_id: true,
        mentor_id: true,
        status: true,
      },
    });

    if (!session) {
      return res.status(404).json({
        error: "Session not found",
      });
    }

    // Check authorization: only session student or mentor can send messages
    if (session.student_id !== userId && session.mentor_id !== userId) {
      return res.status(403).json({
        error: "You don't have permission to send messages in this session",
      });
    }

    // Check if chat is enabled based on session status
    // Disabled for: PENDING, APPROVED (waiting for payment)
    // Read-only for: COMPLETED, CANCELLED (can view but not send)
    // Enabled for: SCHEDULED, PAID
    if (session.status === SessionStatus.PENDING || session.status === SessionStatus.APPROVED) {
      return res.status(403).json({
        error: "Chat is disabled. Please complete payment first.",
      });
    }
    if (session.status === SessionStatus.COMPLETED || session.status === SessionStatus.CANCELLED) {
      return res.status(403).json({
        error: "Chat is read-only for completed/cancelled sessions.",
      });
    }

    // Determine sender role from JWT
    const senderRole = userRole === "STUDENT" ? "STUDENT" : "MENTOR";

    // Verify the sender role matches the session participant
    if (userRole === "STUDENT" && session.student_id !== userId) {
      return res.status(403).json({
        error: "Only the student of this session can send messages as STUDENT",
      });
    }
    if (userRole === "MENTOR" && session.mentor_id !== userId) {
      return res.status(403).json({
        error: "Only the mentor of this session can send messages as MENTOR",
      });
    }

    // Create message
    const newMessage = await prisma.session_messages.create({
      data: {
        session_id: sessionId,
        sender_id: userId,
        sender_role: senderRole,
        content: message.trim(),
        message_type: "text",
      },
      select: {
        id: true,
        sender_id: true,
        sender_role: true,
        content: true,
        message_type: true,
        created_at: true,
      },
    });

    // Format response
    const formattedMessage = {
      id: newMessage.id,
      senderId: newMessage.sender_id,
      senderRole: newMessage.sender_role,
      message: newMessage.content,
      messageType: newMessage.message_type || "text",
      fileData: null,
      createdAt: newMessage.created_at?.toISOString(),
    };

    // Emit socket event to session room
    try {
      const io = getIO();
      const roomName = `session:${sessionId}`;
      console.log(`[Sessions] Emitting new-message (text) to room: ${roomName}`, formattedMessage);
      io.to(roomName).emit("new-message", formattedMessage);
      console.log(`[Sessions] Text message emitted successfully to room: ${roomName}`);
    } catch (socketError) {
      console.error("[Sessions] Error emitting socket event:", socketError);
      // Continue even if socket fails
    }

    res.status(201).json(formattedMessage);
  } catch (error: any) {
    console.error("[Sessions] Error sending message:", error);
    console.error("[Sessions] Error details:", {
      code: error?.code,
      meta: error?.meta,
      message: error?.message,
    });
    res.status(500).json({
      error: "Failed to send message",
      message: error?.message || "Internal server error",
      details: process.env.NODE_ENV === "development" ? error?.meta : undefined,
    });
  }
});

/**
 * POST /api/sessions/:sessionId/mock-payment
 * Create a mock payment for a session
 * After payment, updates session status to SCHEDULED (ONGOING) and generates schedule
 */
router.post("/:sessionId/mock-payment", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const sessionId = req.params.sessionId;
    const { paymentMethod } = req.body;

    // Only students can pay for sessions
    if (userRole !== "STUDENT") {
      return res.status(403).json({
        error: "Only students can complete payment",
      });
    }

    // Validate session exists and is in correct status
    const session = await prisma.sessions.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        student_id: true,
        status: true,
      },
    });

    if (!session) {
      return res.status(404).json({
        error: "Session not found",
      });
    }

    // Verify student owns this session
    if (session.student_id !== userId) {
      return res.status(403).json({
        error: "You can only pay for your own sessions",
      });
    }

    // Validate session is in APPROVED status (payment pending)
    if (session.status !== SessionStatus.APPROVED) {
      return res.status(400).json({
        error: `Session is not in payment pending status. Current status: ${session.status}`,
      });
    }

    // Import payment service (dynamic import to avoid circular dependencies)
    const { paymentService } = await import("../services/payment.service");

    // Create mock payment
    const payment = await paymentService.createMockPayment(
      sessionId,
      userId,
      paymentMethod || "MOCK"
    );

    // Get updated session
    const updatedSession = await prisma.sessions.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        status: true,
        updated_at: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "Payment completed successfully",
      payment: payment,
      session: updatedSession,
    });
  } catch (error: any) {
    console.error("[Sessions] Error processing mock payment:", error);
    res.status(500).json({
      error: "Failed to process payment",
      message: error?.message || "Internal server error",
    });
  }
});

/**
 * POST /api/sessions/:sessionId/payment
 * Legacy endpoint - redirects to mock-payment
 * @deprecated Use /mock-payment instead
 */
router.post("/:sessionId/payment", authenticateToken, async (req, res, next) => {
  // Redirect to mock-payment endpoint
  req.url = req.url.replace("/payment", "/mock-payment");
  // Use next() to continue to the next route handler
  next();
});

/**
 * POST /api/sessions/:sessionId/cancel
 * Cancel a pending session (student can cancel PENDING or APPROVED sessions)
 */
router.post("/:sessionId/cancel", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const sessionId = req.params.sessionId;

    // Only students can cancel their own sessions
    if (userRole !== "STUDENT") {
      return res.status(403).json({
        error: "Only students can cancel sessions",
      });
    }

    // Find session
    const session = await prisma.sessions.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        student_id: true,
        status: true,
      },
    });

    if (!session) {
      return res.status(404).json({
        error: "Session not found",
      });
    }

    // Verify student owns this session
    if (session.student_id !== userId) {
      return res.status(403).json({
        error: "You can only cancel your own sessions",
      });
    }

    // Only allow cancellation for PENDING or APPROVED sessions
    if (session.status !== SessionStatus.PENDING && session.status !== SessionStatus.APPROVED) {
      return res.status(400).json({
        error: "Only pending or approved sessions can be cancelled",
      });
    }

    // Update session status to CANCELLED
    await prisma.sessions.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.CANCELLED,
      },
    });

    res.status(200).json({
      success: true,
      message: "Session cancelled successfully",
    });
  } catch (error: any) {
    console.error("[Sessions] Error cancelling session:", error);
    res.status(500).json({
      error: "Failed to cancel session",
      message: error?.message || "Internal server error",
    });
  }
});

/**
 * DELETE /api/sessions/:sessionId
 * Delete a completed session (soft delete - only for completed sessions)
 */
router.delete("/:sessionId", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const sessionId = req.params.sessionId;

    // Only students can delete their own completed sessions
    if (userRole !== "STUDENT") {
      return res.status(403).json({
        error: "Only students can delete sessions",
      });
    }

    // Find session
    const session = await prisma.sessions.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        student_id: true,
        status: true,
      },
    });

    if (!session) {
      return res.status(404).json({
        error: "Session not found",
      });
    }

    // Verify student owns this session
    if (session.student_id !== userId) {
      return res.status(403).json({
        error: "You can only delete your own sessions",
      });
    }

    // Only allow deletion for COMPLETED sessions
    if (session.status !== SessionStatus.COMPLETED) {
      return res.status(400).json({
        error: "Only completed sessions can be deleted",
      });
    }

    // Delete session (cascade will handle related records)
    await prisma.sessions.delete({
      where: { id: sessionId },
    });

    res.status(200).json({
      success: true,
      message: "Session deleted successfully",
    });
  } catch (error: any) {
    console.error("[Sessions] Error deleting session:", error);
    res.status(500).json({
      error: "Failed to delete session",
      message: error?.message || "Internal server error",
    });
  }
});

/**
 * GET /api/sessions/:sessionId/schedule
 * Get session schedule (all sessions for this mentorship package)
 */
router.get("/:sessionId/schedule", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const sessionId = req.params.sessionId;

    // Verify session exists and user has access
    const session = await prisma.sessions.findUnique({
      where: { id: sessionId },
      select: { id: true, student_id: true, mentor_id: true },
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (session.student_id !== userId && session.mentor_id !== userId) {
      return res.status(403).json({ error: "You don't have access to this session's schedule" });
    }

    // Get session to get courseStartDate (scheduled_at)
    const sessionWithDate = await prisma.sessions.findUnique({
      where: { id: sessionId },
      select: { scheduled_at: true },
    });

    if (!sessionWithDate) {
      return res.status(404).json({ error: "Session not found" });
    }

    const courseStartDate = sessionWithDate.scheduled_at;

    // Update session schedule status based on current date/time
    const updatedSchedule = await updateSessionScheduleStatus(sessionId);

    // Import visibility utility
    const { shouldShowScheduleItem } = await import("../utils/sessionVisibility");

    // Filter schedule items - only show sessions from courseStartDate onwards
    const filteredSchedule = updatedSchedule.filter((item) => {
      if (!item.scheduled_date) return false;
      return shouldShowScheduleItem(item.scheduled_date, courseStartDate);
    });

    // Default sessions per week (since plan system is deprecated, use default)
    const sessionsPerWeek = 5; // Default

    // Format schedule for response
    const formattedSchedule = filteredSchedule.map((item) => {
      // Calculate continuous session number (1, 2, 3, 4, 5, 6, 7, 8...)
      // Formula: (week_number - 1) * sessions_per_week + session_number
      const continuousSessionNumber = (item.week_number - 1) * sessionsPerWeek + item.session_number;

      return {
        id: item.id,
        weekNumber: item.week_number,
        sessionNumber: continuousSessionNumber, // Continuous numbering: 1, 2, 3, 4, 5, 6, 7...
        topicTitle: item.topic_title,
        scheduledDate: item.scheduled_date?.toISOString() || null,
        scheduledTime: item.scheduled_time || null,
        status: item.status,
      };
    });

    res.json(formattedSchedule);
  } catch (error: any) {
    console.error("[Sessions] Error fetching schedule:", error);
    res.status(500).json({ error: "Failed to fetch schedule", message: error?.message || "Internal server error" });
  }
});

/**
 * POST /api/sessions/:sessionId/schedule/:scheduleId/complete
 * Mark a session schedule item as completed (MENTOR ONLY)
 */
router.post("/:sessionId/schedule/:scheduleId/complete", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const sessionId = req.params.sessionId;
    const scheduleId = parseInt(req.params.scheduleId);

    if (userRole !== "MENTOR") {
      return res.status(403).json({ error: "Only mentors can mark sessions as completed" });
    }

    // Verify session exists and mentor owns it
    const session = await prisma.sessions.findUnique({
      where: { id: sessionId },
      select: { id: true, mentor_id: true },
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (session.mentor_id !== userId) {
      return res.status(403).json({ error: "You don't have permission to complete this session" });
    }

    // Verify schedule item exists and belongs to this session
    const scheduleItem = await prisma.session_schedule.findFirst({
      where: {
        id: scheduleId,
        session_id: sessionId,
      },
    });

    if (!scheduleItem) {
      return res.status(404).json({ error: "Schedule item not found" });
    }

    // Only allow completing UPCOMING sessions
    if (scheduleItem.status !== "UPCOMING") {
      return res.status(400).json({
        error: `Cannot complete session. Current status is ${scheduleItem.status}. Only UPCOMING sessions can be completed.`,
      });
    }

    // Mark as COMPLETED
    await prisma.session_schedule.update({
      where: { id: scheduleId },
      data: { status: "COMPLETED" },
    });

    // Update course status (schedule item completion may change course from ONGOING to COMPLETED)
    const { recalculateCourseStatusForScheduleItem } = await import("../services/courseStatus.service");
    await recalculateCourseStatusForScheduleItem(scheduleId).catch((err) => {
      console.error("[Sessions] Error updating course status:", err);
      // Don't fail schedule update if course status update fails
    });

    // Re-run updateSessionScheduleStatus to unlock next session
    const updatedSchedule = await updateSessionScheduleStatus(sessionId);

    // Evaluate mentorship session status (COMPLETED only if ALL scheduled sessions are completed)
    const sessionStatus = await evaluateMentorshipSessionStatus(sessionId);

    // Format schedule for response
    const sessionsPerWeek = 5; // Default
    const formattedSchedule = updatedSchedule.map((item) => {
      const continuousSessionNumber = (item.week_number - 1) * sessionsPerWeek + item.session_number;
      return {
        id: item.id,
        weekNumber: item.week_number,
        sessionNumber: continuousSessionNumber,
        topicTitle: item.topic_title,
        scheduledDate: item.scheduled_date?.toISOString() || null,
        scheduledTime: item.scheduled_time || null,
        status: item.status,
      };
    });

    // Emit Socket.IO events
    try {
      const io = getIO();
      const roomName = `session:${sessionId}`;
      io.to(roomName).emit("schedule-updated", { sessionId, schedule: formattedSchedule });
      io.to(roomName).emit("mentorship-status-updated", {
        sessionId,
        status: sessionStatus.status,
        completedAt: sessionStatus.completedAt,
      });
    } catch (socketError) {
      console.error("[Sessions] Error emitting socket event:", socketError);
    }

    res.json({
      success: true,
      schedule: formattedSchedule,
    });
  } catch (error: any) {
    console.error("[Sessions] Error completing schedule item:", error);
    res.status(500).json({
      error: "Failed to complete session",
      message: error?.message || "Internal server error",
    });
  }
});

/**
 * POST /api/sessions/:sessionId/schedule/:scheduleId/resources
 * Upload PDF resource for a session schedule item (MENTOR ONLY)
 */
router.post("/:sessionId/schedule/:scheduleId/resources", authenticateToken, uploadSessionResource.single("file"), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const sessionId = req.params.sessionId;
    const scheduleId = parseInt(req.params.scheduleId);

    if (userRole !== "MENTOR") {
      return res.status(403).json({ error: "Only mentors can upload resources" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Verify session exists and mentor owns it
    const session = await prisma.sessions.findUnique({
      where: { id: sessionId },
      select: { id: true, mentor_id: true },
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (session.mentor_id !== userId) {
      return res.status(403).json({ error: "You don't have permission to upload resources for this session" });
    }

    // Verify schedule item exists and belongs to this session
    const scheduleItem = await prisma.session_schedule.findFirst({
      where: {
        id: scheduleId,
        session_id: sessionId,
      },
    });

    if (!scheduleItem) {
      return res.status(404).json({ error: "Schedule item not found" });
    }

    // Allow uploading for any session status (UPCOMING or COMPLETED)

    // Get file URL
    const fileURL = getFileURL(req.file.path);

    // Save resource to database
    const resource = await prisma.session_resources.create({
      data: {
        schedule_id: scheduleId,
        file_name: req.file.originalname,
        file_url: fileURL,
        file_size: req.file.size,
        uploaded_by: userId,
      },
    });

    // Emit Socket.IO event
    try {
      const io = getIO();
      const roomName = `session:${sessionId}`;
      io.to(roomName).emit("resource-uploaded", {
        sessionId,
        scheduleId,
        resource: {
          id: resource.id,
          fileName: resource.file_name,
          fileUrl: resource.file_url,
          fileSize: resource.file_size,
          uploadedAt: resource.created_at,
        },
      });
    } catch (socketError) {
      console.error("[Sessions] Error emitting socket event:", socketError);
    }

    res.json({
      success: true,
      resource: {
        id: resource.id,
        fileName: resource.file_name,
        fileUrl: resource.file_url,
        fileSize: resource.file_size,
        uploadedAt: resource.created_at,
      },
    });
  } catch (error: any) {
    console.error("[Sessions] Error uploading resource:", error);
    res.status(500).json({
      error: "Failed to upload resource",
      message: error?.message || "Internal server error",
    });
  }
});

/**
 * GET /api/sessions/:sessionId/schedule/:scheduleId/resources
 * Get all resources for a session schedule item
 */
router.get("/:sessionId/schedule/:scheduleId/resources", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const sessionId = req.params.sessionId;
    const scheduleId = parseInt(req.params.scheduleId);

    // Verify session exists and user has access
    const session = await prisma.sessions.findUnique({
      where: { id: sessionId },
      select: { id: true, student_id: true, mentor_id: true },
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Verify user is either student or mentor for this session
    if (session.student_id !== userId && session.mentor_id !== userId) {
      return res.status(403).json({ error: "You don't have access to this session's resources" });
    }

    // Verify schedule item exists and belongs to this session
    const scheduleItem = await prisma.session_schedule.findFirst({
      where: {
        id: scheduleId,
        session_id: sessionId,
      },
    });

    if (!scheduleItem) {
      return res.status(404).json({ error: "Schedule item not found" });
    }

    // Allow viewing resources for any session status

    // Fetch resources
    const resources = await prisma.session_resources.findMany({
      where: { schedule_id: scheduleId },
      orderBy: { created_at: "desc" },
    });

    res.json({
      resources: resources.map((r) => ({
        id: r.id,
        fileName: r.file_name,
        fileUrl: r.file_url,
        fileSize: r.file_size,
        uploadedAt: r.created_at,
      })),
    });
  } catch (error: any) {
    console.error("[Sessions] Error fetching resources:", error);
    res.status(500).json({
      error: "Failed to fetch resources",
      message: error?.message || "Internal server error",
    });
  }
});

/**
 * GET /api/sessions/:sessionId/notes
 * Get student's private notes for a session
 */
router.get("/:sessionId/notes", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const sessionId = req.params.sessionId;

    if (userRole !== "STUDENT") {
      return res.status(403).json({
        error: "Only students can access notes",
      });
    }

    // Verify session exists and student owns it
    const session = await prisma.sessions.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        student_id: true,
      },
    });

    if (!session) {
      return res.status(404).json({
        error: "Session not found",
      });
    }

    if (session.student_id !== userId) {
      return res.status(403).json({
        error: "You don't have access to this session's notes",
      });
    }

    // Get notes using raw SQL (table created on first save if doesn't exist)
    try {
      const notesResult = await prisma.$queryRaw<Array<{ notes: string | null }>>`
        SELECT notes FROM session_notes WHERE session_id = ${sessionId}::varchar AND student_id = ${userId}::varchar
      `;
      
      if (notesResult.length > 0) {
        return res.json({
          notes: notesResult[0].notes || "",
        });
      }
    } catch (error: any) {
      // Table doesn't exist yet, return empty notes
      if (error.message?.includes("does not exist")) {
        return res.json({ notes: "" });
      }
      throw error;
    }

    res.json({ notes: "" });
  } catch (error: any) {
    console.error("[Sessions] Error fetching notes:", error);
    res.status(500).json({
      error: "Failed to fetch notes",
      message: error?.message || "Internal server error",
    });
  }
});

/**
 * POST /api/sessions/:sessionId/notes
 * Save student's private notes for a session
 */
router.post("/:sessionId/notes", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const sessionId = req.params.sessionId;
    const { notes } = req.body;

    if (userRole !== "STUDENT") {
      return res.status(403).json({
        error: "Only students can save notes",
      });
    }

    // Verify session exists and student owns it
    const session = await prisma.sessions.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        student_id: true,
      },
    });

    if (!session) {
      return res.status(404).json({
        error: "Session not found",
      });
    }

    if (session.student_id !== userId) {
      return res.status(403).json({
        error: "You don't have permission to save notes for this session",
      });
    }

    // Save notes using raw SQL (upsert pattern)
    // Create table if it doesn't exist (for development)
    try {
      await prisma.$executeRaw`
        INSERT INTO session_notes (session_id, student_id, notes, updated_at)
        VALUES (${sessionId}::varchar, ${userId}::varchar, ${notes || ""}::text, NOW())
        ON CONFLICT (session_id, student_id)
        DO UPDATE SET notes = ${notes || ""}::text, updated_at = NOW()
      `;
    } catch (error: any) {
      // If table doesn't exist, create it first (for development)
      if (error.message?.includes("does not exist")) {
        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS session_notes (
            id SERIAL PRIMARY KEY,
            session_id VARCHAR(255) NOT NULL,
            student_id VARCHAR(255) NOT NULL,
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(session_id, student_id)
          )
        `;
        // Retry insert
        await prisma.$executeRaw`
          INSERT INTO session_notes (session_id, student_id, notes, updated_at)
          VALUES (${sessionId}::varchar, ${userId}::varchar, ${notes || ""}::text, NOW())
        `;
      } else {
        throw error;
      }
    }

    res.json({
      success: true,
      message: "Notes saved successfully",
    });
  } catch (error: any) {
    console.error("[Sessions] Error saving notes:", error);
    res.status(500).json({
      error: "Failed to save notes",
      message: error?.message || "Internal server error",
    });
  }
});

/**
 * GET /api/sessions/:sessionId
 * Get session details (for both student and mentor)
 * MUST be after all specific routes (/messages, /notes, etc.) to avoid route conflicts
 */
router.get("/:sessionId", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const sessionId = req.params.sessionId;

    // Get session with mentor, student, course, plan, and payment info
    const session = await prisma.sessions.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        student_id: true,
        mentor_id: true,
        course_id: true,
        session_type: true,
        status: true,
        scheduled_at: true,
        created_at: true,
        updated_at: true,
        completed_at: true,
        student_message: true,
        skill_name: true,
        plan_id: true,
        zoom_link: true,
        zoom_link_expires_at: true,
        users_mentor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        users_student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        courses: {
          select: {
            id: true,
            title: true,
            career_id: true,
          },
        },
        plans: {
          select: {
            id: true,
            skill_name: true,
            plan_key: true,
            plan_title: true,
            price: true,
            duration_weeks: true,
            sessions_per_week: true,
            description: true,
          },
        },
        payments: {
          select: {
            id: true,
            status: true,
            amount: true,
            currency: true,
            completed_at: true,
            payment_method: true,
          },
        },
      },
    });

    if (!session) {
      return res.status(404).json({
        error: "Session not found",
      });
    }

    // Verify user has access (student or mentor of this session)
    if (session.student_id !== userId && session.mentor_id !== userId) {
      return res.status(403).json({
        error: "You don't have access to this session",
      });
    }

    // Safety sync: Evaluate mentorship session status based on scheduled sessions
    // This ensures the session status is correct even if it was changed elsewhere
    try {
      const evaluatedStatus = await evaluateMentorshipSessionStatus(sessionId);
      // Re-fetch session to get updated status if it changed
      if (evaluatedStatus.status !== session.status) {
        const updatedSession = await prisma.sessions.findUnique({
          where: { id: sessionId },
          select: {
            status: true,
            completed_at: true,
          },
        });
        if (updatedSession) {
          session.status = updatedSession.status;
          session.completed_at = updatedSession.completed_at;
        }
      }
    } catch (error) {
      console.error("[Sessions] Error evaluating session status:", error);
      // Continue with original session data if evaluation fails
    }

    // Build response with all session details
    const response: any = {
      id: session.id,
      status: session.status,
      sessionType: session.session_type || null,
      scheduledAt: session.scheduled_at?.toISOString() || null,
      createdAt: session.created_at?.toISOString() || null,
      updatedAt: session.updated_at?.toISOString() || null,
      completedAt: session.completed_at?.toISOString() || null,
      studentMessage: session.student_message || null,
      zoomLink: session.zoom_link || null,
      zoomLinkExpiresAt: session.zoom_link_expires_at?.toISOString() || null,
      skillName: session.skill_name || "Unknown (Legacy)", // From sessions.skill_name (snapshot)
      courseName: session.courses?.title || session.session_type || "Session",
    };

    // Add mentor info
    if (session.users_mentor) {
      response.mentor = {
        id: session.users_mentor.id,
        name: session.users_mentor.name || "Unknown Mentor",
        email: session.users_mentor.email || null,
      };
    }

    // Add student info
    if (session.users_student) {
      response.student = {
        id: session.users_student.id,
        name: session.users_student.name || "Unknown Student",
        email: session.users_student.email || null,
      };
    }

    // Add plan info
    if (session.plans) {
      response.plan = {
        id: session.plans.id,
        skillName: session.plans.skill_name,
        planKey: session.plans.plan_key,
        planTitle: session.plans.plan_title,
        price: session.plans.price.toNumber(),
        durationWeeks: session.plans.duration_weeks,
        sessionsPerWeek: session.plans.sessions_per_week,
        description: session.plans.description,
      };
    }

    // Add payment info
    if (session.payments) {
      response.payment = {
        id: session.payments.id,
        status: session.payments.status,
        amount: session.payments.amount.toNumber(),
        currency: session.payments.currency,
        completedAt: session.payments.completed_at?.toISOString() || null,
        paymentMethod: session.payments.payment_method || null,
      };
      response.hasPayment = session.payments.status === PaymentStatus.SUCCESS;
    } else {
      response.hasPayment = false;
    }

    res.json(response);
  } catch (error: any) {
    console.error("[Sessions] Error fetching session details:", error);
    res.status(500).json({
      error: "Failed to fetch session details",
      message: error?.message || "Internal server error",
    });
  }
});

/**
 * POST /api/sessions/:sessionId/upload
 * Upload a file for a session
 */
router.post("/:sessionId/upload", authenticateToken, uploadFile.single("file"), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const sessionId = req.params.sessionId;

    if (!req.file) {
      return res.status(400).json({
        error: "No file provided",
      });
    }

    // Verify session exists and user has access
    const session = await prisma.sessions.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        student_id: true,
        mentor_id: true,
        status: true,
      },
    });

    if (!session) {
      return res.status(404).json({
        error: "Session not found",
      });
    }

    // Check authorization: only session student or mentor can upload files
    if (session.student_id !== userId && session.mentor_id !== userId) {
      return res.status(403).json({
        error: "You don't have permission to upload files in this session",
      });
    }

    // Check if chat is enabled based on session status
    if (session.status === SessionStatus.PENDING || session.status === SessionStatus.APPROVED) {
      return res.status(403).json({
        error: "Chat is disabled. Please complete payment first.",
      });
    }
    if (session.status === SessionStatus.COMPLETED || session.status === SessionStatus.CANCELLED) {
      return res.status(403).json({
        error: "Chat is read-only for completed/cancelled sessions.",
      });
    }

    // Determine sender role from JWT
    const senderRole = userRole === "STUDENT" ? "STUDENT" : "MENTOR";

    // Verify the sender role matches the session participant
    if (userRole === "STUDENT" && session.student_id !== userId) {
      return res.status(403).json({
        error: "Only the student of this session can upload files as STUDENT",
      });
    }
    if (userRole === "MENTOR" && session.mentor_id !== userId) {
      return res.status(403).json({
        error: "Only the mentor of this session can upload files as MENTOR",
      });
    }

    // Get file URL
    const fileURL = getFileURL(req.file.path);

    // Store file metadata as JSON in content field
    const fileMetadata = {
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileURL: fileURL,
      fileSize: req.file.size,
    };

    // Create message with file metadata
    const newMessage = await prisma.session_messages.create({
      data: {
        session_id: sessionId,
        sender_id: userId,
        sender_role: senderRole,
        content: JSON.stringify(fileMetadata),
        message_type: "file",
      },
      select: {
        id: true,
        sender_id: true,
        sender_role: true,
        content: true,
        message_type: true,
        created_at: true,
      },
    });

    // Format response
    const formattedMessage = {
      id: newMessage.id,
      senderId: newMessage.sender_id,
      senderRole: newMessage.sender_role,
      message: null,
      messageType: "file",
      fileData: fileMetadata,
      createdAt: newMessage.created_at?.toISOString(),
    };

    // Emit socket event to session room
    try {
      const io = getIO();
      const roomName = `session:${sessionId}`;
      console.log(`[Sessions] Emitting new-message (file) to room: ${roomName}`, formattedMessage);
      io.to(roomName).emit("new-message", formattedMessage);
      console.log(`[Sessions] File message emitted successfully to room: ${roomName}`);
    } catch (socketError) {
      console.error("[Sessions] Error emitting socket event:", socketError);
      // Continue even if socket fails
    }

    res.status(201).json(formattedMessage);
  } catch (error: any) {
    console.error("[Sessions] Error uploading file:", error);
    res.status(500).json({
      error: "Failed to upload file",
      message: error?.message || "Internal server error",
    });
  }
});

/**
 * POST /api/sessions/:sessionId/zoom-link
 * Mentor shares a Zoom meeting link for the session
 * Only allowed when session status is SCHEDULED
 */
router.post("/:sessionId/zoom-link", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const sessionId = req.params.sessionId;
    const { zoomLink } = req.body;

    // Only mentors can share Zoom links
    if (userRole !== "MENTOR") {
      return res.status(403).json({
        error: "Only mentors can share Zoom meeting links",
      });
    }

    // Validate zoom link is provided
    if (!zoomLink || typeof zoomLink !== "string" || zoomLink.trim().length === 0) {
      return res.status(400).json({
        error: "Zoom link is required",
      });
    }

    // Validate zoom link format (basic check - should start with http:// or https://)
    const trimmedLink = zoomLink.trim();
    if (!trimmedLink.startsWith("http://") && !trimmedLink.startsWith("https://")) {
      return res.status(400).json({
        error: "Invalid Zoom link format. Link must start with http:// or https://",
      });
    }

    // Validate session exists and belongs to this mentor
    const session = await prisma.sessions.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        mentor_id: true,
        student_id: true,
        status: true,
        zoom_link: true,
      },
    });

    if (!session) {
      return res.status(404).json({
        error: "Session not found",
      });
    }

    // Verify mentor owns this session
    if (session.mentor_id !== userId) {
      return res.status(403).json({
        error: "You don't have permission to share Zoom links for this session",
      });
    }

    // Allow sharing for SCHEDULED or COMPLETED sessions
    // COMPLETED sessions can be reused with a new Zoom link
    if (session.status !== SessionStatus.SCHEDULED && session.status !== SessionStatus.COMPLETED) {
      return res.status(400).json({
        error: "Zoom links can only be shared for scheduled or completed sessions",
      });
    }

    // Determine if this is a new meeting (session was COMPLETED) or updating existing link
    const isNewMeeting = session.status === SessionStatus.COMPLETED;
    
    // Update session with zoom link and set status to SCHEDULED if it was COMPLETED
    const updatedSession = await prisma.sessions.update({
      where: { id: sessionId },
      data: {
        zoom_link: trimmedLink,
        zoom_link_expires_at: null, // Clear expiration for new link
        status: SessionStatus.SCHEDULED, // Reactivate session if it was COMPLETED
        updated_at: new Date(),
      },
      select: {
        id: true,
        status: true,
        zoom_link: true,
      },
    });

    // Create a session message for the zoom link
    const messageText = isNewMeeting ? "New video call started" : "Video call link shared";
    const zoomMessage = await prisma.session_messages.create({
      data: {
        session_id: sessionId,
        sender_id: userId,
        sender_role: "MENTOR",
        content: JSON.stringify({
          zoomLink: trimmedLink,
          message: messageText,
        }),
        message_type: "zoom_link",
      },
      select: {
        id: true,
        sender_id: true,
        sender_role: true,
        content: true,
        message_type: true,
        created_at: true,
      },
    });

    // Format response message
    const formattedMessage = {
      id: zoomMessage.id,
      senderId: zoomMessage.sender_id,
      senderRole: zoomMessage.sender_role,
      message: messageText,
      messageType: "zoom_link",
      zoomLink: trimmedLink,
      createdAt: zoomMessage.created_at?.toISOString(),
    };

    // Emit session-updated event if this is a new meeting (reactivating session)
    if (isNewMeeting) {
      try {
        const io = getIO();
        const roomName = `session:${sessionId}`;
        io.to(roomName).emit("session-updated", {
          sessionId: updatedSession.id,
          status: updatedSession.status,
          zoomLink: updatedSession.zoom_link,
        });
        console.log(`[Sessions] Session ${sessionId} reactivated, session-updated event emitted`);
      } catch (socketError) {
        console.error("[Sessions] Error emitting session-updated event:", socketError);
      }
    }

    // Emit socket event to session room
    try {
      const io = getIO();
      const roomName = `session:${sessionId}`;
      console.log(`[Sessions] Emitting new-message (zoom_link) to room: ${roomName}`, formattedMessage);
      io.to(roomName).emit("new-message", formattedMessage);
      console.log(`[Sessions] Zoom link message emitted successfully to room: ${roomName}`);
    } catch (socketError) {
      console.error("[Sessions] Error emitting socket event:", socketError);
      // Continue even if socket fails
    }

    res.status(201).json({
      success: true,
      zoomLink: updatedSession.zoom_link,
      message: formattedMessage,
    });
  } catch (error: any) {
    console.error("[Sessions] Error sharing Zoom link:", error);
    res.status(500).json({
      error: "Failed to share Zoom link",
      message: error?.message || "Internal server error",
    });
  }
});

/**
 * POST /api/sessions/:sessionId/complete
 * Mentor ends/completes a session
 * Only allowed when session status is SCHEDULED
 */
router.post("/:sessionId/complete", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const sessionId = req.params.sessionId;

    // Only mentors can complete sessions
    if (userRole !== "MENTOR") {
      return res.status(403).json({
        error: "Only mentors can end sessions",
      });
    }

    // Validate session exists and belongs to this mentor
    const session = await prisma.sessions.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        mentor_id: true,
        student_id: true,
        status: true,
        zoom_link: true,
      },
    });

    if (!session) {
      return res.status(404).json({
        error: "Session not found",
      });
    }

    // Verify mentor owns this session
    if (session.mentor_id !== userId) {
      return res.status(403).json({
        error: "You don't have permission to end this session",
      });
    }

    // Only allow completing when session is SCHEDULED
    if (session.status !== SessionStatus.SCHEDULED) {
      return res.status(403).json({
        error: "Only scheduled sessions can be completed",
      });
    }

    // Invalidate zoom link but DO NOT mark session as COMPLETED
    // Session is only COMPLETED when ALL scheduled sessions are completed (handled by evaluateMentorshipSessionStatus)
    const updatedSession = await prisma.sessions.update({
      where: { id: sessionId },
      data: {
        zoom_link: null,
        zoom_link_expires_at: new Date(),
        updated_at: new Date(),
        // DO NOT set status to COMPLETED or completed_at here
        // Status will be evaluated by evaluateMentorshipSessionStatus based on scheduled sessions
      },
      select: {
        id: true,
        status: true,
        zoom_link: true,
        completed_at: true,
      },
    });

    // Evaluate mentorship session status (will mark as COMPLETED only if ALL scheduled sessions are completed)
    const sessionStatus = await evaluateMentorshipSessionStatus(sessionId);
    
    // Re-fetch session to get updated status if it changed
    const finalSession = await prisma.sessions.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        status: true,
        zoom_link: true,
        completed_at: true,
      },
    });

    // Create system message
    const systemMessage = await prisma.session_messages.create({
      data: {
        session_id: sessionId,
        sender_id: userId,
        sender_role: "MENTOR",
        content: "Meeting ended",
        message_type: "system",
      },
      select: {
        id: true,
        sender_id: true,
        sender_role: true,
        content: true,
        message_type: true,
        created_at: true,
      },
    });

    // Format system message for Socket.IO
    const formattedSystemMessage = {
      id: systemMessage.id,
      senderId: systemMessage.sender_id,
      senderRole: systemMessage.sender_role,
      message: systemMessage.content,
      messageType: "system",
      createdAt: systemMessage.created_at?.toISOString(),
    };

    // Emit Socket.IO events
    try {
      const io = getIO();
      const roomName = `session:${sessionId}`;
      const finalStatus = finalSession?.status || updatedSession.status;
      
      // Emit session update event
      io.to(roomName).emit("session-updated", {
        sessionId: finalSession?.id || updatedSession.id,
        status: finalStatus,
        zoomLink: null,
        completedAt: finalSession?.completed_at || updatedSession.completed_at,
      });
      
      // Emit system message
      io.to(roomName).emit("new-message", formattedSystemMessage);
      
      // Emit mentorship status update if status changed
      if (finalSession && finalSession.status !== session.status) {
        io.to(roomName).emit("mentorship-status-updated", {
          sessionId: finalSession.id,
          status: finalSession.status,
          completedAt: finalSession.completed_at,
        });
      }
      
      console.log(`[Sessions] Session ${sessionId} meeting ended, events emitted to room: ${roomName}`);
    } catch (socketError) {
      console.error("[Sessions] Error emitting socket events:", socketError);
      // Continue even if socket fails
    }

    res.json({
      success: true,
      session: {
        id: finalSession?.id || updatedSession.id,
        status: finalSession?.status || updatedSession.status,
        zoomLink: null,
        completedAt: finalSession?.completed_at?.toISOString() || updatedSession.completed_at?.toISOString(),
      },
      message: formattedSystemMessage,
    });
  } catch (error: any) {
    console.error("[Sessions] Error completing session:", error);
    res.status(500).json({
      error: "Failed to complete session",
      message: error?.message || "Internal server error",
    });
  }
});

export default router;

