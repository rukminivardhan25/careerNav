/**
 * Assignment Service
 * Business logic for assignment operations
 */
import { PrismaClient, SubmissionStatus, ReviewStatus } from "@prisma/client";

const prisma = new PrismaClient();

export class AssignmentService {
  /**
   * Create a new assignment (MENTOR ONLY)
   */
  async createAssignment(
    mentorId: string,
    sessionId: string,
    title: string,
    description?: string
  ): Promise<any> {
    try {
      // Verify mentor owns the session
      const session = await prisma.sessions.findFirst({
        where: {
          id: sessionId,
          mentor_id: mentorId,
        },
      });

      if (!session) {
        throw new Error("Session not found or you don't have permission to create assignments for this session");
      }

      // Calculate due_at (24 hours from now)
      const dueAt = new Date();
      dueAt.setHours(dueAt.getHours() + 24);

      // Create assignment
      const assignment = await prisma.assignments.create({
        data: {
          session_id: sessionId,
          mentor_id: mentorId,
          title,
          description: description || null,
          due_at: dueAt,
          is_active: true,
        },
        include: {
          sessions: {
            select: {
              id: true,
              student_id: true,
              mentor_id: true,
            },
          },
        },
      });

      return assignment;
    } catch (error: any) {
      console.error("[AssignmentService] createAssignment error:", error);
      throw error;
    }
  }

  /**
   * Get assignments for a session (STUDENT & MENTOR)
   */
  async getAssignments(sessionId: string, userId: string, userRole: string): Promise<any[]> {
    try {
      // Verify user has access to this session
      const session = await prisma.sessions.findFirst({
        where: {
          id: sessionId,
          OR: [
            { student_id: userId },
            { mentor_id: userId },
          ],
        },
      });

      if (!session) {
        throw new Error("Session not found or access denied");
      }

      // Get assignments
      const assignments = await prisma.assignments.findMany({
        where: {
          session_id: sessionId,
          is_active: true,
        },
        include: {
          assignment_submissions: userRole === "STUDENT"
            ? {
                where: {
                  student_id: userId,
                },
                select: {
                  id: true,
                  file_url: true,
                  submitted_at: true,
                  status: true,
                  review_status: true,
                  mentor_feedback: true,
                  reviewed_at: true,
                },
              }
            : {
                select: {
                  id: true,
                  file_url: true,
                  submitted_at: true,
                  status: true,
                  review_status: true,
                  mentor_feedback: true,
                  reviewed_at: true,
                },
              },
        },
        orderBy: {
          created_at: "desc",
        },
      });

      // Format response
      return assignments.map((assignment) => {
        const rawSubmission = userRole === "STUDENT"
          ? (Array.isArray(assignment.assignment_submissions) ? assignment.assignment_submissions[0] : assignment.assignment_submissions) || null
          : assignment.assignment_submissions;

        // Format submission with review fields
        const submission = rawSubmission && !Array.isArray(rawSubmission)
          ? {
              id: rawSubmission.id,
              fileUrl: rawSubmission.file_url,
              submittedAt: rawSubmission.submitted_at,
              status: rawSubmission.status,
              reviewStatus: rawSubmission.review_status,
              mentorFeedback: rawSubmission.mentor_feedback,
              reviewedAt: rawSubmission.reviewed_at,
            }
          : null;

        return {
          id: assignment.id,
          sessionId: assignment.session_id,
          mentorId: assignment.mentor_id,
          title: assignment.title,
          description: assignment.description,
          createdAt: assignment.created_at,
          dueAt: assignment.due_at,
          isActive: assignment.is_active,
          submission: submission,
          submissionStatus: submission
            ? submission.status
            : null,
        };
      });
    } catch (error: any) {
      console.error("[AssignmentService] getAssignments error:", error);
      throw error;
    }
  }

