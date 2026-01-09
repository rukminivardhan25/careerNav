/**
 * Mentor Service
 * Business logic for mentor operations
 */
import { PrismaClient, SessionStatus, TestStatus, PaymentStatus, ReviewStatus, ScheduleStatus } from "@prisma/client";
import { getISTNow, getISTTodayStart, getISTTodayEnd, createISTDateTimeFromSchedule, getISTDateComponents, getISTTimeComponents } from "../utils/istTime";

const prisma = new PrismaClient();

// ============================================
// PUBLIC METHODS (Student Discovery)
// ============================================

export class MentorService {
  /**
   * Get all mentors (for student discovery)
   */
  async getAllMentors(
    courseId?: string,
    search?: string
  ): Promise<any[]> {
    try {
      // Only show mentors who have passed at least one test (verified)
      const where: any = {
        mentor_course_verifications: {
          some: {
            is_active: true,
          },
        },
      };

      // Filter by course if provided
      if (courseId) {
        where.mentor_course_verifications = {
          some: {
            course: {
              career_id: courseId,
            },
            is_active: true,
          },
        };
      }

      const mentors = await prisma.mentor_profiles.findMany({
        where,
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          mentor_course_verifications: {
            where: {
              is_active: true,
            },
            include: {
              courses: true,
            },
          },
        },
      });

      // Filter by search if provided
      let filteredMentors = mentors;
      if (search) {
        const searchLower = search.toLowerCase();
        filteredMentors = mentors.filter(
          (m) =>
            m.full_name?.toLowerCase().includes(searchLower) ||
            m.bio?.toLowerCase().includes(searchLower) ||
            m.expertise_areas.some((area) =>
              area.toLowerCase().includes(searchLower)
            )
        );
      }

      return filteredMentors.map((mentor) => ({
        id: mentor.user_id,
        name: mentor.full_name || mentor.users.name,
        email: mentor.users.email,
        bio: mentor.bio,
        rating: mentor.rating,
        totalReviews: mentor.total_reviews,
        verifiedCourses: mentor.mentor_course_verifications.map((vc) => ({
          courseId: vc.courses.career_id,
          courseName: vc.courses.title,
          verifiedAt: vc.verified_at,
          score: vc.verification_score,
        })),
        sessionTypes: mentor.session_types,
        pricingPerHour: mentor.pricing_per_hour,
      }));
    } catch (error) {
      console.error("[MentorService] getAllMentors error:", error);
      throw error;
    }
  }

  /**
   * Get mentor by ID
   */
  async getMentorById(mentorId: string): Promise<any | null> {
    try {
      const mentor = await prisma.mentor_profiles.findUnique({
        where: { user_id: mentorId },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          mentor_experiences: {
            orderBy: {
              start_date: "desc",
            },
          },
          mentor_course_verifications: {
            where: {
              is_active: true,
            },
            include: {
              courses: true,
            },
          },
        },
      });

      if (!mentor) return null;

      return {
        id: mentor.user_id,
        name: mentor.full_name || mentor.users.name,
        email: mentor.users.email,
        bio: mentor.bio,
        currentRole: mentor.current_role,
        education: {
          highestQualification: mentor.highest_qualification,
          degree: mentor.degree,
          branch: mentor.branch,
          college: mentor.college,
          graduationYear: mentor.graduation_year,
          currentYear: mentor.current_year,
        },
        experience: mentor.mentor_experiences.map((exp) => ({
          id: exp.id,
          company: exp.company,
          role: exp.role,
          domain: exp.domain,
          startDate: exp.start_date,
          endDate: exp.end_date,
          isCurrent: exp.is_current,
          description: exp.description,
          achievements: exp.achievements,
        })),
        rating: mentor.rating,
        totalReviews: mentor.total_reviews,
        verifiedCourses: mentor.mentor_course_verifications.map((vc) => ({
          courseId: vc.courses.id, // Use the actual course.id (Int) for session requests
          courseCareerId: vc.courses.career_id, // Keep career_id for reference
          courseName: vc.courses.title,
          verifiedAt: vc.verified_at,
          score: vc.verification_score,
        })),
        sessionTypes: mentor.session_types,
        pricingPerHour: mentor.pricing_per_hour,
        availableSlots: mentor.available_slots,
        linkedinUrl: mentor.linkedin_url,
      };
    } catch (error) {
      console.error("[MentorService] getMentorById error:", error);
      throw error;
    }
  }

  /**
   * Get mentors for a specific course
   */
  async getMentorsByCourse(courseId: string): Promise<any[]> {
    try {
      const mentors = await prisma.mentor_course_verifications.findMany({
        where: {
          courses: {
            career_id: courseId,
          },
          is_active: true,
        },
        include: {
          mentor_profiles: {
            include: {
              users: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          courses: true,
        },
        orderBy: {
          verification_score: "desc",
        },
      });

      return mentors.map((vc) => ({
        id: vc.mentor_profiles.user_id,
        name: vc.mentor_profiles.full_name || vc.mentor_profiles.users.name,
        email: vc.mentor_profiles.users.email,
        bio: vc.mentor_profiles.bio,
        rating: vc.mentor_profiles.rating,
        totalReviews: vc.mentor_profiles.total_reviews,
        verifiedScore: vc.verification_score,
        sessionTypes: vc.mentor_profiles.session_types,
        pricingPerHour: vc.mentor_profiles.pricing_per_hour,
      }));
    } catch (error) {
      console.error("[MentorService] getMentorsByCourse error:", error);
      throw error;
    }
  }

  /**
   * Get top mentors grouped by course
   * Uses mentor_tests as source of truth, groups by course_name, sorted by score
   */
  /**
   * Get top mentors with their verified skills (from mentor_tests only)
   * Returns flat array format for frontend grouping
   * 
   * Note: Uses mentor_tests table, not course fields
   */
  async getTopMentors(): Promise<Array<{
    mentorId: string;
    name: string;
    rating: number;
    skills: Array<{
      skillId: string;
      skillName: string;
    }>;
  }>> {
    try {
      // Get all passed mentor tests, sorted by score DESC
      const mentorTests = await prisma.mentor_tests.findMany({
        where: {
          status: TestStatus.PASSED,
        },
        include: {
          mentor_profiles: {
            include: {
              users: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          score: "desc",
        },
      });

      // Group tests by mentor, then collect all their skills
      const mentorsMap = new Map<string, {
        mentorId: string;
        name: string;
        rating: number;
        skills: Array<{ skillId: string; skillName: string }>;
      }>();

      mentorTests.forEach((test) => {
        if (!test.course_name) return; // Skip tests without course name

        const mentor = test.mentor_profiles;
        const user = mentor.users;
        const mentorId = mentor.user_id;
        const name = mentor.full_name || user.name;
        const rating = mentor.rating ? Number(mentor.rating) : 4.5;

        // Use course_name as skill (this is the skill the mentor passed test for)
        const skillName = test.course_name;
        const skillId = skillName.toLowerCase().replace(/\s+/g, "-"); // Simple slug generation

        if (!mentorsMap.has(mentorId)) {
          mentorsMap.set(mentorId, {
            mentorId,
            name,
            rating,
            skills: [],
          });
        }

        const mentorData = mentorsMap.get(mentorId)!;
        
        // Add skill if not already added (prevent duplicates)
        const skillExists = mentorData.skills.some(s => s.skillName === skillName);
        if (!skillExists) {
          mentorData.skills.push({
            skillId,
            skillName,
          });
        }
      });

      // Convert map to array
      const result = Array.from(mentorsMap.values());

      // Sort by rating DESC
      result.sort((a, b) => b.rating - a.rating);

      return result;
    } catch (error) {
      console.error("[MentorService] getTopMentors error:", error);
      throw error;
    }
  }

  // ============================================
  // DASHBOARD
  // ============================================

  /**
   * Get dashboard statistics (DAILY VIEW - TODAY ONLY)
   * todaySessions uses session_schedule to filter by today's sessions only
   */
  async getDashboardStats(mentorId: string): Promise<any> {
    try {
      // Use IST time for business logic
      const todayStart = getISTTodayStart();
      const todayEnd = getISTTodayEnd();

      const [pendingRequests, scheduledSessions, verifiedCourses] =
        await Promise.all([
          prisma.sessions.count({
            where: {
              mentor_id: mentorId,
              status: SessionStatus.PENDING,
            },
          }),
          prisma.sessions.count({
            where: {
              mentor_id: mentorId,
              status: {
                in: [SessionStatus.SCHEDULED, SessionStatus.PAID],
              },
            },
          }),
          // Count verified skills from mentor_tests
          prisma.mentor_tests.count({
            where: {
              mentor_id: mentorId,
              status: "PASSED",
            },
          }),
        ]);

      // Calculate todaySessions using session_schedule (DAILY LOGIC)
      // Uses the same logic as getOngoingSessions - sessions with today's schedule items that haven't completed
      const sessionsWithTodaySchedule = await prisma.sessions.findMany({
        where: {
          mentor_id: mentorId,
          status: {
            notIn: [SessionStatus.CANCELLED, SessionStatus.REJECTED],
          },
        },
        select: {
          id: true,
          status: true,
          payments: {
            select: {
              status: true,
            },
          },
          session_schedule: {
            where: {
              scheduled_date: {
                gte: todayStart,
                lt: todayEnd,
              },
            },
            select: {
              id: true,
              scheduled_date: true,
              scheduled_time: true,
              status: true,
            },
            orderBy: [
              { scheduled_date: "asc" },
              { scheduled_time: "asc" },
            ],
          },
        },
      });

      // Filter to sessions with successful payments (same logic as getOngoingSessions)
      const paidSessions = sessionsWithTodaySchedule.filter((session) => {
        if (session.status === SessionStatus.PAID || session.status === SessionStatus.SCHEDULED) {
          return true;
        }
        if (session.payments && session.payments.status === PaymentStatus.SUCCESS) {
          return true;
        }
        return false;
      });

      // Count sessions where at least one today's schedule item is not completed
      // Each schedule item is evaluated individually based on its end time
      let todaySessions = 0;
      for (const session of paidSessions) {
        const todayScheduleItems = session.session_schedule || [];
        
        if (todayScheduleItems.length === 0) {
          continue;
        }

        // Calculate completion status for each schedule item based on end time
        const now = getISTNow();
        const hasOngoingItem = todayScheduleItems.some((item) => {
          // Create IST datetime from scheduled_date and scheduled_time
          const scheduledDateTimeIST = createISTDateTimeFromSchedule(item.scheduled_date, item.scheduled_time);
          
          // Default duration: 1 hour
          const endTimeIST = new Date(scheduledDateTimeIST.getTime() + 60 * 60 * 1000);
          
          // Item is completed if current IST time >= end time OR mentor marked it as COMPLETED
          const isCompleted = now >= endTimeIST || item.status === ScheduleStatus.COMPLETED;
          
          // If at least one item is not completed, this session counts as "today's session left"
          return !isCompleted;
        });

        if (hasOngoingItem) {
          todaySessions++;
        }
      }

      return {
        pendingRequests,
        scheduledSessions,
        todaySessions,
        verifiedCourses,
      };
    } catch (error) {
      console.error("[MentorService] getDashboardStats error:", error);
      throw error;
    }
  }

  /**
   * Get payment pending sessions (APPROVED status with no successful payment)
   */
  async getPaymentPendingSessions(mentorId: string): Promise<any[]> {
    try {
      const sessions = await prisma.sessions.findMany({
        where: {
          mentor_id: mentorId,
          status: SessionStatus.APPROVED,
        },
        select: {
          id: true,
          skill_name: true, // Include skill_name in select
          skill_id: true,
          session_type: true,
          scheduled_at: true,
          created_at: true,
          users_student: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          payments: true, // ONE-TO-ONE relation, not array
          courses: {
            select: {
              id: true,
              title: true,
              career_id: true,
            },
          },
        },
        orderBy: {
          created_at: "desc",
        },
      });

      // Filter out sessions that have successful payments (payments is ONE-TO-ONE, not array)
      const paymentPendingSessions = sessions.filter(
        (session) => !session.payments || session.payments.status !== PaymentStatus.SUCCESS
      );

      return paymentPendingSessions.map((session) => {
        // Use skill_name from sessions table (snapshot saved at connection time)
        const skillName = session.skill_name || "Unknown (Legacy)";
        return {
          id: session.id,
          student: {
            id: session.users_student.id,
            name: session.users_student.name,
            email: session.users_student.email,
          },
          skill_name: skillName, // From sessions.skill_name (snapshot)
          courseName: session.courses?.title || session.session_type || "Session",
          sessionType: session.session_type,
          scheduledAt: session.scheduled_at,
          requestedAt: session.created_at,
        };
      });
    } catch (error) {
      console.error("[MentorService] getPaymentPendingSessions error:", error);
      throw error;
    }
  }

  /**
   * Get pending session requests
   */
  async getPendingSessionRequests(mentorId: string): Promise<any[]> {
    try {
      const sessions = await prisma.sessions.findMany({
        where: {
          mentor_id: mentorId,
          status: SessionStatus.PENDING,
        },
        select: {
          id: true,
          skill_name: true, // Include skill_name in select
          skill_id: true,
          session_type: true,
          student_message: true,
          scheduled_at: true,
          created_at: true,
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
        },
        orderBy: {
          created_at: "desc",
        },
      });

      console.log(`[MentorService] Found ${sessions.length} pending sessions for mentor ${mentorId}`);

      return sessions.map((session) => {
        // Use skill_name from sessions table (snapshot saved at connection time)
        const skillName = session.skill_name || "Unknown (Legacy)";
        return {
          id: session.id,
          student: {
            id: session.users_student.id,
            name: session.users_student.name,
            email: session.users_student.email,
          },
          skill_name: skillName, // From sessions.skill_name (snapshot)
          courseName: session.courses?.title || session.session_type || "Session",
          sessionType: session.session_type,
          studentMessage: session.student_message,
          scheduledAt: session.scheduled_at,
          requestedAt: session.created_at,
        };
      });
    } catch (error) {
      console.error(
        "[MentorService] getPendingSessionRequests error:",
        error
      );
      throw error;
    }
  }

  /**
   * Get ongoing sessions (DAILY VIEW - TODAY ONLY)
   * DAY-BASED LOGIC: Matches student-side implementation exactly
   * Shows ONLY sessions with today's scheduled session_schedule items that haven't all completed
   * Uses session_schedule.scheduled_date to filter by today (IST)
   * 
   * CORE RULE: A session is ongoing if TODAY has at least one schedule item that is NOT completed
   */
  async getOngoingSessions(mentorId: string): Promise<any[]> {
    try {
      const now = getISTNow(); // Use IST time
      // Get today's date at midnight (start of day) in IST
      const todayStart = getISTTodayStart();
      const todayEnd = getISTTodayEnd();

      // Get all sessions for this mentor (excluding CANCELLED and REJECTED)
      // Do NOT filter by session.status - we use schedule items for daily grouping
      const sessions = await prisma.sessions.findMany({
        where: {
          mentor_id: mentorId,
          status: {
            notIn: [SessionStatus.CANCELLED, SessionStatus.REJECTED],
          },
        },
        select: {
          id: true,
          skill_name: true,
          skill_id: true,
          session_type: true,
          scheduled_at: true,
          status: true,
          zoom_link: true,
          zoom_link_expires_at: true,
          users_student: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          payments: true,
          courses: {
            select: {
              id: true,
              title: true,
              career_id: true,
            },
          },
          session_schedule: {
            where: {
              scheduled_date: {
                gte: todayStart,
                lt: todayEnd,
              },
            },
            select: {
              id: true,
              scheduled_date: true,
              scheduled_time: true,
              status: true,
              topic_title: true,
            },
            orderBy: [
              { scheduled_date: "asc" },
              { scheduled_time: "asc" },
            ],
          },
        },
        orderBy: {
          scheduled_at: "asc",
        },
      });

      // Filter to sessions with successful payments (must be paid to be ongoing)
      const paidSessions = sessions.filter((session) => {
        // Must have successful payment OR be in PAID/SCHEDULED status
        if (session.status === SessionStatus.PAID || session.status === SessionStatus.SCHEDULED) {
          return true;
        }
        // Check for successful payment in APPROVED or COMPLETED sessions
        if (session.payments && session.payments.status === PaymentStatus.SUCCESS) {
          return true;
        }
        return false;
      });

      // Calculate completion status for each schedule item
      // Each schedule item is evaluated individually based on its end time
      const sessionsWithCompletion = paidSessions.map((session) => {
        const todayScheduleItems = session.session_schedule || [];
        
        // Calculate isCompleted for each schedule item based on end time
        const scheduleItemsWithCompletion = todayScheduleItems.map((item) => {
          // Create IST datetime from scheduled_date and scheduled_time
          const scheduledDateTimeIST = createISTDateTimeFromSchedule(item.scheduled_date, item.scheduled_time);
          
          // Default duration: 1 hour
          const endTimeIST = new Date(scheduledDateTimeIST.getTime() + 60 * 60 * 1000);
          
          // Item is completed if current IST time >= end time OR mentor marked it as COMPLETED
          const isCompleted = now >= endTimeIST || item.status === ScheduleStatus.COMPLETED;
          
          return {
            ...item,
            scheduledDateTime: scheduledDateTimeIST,
            endTime: endTimeIST,
            isCompleted,
          };
        });

        return {
          ...session,
          todayScheduleItems: scheduleItemsWithCompletion,
        };
      });

      // ONGOING: Sessions with today's schedule items where at least one has end time >= current time
      // Each schedule item is evaluated individually: if end time >= current time → ongoing
      const ongoingSessions = sessionsWithCompletion.filter((session) => {
        const todayScheduleItems = session.todayScheduleItems || [];
        
        // Must have at least one schedule item for today
        if (todayScheduleItems.length === 0) {
          return false;
        }

        // At least one schedule item must have end time >= current time (not completed)
        return todayScheduleItems.some(item => !item.isCompleted);
      });

      return ongoingSessions.map((session) => {
        const skillName = session.skill_name || "Unknown (Legacy)";
        
        // Display today's date with the session's scheduled time
        // Shows correct scheduled time, not current time
        const today = getISTTodayStart(); // IST today start
        
        // Get the first schedule item's time (sessions can have multiple schedule items)
        const firstScheduleItem = session.todayScheduleItems?.[0];
        let scheduledAt: string;
        
        if (firstScheduleItem && firstScheduleItem.scheduled_time) {
          // Combine today's date with the session's scheduled time in IST
          const todayWithSessionTime = createISTDateTimeFromSchedule(today, firstScheduleItem.scheduled_time);
          scheduledAt = todayWithSessionTime.toISOString();
        } else {
          // Fallback: if no schedule item found, use current time
          // This shouldn't happen in normal flow, but provides safety
          scheduledAt = getISTNow().toISOString();
        }
        
        return {
          id: session.id,
          student: {
            id: session.users_student.id,
            name: session.users_student.name,
            email: session.users_student.email,
          },
          skill_name: skillName,
          courseName: session.courses?.title || session.session_type || "Session",
          sessionType: session.session_type,
          scheduledAt: scheduledAt, // Today's date with session's start time
          status: session.status,
          zoomLink: session.zoom_link,
          zoomLinkExpiresAt: session.zoom_link_expires_at,
          isPaid: session.payments !== null && session.payments.status === PaymentStatus.SUCCESS,
        };
      });
    } catch (error) {
      console.error("[MentorService] getOngoingSessions error:", error);
      throw error;
    }
  }

  /**
   * Get scheduled/ongoing sessions (SCHEDULED, PAID, APPROVED)
   * These are active sessions that are not pending or completed
   * 
   * Dashboard visibility rules:
   * - sessionDate === today
   * - currentTime >= (startTime - 1 hour)
   * - currentTime < startTime OR session is ONGOING
   * - status === "APPROVED" or "SCHEDULED"
   */
  async getScheduledSessions(
    mentorId: string,
    upcomingOnly: boolean = false,
    forDashboard: boolean = false
  ): Promise<any[]> {
    try {
      const whereClause: any = {
        mentor_id: mentorId,
        // Exclude COMPLETED sessions - only show SCHEDULED, PAID, APPROVED, ONGOING
        status: {
          in: [SessionStatus.SCHEDULED, SessionStatus.PAID, SessionStatus.APPROVED],
        },
      };

      if (upcomingOnly) {
        whereClause.scheduled_at = {
          gte: getISTNow(), // Use IST time for comparison
        };
      }

      const sessions = await prisma.sessions.findMany({
        where: whereClause,
        select: {
          id: true,
          skill_name: true, // Include skill_name in select
          skill_id: true,
          session_type: true,
          scheduled_at: true,
          status: true,
          zoom_link: true,
          zoom_link_expires_at: true,
          users_student: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          payments: true, // ONE-TO-ONE relation, not array
          courses: {
            select: {
              id: true,
              title: true,
              career_id: true,
            },
          },
        },
        orderBy: {
          scheduled_at: "asc",
        },
      });

      // Import visibility utility
      const { shouldShowSessionOnDashboard } = await import("../utils/sessionVisibility");

      return sessions
        .filter((session) => {
          // If for dashboard, apply strict visibility rules
          if (forDashboard) {
            // scheduled_at is the course start date/time
            return shouldShowSessionOnDashboard(
              session.scheduled_at,
              session.scheduled_at, // startTime is same as scheduled_at
              session.status
            );
          }
          return true; // For non-dashboard, return all
        })
        .map((session) => {
          // Use skill_name from sessions table (snapshot saved at connection time)
          const skillName = session.skill_name || "Unknown (Legacy)";
          return {
            id: session.id,
            student: {
              id: session.users_student.id,
              name: session.users_student.name,
              email: session.users_student.email,
            },
            skill_name: skillName, // From sessions.skill_name (snapshot)
            courseName: session.courses?.title || session.session_type || "Session",
            sessionType: session.session_type,
            scheduledAt: session.scheduled_at,
            status: session.status,
            zoomLink: session.zoom_link,
            zoomLinkExpiresAt: session.zoom_link_expires_at,
            isPaid: session.payments !== null && session.payments.status === PaymentStatus.SUCCESS,
          };
        });
    } catch (error) {
      console.error("[MentorService] getScheduledSessions error:", error);
      throw error;
    }
  }

  /**
   * Get completed sessions (DAILY VIEW - TODAY ONLY)
   * Shows ONLY sessions with today's scheduled session_schedule items that have all completed
   * Resets daily at 12:00 AM IST
   */
  /**
   * Get completed sessions (DAILY VIEW - TODAY ONLY)
   * DAY-BASED LOGIC: Matches student-side implementation exactly
   * Shows ONLY sessions with today's scheduled session_schedule items that are ALL completed
   * Uses session_schedule.scheduled_date to filter by today (IST)
   * 
   * CORE RULE: A session is completed if TODAY has schedule items AND ALL of them are completed
   */
  async getCompletedSessions(mentorId: string): Promise<any[]> {
    try {
      const now = getISTNow(); // Use IST time
      // Get today's date at midnight (start of day) in IST
      const todayStart = getISTTodayStart();
      const todayEnd = getISTTodayEnd();

      // Get all sessions for this mentor (excluding CANCELLED and REJECTED)
      // Do NOT filter by session.status - we use schedule items for daily grouping
      const sessions = await prisma.sessions.findMany({
        where: {
          mentor_id: mentorId,
          status: {
            notIn: [SessionStatus.CANCELLED, SessionStatus.REJECTED],
          },
        },
        select: {
          id: true,
          skill_name: true,
          skill_id: true,
          session_type: true,
          scheduled_at: true,
          completed_at: true,
          status: true,
          users_student: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          payments: true,
          courses: {
            select: {
              id: true,
              title: true,
              career_id: true,
            },
          },
          session_schedule: {
            where: {
              scheduled_date: {
                gte: todayStart,
                lt: todayEnd,
              },
            },
            select: {
              id: true,
              scheduled_date: true,
              scheduled_time: true,
              status: true,
              topic_title: true,
            },
            orderBy: [
              { scheduled_date: "asc" },
              { scheduled_time: "asc" },
            ],
          },
        },
        orderBy: {
          scheduled_at: "asc",
        },
      });

      // Filter to sessions with successful payments (must be paid to be completed)
      const paidSessions = sessions.filter((session) => {
        // Must have successful payment OR be in PAID/SCHEDULED status
        if (session.status === SessionStatus.PAID || session.status === SessionStatus.SCHEDULED) {
          return true;
        }
        // Check for successful payment in APPROVED or COMPLETED sessions
        if (session.payments && session.payments.status === PaymentStatus.SUCCESS) {
          return true;
        }
        return false;
      });

      // Calculate completion status for each schedule item
      // Each schedule item is evaluated individually based on its end time
      // End time = scheduled_date + scheduled_time + duration (1 hour default)
      const sessionsWithCompletion = paidSessions.map((session) => {
        const todayScheduleItems = session.session_schedule || [];
        
        // Calculate isCompleted for each schedule item based on end time
        const scheduleItemsWithCompletion = todayScheduleItems.map((item) => {
          // Create IST datetime from scheduled_date and scheduled_time
          const scheduledDateTimeIST = createISTDateTimeFromSchedule(item.scheduled_date, item.scheduled_time);
          
          // Default duration: 1 hour (set by student when requesting mentorship)
          const endTimeIST = new Date(scheduledDateTimeIST.getTime() + 60 * 60 * 1000);
          
          // Item is completed if current IST time >= end time OR mentor marked it as COMPLETED
          // This updates automatically every day based on current time vs end time
          const isCompleted = now >= endTimeIST || item.status === ScheduleStatus.COMPLETED;
          
          return {
            ...item,
            scheduledDateTime: scheduledDateTimeIST,
            endTime: endTimeIST,
            isCompleted,
          };
        });

        return {
          ...session,
          todayScheduleItems: scheduleItemsWithCompletion,
        };
      });

      // COMPLETED: Sessions with today's schedule items where ALL have end time < current time
      // Logic: If end time < current time → Completed (if payment completed)
      // Each schedule item is evaluated individually
      const completedSessions = sessionsWithCompletion.filter((session) => {
        const todayScheduleItems = session.todayScheduleItems || [];
        
        // Must have at least one schedule item for today
        if (todayScheduleItems.length === 0) {
          return false;
        }

        // ALL schedule items must have end time < current time (all completed)
        // This means: current time >= end time for all items → session is completed
        return todayScheduleItems.every(item => item.isCompleted);
      });

      // Sort by last session end time (descending) - most recently completed first
      completedSessions.sort((a, b) => {
        const aLastItem = a.todayScheduleItems[a.todayScheduleItems.length - 1];
        const bLastItem = b.todayScheduleItems[b.todayScheduleItems.length - 1];
        
        // Create IST datetime for end times
        const aEndTimeIST = createISTDateTimeFromSchedule(aLastItem.scheduled_date, aLastItem.scheduled_time);
        aEndTimeIST.setTime(aEndTimeIST.getTime() + 60 * 60 * 1000);
        
        const bEndTimeIST = createISTDateTimeFromSchedule(bLastItem.scheduled_date, bLastItem.scheduled_time);
        bEndTimeIST.setTime(bEndTimeIST.getTime() + 60 * 60 * 1000);
        
        return bEndTimeIST.getTime() - aEndTimeIST.getTime();
      });

      return completedSessions.map((session) => {
        const skillName = session.skill_name || "Unknown (Legacy)";
        // Use the last schedule item's end time as completedAt
        const lastScheduleItem = session.todayScheduleItems[session.todayScheduleItems.length - 1];
        const scheduledDateTimeIST = createISTDateTimeFromSchedule(lastScheduleItem.scheduled_date, lastScheduleItem.scheduled_time);
        const endTime = new Date(scheduledDateTimeIST.getTime() + 60 * 60 * 1000);
        
        return {
          id: session.id,
          student: {
            id: session.users_student.id,
            name: session.users_student.name,
            email: session.users_student.email,
          },
          skill_name: skillName,
          courseName: session.courses?.title || session.session_type || "Session",
          sessionType: session.session_type,
          scheduledAt: session.scheduled_at,
          completedAt: endTime, // Use last schedule item's end time (day-based)
          status: session.status,
        };
      });
    } catch (error) {
      console.error("[MentorService] getCompletedSessions error:", error);
      throw error;
    }
  }

  // ============================================
  // STUDENTS MANAGEMENT
  // ============================================

  /**
   * Get list of students
   */
  async getStudents(
    mentorId: string,
    filters?: {
      search?: string;
      status?: string;
      courseId?: string;
    }
  ): Promise<any[]> {
    try {
      const where: any = {
        mentor_id: mentorId,
      };

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.courseId) {
        where.course_id = {
          in: await prisma.courses
            .findMany({
              where: { career_id: filters.courseId },
              select: { id: true },
            })
            .then((courses) => courses.map((c) => c.id)),
        };
      }

      // Get all sessions for this mentor
      const sessions = await prisma.sessions.findMany({
        where,
        include: {
          users_student: {
            select: {
              id: true,
              name: true,
              email: true,
              student_profiles: {
                select: {
                  branch: true,
                  grade_or_year: true,
                },
              },
              student_learning_progress: {
                select: {
                  progress_percentage: true,
                  skills_completed: true,
                },
              },
            },
          },
          courses: {
            select: {
              title: true,
            },
          },
        },
        orderBy: {
          created_at: "desc",
        },
      });

      // Get distinct students by student_id
      const studentMap = new Map<string, any>();
      
      sessions.forEach((session) => {
        const studentId = session.student_id;
        
        // Only add if we haven't seen this student yet
        if (!studentMap.has(studentId)) {
          const student = session.users_student;
          // Handle student_profiles - it might be an array or single object
          const profile = Array.isArray(student.student_profiles) 
            ? student.student_profiles[0] 
            : student.student_profiles;
          // Handle student_learning_progress - it's an array
          const progress = Array.isArray(student.student_learning_progress) 
            ? student.student_learning_progress[0] 
            : null;

          // Safely access courses - it might be null if course_id doesn't exist
          const courseTitle = session.courses?.title || null;
          
          studentMap.set(studentId, {
            id: student.id,
            name: student.name || "Unknown",
            email: student.email || "",
            course: courseTitle,
            skillName: null, // Will be populated below
            branch: profile?.branch || null,
            year: profile?.grade_or_year || null,
            progress: progress?.progress_percentage || 0,
            skillsCompleted: progress?.skills_completed || 0,
            status: session.status,
          });
        }
      });

      // Get skill_name for all sessions using raw SQL
      const sessionIds = sessions.map((s) => s.id);
      let skillNameMap: Map<string, string | null> = new Map();
      
      if (sessionIds.length > 0) {
        try {
          const skillNames = await prisma.$queryRaw<Array<{
            id: string;
            skill_name: string | null;
          }>>`
            SELECT id, skill_name
            FROM sessions
            WHERE id = ANY(${sessionIds}::varchar[])
          `;
          
          skillNames.forEach((row) => {
            skillNameMap.set(row.id, row.skill_name);
          });
        } catch (error) {
          console.error("[MentorService] Error fetching skill_name:", error);
          // Continue without skill_name if query fails (column might not exist yet)
        }
      }

      // Map skill_name to students based on their most recent session
      let students = Array.from(studentMap.values()).map((student) => {
        // Find the most recent session for this student
        const studentSessions = sessions.filter((s) => s.student_id === student.id);
        const mostRecentSession = studentSessions[0]; // Already ordered by created_at desc
        const skillName = mostRecentSession ? skillNameMap.get(mostRecentSession.id) : null;
        
        return {
          ...student,
          skillName: skillName || student.course || "Skill not available",
          course: skillName || student.course || null, // Prefer skill_name over course title
        };
      });

      // Filter by search
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        students = students.filter(
          (s) =>
            s.name?.toLowerCase().includes(searchLower) ||
            s.email?.toLowerCase().includes(searchLower) ||
            s.course?.toLowerCase().includes(searchLower) ||
            s.skillName?.toLowerCase().includes(searchLower)
        );
      }

      return students;
    } catch (error) {
      console.error("[MentorService] getStudents error:", error);
      throw error;
    }
  }

  /**
   * Get student details
   */
  async getStudentDetails(
    mentorId: string,
    studentId: string
  ): Promise<any | null> {
    try {
      // Verify mentor has sessions with this student
      const session = await prisma.sessions.findFirst({
        where: {
          mentor_id: mentorId,
          student_id: studentId,
        },
      });

      if (!session) {
        return null;
      }

      const student = await prisma.user.findUnique({
        where: { id: studentId },
        include: {
          student_profiles: true,
          student_learning_progress: {
            include: {
              learning_paths: true,
            },
          },
          sessions_as_student: {
            where: {
              mentor_id: mentorId,
            },
            include: {
              courses: true,
            },
          },
        },
      });

      if (!student) return null;

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        profile: student.student_profiles,
        learningProgress: student.student_learning_progress,
        sessions: student.sessions_as_student,
      };
    } catch (error) {
      console.error("[MentorService] getStudentDetails error:", error);
      throw error;
    }
  }

  /**
   * Get student learning progress
   */
  async getStudentProgress(
    mentorId: string,
    studentId: string
  ): Promise<any> {
    try {
      // Verify mentor has sessions with this student
      const session = await prisma.sessions.findFirst({
        where: {
          mentor_id: mentorId,
          student_id: studentId,
        },
      });

      if (!session) {
        throw new Error("No session found with this student");
      }

      const progress = await prisma.student_learning_progress.findMany({
        where: {
          student_id: studentId,
        },
        include: {
          learning_paths: true,
          skill_completions: true,
        },
      });

      return progress;
    } catch (error) {
      console.error("[MentorService] getStudentProgress error:", error);
      throw error;
    }
  }

  // ============================================
  // REVIEWS MANAGEMENT
  // ============================================

  /**
   * Get reviews - includes assignment submissions
   */
  async getReviews(
    mentorId: string,
    filters?: {
      status?: string;
      type?: string;
      priority?: string;
    }
  ): Promise<any[]> {
    try {
      // Get all assignment submissions for this mentor's assignments
      const submissions = await prisma.assignment_submissions.findMany({
        where: {
          assignments: {
            mentor_id: mentorId,
          },
        },
        include: {
          assignments: {
            select: {
              id: true,
              title: true,
              description: true,
              created_at: true,
              due_at: true,
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
        orderBy: {
          submitted_at: "desc",
        },
      });

      // Get all resume review requests for this mentor
      const resumeReviews = await prisma.resume_review_requests.findMany({
        where: {
          mentor_id: mentorId,
        },
        include: {
          resumes: {
            select: {
              id: true,
              title: true,
              created_at: true,
              updated_at: true,
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
        orderBy: {
          created_at: "desc",
        },
      });

      // Get all cover letter review requests for this mentor
      const coverLetterReviews = await prisma.cover_letter_review_requests.findMany({
        where: {
          mentor_id: mentorId,
        },
        include: {
          cover_letters: {
            select: {
              id: true,
              title: true,
              company_name: true,
              job_title: true,
              created_at: true,
              updated_at: true,
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
        orderBy: {
          created_at: "desc",
        },
      });

      // Transform cover letter reviews to match Reviews card format
      const coverLetterReviewItems = coverLetterReviews.map((review) => {
        const reviewStatus = review.status === ReviewStatus.VERIFIED ? "completed" : "pending";
        
        const createdAt = new Date(review.created_at || getISTNow());
        const now = getISTNow();
        const diffMs = now.getTime() - createdAt.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        
        let submittedAgo = "";
        if (diffDays > 0) {
          submittedAgo = `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
        } else if (diffHours > 0) {
          submittedAgo = `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
        } else {
          const diffMinutes = Math.floor(diffMs / (1000 * 60));
          submittedAgo = `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
        }

        return {
          id: `cover_letter_${review.id}`, // Prefix to distinguish from other reviews
          student: {
            name: review.users_student.name,
            email: review.users_student.email,
            avatar: review.users_student.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2),
          },
          type: "Cover Letter Review",
          submitted: submittedAgo,
          priority: "medium",
          status: reviewStatus,
          document: `Cover Letter - ${review.cover_letters.company_name || "Company"} - ${review.cover_letters.job_title || "Position"}`,
          message: `Cover letter review request: ${review.cover_letters.title || `${review.cover_letters.company_name} - ${review.cover_letters.job_title}`}`,
          coverLetterId: review.cover_letters.id,
          reviewRequestId: review.id,
          feedback: review.mentor_feedback,
          mentorFeedback: review.mentor_feedback,
          rating: review.rating ? Number(review.rating) : null,
          reviewedAt: review.reviewed_at,
          completedAt: review.reviewed_at
            ? new Date(review.reviewed_at).toLocaleString()
            : undefined,
        };
      });

      // Transform resume reviews to match Reviews card format
      const resumeReviewItems = resumeReviews.map((review) => {
        const reviewStatus = review.status === ReviewStatus.VERIFIED ? "completed" : "pending";
        
        const createdAt = new Date(review.created_at || getISTNow());
        const now = getISTNow();
        const diffMs = now.getTime() - createdAt.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        
        let submittedAgo = "";
        if (diffDays > 0) {
          submittedAgo = `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
        } else if (diffHours > 0) {
          submittedAgo = `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
        } else {
          const diffMinutes = Math.floor(diffMs / (1000 * 60));
          submittedAgo = `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
        }

        return {
          id: `resume_${review.id}`, // Prefix to distinguish from assignment reviews
          student: {
            name: review.users_student.name,
            email: review.users_student.email,
            avatar: review.users_student.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2),
          },
          type: "Resume Review",
          submitted: submittedAgo,
          priority: "medium",
          status: reviewStatus,
          document: `Resume - ${review.resumes.id}`,
          message: `Resume review request: ${review.resumes.title || "Resume"}`,
          resumeId: review.resumes.id,
          reviewRequestId: review.id,
          feedback: review.mentor_feedback,
          mentorFeedback: review.mentor_feedback,
          rating: review.rating ? Number(review.rating) : null,
          reviewedAt: review.reviewed_at,
          completedAt: review.reviewed_at
            ? new Date(review.reviewed_at).toLocaleString()
            : undefined,
        };
      });

      // Transform submissions to match Reviews card format
      const assignmentReviewItems = submissions.map((submission) => {
        // Determine status for filtering
        const reviewStatus = submission.review_status === ReviewStatus.VERIFIED ? "completed" : "pending";
        
        // Calculate time ago
        const submittedAt = new Date(submission.submitted_at);
        const now = getISTNow();
        const diffMs = now.getTime() - submittedAt.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        
        let submittedAgo = "";
        if (diffDays > 0) {
          submittedAgo = `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
        } else if (diffHours > 0) {
          submittedAgo = `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
        } else {
          const diffMinutes = Math.floor(diffMs / (1000 * 60));
          submittedAgo = `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
        }

        // Extract filename from URL
        const fileUrl = submission.file_url;
        const fileName = fileUrl.split("/").pop() || "assignment_file";

        return {
          id: `assignment_${submission.id}`, // Prefix to distinguish from other review types
          student: {
            name: submission.users_student.name,
            email: submission.users_student.email,
            avatar: submission.users_student.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2),
          },
          type: "Assignment Review",
          submitted: submittedAgo,
          priority: submission.status === "LATE" ? "high" : "medium", // Late submissions are high priority
          status: reviewStatus,
          document: fileName,
          message: submission.assignments.description || `Assignment: ${submission.assignments.title}`,
          assignmentId: submission.assignments.id,
          submissionId: submission.id,
          fileUrl: submission.file_url,
          feedback: submission.mentor_feedback, // Use 'feedback' to match Review interface
          mentorFeedback: submission.mentor_feedback, // Keep for backward compatibility
          reviewedAt: submission.reviewed_at,
          completedAt: submission.reviewed_at
            ? new Date(submission.reviewed_at).toLocaleString()
            : undefined,
        };
      });

      // Combine assignment and resume reviews
      const allReviews = [...assignmentReviewItems, ...resumeReviewItems, ...coverLetterReviewItems];

      // Apply filters
      let filteredReviews = allReviews;
      if (filters) {
        if (filters.status && filters.status !== "all") {
          filteredReviews = filteredReviews.filter((r) => r.status === filters.status);
        }
        if (filters.type && filters.type !== "all") {
          filteredReviews = filteredReviews.filter((r) => r.type === filters.type);
        }
        if (filters.priority && filters.priority !== "all") {
          filteredReviews = filteredReviews.filter((r) => r.priority === filters.priority);
        }
      }

      return filteredReviews;
    } catch (error) {
      console.error("[MentorService] getReviews error:", error);
      throw error;
    }
  }

  /**
   * Get review details
   */
  async getReviewDetails(
    mentorId: string,
    reviewId: string
  ): Promise<any | null> {
    try {
      // Check if it's a resume review
      if (reviewId.startsWith("resume_")) {
        const requestId = parseInt(reviewId.replace("resume_", ""));
        
        const review = await prisma.resume_review_requests.findFirst({
          where: {
            id: requestId,
            mentor_id: mentorId,
          },
          include: {
            resumes: {
              select: {
                id: true,
                title: true,
                resume_data: true,
                generated_resume_text: true,
                created_at: true,
                updated_at: true,
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

        if (!review) {
          return null;
        }

        return {
          id: reviewId,
          type: "Resume Review",
          student: {
            name: review.users_student.name,
            email: review.users_student.email,
            avatar: review.users_student.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2),
          },
          resume: review.resumes,
          resumeId: review.resumes.id,
          reviewRequestId: review.id,
          status: review.status === ReviewStatus.VERIFIED ? "completed" : "pending",
          feedback: review.mentor_feedback,
          rating: review.rating ? Number(review.rating) : null,
          reviewedAt: review.reviewed_at,
          completedAt: review.reviewed_at
            ? new Date(review.reviewed_at).toLocaleString()
            : undefined,
        };
      }

      // Check if it's an assignment review
      if (reviewId.startsWith("assignment_")) {
        const submissionId = parseInt(reviewId.replace("assignment_", ""));
        
        const submission = await prisma.assignment_submissions.findFirst({
          where: {
            id: submissionId,
            assignments: {
              mentor_id: mentorId,
            },
          },
          include: {
            assignments: {
              select: {
                id: true,
                title: true,
                description: true,
                created_at: true,
                due_at: true,
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
          return null;
        }

        return {
          id: reviewId,
          type: "Assignment Review",
          student: {
            name: submission.users_student.name,
            email: submission.users_student.email,
          },
          assignment: {
            id: submission.assignments.id,
            title: submission.assignments.title,
            description: submission.assignments.description,
          },
          submission: {
            id: submission.id,
            fileUrl: submission.file_url,
            submittedAt: submission.submitted_at,
            status: submission.status,
            reviewStatus: submission.review_status,
            mentorFeedback: submission.mentor_feedback,
            reviewedAt: submission.reviewed_at,
          },
        };
      }

      // For other review types, return null (not implemented yet)
      return null;
    } catch (error) {
      console.error("[MentorService] getReviewDetails error:", error);
      throw error;
    }
  }

  /**
   * Complete a review
   */
  async completeReview(
    mentorId: string,
    reviewId: string,
    data: { feedback?: string; rating?: number }
  ): Promise<any> {
    try {
      // Check if it's a resume review
      if (reviewId.startsWith("resume_")) {
        const requestId = parseInt(reviewId.replace("resume_", ""));
        
        // First, check if review exists and is not already completed
        const existingReview = await prisma.resume_review_requests.findFirst({
          where: {
            id: requestId,
            mentor_id: mentorId,
          },
        });

        if (!existingReview) {
          throw new Error("Review not found or access denied");
        }

        if (existingReview.status === ReviewStatus.VERIFIED) {
          throw new Error("Review has already been completed. Cannot review again.");
        }

        // Validate rating is provided (required for resume reviews)
        if (!data.rating || data.rating < 1 || data.rating > 5) {
          throw new Error("Rating is required and must be between 1 and 5");
        }
        
        const review = await prisma.resume_review_requests.update({
          where: {
            id: requestId,
            mentor_id: mentorId,
          },
          data: {
            status: ReviewStatus.VERIFIED,
            mentor_feedback: data.feedback || null,
            rating: data.rating, // Required: 1-5 stars
            reviewed_at: new Date(),
            updated_at: new Date(),
          },
          include: {
            resumes: {
              select: {
                id: true,
                title: true,
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

        return {
          id: reviewId,
          type: "Resume Review",
          student: {
            name: review.users_student.name,
            email: review.users_student.email,
          },
          resume: review.resumes,
          status: "completed",
          feedback: review.mentor_feedback,
          rating: review.rating ? Number(review.rating) : null,
          reviewedAt: review.reviewed_at,
        };
      }

      // Check if it's a cover letter review
      if (reviewId.startsWith("cover_letter_")) {
        const requestId = parseInt(reviewId.replace("cover_letter_", ""));
        
        // First, check if review exists and is not already completed
        const existingReview = await prisma.cover_letter_review_requests.findFirst({
          where: {
            id: requestId,
            mentor_id: mentorId,
          },
        });

        if (!existingReview) {
          throw new Error("Review not found or access denied");
        }

        if (existingReview.status === ReviewStatus.VERIFIED) {
          throw new Error("Review has already been completed. Cannot review again.");
        }

        // Validate rating is provided (required for cover letter reviews)
        if (!data.rating || data.rating < 1 || data.rating > 5) {
          throw new Error("Rating is required and must be between 1 and 5");
        }
        
        const review = await prisma.cover_letter_review_requests.update({
          where: {
            id: requestId,
            mentor_id: mentorId,
          },
          data: {
            status: ReviewStatus.VERIFIED,
            mentor_feedback: data.feedback || null,
            rating: data.rating, // Required: 1-5 stars
            reviewed_at: new Date(),
            updated_at: new Date(),
          },
          include: {
            cover_letters: {
              select: {
                id: true,
                title: true,
                company_name: true,
                job_title: true,
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

        return {
          id: reviewId,
          type: "Cover Letter Review",
          student: {
            name: review.users_student.name,
            email: review.users_student.email,
          },
          coverLetter: review.cover_letters,
          status: "completed",
          feedback: review.mentor_feedback,
          rating: review.rating ? Number(review.rating) : null,
          reviewedAt: review.reviewed_at,
        };
      }

      // Check if it's an assignment review
      if (reviewId.startsWith("assignment_")) {
        const submissionId = parseInt(reviewId.replace("assignment_", ""));
        
        // Use assignment service to verify
        const { assignmentService } = await import("./assignment.service");
        return await assignmentService.verifyAssignment(
          mentorId,
          submissionId,
          data.feedback
        );
      }

      // For other review types, return null (not implemented yet)
      return null;
    } catch (error) {
      console.error("[MentorService] completeReview error:", error);
      throw error;
    }
  }

  // ============================================
  // INSIGHTS & ANALYTICS
  // ============================================

  /**
   * Get insights metrics
   */
  async getInsightsMetrics(
    mentorId: string,
    timeRange?: string
  ): Promise<any> {
    try {
      const now = getISTNow();
      let startDate = getISTNow();
      let monthsBack = 6; // Default to 6 months
      
      // Calculate start date based on time range
      if (timeRange === "1month") {
        monthsBack = 1;
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      } else if (timeRange === "3months") {
        monthsBack = 3;
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      } else if (timeRange === "6months") {
        monthsBack = 6;
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      } else if (timeRange === "1year") {
        monthsBack = 12;
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
      } else {
        // Default to 6 months
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      }

      // Calculate previous period for comparison
      const previousStartDate = new Date(startDate);
      previousStartDate.setMonth(previousStartDate.getMonth() - monthsBack);
      const previousEndDate = new Date(startDate);

      // 1. Total Students - COUNT(DISTINCT studentId) WHERE status != "CANCELLED"
      const [currentStudents, previousStudents] = await Promise.all([
        prisma.sessions.findMany({
          where: {
            mentor_id: mentorId,
            status: { not: SessionStatus.CANCELLED },
            created_at: { gte: startDate },
          },
          distinct: ["student_id"],
          select: { student_id: true },
        }),
        prisma.sessions.findMany({
          where: {
            mentor_id: mentorId,
            status: { not: SessionStatus.CANCELLED },
            created_at: { gte: previousStartDate, lt: previousEndDate },
          },
          distinct: ["student_id"],
          select: { student_id: true },
        }),
      ]);

      const totalStudents = currentStudents.length;
      const previousMonthStudents = previousStudents.length;
      const studentGrowth = previousMonthStudents > 0 
        ? ((totalStudents - previousMonthStudents) / previousMonthStudents) * 100 
        : 0;

      // 2. Average Rating - AVG(rating) from mentor_profiles.rating
      // Note: In this system, rating is stored in mentor_profiles, not per-review
      // We'll use the mentor's overall rating
      const mentorProfile = await prisma.mentor_profiles.findUnique({
        where: { user_id: mentorId },
        select: { rating: true },
      });
      const avgRating = mentorProfile?.rating ? Number(mentorProfile.rating) : 0;

      // Get previous month rating (we'll use current rating as approximation)
      // In a real system, you'd track historical ratings
      const ratingChange = 0; // Placeholder - would need historical data

      // 3. Total Sessions - COUNT(*) WHERE status = "COMPLETED"
      const [totalSessions, previousSessions] = await Promise.all([
        prisma.sessions.count({
          where: {
            mentor_id: mentorId,
            status: SessionStatus.COMPLETED,
            completed_at: { gte: startDate },
          },
        }),
        prisma.sessions.count({
          where: {
            mentor_id: mentorId,
            status: SessionStatus.COMPLETED,
            completed_at: { gte: previousStartDate, lt: previousEndDate },
          },
        }),
      ]);

      const sessionGrowth = previousSessions > 0 
        ? ((totalSessions - previousSessions) / previousSessions) * 100 
        : 0;

      // 4. Avg Response Time - AVG(mentorReplyTime - studentMessageTime)
      // Get all sessions for this mentor
      const mentorSessions = await prisma.sessions.findMany({
        where: { mentor_id: mentorId },
        select: { id: true },
      });
      const sessionIds = mentorSessions.map(s => s.id);

      // Get all messages for these sessions
      const messages = await prisma.session_messages.findMany({
        where: {
          session_id: { in: sessionIds },
          created_at: { gte: startDate },
        },
        orderBy: { created_at: "asc" },
      });

      // Calculate response times
      const responseTimes: number[] = [];
      for (let i = 0; i < messages.length - 1; i++) {
        const currentMsg = messages[i];
        const nextMsg = messages[i + 1];
        
        // If current is from student and next is from mentor (same session)
        if (
          currentMsg.sender_role === "STUDENT" &&
          nextMsg.sender_role === "MENTOR" &&
          currentMsg.session_id === nextMsg.session_id
        ) {
          if (!nextMsg.created_at || !currentMsg.created_at) {
            continue;
          }
          const responseTime = nextMsg.created_at.getTime() - currentMsg.created_at.getTime();
          responseTimes.push(responseTime); // in milliseconds
        }
      }

      const avgResponseTimeMs = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;
      
      // Convert to hours
      const avgResponseTimeHours = avgResponseTimeMs / (1000 * 60 * 60);
      const avgResponseTimeFormatted = avgResponseTimeHours < 1
        ? `${Math.round(avgResponseTimeHours * 60)} min`
        : `${avgResponseTimeHours.toFixed(1)} hours`;

      return {
        totalStudents,
        studentGrowth: Math.round(studentGrowth * 100) / 100,
        avgRating: Math.round(avgRating * 10) / 10,
        ratingChange: Math.round(ratingChange * 10) / 10,
        totalSessions,
        sessionGrowth: Math.round(sessionGrowth * 100) / 100,
        avgResponseTime: avgResponseTimeFormatted,
        avgResponseTimeHours: avgResponseTimeHours,
      };
    } catch (error) {
      console.error("[MentorService] getInsightsMetrics error:", error);
      throw error;
    }
  }

  /**
   * Get performance data (monthly breakdown)
   */
  async getPerformanceData(
    mentorId: string,
    timeRange?: string
  ): Promise<any> {
    try {
      const now = getISTNow();
      let monthsBack = 6; // Default to 6 months
      
      if (timeRange === "1month") {
        monthsBack = 1;
      } else if (timeRange === "3months") {
        monthsBack = 3;
      } else if (timeRange === "6months") {
        monthsBack = 6;
      } else if (timeRange === "1year") {
        monthsBack = 12;
      }

      // Get all sessions for the time range
      const startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
      
      const sessions = await prisma.sessions.findMany({
        where: {
          mentor_id: mentorId,
          created_at: { gte: startDate },
        },
        select: {
          id: true,
          student_id: true,
          status: true,
          created_at: true,
          completed_at: true,
        },
      });

      // Get assignment submissions (reviews) for this mentor
      const reviews = await prisma.assignment_submissions.findMany({
        where: {
          assignments: {
            mentor_id: mentorId,
          },
          submitted_at: { gte: startDate },
        },
        select: {
          submitted_at: true,
        },
      });

      // Group by month
      const monthData: Record<string, {
        students: Set<string>;
        sessions: number;
        reviews: number;
      }> = {};

      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      // Initialize months
      for (let i = 0; i < monthsBack; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${monthNames[date.getMonth()]}`;
        if (!monthData[monthKey]) {
          monthData[monthKey] = {
            students: new Set(),
            sessions: 0,
            reviews: 0,
          };
        }
      }

      // Process sessions
      sessions.forEach((session) => {
        const sessionDate = session.created_at || session.completed_at;
        if (!sessionDate) return;
        
        const monthKey = monthNames[sessionDate.getMonth()];
        if (monthData[monthKey]) {
          monthData[monthKey].students.add(session.student_id);
          if (session.status === SessionStatus.COMPLETED) {
            monthData[monthKey].sessions++;
          }
        }
      });

      // Process reviews
      reviews.forEach((review) => {
        const reviewDate = review.submitted_at;
        if (!reviewDate) return;
        
        const monthKey = monthNames[reviewDate.getMonth()];
        if (monthData[monthKey]) {
          monthData[monthKey].reviews++;
        }
      });

      // Convert to array format, sorted by month
      const monthOrder = monthNames;
      const data = Object.entries(monthData)
        .map(([month, data]) => ({
          month,
          students: data.students.size,
          sessions: data.sessions,
          reviews: data.reviews,
        }))
        .sort((a, b) => {
          const aIndex = monthOrder.indexOf(a.month);
          const bIndex = monthOrder.indexOf(b.month);
          return aIndex - bIndex;
        })
        .slice(-monthsBack); // Get last N months

      return { data };
    } catch (error) {
      console.error("[MentorService] getPerformanceData error:", error);
      throw error;
    }
  }

  /**
   * Get student joins for a specific month/year
   * Returns students who made successful payments in that month
   */
  async getStudentJoins(
    mentorId: string,
    year: number,
    month: number
  ): Promise<any> {
    try {
      // Calculate month range (month is 1-based: 1 = January, 12 = December)
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 1);

      // Query payments with successful status for this mentor
      const payments = await prisma.payments.findMany({
        where: {
          status: PaymentStatus.SUCCESS,
          created_at: {
            gte: monthStart,
            lt: monthEnd,
          },
          sessions: {
            mentor_id: mentorId,
          },
        },
        select: {
          id: true,
          created_at: true,
          sessions: {
            select: {
              id: true,
              student_id: true,
              skill_name: true,
              users_student: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          created_at: "asc",
        },
      });

      // Group by student_id to avoid duplicates (one student counted once per month)
      const studentMap = new Map<string, {
        student_id: string;
        name: string;
        joined_at: string;
        skill: string;
      }>();

      payments.forEach((payment) => {
        if (payment.sessions && payment.sessions.users_student && payment.created_at) {
          const studentId = payment.sessions.student_id;
          const studentName = payment.sessions.users_student.name || "Unknown Student";
          const skillName = payment.sessions.skill_name || "Unknown Skill";
          const joinedAt = payment.created_at.toISOString().split("T")[0];

          // Only add if not already in map (first payment in this month)
          if (!studentMap.has(studentId)) {
            studentMap.set(studentId, {
              student_id: studentId,
              name: studentName,
              joined_at: joinedAt,
              skill: skillName,
            });
          }
        }
      });

      // Convert map to array and sort by joined_at
      const students = Array.from(studentMap.values()).sort((a, b) => {
        return a.joined_at.localeCompare(b.joined_at);
      });

      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];

      return {
        year,
        month: monthNames[month - 1],
        count: students.length,
        students,
      };
    } catch (error) {
      console.error("[MentorService] getStudentJoins error:", error);
      throw error;
    }
  }

  /**
   * Get weekly schedule for mentor (for weekly timetable)
   * Returns sessions scheduled for Monday-Friday of the specified week, based on session_schedule
   */
  async getWeeklySchedule(mentorId: string, weekStart: string, weekEnd: string): Promise<any> {
    try {
      // Parse week start and end dates (format: YYYY-MM-DD)
      const [startYear, startMonth, startDay] = weekStart.split('-').map(Number);
      const weekStartDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
      
      const [endYear, endMonth, endDay] = weekEnd.split('-').map(Number);
      const weekEndDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);

      // Get sessions with this week's schedule items
      const sessions = await prisma.sessions.findMany({
        where: {
          mentor_id: mentorId,
          status: {
            notIn: [SessionStatus.CANCELLED, SessionStatus.REJECTED],
          },
        },
        select: {
          id: true,
          skill_name: true,
          users_student: {
            select: {
              id: true,
              name: true,
            },
          },
          payments: {
            select: {
              status: true,
            },
          },
          session_schedule: {
            where: {
              scheduled_date: {
                gte: weekStartDate,
                lte: weekEndDate,
              },
            },
            select: {
              id: true,
              scheduled_date: true,
              scheduled_time: true,
              status: true,
              topic_title: true,
            },
            orderBy: [
              { scheduled_date: "asc" },
              { scheduled_time: "asc" },
            ],
          },
        },
      });

      // Filter to sessions with successful payments
      const paidSessions = sessions.filter((session: any) => {
        if ((session as any).status === SessionStatus.PAID || (session as any).status === SessionStatus.SCHEDULED) {
          return true;
        }
        if (session.payments && session.payments.status === PaymentStatus.SUCCESS) {
          return true;
        }
        return false;
      });

      // Build schedule items grouped by day (Monday to Friday)
      const dayMap = new Map<string, Array<{
        start_time: string;
        end_time: string;
        skill: string;
        student: string;
      }>>();

      // Initialize days map (Monday to Friday)
      const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
      for (let i = 0; i < 5; i++) {
        const dayDate = new Date(weekStartDate);
        dayDate.setDate(dayDate.getDate() + i);
        const dateKey = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;
        dayMap.set(dateKey, []);
      }

      paidSessions.forEach((session) => {
        session.session_schedule.forEach((item) => {
          // Create IST datetime from scheduled_date and scheduled_time
          const scheduledDateTimeIST = createISTDateTimeFromSchedule(item.scheduled_date, item.scheduled_time);
          
          // Default duration: 1 hour
          const endDateTimeIST = new Date(scheduledDateTimeIST.getTime() + 60 * 60 * 1000);
          
          // Format times as HH:MM (extract from IST datetime)
          const [hours, minutes] = item.scheduled_time.split(':').map(Number);
          const startTime = `${String(hours || 0).padStart(2, '0')}:${String(minutes || 0).padStart(2, '0')}`;
          
          // Get end time components from IST datetime
          const endTimeComponents = getISTTimeComponents(endDateTimeIST);
          const endTime = `${String(endTimeComponents.hour).padStart(2, '0')}:${String(endTimeComponents.minute).padStart(2, '0')}`;

          // Get date key for this schedule item (use IST date components)
          const dateComponents = getISTDateComponents(scheduledDateTimeIST);
          const dateKey = `${dateComponents.year}-${String(dateComponents.month).padStart(2, '0')}-${String(dateComponents.day).padStart(2, '0')}`;
          
          if (dayMap.has(dateKey)) {
            dayMap.get(dateKey)!.push({
              start_time: startTime,
              end_time: endTime,
              skill: session.skill_name || "Unknown Skill",
              student: session.users_student?.name || "Unknown Student",
            });
          }
        });
      });

      // Build days array with day names
      const days: Array<{
        date: string;
        dayName: string;
        sessions: Array<{
          start_time: string;
          end_time: string;
          skill: string;
          student: string;
        }>;
      }> = [];

      for (let i = 0; i < 5; i++) {
        const dayDate = new Date(weekStartDate);
        dayDate.setDate(dayDate.getDate() + i);
        const dateKey = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;
        const sessions = dayMap.get(dateKey) || [];
        sessions.sort((a, b) => {
          const [aHour, aMin] = a.start_time.split(':').map(Number);
          const [bHour, bMin] = b.start_time.split(':').map(Number);
          return (aHour * 60 + aMin) - (bHour * 60 + bMin);
        });
        
        days.push({
          date: dateKey,
          dayName: dayNames[i],
          sessions,
        });
      }

      const weekStartStr = `${weekStartDate.getFullYear()}-${String(weekStartDate.getMonth() + 1).padStart(2, '0')}-${String(weekStartDate.getDate()).padStart(2, '0')}`;
      const weekEndStr = `${weekEndDate.getFullYear()}-${String(weekEndDate.getMonth() + 1).padStart(2, '0')}-${String(weekEndDate.getDate()).padStart(2, '0')}`;

      return {
        weekStart: weekStartStr,
        weekEnd: weekEndStr,
        days,
      };
    } catch (error) {
      console.error("[MentorService] getWeeklySchedule error:", error);
      throw error;
    }
  }

  /**
   * Get top performing students
   * Progress = (completedSessions / totalSessions) * 100
   * Sort by progress DESC, then rating DESC
   */
  async getTopStudents(mentorId: string, limit: number = 3): Promise<any[]> {
    try {
      // Get all sessions for this mentor
      const allSessions = await prisma.sessions.findMany({
        where: {
          mentor_id: mentorId,
          status: { not: SessionStatus.CANCELLED },
        },
        include: {
          users_student: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Group by student and calculate progress
      const studentMap = new Map<string, {
        id: string;
        name: string;
        email: string;
        totalSessions: number;
        completedSessions: number;
      }>();

      allSessions.forEach((session) => {
        const studentId = session.student_id;
        if (!studentMap.has(studentId)) {
          studentMap.set(studentId, {
            id: session.users_student.id,
            name: session.users_student.name,
            email: session.users_student.email,
            totalSessions: 0,
            completedSessions: 0,
          });
        }
        const student = studentMap.get(studentId)!;
        student.totalSessions++;
        if (session.status === SessionStatus.COMPLETED) {
          student.completedSessions++;
        }
      });

      // Calculate progress and get mentor rating from profile
      const mentorProfile = await prisma.mentor_profiles.findUnique({
        where: { user_id: mentorId },
        select: { rating: true },
      });
      const defaultRating = mentorProfile?.rating ? Number(mentorProfile.rating) : 4.5;

      const studentStats = Array.from(studentMap.values()).map((student) => {
        const progress = student.totalSessions > 0
          ? (student.completedSessions / student.totalSessions) * 100
          : 0;
        
        return {
          id: student.id,
          name: student.name,
          email: student.email,
          progress: Math.round(progress),
          rating: defaultRating, // Use mentor's overall rating as approximation
        };
      });

      return studentStats
        .sort((a, b) => {
          // Sort by progress DESC, then rating DESC
          if (b.progress !== a.progress) {
            return b.progress - a.progress;
          }
          return b.rating - a.rating;
        })
        .slice(0, limit);
    } catch (error) {
      console.error("[MentorService] getTopStudents error:", error);
      throw error;
    }
  }

  /**
   * Get course distribution
   * Count students by their course/degree from student_profiles
   */
  async getCourseDistribution(mentorId: string): Promise<any[]> {
    try {
      // Get all unique students for this mentor
      const sessions = await prisma.sessions.findMany({
        where: {
          mentor_id: mentorId,
          status: { not: SessionStatus.CANCELLED },
        },
        distinct: ["student_id"],
        include: {
          users_student: {
            include: {
              student_profiles: {
                select: {
                  education_type: true,
                  branch: true,
                },
              },
            },
          },
        },
      });

      // Group by course/degree
      const courseMap = new Map<string, number>();
      sessions.forEach((session) => {
        const profile = session.users_student.student_profiles;
        if (profile) {
          const course = profile.education_type 
            ? `${profile.education_type} ${profile.branch || ""}`.trim()
            : "Not Specified";
          courseMap.set(course, (courseMap.get(course) || 0) + 1);
        } else {
          courseMap.set("Not Specified", (courseMap.get("Not Specified") || 0) + 1);
        }
      });

      const totalStudents = sessions.length;
      const distribution = Array.from(courseMap.entries()).map(([course, count]) => ({
        course,
        count,
        percentage: totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0,
      }));

      return distribution.sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error("[MentorService] getCourseDistribution error:", error);
      throw error;
    }
  }

  /**
   * Get quick stats
   * - Active Students: students with ONGOING or UPCOMING sessions
   * - Completed Reviews: total assignment submissions (reviews)
   * - Avg Session Duration: AVG(completed_at - scheduled_at) for completed sessions
   * - Student Satisfaction: (AVG rating / 5) * 100
   */
  async getQuickStats(mentorId: string): Promise<any> {
    try {
      // Active Students - students with ONGOING or UPCOMING sessions
      const activeStudents = await prisma.sessions.findMany({
        where: {
          mentor_id: mentorId,
          status: {
            in: [SessionStatus.SCHEDULED, SessionStatus.APPROVED, SessionStatus.PAID],
          },
        },
        distinct: ["student_id"],
      });

      // Completed Reviews - assignments, cover letters, and resumes
      const [assignmentReviews, coverLetterReviews, resumeReviews] = await Promise.all([
        // Assignment submissions
        prisma.assignment_submissions.count({
          where: {
            assignments: {
              mentor_id: mentorId,
            },
            review_status: "VERIFIED",
          },
        }),
        // Cover letter reviews
        prisma.cover_letter_review_requests.count({
          where: {
            mentor_id: mentorId,
            status: ReviewStatus.VERIFIED,
          },
        }),
        // Resume reviews
        prisma.resume_review_requests.count({
          where: {
            mentor_id: mentorId,
            status: ReviewStatus.VERIFIED,
          },
        }),
      ]);

      const completedReviews = assignmentReviews + coverLetterReviews + resumeReviews;

      // Avg Session Duration - calculate from completed sessions
      const completedSessions = await prisma.sessions.findMany({
        where: {
          mentor_id: mentorId,
          status: SessionStatus.COMPLETED,
          completed_at: { not: null },
        },
        select: {
          scheduled_at: true,
          completed_at: true,
        },
      });

      let totalDuration = 0;
      let validSessions = 0;
      completedSessions.forEach((session) => {
        if (session.completed_at && session.scheduled_at) {
          const duration = session.completed_at.getTime() - session.scheduled_at.getTime();
          if (duration > 0) {
            totalDuration += duration;
            validSessions++;
          }
        }
      });

      const avgDurationMinutes = validSessions > 0
        ? Math.round(totalDuration / (1000 * 60) / validSessions)
        : 45; // Default to 45 if no data

      // Student Satisfaction - (AVG rating / 5) * 100
      const mentorProfile = await prisma.mentor_profiles.findUnique({
        where: { user_id: mentorId },
        select: { rating: true },
      });
      const avgRating = mentorProfile?.rating ? Number(mentorProfile.rating) : 0;
      const satisfaction = (avgRating / 5) * 100;

      return {
        activeStudents: activeStudents.length,
        completedReviews,
        avgSessionDuration: `${avgDurationMinutes} min`,
        studentSatisfaction: Math.round(satisfaction),
      };
    } catch (error) {
      console.error("[MentorService] getQuickStats error:", error);
      throw error;
    }
  }

  // ============================================
  // MESSAGES & CHAT
  // ============================================

  /**
   * Get all conversations
   */
  async getConversations(
    mentorId: string,
    search?: string
  ): Promise<any[]> {
    try {
      const sessions = await prisma.sessions.findMany({
        where: {
          mentor_id: mentorId,
          status: {
            in: [SessionStatus.SCHEDULED, SessionStatus.PAID],
          },
        },
        include: {
          users_student: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          session_messages: {
            orderBy: {
              created_at: "desc",
            },
            take: 1,
          },
        },
        distinct: ["student_id"],
      });

      let conversations = sessions.map((session) => {
        const lastMessage = session.session_messages[0];
        return {
          id: session.id,
          student: {
            id: session.users_student.id,
            name: session.users_student.name,
            email: session.users_student.email,
          },
          lastMessage: lastMessage?.content,
          lastMessageTime: lastMessage?.created_at,
          unreadCount: 0, // TODO: Need to track unread messages per conversation
        };
      });

      // Filter by search
      if (search) {
        const searchLower = search.toLowerCase();
        conversations = conversations.filter(
          (c) =>
            c.student.name.toLowerCase().includes(searchLower) ||
            c.student.email.toLowerCase().includes(searchLower)
        );
      }

      return conversations;
    } catch (error) {
      console.error("[MentorService] getConversations error:", error);
      throw error;
    }
  }

  /**
   * Get messages for a session
   */
  async getSessionMessages(
    mentorId: string,
    sessionId: string
  ): Promise<any[]> {
    try {
      // Verify session belongs to mentor
      const session = await prisma.sessions.findFirst({
        where: {
          id: sessionId,
          mentor_id: mentorId,
        },
      });

      if (!session) {
        throw new Error("Session not found or access denied");
      }

      const messages = await prisma.session_messages.findMany({
        where: {
          session_id: sessionId,
        },
        include: {
          users: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          created_at: "asc",
        },
      });

      return messages.map((msg) => ({
        id: msg.id,
        senderId: msg.sender_id,
        senderName: msg.users.name,
        content: msg.content,
        messageType: msg.message_type,
        createdAt: msg.created_at,
        isMentor: msg.sender_id === mentorId,
      }));
    } catch (error) {
      console.error("[MentorService] getSessionMessages error:", error);
      throw error;
    }
  }

  /**
   * Send a message
   */
  async sendMessage(
    mentorId: string,
    data: {
      sessionId: string;
      content: string;
      messageType?: string;
    }
  ): Promise<any> {
    try {
      // Verify session belongs to mentor and is paid/scheduled
      const session = await prisma.sessions.findFirst({
        where: {
          id: data.sessionId,
          mentor_id: mentorId,
          status: {
            in: [SessionStatus.SCHEDULED, SessionStatus.PAID],
          },
        },
      });

      if (!session) {
        throw new Error("Session not found or chat not enabled");
      }

      const message = await prisma.session_messages.create({
        data: {
          session_id: data.sessionId,
          sender_id: mentorId,
          sender_role: "MENTOR",
          content: data.content,
          message_type: data.messageType || "text",
        },
        include: {
          users: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return {
        id: message.id,
        senderId: message.sender_id,
        senderName: message.users.name,
        content: message.content,
        messageType: message.message_type,
        createdAt: message.created_at,
      };
    } catch (error) {
      console.error("[MentorService] sendMessage error:", error);
      throw error;
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesRead(
    mentorId: string,
    sessionId: string,
    messageIds?: number[]
  ): Promise<void> {
    // TODO: Add read receipts - need to track when messages are viewed
    return;
  }

  // ============================================
  // SKILL TEST
  // ============================================

  /**
   * Get available courses for skill test (DB-driven, only courses with questions)
   * Returns only courses that have questions in skill_test_questions table
   */
  async getAvailableCourses(mentorId: string): Promise<any[]> {
    try {
      // Get all courses that have questions
      const coursesWithQuestions = await prisma.courses.findMany({
        where: {
          is_active: true,
          skill_test_questions: {
            some: {}, // At least one question exists
          },
        },
        include: {
          _count: {
            select: {
              skill_test_questions: true,
            },
          },
        },
        orderBy: {
          title: "asc",
        },
      });

      // Get mentor's test results
      const mentorTests = await prisma.mentor_tests.findMany({
        where: {
          mentor_id: mentorId,
        },
      });

      // Map courses with test status
      // Filter out courses where test is PASSED (already verified)
      return coursesWithQuestions
        .map((course) => {
          const test = mentorTests.find(
            (t) => t.course_name.toLowerCase() === course.title.toLowerCase()
          );
          return {
            id: course.id,
            careerId: course.career_id,
            name: course.title,
            description: course.description,
            testStatus: test?.status || null,
            testScore: test?.score ? Number(test.score) : null,
            retryAvailableAfter: test?.retry_available_after || null,
            questionCount: course._count.skill_test_questions,
          };
        })
        .filter((course) => {
          // Remove PASSED tests from available courses (already verified)
          return course.testStatus !== "PASSED";
        });
    } catch (error) {
      console.error("[MentorService] getAvailableCourses error:", error);
      throw error;
    }
  }

  /**
   * Get test results
   */
  async getTestResults(mentorId: string): Promise<any> {
    try {
      const tests = await prisma.mentor_tests.findMany({
        where: {
          mentor_id: mentorId,
        },
        orderBy: {
          completed_at: "desc",
        },
      });

      return {
        passed: tests
          .filter((t) => t.status === TestStatus.PASSED)
          .map((t) => ({
            id: t.id,
            courseName: t.course_name,
            score: Number(t.score),
            completedAt: t.completed_at,
          })),
        failed: tests
          .filter((t) => t.status === TestStatus.FAILED)
          .map((t) => ({
            id: t.id,
            courseName: t.course_name,
            score: Number(t.score),
            retryAvailableAfter: t.retry_available_after,
          })),
        pending: tests
          .filter((t) => t.status === TestStatus.PENDING || t.status === TestStatus.IN_PROGRESS)
          .map((t) => ({
            id: t.id,
            courseName: t.course_name,
            status: t.status,
            attemptedAt: t.attempted_at,
          })),
      };
    } catch (error) {
      console.error("[MentorService] getTestResults error:", error);
      throw error;
    }
  }

  /**
   * Generate a skill test (DB-DRIVEN, NO AI)
   * - Validates course exists and is active
   * - Fetches questions from database
   * - Randomizes and selects 20 questions
   */
  async generateTest(
    mentorId: string,
    data: {
      courseId: number; // Course ID from dropdown selection
    }
  ): Promise<any> {
    try {
      // STEP 1: Validate course exists and is active
      const course = await prisma.courses.findFirst({
        where: {
          id: data.courseId,
          is_active: true,
        },
      });

      if (!course) {
        throw new Error("Selected course not found or inactive");
      }

      const courseName = course.title;

      // STEP 2: Check if test already exists (PENDING or IN_PROGRESS)
      // Allow retest - if test exists, return it so user can continue
      const existingTest = await prisma.mentor_tests.findFirst({
        where: {
          mentor_id: mentorId,
          course_name: courseName,
          status: {
            in: [TestStatus.PENDING, TestStatus.IN_PROGRESS],
          },
        },
      });

      if (existingTest) {
        // Return existing test so user can continue/resume
        console.log(`[MentorService] Found existing ${existingTest.status} test ${existingTest.id}, allowing resume`);
        
        // Get questions from existing test
        let questions = (existingTest.analysis as any) || [];
        
        // Check if questions are placeholders
        const hasPlaceholderQuestions = questions.length > 0 && (
          questions.some((q: any) => 
            (q.question_text && (q.question_text.includes('Backend Question') || 
                                 (q.question_text.includes('Question ') && !q.question_text.includes('?')))) ||
            (Array.isArray(q.options) && (q.options[0] === 'Option A' || q.options[0] === 'A'))
          )
        );
        
        // If placeholders found, refresh from database
        if (hasPlaceholderQuestions || questions.length === 0) {
          console.log(`[MentorService] Existing test has ${hasPlaceholderQuestions ? 'placeholder' : 'no'} questions, refreshing from database...`);
          
          // Find course
          const course = await prisma.courses.findFirst({
            where: {
              title: {
                equals: courseName,
                mode: "insensitive",
              },
              is_active: true,
            },
          });
          
          if (course) {
            // Fetch questions from database
            const dbQuestions = await prisma.skill_test_questions.findMany({
              where: {
                course_id: course.id,
              },
              take: 20,
            });
            
            if (dbQuestions.length > 0) {
              // Format questions
              questions = dbQuestions.map((q) => {
                let optionsArray: string[] = [];
                if (typeof q.options === 'string') {
                  try {
                    const parsed = JSON.parse(q.options);
                    optionsArray = Array.isArray(parsed) 
                      ? parsed.filter((item): item is string => typeof item === "string")
                      : [];
                  } catch (e) {
                    console.error(`[MentorService] Failed to parse options for question ${q.id}:`, e);
                    optionsArray = [];
                  }
                } else if (Array.isArray(q.options)) {
                  optionsArray = q.options.filter((item): item is string => typeof item === "string");
                } else {
                  optionsArray = [];
                }
                
                return {
                  id: q.id,
                  question_text: q.question_text || `Question ${q.id}`,
                  question_type: q.question_type || "conceptual",
                  options: optionsArray,
                  correct_answer: q.correct_answer,
                  explanation: q.explanation || "",
                  points: q.points || 1,
                  difficulty: q.difficulty || "INTERMEDIATE",
                };
              });
              
              // Update test with real questions
              await prisma.mentor_tests.update({
                where: { id: existingTest.id },
                data: {
                  analysis: questions as any,
                  total_questions: questions.length,
                },
              });
              console.log(`[MentorService] Updated existing test ${existingTest.id} with ${questions.length} real questions`);
            }
          }
        }
        
        return {
          id: existingTest.id,
          status: existingTest.status,
          message: "Resuming existing test",
          questions: questions, // Return questions for frontend
          totalQuestions: questions.length,
        };
      }

      // STEP 3: Check if already passed
      const passedTest = await prisma.mentor_tests.findFirst({
        where: {
          mentor_id: mentorId,
          course_name: courseName,
          status: TestStatus.PASSED,
        },
      });

      if (passedTest) {
        throw new Error("You have already passed this test");
      }

      // STEP 4: Check retry availability for failed tests
      const failedTest = await prisma.mentor_tests.findFirst({
        where: {
          mentor_id: mentorId,
          course_name: courseName,
          status: TestStatus.FAILED,
        },
      });

      if (failedTest && failedTest.retry_available_after) {
        const retryDate = new Date(failedTest.retry_available_after);
        if (retryDate > getISTNow()) {
          throw new Error(
            `Retry available after ${retryDate.toLocaleDateString()}`
          );
        }
      }

      // STEP 5: Fetch questions from database
      console.log(`[MentorService] Fetching questions for courseId: ${data.courseId}, courseName: ${courseName}`);
      
      const allQuestions = await prisma.skill_test_questions.findMany({
        where: {
          course_id: data.courseId,
        },
      });

      console.log(`[MentorService] Found ${allQuestions.length} questions for courseId ${data.courseId}`);

      if (allQuestions.length === 0) {
        // Double-check by course name as fallback
        const questionsByName = await prisma.skill_test_questions.findMany({
          where: {
            courses: {
              title: courseName,
            },
          },
        });
        console.log(`[MentorService] Fallback check by name: Found ${questionsByName.length} questions for courseName: ${courseName}`);
        
        if (questionsByName.length === 0) {
          throw new Error(`No questions available for this skill (${courseName}). Please contact admin.`);
        }
        
        // Use questions found by name
        const shuffled = [...questionsByName].sort(() => Math.random() - 0.5);
        const selectedQuestions = shuffled.slice(0, 20);
        
        // Format questions - ensure options is properly parsed
        const testQuestions = selectedQuestions.map((q) => {
          // Parse options if it's a string, otherwise use as-is
          let optionsArray: string[] = [];
          if (typeof q.options === 'string') {
            try {
              const parsed = JSON.parse(q.options);
              optionsArray = Array.isArray(parsed) 
                ? parsed.filter((item): item is string => typeof item === "string")
                : [];
            } catch (e) {
              console.error(`[MentorService] Failed to parse options for question ${q.id}:`, e);
              optionsArray = [];
            }
          } else if (Array.isArray(q.options)) {
            optionsArray = q.options.filter((item): item is string => typeof item === "string");
          } else {
            console.error(`[MentorService] Invalid options format for question ${q.id}:`, typeof q.options);
            optionsArray = [];
          }

          return {
            id: q.id,
            question_text: q.question_text || `Question ${q.id}`,
            question_type: q.question_type || "conceptual",
            options: optionsArray,
            correct_answer: q.correct_answer,
            explanation: q.explanation || "",
            points: q.points || 1,
            difficulty: q.difficulty || "INTERMEDIATE",
          };
        });

        // Ensure mentor profile exists before creating test
        let mentorProfile = await prisma.mentor_profiles.findUnique({
          where: { user_id: mentorId },
        });

        if (!mentorProfile) {
          const user = await prisma.user.findUnique({
            where: { id: mentorId },
            select: { name: true, email: true },
          });

          if (!user) {
            throw new Error("User not found");
          }

          mentorProfile = await prisma.mentor_profiles.create({
            data: {
              user_id: mentorId,
              full_name: user.name,
              bio: "",
              current_role: "",
            },
          });
          console.log(`[MentorService] Created mentor profile for user ${mentorId}`);
        }

        const { inferCourseCategory } = await import("../utils/skillUtils");
        const inferredCategory = inferCourseCategory(courseName);

        const test = await prisma.mentor_tests.create({
          data: {
            mentor_id: mentorId,
            course_name: courseName,
            course_category: inferredCategory,
            status: TestStatus.PENDING,
            score: 0,
            total_questions: testQuestions.length,
            strengths: [],
            weaknesses: [],
            analysis: testQuestions as any,
          },
        });

        return {
          id: test.id,
          status: test.status,
          message: "Test is ready! You can start taking it now.",
          questions: testQuestions,
          totalQuestions: testQuestions.length,
          courseId: course.id,
        };
      }

      if (allQuestions.length < 20) {
        console.warn(`[MentorService] Only ${allQuestions.length} questions available for ${courseName}, using all available`);
      }

      // STEP 6: Randomize and select 20 questions (or all if less than 20)
      const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
      const selectedQuestions = shuffled.slice(0, 20);

      // Format questions for test - ensure options is properly parsed
      const testQuestions = selectedQuestions.map((q) => {
        // Parse options if it's a string, otherwise use as-is
        let optionsArray: string[] = [];
        if (typeof q.options === 'string') {
          try {
            const parsed = JSON.parse(q.options);
            optionsArray = Array.isArray(parsed) 
              ? parsed.filter((item): item is string => typeof item === "string")
              : [];
          } catch (e) {
            console.error(`[MentorService] Failed to parse options for question ${q.id}:`, e);
            optionsArray = [];
          }
        } else if (Array.isArray(q.options)) {
          optionsArray = q.options.filter((item): item is string => typeof item === "string");
        } else {
          console.error(`[MentorService] Invalid options format for question ${q.id}:`, typeof q.options);
          optionsArray = [];
        }

        return {
          id: q.id,
          question_text: q.question_text || `Question ${q.id}`,
          question_type: q.question_type || "conceptual",
          options: optionsArray,
          correct_answer: q.correct_answer,
          explanation: q.explanation || "",
          points: q.points || 1,
          difficulty: q.difficulty || "INTERMEDIATE",
        };
      });

      // STEP 7: Ensure mentor profile exists (required for foreign key constraint)
      let mentorProfile = await prisma.mentor_profiles.findUnique({
        where: { user_id: mentorId },
      });

      if (!mentorProfile) {
        // Create a basic mentor profile if it doesn't exist
        const user = await prisma.user.findUnique({
          where: { id: mentorId },
          select: { name: true, email: true },
        });

        if (!user) {
          throw new Error("User not found");
        }

        mentorProfile = await prisma.mentor_profiles.create({
          data: {
            user_id: mentorId,
            full_name: user.name,
            bio: "",
            current_role: "",
          },
        });
        console.log(`[MentorService] Created mentor profile for user ${mentorId}`);
      }

      // STEP 8: Infer category from course title
      const { inferCourseCategory } = await import("../utils/skillUtils");
      const inferredCategory = inferCourseCategory(courseName);

      // STEP 9: Create test record
      const test = await prisma.mentor_tests.create({
        data: {
          mentor_id: mentorId,
          course_name: courseName,
          course_category: inferredCategory,
          status: TestStatus.PENDING,
          score: 0, // Required field, set to 0 for pending tests
          total_questions: testQuestions.length,
          strengths: [], // Required array
          weaknesses: [], // Required array
          analysis: testQuestions as any, // Store questions in analysis field
        },
      });

      console.log(`[MentorService] Created test ${test.id} with ${testQuestions.length} questions for ${courseName}`);

      return {
        id: test.id,
        status: test.status,
        message: "Test is ready! You can start taking it now.",
        questions: testQuestions, // Return questions for frontend
        totalQuestions: testQuestions.length,
        courseId: course.id,
      };
    } catch (error) {
      console.error("[MentorService] generateTest error:", error);
      throw error;
    }
  }

  /**
   * Submit test answers (RULE-BASED EVALUATION, NO AI)
   * - Evaluates answers by comparing with correct_answer
   * - Calculates score
   * - Creates verification records if passed
   * - Links mentor to course
   */
  async submitTest(
    mentorId: string,
    testId: number,
    answers: any[]
  ): Promise<any> {
    try {
      // Ensure testId is a number
      const testIdNum = typeof testId === "string" ? parseInt(testId, 10) : testId;
      
      if (isNaN(testIdNum)) {
        throw new Error("Invalid test ID");
      }

      console.log(`[MentorService] Submitting test ${testIdNum} for mentor ${mentorId}`);

      const test = await prisma.mentor_tests.findFirst({
        where: {
          id: testIdNum,
          mentor_id: mentorId,
        },
      });

      if (!test) {
        throw new Error("Test not found");
      }

      // Get questions from test analysis field
      const questions = (test.analysis as any) || [];
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error("Test questions not found");
      }

      // STEP 1: Evaluate answers (rule-based, no AI)
      console.log(`[MentorService] Evaluating test answers for test ${testId} (rule-based)`);
      
      let correctCount = 0;
      const totalQuestions = questions.length;
      const strengths: string[] = [];
      const weaknesses: string[] = [];
      const questionTypesCorrect: Record<string, number> = {};
      const questionTypesTotal: Record<string, number> = {};

      // Evaluate each answer
      console.log(`[MentorService] Evaluating ${answers.length} answers for ${totalQuestions} questions`);
      
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const answer = answers.find((a) => a.questionIndex === i);
        let selectedAnswer = answer?.selectedAnswer ?? null;

        // Ensure selectedAnswer is a number (might come as string)
        if (selectedAnswer !== null) {
          selectedAnswer = typeof selectedAnswer === "string" ? parseInt(selectedAnswer, 10) : selectedAnswer;
        }

        // Count by question type
        const qType = question.question_type || "unknown";
        questionTypesTotal[qType] = (questionTypesTotal[qType] || 0) + 1;

        // Check if answer is correct
        const correctAnswer = typeof question.correct_answer === "string" 
          ? parseInt(question.correct_answer, 10) 
          : question.correct_answer;

        if (selectedAnswer !== null && !isNaN(selectedAnswer) && selectedAnswer === correctAnswer) {
          correctCount++;
          questionTypesCorrect[qType] = (questionTypesCorrect[qType] || 0) + 1;
        } else {
          console.log(`[MentorService] Question ${i}: Selected ${selectedAnswer}, Expected ${correctAnswer}, Match: ${selectedAnswer === correctAnswer}`);
        }
      }

      // Calculate score (percentage)
      const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100 * 100) / 100 : 0;

      // Derive strengths and weaknesses from question types
      for (const [qType, correct] of Object.entries(questionTypesCorrect)) {
        const total = questionTypesTotal[qType] || 1;
        const percentage = (correct / total) * 100;
        
        if (percentage >= 75) {
          strengths.push(`${qType.charAt(0).toUpperCase() + qType.slice(1)} questions`);
        } else if (percentage < 50) {
          weaknesses.push(`${qType.charAt(0).toUpperCase() + qType.slice(1)} questions`);
        }
      }

      // Generate feedback
      let feedback = "";
      if (score >= 75) {
        feedback = `Excellent performance! You scored ${score}% (${correctCount}/${totalQuestions} correct). You demonstrated strong understanding of ${test.course_name}.`;
      } else if (score >= 60) {
        feedback = `Good attempt! You scored ${score}% (${correctCount}/${totalQuestions} correct). Consider reviewing the areas where you struggled.`;
      } else {
        feedback = `You scored ${score}% (${correctCount}/${totalQuestions} correct). We recommend reviewing the course material and retaking the test after 7 days.`;
      }

      const evaluation = {
        score,
        correct_answers: correctCount,
        total_questions: totalQuestions,
        strengths,
        weaknesses,
        feedback,
      };

      // STEP 2: Determine status
      let status: TestStatus;
      if (score >= 75) {
        status = TestStatus.PASSED;
      } else if (score >= 60) {
        status = TestStatus.CONDITIONAL;
      } else {
        status = TestStatus.FAILED;
        // Set retry date (7 days from now in IST)
        const retryDate = getISTNow();
        retryDate.setDate(retryDate.getDate() + 7);
        await prisma.mentor_tests.update({
          where: { id: testIdNum },
          data: {
            retry_available_after: retryDate,
          },
        });
      }

      // Store submitted answers with questions for review
      const questionsWithAnswers = questions.map((q: any, i: number) => {
        const answer = answers.find((a) => a.questionIndex === i);
        const selectedAnswer = answer?.selectedAnswer ?? null;
        const correctAnswer = typeof q.correct_answer === "string" 
          ? parseInt(q.correct_answer, 10) 
          : q.correct_answer;
        const isCorrect = selectedAnswer !== null && !isNaN(selectedAnswer) && selectedAnswer === correctAnswer;
        
        return {
          ...q,
          submitted_answer: selectedAnswer,
          is_correct: isCorrect,
        };
      });

      // STEP 3: Update test with evaluation results and submitted answers
      const updatedTest = await prisma.mentor_tests.update({
        where: { id: testIdNum },
        data: {
          status,
          score,
          correct_answers: evaluation.correct_answers,
          total_questions: evaluation.total_questions,
          strengths: evaluation.strengths,
          weaknesses: evaluation.weaknesses,
          feedback: evaluation.feedback,
          completed_at: new Date(),
          analysis: questionsWithAnswers as any, // Store questions with submitted answers
        },
      });

      // STEP 4: If passed, create verification and link mentor to course
      if (status === TestStatus.PASSED) {
        // Find course by name (case-insensitive)
        const course = await prisma.courses.findFirst({
          where: {
            title: {
              equals: test.course_name,
              mode: "insensitive",
            },
          },
        });

        if (course) {
          // Check if verification already exists
          const existingVerification =
            await prisma.mentor_course_verifications.findFirst({
              where: {
                mentor_id: mentorId,
                course_id: course.id,
              },
            });

          if (!existingVerification) {
            // Create verification record
            await prisma.mentor_course_verifications.create({
              data: {
                mentor_id: mentorId,
                course_id: course.id,
                test_id: testId,
                verification_score: score,
                is_active: true,
                verified_at: new Date(),
              },
            });

            // Create mentor_courses link
            const existingMentorCourse = await prisma.mentor_courses.findFirst({
              where: {
                mentor_id: mentorId,
                course_id: course.id,
              },
            });

            if (!existingMentorCourse) {
              await prisma.mentor_courses.create({
                data: {
                  mentor_id: mentorId,
                  course_id: course.id,
                },
              });
            }

            // Update mentor profile expertise_areas
            const mentorProfile = await prisma.mentor_profiles.findUnique({
              where: { user_id: mentorId },
              select: { expertise_areas: true },
            });

            if (mentorProfile) {
              const currentAreas = mentorProfile.expertise_areas || [];
              const courseName = course.title;
              
              // Add course if not already in expertise areas
              if (!currentAreas.includes(courseName)) {
                await prisma.mentor_profiles.update({
                  where: { user_id: mentorId },
                  data: {
                    expertise_areas: [...currentAreas, courseName],
                  },
                });
              }
            }

            console.log(`[MentorService] Created verification and linked mentor ${mentorId} to course ${course.id}`);
          }
        } else {
          console.warn(`[MentorService] Course not found for skill: ${test.course_name}`);
        }
      }

      return {
        id: updatedTest.id,
        status: updatedTest.status,
        score: Number(updatedTest.score),
        passed: status === TestStatus.PASSED,
        strengths: evaluation.strengths,
        weaknesses: evaluation.weaknesses,
        feedback: evaluation.feedback,
      };
    } catch (error) {
      console.error("[MentorService] submitTest error:", error);
      throw error;
    }
  }

  /**
   * Get test details (including questions)
   */
  async getTestDetails(mentorId: string, testId: string): Promise<any | null> {
    try {
      const test = await prisma.mentor_tests.findFirst({
        where: {
          id: parseInt(testId),
          mentor_id: mentorId,
        },
      });

      if (!test) return null;

      // Get questions from analysis field
      let questions = (test.analysis as any) || [];

      // Check if questions are placeholders (old format)
      const hasPlaceholderQuestions = questions.length > 0 && (
        questions.some((q: any) => 
          (q.question_text && (q.question_text.includes('Backend Question') || 
                               (q.question_text.includes('Question ') && !q.question_text.includes('?')))) ||
          (Array.isArray(q.options) && (q.options[0] === 'Option A' || q.options[0] === 'A'))
        )
      );

      // If no questions exist OR questions are placeholders, fetch from database
      if (!questions || questions.length === 0 || hasPlaceholderQuestions) {
        if (hasPlaceholderQuestions) {
          console.log(`[MentorService] Test ${testId} has placeholder questions, refreshing from database...`);
        } else {
          console.log(`[MentorService] No questions found in test ${testId} analysis field, fetching from database...`);
        }
        console.log(`[MentorService] Looking for course: "${test.course_name}"`);
        
        // Find the course (case-insensitive)
        const course = await prisma.courses.findFirst({
          where: {
            title: {
              equals: test.course_name,
              mode: "insensitive",
            },
            is_active: true,
          },
        });

        if (course) {
          console.log(`[MentorService] Found course: ${course.title} (ID: ${course.id})`);
          
          // Fetch questions from database
          const dbQuestions = await prisma.skill_test_questions.findMany({
            where: {
              course_id: course.id,
            },
            take: 20, // Limit to 20 questions
          });

          console.log(`[MentorService] Found ${dbQuestions.length} questions in database for course ${course.id}`);

          if (dbQuestions.length > 0) {
            // Format questions - ensure options is properly parsed
            questions = dbQuestions.map((q) => {
              // Parse options if it's a string, otherwise use as-is
              let optionsArray: string[] = [];
              if (typeof q.options === 'string') {
                try {
                  const parsed = JSON.parse(q.options);
                  optionsArray = Array.isArray(parsed) 
                    ? parsed.filter((item): item is string => typeof item === "string")
                    : [];
                } catch (e) {
                  console.error(`[MentorService] Failed to parse options for question ${q.id}:`, e);
                  optionsArray = [];
                }
              } else if (Array.isArray(q.options)) {
                optionsArray = q.options.filter((item): item is string => typeof item === "string");
              } else {
                console.error(`[MentorService] Invalid options format for question ${q.id}:`, typeof q.options);
                optionsArray = [];
              }

              return {
                id: q.id,
                question_text: q.question_text || `Question ${q.id}`,
                question_type: q.question_type || "conceptual",
                options: optionsArray,
                correct_answer: q.correct_answer,
                explanation: q.explanation || "",
                points: q.points || 1,
                difficulty: q.difficulty || "INTERMEDIATE",
              };
            });

            // Update the test record with questions
            await prisma.mentor_tests.update({
              where: { id: test.id },
              data: {
                analysis: questions as any,
                total_questions: questions.length,
              },
            });
            console.log(`[MentorService] Successfully loaded and updated ${questions.length} questions for test ${testId}`);
          } else {
            console.error(`[MentorService] No questions found in database for course ID ${course.id} (${test.course_name})`);
            // Try to find any questions for this course (without limit)
            const allQuestions = await prisma.skill_test_questions.findMany({
              where: { course_id: course.id },
            });
            console.error(`[MentorService] Total questions in DB for course ${course.id}: ${allQuestions.length}`);
            questions = [];
          }
        } else {
          console.error(`[MentorService] Course not found for name: "${test.course_name}"`);
          // List all active courses for debugging
          const allCourses = await prisma.courses.findMany({
            where: { is_active: true },
            select: { id: true, title: true },
          });
          console.error(`[MentorService] Available courses: ${JSON.stringify(allCourses.map(c => ({ id: c.id, title: c.title })))}`);
          questions = [];
        }
      } else {
        // Check if questions are placeholders (double-check after loading)
        const stillHasPlaceholders = questions.some((q: any) => 
          (q.question_text && (q.question_text.includes('Backend Question') || 
                               (q.question_text.includes('Question ') && !q.question_text.includes('?')))) ||
          (Array.isArray(q.options) && (q.options[0] === 'Option A' || q.options[0] === 'A'))
        );
        
        if (stillHasPlaceholders) {
          console.log(`[MentorService] Questions still have placeholders, fetching fresh questions from database...`);
          // Fetch from database (same logic as above)
          const course = await prisma.courses.findFirst({
            where: {
              title: {
                equals: test.course_name,
                mode: "insensitive",
              },
              is_active: true,
            },
          });

          if (course) {
            const dbQuestions = await prisma.skill_test_questions.findMany({
              where: {
                course_id: course.id,
              },
              take: 20,
            });

            if (dbQuestions.length > 0) {
              questions = dbQuestions.map((q) => {
                let optionsArray: string[] = [];
                if (typeof q.options === 'string') {
                  try {
                    const parsed = JSON.parse(q.options);
                    optionsArray = Array.isArray(parsed) 
                      ? parsed.filter((item): item is string => typeof item === "string")
                      : [];
                  } catch (e) {
                    console.error(`[MentorService] Failed to parse options for question ${q.id}:`, e);
                    optionsArray = [];
                  }
                } else if (Array.isArray(q.options)) {
                  optionsArray = q.options.filter((item): item is string => typeof item === "string");
                } else {
                  optionsArray = [];
                }

                return {
                  id: q.id,
                  question_text: q.question_text || `Question ${q.id}`,
                  question_type: q.question_type || "conceptual",
                  options: optionsArray,
                  correct_answer: q.correct_answer,
                  explanation: q.explanation || "",
                  points: q.points || 1,
                  difficulty: q.difficulty || "INTERMEDIATE",
                };
              });

              // Update the test record with real questions
              await prisma.mentor_tests.update({
                where: { id: test.id },
                data: {
                  analysis: questions as any,
                  total_questions: questions.length,
                },
              });
              console.log(`[MentorService] Updated test ${testId} with real questions from database`);
            }
          }
        } else {
          console.log(`[MentorService] Found ${questions.length} questions in test ${testId} analysis field`);
        }
        
        // Ensure questions are properly formatted - parse options if needed
        questions = questions.map((q: any) => {
          // Ensure question_text exists
          if (!q.question_text && q.question) {
            q.question_text = q.question;
          }
          
          // Parse options if it's a string
          if (typeof q.options === 'string') {
            try {
              q.options = JSON.parse(q.options);
            } catch (e) {
              console.error(`[MentorService] Failed to parse options for question ${q.id || 'unknown'}:`, e);
              q.options = [];
            }
          } else if (!Array.isArray(q.options)) {
            console.error(`[MentorService] Invalid options format for question ${q.id || 'unknown'}:`, typeof q.options);
            q.options = [];
          }
          
          // Ensure all required fields exist
          return {
            id: q.id,
            question_text: q.question_text || q.question || `Question ${q.id || 'unknown'}`,
            question_type: q.question_type || "conceptual",
            options: Array.isArray(q.options) ? q.options : [],
            correct_answer: q.correct_answer,
            explanation: q.explanation || "",
            points: q.points || 1,
            difficulty: q.difficulty || "INTERMEDIATE",
          };
        });
      }

      return {
        id: test.id,
        course_name: test.course_name,
        course_category: test.course_category,
        status: test.status,
        score: test.score ? Number(test.score) : null,
        total_questions: test.total_questions || questions.length,
        correct_answers: test.correct_answers,
        strengths: test.strengths || [],
        weaknesses: test.weaknesses || [],
        feedback: test.feedback,
        attempted_at: test.attempted_at,
        completed_at: test.completed_at,
        retry_available_after: test.retry_available_after,
        questions: questions, // Return questions for frontend
      };
    } catch (error) {
      console.error("[MentorService] getTestDetails error:", error);
      throw error;
    }
  }

  // ============================================
  // PROFILE MANAGEMENT
  // ============================================

  /**
   * Get mentor profile
   */
  async getProfile(mentorId: string): Promise<any | null> {
    try {
      let profile = await prisma.mentor_profiles.findUnique({
        where: { user_id: mentorId },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          mentor_experiences: {
            orderBy: {
              start_date: "desc",
            },
          },
          mentor_course_verifications: {
            where: {
              is_active: true,
            },
            include: {
              courses: true,
              mentor_tests: true,
            },
          },
          mentor_tests: {
            where: {
              status: {
                in: [TestStatus.PENDING, TestStatus.IN_PROGRESS],
              },
            },
          },
        },
      });

      // If profile doesn't exist, create a default one
      if (!profile) {
        const user = await prisma.user.findUnique({
          where: { id: mentorId },
          select: { name: true, email: true },
        });

        if (!user) {
          return null;
        }

        await prisma.mentor_profiles.create({
          data: {
            user_id: mentorId,
            full_name: user.name,
            bio: "",
            current_role: "",
          },
        });

        // Fetch the created profile with all relations
        profile = await prisma.mentor_profiles.findUnique({
          where: { user_id: mentorId },
          include: {
            users: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            mentor_experiences: {
              orderBy: {
                start_date: "desc",
              },
            },
            mentor_course_verifications: {
              where: {
                is_active: true,
              },
              include: {
                courses: true,
                mentor_tests: true,
              },
            },
            mentor_tests: {
              where: {
                status: {
                  in: [TestStatus.PENDING, TestStatus.IN_PROGRESS],
                },
              },
            },
          },
        });
        console.log(`[MentorService] Created default mentor profile for user ${mentorId}`);
      }

      if (!profile) {
        throw new Error("Profile not found");
      }

      return {
        basicInfo: {
          name: profile.full_name || profile.users.name,
          email: profile.users.email,
          bio: profile.bio,
          currentRole: profile.current_role,
          photoUrl: profile.profile_photo_url,
        },
        education: {
          highestQualification: profile.highest_qualification,
          degree: profile.degree,
          branch: profile.branch,
          college: profile.college,
          graduationYear: profile.graduation_year,
          currentYear: profile.current_year,
        },
        experience: profile.mentor_experiences.map((exp) => ({
          id: exp.id,
          company: exp.company,
          role: exp.role,
          domain: exp.domain,
          startDate: exp.start_date,
          endDate: exp.end_date,
          isCurrent: exp.is_current,
          description: exp.description,
          achievements: exp.achievements,
        })),
        verifiedCourses: profile.mentor_course_verifications.map((vc) => ({
          id: vc.id,
          courseId: vc.courses.career_id,
          courseName: vc.courses.title,
          verifiedAt: vc.verified_at,
          score: Number(vc.verification_score),
        })),
        pendingTests: profile.mentor_tests.map((t) => ({
          id: t.id,
          courseName: t.course_name,
          status: t.status,
          attemptedAt: t.attempted_at,
        })),
      };
    } catch (error) {
      console.error("[MentorService] getProfile error:", error);
      throw error;
    }
  }

  /**
   * Update mentor profile
   */
  async updateProfile(mentorId: string, data: any): Promise<any> {
    try {
      const updateData: any = {};

      if (data.name) updateData.full_name = data.name;
      if (data.bio !== undefined) updateData.bio = data.bio;
      if (data.currentRole) updateData.current_role = data.currentRole;
      if (data.profilePhotoUrl) updateData.profile_photo_url = data.profilePhotoUrl;
      if (data.highestQualification)
        updateData.highest_qualification = data.highestQualification;
      if (data.degree) updateData.degree = data.degree;
      if (data.branch) updateData.branch = data.branch;
      if (data.college) updateData.college = data.college;
      if (data.graduationYear) updateData.graduation_year = data.graduationYear;
      if (data.currentYear) updateData.current_year = data.currentYear;
      if (data.experienceYears) updateData.experience_years = data.experienceYears;
      if (data.profession) updateData.profession = data.profession;
      if (data.company) updateData.company = data.company;
      if (data.expertiseAreas) updateData.expertise_areas = data.expertiseAreas;
      if (data.linkedinUrl) updateData.linkedin_url = data.linkedinUrl;
      if (data.sessionTypes) updateData.session_types = data.sessionTypes;
      if (data.pricingPerHour) updateData.pricing_per_hour = data.pricingPerHour;
      if (data.availableSlots) updateData.available_slots = data.availableSlots;
      if (data.profileCompleted !== undefined)
        updateData.profile_completed = data.profileCompleted;

      const profile = await prisma.mentor_profiles.update({
        where: { user_id: mentorId },
        data: updateData,
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return profile;
    } catch (error) {
      console.error("[MentorService] updateProfile error:", error);
      throw error;
    }
  }

  /**
   * Get verified courses
   */
  /**
   * Get verified courses (skills) from mentor_tests
   * mentor_tests is the single source of truth for mentor skills
   */
  async getVerifiedCourses(mentorId: string): Promise<any[]> {
    try {
      const tests = await prisma.mentor_tests.findMany({
        where: {
          mentor_id: mentorId,
          status: "PASSED",
        },
        orderBy: {
          completed_at: "desc",
        },
      });

      return tests.map((test) => ({
        skill: test.course_name, // This is the skill name (e.g., "Python", "Java")
        score: test.score || 0,
        verifiedAt: test.completed_at,
      }));
    } catch (error) {
      console.error("[MentorService] getVerifiedCourses error:", error);
      throw error;
    }
  }

  // ============================================
  // EXPERIENCE MANAGEMENT
  // ============================================

  /**
   * Get mentor experiences
   */
  async getExperiences(mentorId: string): Promise<any[]> {
    try {
      const experiences = await prisma.mentor_experiences.findMany({
        where: {
          mentor_id: mentorId,
        },
        orderBy: {
          start_date: "desc",
        },
      });

      return experiences.map((exp) => ({
        id: exp.id,
        company: exp.company,
        role: exp.role,
        domain: exp.domain,
        startDate: exp.start_date,
        endDate: exp.end_date,
        isCurrent: exp.is_current,
        description: exp.description,
        achievements: exp.achievements,
      }));
    } catch (error) {
      console.error("[MentorService] getExperiences error:", error);
      throw error;
    }
  }

  /**
   * Add experience
   */
  async addExperience(mentorId: string, data: any): Promise<any> {
    try {
      const experience = await prisma.mentor_experiences.create({
        data: {
          mentor_id: mentorId,
          company: data.company,
          role: data.role,
          domain: data.domain,
          start_date: data.startDate ? new Date(data.startDate) : null,
          end_date: data.endDate ? new Date(data.endDate) : null,
          is_current: data.isCurrent || false,
          description: data.description,
          achievements: data.achievements || [],
        },
      });

      return experience;
    } catch (error) {
      console.error("[MentorService] addExperience error:", error);
      throw error;
    }
  }

  /**
   * Update experience
   */
  async updateExperience(
    mentorId: string,
    experienceId: number,
    data: any
  ): Promise<any> {
    try {
      // Verify ownership
      const existing = await prisma.mentor_experiences.findFirst({
        where: {
          id: experienceId,
          mentor_id: mentorId,
        },
      });

      if (!existing) {
        throw new Error("Experience not found");
      }

      const updateData: any = {};
      if (data.company) updateData.company = data.company;
      if (data.role) updateData.role = data.role;
      if (data.domain !== undefined) updateData.domain = data.domain;
      if (data.startDate) updateData.start_date = new Date(data.startDate);
      if (data.endDate) updateData.end_date = new Date(data.endDate);
      if (data.isCurrent !== undefined) updateData.is_current = data.isCurrent;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.achievements) updateData.achievements = data.achievements;

      const experience = await prisma.mentor_experiences.update({
        where: { id: experienceId },
        data: updateData,
      });

      return experience;
    } catch (error) {
      console.error("[MentorService] updateExperience error:", error);
      throw error;
    }
  }

  /**
   * Delete experience
   */
  async deleteExperience(mentorId: string, experienceId: number): Promise<void> {
    try {
      // Verify ownership
      const existing = await prisma.mentor_experiences.findFirst({
        where: {
          id: experienceId,
          mentor_id: mentorId,
        },
      });

      if (!existing) {
        throw new Error("Experience not found");
      }

      await prisma.mentor_experiences.delete({
        where: { id: experienceId },
      });
    } catch (error) {
      console.error("[MentorService] deleteExperience error:", error);
      throw error;
    }
  }

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  /**
   * Get all sessions
   */
  async getSessions(mentorId: string, status?: string): Promise<any[]> {
    try {
      const where: any = {
        mentor_id: mentorId,
      };

      if (status) {
        where.status = status;
      }

      const sessions = await prisma.sessions.findMany({
        where,
        select: {
          id: true,
          skill_name: true, // Include skill_name in select
          skill_id: true,
          session_type: true,
          scheduled_at: true,
          status: true,
          student_message: true,
          zoom_link: true,
          created_at: true,
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
        },
        orderBy: {
          created_at: "desc",
        },
      });

      return sessions.map((session) => {
        // Use skill_name from sessions table (snapshot saved at connection time)
        const skillName = session.skill_name || "Unknown (Legacy)";
        
        return {
          id: session.id,
          student: {
            id: session.users_student.id,
            name: session.users_student.name,
            email: session.users_student.email,
          },
          skillName: skillName, // From sessions.skill_name (snapshot)
          course: {
            id: session.courses.career_id,
            name: session.courses.title,
          },
          sessionType: session.session_type,
          scheduledAt: session.scheduled_at,
          status: session.status,
          studentMessage: session.student_message,
          zoomLink: session.zoom_link,
          createdAt: session.created_at,
        };
      });
    } catch (error) {
      console.error("[MentorService] getSessions error:", error);
      throw error;
    }
  }

  /**
   * Get session details
   */
  async getSessionDetails(mentorId: string, sessionId: string): Promise<any | null> {
    try {
      const session = await prisma.sessions.findFirst({
        where: {
          id: sessionId,
          mentor_id: mentorId,
        },
        select: {
          id: true,
          skill_name: true, // Include skill_name in select
          skill_id: true,
          session_type: true,
          status: true,
          zoom_link: true,
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
        },
      });

      if (!session) return null;

      // Use skill_name from sessions table (snapshot saved at connection time)
      const skillName = session.skill_name || "Unknown (Legacy)";

      return {
        id: session.id,
        student: {
          id: session.users_student.id,
          name: session.users_student.name,
          email: session.users_student.email,
        },
        courseName: session.courses?.title || session.session_type || "Session",
        skillName: skillName, // From sessions.skill_name (snapshot)
        status: session.status,
        zoomLink: session.zoom_link || null,
      };
    } catch (error) {
      console.error("[MentorService] getSessionDetails error:", error);
      throw error;
    }
  }

  /**
   * Approve a session request
   */
  async approveSession(mentorId: string, sessionId: string): Promise<any> {
    try {
      const session = await prisma.sessions.findFirst({
        where: {
          id: sessionId,
          mentor_id: mentorId,
          status: SessionStatus.PENDING,
        },
      });

      if (!session) {
        throw new Error("Session not found or already processed");
      }

      const updated = await prisma.sessions.update({
        where: { id: sessionId },
        data: {
          status: SessionStatus.APPROVED,
          updated_at: new Date(),
        },
        include: {
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
            },
          },
        },
      });

      // Create notification for student
      // Use skill_name from sessions table (snapshot saved at connection time) instead of course title
      const skillName = updated.skill_name || updated.courses?.title || updated.session_type || "session";
      await prisma.notifications.create({
        data: {
          user_id: session.student_id,
          type: "session_approved",
          title: "Session Request Approved",
          message: `Your ${skillName} session request has been approved by the mentor. Please complete payment to start.`,
          related_id: sessionId,
        },
      });

      return updated;
    } catch (error) {
      console.error("[MentorService] approveSession error:", error);
      throw error;
    }
  }

  /**
   * Reject a session request
   */
  async rejectSession(
    mentorId: string,
    sessionId: string,
    reason?: string
  ): Promise<any> {
    try {
      const session = await prisma.sessions.findFirst({
        where: {
          id: sessionId,
          mentor_id: mentorId,
          status: SessionStatus.PENDING,
        },
      });

      if (!session) {
        throw new Error("Session not found or already processed");
      }

      const updated = await prisma.sessions.update({
        where: { id: sessionId },
        data: {
          status: SessionStatus.REJECTED,
          updated_at: new Date(),
        },
        include: {
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
            },
          },
        },
      });

      // Create notification for student
      // Use skill_name from sessions table (snapshot saved at connection time) instead of course title
      const skillName = updated.skill_name || updated.courses?.title || updated.session_type || "session";
      await prisma.notifications.create({
        data: {
          user_id: session.student_id,
          type: "session_rejected",
          title: "Session Request",
          message: reason 
            ? `Your ${skillName} session request was not approved. Reason: ${reason}`
            : `Your ${skillName} session request was not approved at this time.`,
          related_id: sessionId,
        },
      });

      return updated;
    } catch (error) {
      console.error("[MentorService] rejectSession error:", error);
      throw error;
    }
  }

  /**
   * Cancel/Delete session (for payment pending or completed sessions)
   */
  async cancelSession(mentorId: string, sessionId: string): Promise<any> {
    try {
      const session = await prisma.sessions.findFirst({
        where: {
          id: sessionId,
          mentor_id: mentorId,
          status: {
            in: [SessionStatus.APPROVED, SessionStatus.COMPLETED],
          },
        },
      });

      if (!session) {
        throw new Error("Session not found or cannot be cancelled");
      }

      // Update session status to CANCELLED
      const updated = await prisma.sessions.update({
        where: { id: sessionId },
        data: {
          status: SessionStatus.CANCELLED,
          updated_at: new Date(),
        },
        include: {
          users_student: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return {
        id: updated.id,
        status: updated.status,
        student: {
          id: updated.users_student.id,
          name: updated.users_student.name,
          email: updated.users_student.email,
        },
      };
    } catch (error) {
      console.error("[MentorService] cancelSession error:", error);
      throw error;
    }
  }

  /**
   * Mark session as completed
   */
  async completeSession(mentorId: string, sessionId: string): Promise<any> {
    try {
      const session = await prisma.sessions.findFirst({
        where: {
          id: sessionId,
          mentor_id: mentorId,
          status: {
            in: [SessionStatus.SCHEDULED, SessionStatus.PAID],
          },
        },
      });

      if (!session) {
        throw new Error("Session not found or cannot be completed");
      }

      const updated = await prisma.sessions.update({
        where: { id: sessionId },
        data: {
          status: SessionStatus.COMPLETED,
          completed_at: new Date(),
          updated_at: new Date(),
        },
        include: {
          users_student: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          courses: true,
        },
      });

      // Update admin ledger payout status to READY
      const payment = await prisma.payments.findFirst({
        where: {
          session_id: sessionId,
          status: "SUCCESS",
        },
      });

      if (payment) {
        await prisma.admin_ledger.updateMany({
          where: {
            payment_id: payment.id,
          },
          data: {
            payout_status: "READY",
          },
        });
      }

      return updated;
    } catch (error) {
      console.error("[MentorService] completeSession error:", error);
      throw error;
    }
  }

  /**
   * Add/update zoom link
   */
  async addZoomLink(
    mentorId: string,
    sessionId: string,
    zoomLink: string,
    expiresAt?: Date
  ): Promise<any> {
    try {
      const session = await prisma.sessions.findFirst({
        where: {
          id: sessionId,
          mentor_id: mentorId,
        },
      });

      if (!session) {
        throw new Error("Session not found");
      }

      const updated = await prisma.sessions.update({
        where: { id: sessionId },
        data: {
          zoom_link: zoomLink,
          zoom_link_expires_at: expiresAt,
          updated_at: new Date(),
        },
        include: {
          users_student: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          courses: true,
        },
      });

      // Also create a message with zoom link
      await prisma.session_messages.create({
        data: {
          session_id: sessionId,
          sender_id: mentorId,
          sender_role: "MENTOR",
          content: zoomLink,
          message_type: "zoom_link",
        },
      });

      return updated;
    } catch (error) {
      console.error("[MentorService] addZoomLink error:", error);
      throw error;
    }
  }
}

export const mentorService = new MentorService();
