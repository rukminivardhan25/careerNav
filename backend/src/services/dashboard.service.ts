/**
 * Dashboard Service
 * Computes all dashboard metrics from database (no stored values)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface DashboardMetrics {
  careerScore: {
    value: number; // 0-100
    delta: number; // percentage change vs last week
  };
  resumeStrength: {
    value: number; // 0-100
    delta: number; // percentage change after AI review
  };
  mockInterviews: {
    value: number; // count
    delta: number; // count change this month
  };
  skillsGained: {
    value: number; // count
    delta: number; // new skills this week
  };
}

export class DashboardService {
  /**
   * Calculate Career Score (0-100%)
   * Formula: 40% assessment completion + 30% learning progress + 30% skill completion
   */
  private async calculateCareerScore(studentId: string): Promise<number> {
    let score = 0;

    // 1. Assessment Completion (40%)
    const assessments = await prisma.student_assessments.findMany({
      where: {
        student_id: studentId,
        status: "completed",
      },
    });

    // Check if both aptitude and personality are completed
    const aptitudeCompleted = assessments.some(
      (a) => a.assessment_type === "aptitude" && a.status === "completed"
    );
    const personalityCompleted = assessments.some(
      (a) => a.assessment_type === "personality" && a.status === "completed"
    );

    if (aptitudeCompleted && personalityCompleted) {
      score += 40; // Both assessments completed
    } else if (aptitudeCompleted || personalityCompleted) {
      score += 20; // One assessment completed
    }

    // 2. Learning Path Progress (30%)
    const learningProgress = await prisma.student_learning_progress.findFirst({
      where: {
        student_id: studentId,
      },
      orderBy: {
        last_accessed_at: "desc",
      },
    });

    if (learningProgress && learningProgress.total_skills > 0) {
      const progressPercentage = learningProgress.progress_percentage || 0;
      score += (progressPercentage / 100) * 30;
    }

    // 3. Skill Completion (30%)
    if (learningProgress) {
      // Get skill completions for this learning progress
      const skillCompletions = await prisma.skill_completions.count({
        where: {
          student_learning_progress_id: learningProgress.id,
        },
      });

      const totalSkills = learningProgress.total_skills || 0;
      if (totalSkills > 0) {
        const skillPercentage = (skillCompletions / totalSkills) * 100;
        score += (skillPercentage / 100) * 30;
      }
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * Calculate Career Score Delta (vs last week)
   */
  private async calculateCareerScoreDelta(
    studentId: string,
    currentScore: number
  ): Promise<number> {
    // Get activity from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // Calculate score from 7-14 days ago (previous week)
    // This is a simplified calculation - in production, you'd store historical snapshots
    // For now, we'll calculate based on activity

    const recentActivity = await prisma.user_activity.count({
      where: {
        user_id: studentId,
        activity_date: {
          gte: sevenDaysAgo,
        },
      },
    });

    const previousActivity = await prisma.user_activity.count({
      where: {
        user_id: studentId,
        activity_date: {
          gte: fourteenDaysAgo,
          lt: sevenDaysAgo,
        },
      },
    });

    // Estimate delta based on activity change
    if (previousActivity === 0) {
      return recentActivity > 0 ? 5 : 0; // New activity = +5%
    }

    const activityChange = ((recentActivity - previousActivity) / previousActivity) * 100;
    return Math.round(activityChange * 0.1); // Scale down to reasonable percentage
  }

  /**
   * Calculate Resume Strength (0-100%)
   * Based on resume completeness and quality
   */
  private async calculateResumeStrength(studentId: string): Promise<number> {
    let strength = 0;

    // Get primary resume
    const resume = await prisma.resumes.findFirst({
      where: {
        student_id: studentId,
        is_primary: true,
      },
    });

    if (!resume) {
      return 0; // No resume = 0%
    }

    // Resume exists → +20%
    strength += 20;

    // Parse resume data to check completeness
    try {
      const resumeData = resume.resume_data as any;

      // Check for key sections
      if (resumeData?.personalInfo) strength += 10;
      if (resumeData?.education && Array.isArray(resumeData.education) && resumeData.education.length > 0) {
        strength += 15;
      }
      if (resumeData?.experience && Array.isArray(resumeData.experience) && resumeData.experience.length > 0) {
        strength += 20;
      }
      if (resumeData?.skills && Array.isArray(resumeData.skills) && resumeData.skills.length > 0) {
        strength += 15;
      }
      if (resumeData?.projects && Array.isArray(resumeData.projects) && resumeData.projects.length > 0) {
        strength += 10;
      }
      if (resumeData?.achievements && Array.isArray(resumeData.achievements) && resumeData.achievements.length > 0) {
        strength += 10;
      }

      // Check if AI review was done (has generated_resume_text)
      if (resume.generated_resume_text) {
        strength += 10; // AI review completed
      }
    } catch (error) {
      console.error("[Dashboard] Error parsing resume data:", error);
    }

    return Math.min(100, Math.round(strength));
  }

  /**
   * Calculate Resume Strength Delta
   * Compares current strength with previous (simplified - would need historical data)
   */
  private async calculateResumeStrengthDelta(
    studentId: string,
    currentStrength: number
  ): Promise<number> {
    // Get all resumes ordered by update time
    const resumes = await prisma.resumes.findMany({
      where: {
        student_id: studentId,
      },
      orderBy: {
        updated_at: "desc",
      },
      take: 2,
    });

    if (resumes.length < 2) {
      // First resume or only one resume
      return currentStrength > 0 ? 12 : 0; // If resume exists, show improvement
    }

    // Calculate previous strength
    const previousResume = resumes[1];
    let previousStrength = 0;

    if (previousResume) {
      previousStrength = 20; // Base for existing resume
      try {
        const prevData = previousResume.resume_data as any;
        if (prevData?.education) previousStrength += 15;
        if (prevData?.experience) previousStrength += 20;
        if (prevData?.skills) previousStrength += 15;
        if (prevData?.projects) previousStrength += 10;
        if (prevData?.achievements) previousStrength += 10;
        if (previousResume.generated_resume_text) previousStrength += 10;
      } catch (error) {
        // Ignore parsing errors
      }
    }

    const delta = currentStrength - previousStrength;
    return Math.max(0, Math.round(delta)); // Only show positive changes
  }

  /**
   * Calculate Mock Interviews Count
   * Counts completed mock interview sessions
   */
  private async calculateMockInterviews(studentId: string): Promise<number> {
    const mockInterviews = await prisma.sessions.count({
      where: {
        student_id: studentId,
        session_type: "Mock Interview",
        status: "COMPLETED",
      },
    });

    return mockInterviews;
  }

  /**
   * Calculate Mock Interviews Delta (this month)
   */
  private async calculateMockInterviewsDelta(
    studentId: string
  ): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const thisMonth = await prisma.sessions.count({
      where: {
        student_id: studentId,
        session_type: "Mock Interview",
        status: "COMPLETED",
        completed_at: {
          gte: startOfMonth,
        },
      },
    });

    const lastMonth = await prisma.sessions.count({
      where: {
        student_id: studentId,
        session_type: "Mock Interview",
        status: "COMPLETED",
        completed_at: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
    });

    return thisMonth - lastMonth;
  }

  /**
   * Calculate Skills Gained Count
   * Counts completed skills
   */
  private async calculateSkillsGained(studentId: string): Promise<number> {
    // Get all learning progress records for this student
    const learningProgressRecords = await prisma.student_learning_progress.findMany({
      where: {
        student_id: studentId,
      },
      select: {
        id: true,
      },
    });

    if (learningProgressRecords.length === 0) {
      return 0;
    }

    const progressIds = learningProgressRecords.map((p) => p.id);

    const skillsGained = await prisma.skill_completions.count({
      where: {
        student_learning_progress_id: {
          in: progressIds,
        },
      },
    });

    return skillsGained;
  }

  /**
   * Calculate Skills Gained Delta (new skills this week)
   */
  private async calculateSkillsGainedDelta(
    studentId: string
  ): Promise<number> {
    // Get all learning progress records for this student
    const learningProgressRecords = await prisma.student_learning_progress.findMany({
      where: {
        student_id: studentId,
      },
      select: {
        id: true,
      },
    });

    if (learningProgressRecords.length === 0) {
      return 0;
    }

    const progressIds = learningProgressRecords.map((p) => p.id);

    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const thisWeek = await prisma.skill_completions.count({
      where: {
        student_learning_progress_id: {
          in: progressIds,
        },
        completed_at: {
          gte: sevenDaysAgo,
        },
      },
    });

    const lastWeek = await prisma.skill_completions.count({
      where: {
        student_learning_progress_id: {
          in: progressIds,
        },
        completed_at: {
          gte: fourteenDaysAgo,
          lt: sevenDaysAgo,
        },
      },
    });

    return thisWeek - lastWeek;
  }

  /**
   * Get all dashboard metrics
   * All values are computed from database, never stored
   */
  async getDashboardMetrics(studentId: string): Promise<DashboardMetrics> {
    try {
      // Calculate all metrics in parallel
      const [
        careerScore,
        resumeStrength,
        mockInterviews,
        skillsGained,
      ] = await Promise.all([
        this.calculateCareerScore(studentId),
        this.calculateResumeStrength(studentId),
        this.calculateMockInterviews(studentId),
        this.calculateSkillsGained(studentId),
      ]);

      // Calculate deltas
      const [
        careerScoreDelta,
        resumeStrengthDelta,
        mockInterviewsDelta,
        skillsGainedDelta,
      ] = await Promise.all([
        this.calculateCareerScoreDelta(studentId, careerScore),
        this.calculateResumeStrengthDelta(studentId, resumeStrength),
        this.calculateMockInterviewsDelta(studentId),
        this.calculateSkillsGainedDelta(studentId),
      ]);

      return {
        careerScore: {
          value: careerScore,
          delta: careerScoreDelta,
        },
        resumeStrength: {
          value: resumeStrength,
          delta: resumeStrengthDelta,
        },
        mockInterviews: {
          value: mockInterviews,
          delta: mockInterviewsDelta,
        },
        skillsGained: {
          value: skillsGained,
          delta: skillsGainedDelta,
        },
      };
    } catch (error) {
      console.error("[DashboardService] Error calculating metrics:", error);
      // Return zeros on error
      return {
        careerScore: { value: 0, delta: 0 },
        resumeStrength: { value: 0, delta: 0 },
        mockInterviews: { value: 0, delta: 0 },
        skillsGained: { value: 0, delta: 0 },
      };
    }
  }
}

export const dashboardService = new DashboardService();