  /**
   * Submit assignment (STUDENT ONLY)
   */
  async submitAssignment(
    studentId: string,
    assignmentId: number,
    fileUrl: string
  ): Promise<any> {
    try {
      // Get assignment with session and student info
      const assignment = await prisma.assignments.findUnique({
        where: {
          id: assignmentId,
        },
        include: {
          sessions: {
            include: {
              users_student: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!assignment) {
        throw new Error("Assignment not found");
      }

      // Verify student owns the session
      if (assignment.sessions.student_id !== studentId) {
        throw new Error("You don't have permission to submit this assignment");
      }

      // Check if already submitted
      const existingSubmission = await prisma.assignment_submissions.findFirst({
        where: {
          assignment_id: assignmentId,
          student_id: studentId,
        },
      });

      if (existingSubmission) {
        throw new Error("Assignment already submitted");
      }

      // Determine status (SUBMITTED or LATE)
      const now = new Date();
      const isLate = now > assignment.due_at;
      const status = isLate ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED;

      // Create submission
      const submission = await prisma.assignment_submissions.create({
        data: {
          assignment_id: assignmentId,
          student_id: studentId,
          file_url: fileUrl,
          submitted_at: now,
          status,
        },
        include: {
          assignments: {
            include: {
              sessions: {
                select: {
                  id: true,
                  mentor_id: true,
                  student_id: true,
                },
              },
            },
          },
        },
      });

      // Create notification for mentor when student submits assignment
      // Note: Rating is not available at submission time, so we'll show without rating
      const { notificationService } = await import("./notification.service");
      await notificationService.createNotification(
        assignment.mentor_id,
        "new_review_received",
        "New Review Received",
        `⭐ New review received`,
        submission.id.toString()
      );

      return submission;
    } catch (error: any) {
      console.error("[AssignmentService] submitAssignment error:", error);
      throw error;
    }
  }

  /**
   * Get assignment details with submissions (MENTOR ONLY)
   */
  async getAssignmentDetails(mentorId: string, assignmentId: number): Promise<any> {
    try {
      const assignment = await prisma.assignments.findFirst({
        where: {
          id: assignmentId,
          mentor_id: mentorId,
        },
        include: {
          sessions: {
            select: {
              id: true,
              student_id: true,
              users_student: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          assignment_submissions: {
            include: {
              users_student: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: {
              submitted_at: "desc",
            },
          },
        },
      });

      if (!assignment) {
        throw new Error("Assignment not found or access denied");
      }

      return {
        id: assignment.id,
        sessionId: assignment.session_id,
        mentorId: assignment.mentor_id,
        title: assignment.title,
        description: assignment.description,
        createdAt: assignment.created_at,
        dueAt: assignment.due_at,
        isActive: assignment.is_active,
        student: assignment.sessions.users_student,
        submissions: assignment.assignment_submissions.map((sub) => ({
          id: sub.id,
          studentId: sub.student_id,
          student: sub.users_student,
          fileUrl: sub.file_url,
          submittedAt: sub.submitted_at,
          status: sub.status,
        })),
      };
    } catch (error: any) {
      console.error("[AssignmentService] getAssignmentDetails error:", error);
      throw error;
    }
  }

  /**
   * Verify assignment submission (MENTOR ONLY)
   */
  async verifyAssignment(
    mentorId: string,
    submissionId: number,
    mentorFeedback?: string
  ): Promise<any> {
    try {
      // Get submission with assignment and session info
      const submission = await prisma.assignment_submissions.findUnique({
        where: {
          id: submissionId,
        },
        include: {
          assignments: {
            include: {
              sessions: {
                select: {
                  id: true,
                  mentor_id: true,
                  student_id: true,
                },
              },
            },
          },
          users_student: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!submission) {
        throw new Error("Submission not found");
      }

      // Verify mentor owns the assignment
      if (submission.assignments.mentor_id !== mentorId) {
        throw new Error("You don't have permission to verify this assignment");
      }

      // Update submission
      const updatedSubmission = await prisma.assignment_submissions.update({
        where: {
          id: submissionId,
        },
        data: {
          review_status: ReviewStatus.VERIFIED,
          mentor_feedback: mentorFeedback || null,
          reviewed_at: new Date(),
        },
        include: {
          assignments: {
            include: {
              sessions: {
                select: {
                  id: true,
                  mentor_id: true,
                  student_id: true,
                },
              },
            },
          },
          users_student: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return updatedSubmission;
    } catch (error: any) {
      console.error("[AssignmentService] verifyAssignment error:", error);
      throw error;
    }
  }
}

export const assignmentService = new AssignmentService();

