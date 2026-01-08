/**
 * Assignment routes
 * For mentors to create assignments and students to submit them
 */
import express from "express";
import { authenticateToken } from "../middlewares/auth.middleware";
import { assignmentService } from "../services/assignment.service";
import { uploadAssignmentFile, getFileURL } from "../utils/fileUpload";
import { getIO } from "../config/socket";
import path from "path";

const router = express.Router();

/**
 * POST /api/assignments
 * Create a new assignment (MENTOR ONLY)
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    if (userRole !== "MENTOR") {
      return res.status(403).json({
        error: "Only mentors can create assignments",
      });
    }

    const { sessionId, title, description } = req.body;

    if (!sessionId || !title) {
      return res.status(400).json({
        error: "Missing required fields: sessionId, title",
      });
    }

    const assignment = await assignmentService.createAssignment(
      userId,
      sessionId,
      title,
      description
    );

    // Emit socket event to session room
    try {
      const io = getIO();
      const roomName = `session:${sessionId}`;
      io.to(roomName).emit("assignment-created", {
        assignment: {
          id: assignment.id,
          sessionId: assignment.session_id,
          title: assignment.title,
          description: assignment.description,
          createdAt: assignment.created_at,
          dueAt: assignment.due_at,
        },
      });
    } catch (socketError) {
      console.error("[Assignments] Error emitting socket event:", socketError);
    }

    res.status(201).json({
      success: true,
      assignment: {
        id: assignment.id,
        sessionId: assignment.session_id,
        title: assignment.title,
        description: assignment.description,
        createdAt: assignment.created_at,
        dueAt: assignment.due_at,
      },
    });
  } catch (error: any) {
    console.error("[Assignments] Error creating assignment:", error);
    res.status(500).json({
      error: "Failed to create assignment",
      message: error?.message || "Internal server error",
    });
  }
});

/**
 * GET /api/assignments?sessionId=:sessionId
 * Get assignments for a session (STUDENT & MENTOR)
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const sessionId = req.query.sessionId as string;

    if (!sessionId) {
      return res.status(400).json({
        error: "Missing required query parameter: sessionId",
      });
    }

    const assignments = await assignmentService.getAssignments(
      sessionId,
      userId,
      userRole
    );

    res.json({
      success: true,
      assignments,
    });
  } catch (error: any) {
    console.error("[Assignments] Error fetching assignments:", error);
    res.status(500).json({
      error: "Failed to fetch assignments",
      message: error?.message || "Internal server error",
    });
  }
});

/**
 * POST /api/assignments/:assignmentId/submit
 * Submit assignment (STUDENT ONLY)
 */
router.post("/:assignmentId/submit", authenticateToken, uploadAssignmentFile.single("file"), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const assignmentId = parseInt(req.params.assignmentId);

    if (userRole !== "STUDENT") {
      return res.status(403).json({
        error: "Only students can submit assignments",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: "File is required",
      });
    }

    // Get file URL
    const fileUrl = getFileURL(req.file.path);

    const submission = await assignmentService.submitAssignment(
      userId,
      assignmentId,
      fileUrl
    );

    // Emit socket event to session room
    try {
      const io = getIO();
      const sessionId = submission.assignments.sessions.id;
      const roomName = `session:${sessionId}`;
      io.to(roomName).emit("assignment-submitted", {
        assignmentId: submission.assignment_id,
        submission: {
          id: submission.id,
          studentId: submission.student_id,
          fileUrl: submission.file_url,
          submittedAt: submission.submitted_at,
          status: submission.status,
        },
      });
    } catch (socketError) {
      console.error("[Assignments] Error emitting socket event:", socketError);
    }

    res.status(201).json({
      success: true,
      submission: {
        id: submission.id,
        assignmentId: submission.assignment_id,
        fileUrl: submission.file_url,
        submittedAt: submission.submitted_at,
        status: submission.status,
      },
    });
  } catch (error: any) {
    console.error("[Assignments] Error submitting assignment:", error);
    res.status(500).json({
      error: "Failed to submit assignment",
      message: error?.message || "Internal server error",
    });
  }
});

/**
 * GET /api/assignments/:assignmentId
 * Get assignment details with submissions (MENTOR ONLY)
 */
router.get("/:assignmentId", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const assignmentId = parseInt(req.params.assignmentId);

    if (userRole !== "MENTOR") {
      return res.status(403).json({
        error: "Only mentors can view assignment details",
      });
    }

    const assignment = await assignmentService.getAssignmentDetails(
      userId,
      assignmentId
    );

    res.json({
      success: true,
      assignment,
    });
  } catch (error: any) {
    console.error("[Assignments] Error fetching assignment details:", error);
    res.status(500).json({
      error: "Failed to fetch assignment details",
      message: error?.message || "Internal server error",
    });
  }
});

/**
 * POST /api/assignments/:submissionId/verify
 * Verify assignment submission (MENTOR ONLY)
 */
router.post("/:submissionId/verify", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const submissionId = parseInt(req.params.submissionId);
    const { mentor_feedback } = req.body;

    if (userRole !== "MENTOR") {
      return res.status(403).json({
        error: "Only mentors can verify assignments",
      });
    }

    const submission = await assignmentService.verifyAssignment(
      userId,
      submissionId,
      mentor_feedback
    );

    // Emit socket event to session room
    try {
      const io = getIO();
      const sessionId = submission.assignments.sessions.id;
      const roomName = `session:${sessionId}`;
      io.to(roomName).emit("assignment-verified", {
        submissionId: submission.id,
        assignmentId: submission.assignment_id,
        reviewStatus: submission.review_status,
        mentorFeedback: submission.mentor_feedback,
        reviewedAt: submission.reviewed_at,
      });
    } catch (socketError) {
      console.error("[Assignments] Error emitting socket event:", socketError);
    }

    res.json({
      success: true,
      submission: {
        id: submission.id,
        assignmentId: submission.assignment_id,
        reviewStatus: submission.review_status,
        mentorFeedback: submission.mentor_feedback,
        reviewedAt: submission.reviewed_at,
      },
    });
  } catch (error: any) {
    console.error("[Assignments] Error verifying assignment:", error);
    res.status(500).json({
      error: "Failed to verify assignment",
      message: error?.message || "Internal server error",
    });
  }
});

export default router;

