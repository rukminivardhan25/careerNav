/**
 * Learning Path Service
 * Business logic for learning paths
 */
import { PrismaClient } from "@prisma/client";
import { LearningPath, LearningPathSkill } from "../types/career.types";
import { generateLearningPathWithGroq } from "../utils/groq";

const prisma = new PrismaClient();

export class LearningService {
  /**
   * Get or generate learning path for current user based on selected career
   */
  async getOrGenerateLearningPath(studentId: string): Promise<any> {
    try {
      // Get selected career
      const selectedCareer = await prisma.selected_careers.findUnique({
        where: { student_id: studentId },
      });

      if (!selectedCareer) {
        return {
          error: "No career selected",
          message: "Please select a career from your career report to generate a learning path.",
        };
      }

      const careerTitle = selectedCareer.career_title;
      const careerId = selectedCareer.career_id;

      console.log(`[Learning Service] Getting learning path for career: ${careerTitle}`);

      // Check if learning path already exists
      let learningPath = await prisma.learning_paths.findUnique({
        where: { career_id: careerId },
        include: {
          learning_skills: {
            orderBy: { skill_order: "asc" },
          },
        },
      });

      // If path exists, return it
      if (learningPath && learningPath.learning_skills.length > 0) {
        console.log(`[Learning Service] Found existing learning path with ${learningPath.learning_skills.length} skills`);
        return this.formatLearningPathResponse(learningPath);
      }

      // Get user profile for personalized path
      const userProfile = await prisma.student_profiles.findUnique({
        where: { user_id: studentId },
      });

      const profileData = userProfile ? {
        branch: userProfile.branch,
        grade_or_year: userProfile.grade_or_year,
        education_type: userProfile.education_type,
        existing_skills: userProfile.existing_skills || [],
        other_skills: userProfile.other_skills || "",
        experience_level: userProfile.experience_level || "",
      } : undefined;
      
      console.log(`[Learning Service] Profile data for path generation:`, {
        branch: profileData?.branch,
        year: profileData?.grade_or_year,
        skills: profileData?.existing_skills?.length || 0,
        otherSkills: profileData?.other_skills ? "Yes" : "No",
      });

      console.log(`[Learning Service] Generating new learning path for: ${careerTitle}`);

      // Generate learning path using AI
      let pathData;
      try {
        pathData = await generateLearningPathWithGroq(careerTitle, profileData);
        console.log(`[Learning Service] AI generated learning path with ${pathData.skills?.length || 0} skills`);
      } catch (error: any) {
        console.error("[Learning Service] AI generation failed:", error);
        console.log("[Learning Service] Using fallback learning path with videos and resources");
        // Use basic fallback (which includes videos and resources)
        pathData = this.getBasicLearningPath(careerTitle, profileData);
        console.log(`[Learning Service] Fallback learning path has ${pathData.skills?.length || 0} skills`);
      }

      // Save learning path to database
      learningPath = await prisma.learning_paths.upsert({
        where: { career_id: careerId },
        update: {
          title: pathData.title || `${careerTitle} Learning Path`,
          description: pathData.description || `Step-by-step path to become a ${careerTitle}`,
          total_skills: pathData.skills?.length || 0,
          estimated_duration_weeks: pathData.estimated_duration_weeks || 12,
          updated_at: new Date(),
        },
        create: {
          career_id: careerId,
          title: pathData.title || `${careerTitle} Learning Path`,
          description: pathData.description || `Step-by-step path to become a ${careerTitle}`,
          total_skills: pathData.skills?.length || 0,
          estimated_duration_weeks: pathData.estimated_duration_weeks || 12,
        },
        include: {
          learning_skills: true,
        },
      }) as any;

      if (!learningPath) {
        throw new Error("Failed to create or update learning path");
      }

      // Save skills to database
      if (pathData.skills && pathData.skills.length > 0) {
        // Delete existing skills
        await prisma.learning_skills.deleteMany({
          where: { learning_path_id: learningPath.id },
        });

        // Create new skills
        const skillsToSave = pathData.skills.map((skill: any, index: number) => {
          const youtubeVideos = skill.youtube_videos || [];
          const externalResources = skill.external_resources || [];
          const assignments = skill.assignments || { mcqs: 5, tasks: 1 };
          
          console.log(`[Learning Service] Saving skill ${skill.skill_id}: ${youtubeVideos.length} videos, ${externalResources.length} resources`);
          
          return {
            learning_path_id: learningPath.id,
            skill_id: skill.skill_id || `skill-${index + 1}`,
            name: skill.name,
            description: skill.description,
            skill_order: skill.skill_order || index + 1,
            youtube_videos: youtubeVideos.length > 0 ? youtubeVideos : [],
            external_resources: externalResources.length > 0 ? externalResources : [],
            skill_test_questions: assignments,
          };
        });

        await prisma.learning_skills.createMany({
          data: skillsToSave,
        });

        console.log(`[Learning Service] Saved ${pathData.skills.length} skills to database`);
        
        // Verify the saved data
        const savedSkills = await prisma.learning_skills.findMany({
          where: { learning_path_id: learningPath.id },
          select: {
            skill_id: true,
            name: true,
            youtube_videos: true,
            external_resources: true,
          },
        });
        
        savedSkills.forEach((skill: any) => {
          const videos = (skill.youtube_videos as any) || [];
          const resources = (skill.external_resources as any) || [];
          console.log(`[Learning Service] Verified skill ${skill.skill_id} (${skill.name}): ${videos.length} videos, ${resources.length} resources saved`);
        });
      }

      // Fetch the complete path with skills
      const completePath = await prisma.learning_paths.findUnique({
        where: { id: learningPath.id },
        include: {
          learning_skills: {
            orderBy: { skill_order: "asc" },
          },
        },
      });

      return this.formatLearningPathResponse(completePath!);
    } catch (error: any) {
      console.error("[Learning Service] Error:", error);
      throw error;
    }
  }

  /**
   * Format learning path response for frontend
   */
  private formatLearningPathResponse(learningPath: any): any {
    const skills = (learningPath.learning_skills || []).map((skill: any) => ({
      id: skill.id.toString(),
      skill_id: skill.skill_id,
      name: skill.name,
      description: skill.description,
      skill_order: skill.skill_order,
      status: "not_started" as const, // TODO: Check student_learning_progress for actual status
      estimated_duration: `${skill.skill_order * 1.5} weeks`, // Estimate based on order
      youtube_videos: skill.youtube_videos || [],
      external_resources: skill.external_resources || [],
      assignments: skill.skill_test_questions || { mcqs: 5, tasks: 1 },
    }));

    return {
      id: learningPath.id,
      career_id: learningPath.career_id,
      title: learningPath.title,
      description: learningPath.description,
      total_skills: learningPath.total_skills || skills.length,
      estimated_duration: `${learningPath.estimated_duration_weeks || 12} weeks`,
      skill_level: "Beginner → Intermediate",
      skills: skills,
    };
  }

  /**
   * Get basic learning path (fallback)
   * Uses the comprehensive fallback from groq.ts
   */
  private getBasicLearningPath(careerTitle: string, profileData?: any): any {
    // Import the comprehensive fallback function from groq.ts
    const { generateBasicLearningPath } = require("../utils/groq");
    return generateBasicLearningPath(careerTitle, profileData);
  }

  /**
   * Get learning path by career ID
   */
  async getLearningPathByCareerId(careerId: string): Promise<LearningPath | null> {
    const learningPath = await prisma.learning_paths.findUnique({
      where: { career_id: careerId },
      include: {
        learning_skills: {
          orderBy: { skill_order: "asc" },
        },
      },
    });

    if (!learningPath) {
      return null;
    }

    return this.formatLearningPathResponse(learningPath) as LearningPath;
  }

  /**
   * Get learning path skills
   */
  async getLearningPathSkills(learningPathId: number): Promise<LearningPathSkill[]> {
    const skills = await prisma.learning_skills.findMany({
      where: { learning_path_id: learningPathId },
      orderBy: { skill_order: "asc" },
    });

    return skills.map((skill) => ({
      learningPathId: learningPathId,
      skillName: skill.name,
      order: skill.skill_order,
      id: skill.id,
      skill_id: skill.skill_id,
      name: skill.name,
      description: skill.description || "",
      skill_order: skill.skill_order,
    })) as any;
  }

  /**
   * Get student learning progress
   */
  async getStudentProgress(studentId: string): Promise<any> {
    const progress = await prisma.student_learning_progress.findMany({
      where: { student_id: studentId },
      include: {
        learning_paths: {
          include: {
            learning_skills: true,
          },
        },
        skill_completions: true,
      },
    });

    return progress;
  }

  /**
   * Get skill detail by skill ID
   */
  async getSkillDetail(studentId: string, skillId: string): Promise<any> {
    try {
      console.log(`[Learning Service] Getting skill detail for skillId: ${skillId}, studentId: ${studentId}`);
      
      // Get user's selected career
      const selectedCareer = await prisma.selected_careers.findUnique({
        where: { student_id: studentId },
      });

      if (!selectedCareer) {
        console.log(`[Learning Service] No selected career found for student: ${studentId}`);
        return null;
      }

      console.log(`[Learning Service] Selected career: ${selectedCareer.career_title} (ID: ${selectedCareer.career_id})`);

      // Find the learning path for the selected career
      let learningPath = await prisma.learning_paths.findUnique({
        where: { career_id: selectedCareer.career_id },
        include: {
          learning_skills: {
            orderBy: { skill_order: "asc" },
          },
        },
      });

      // If learning path doesn't exist, generate it
      if (!learningPath || learningPath.learning_skills.length === 0) {
        console.log(`[Learning Service] Learning path not found for career ${selectedCareer.career_id}. Generating...`);
        const pathData = await this.getOrGenerateLearningPath(studentId);
        if (pathData.error) {
          console.error(`[Learning Service] Failed to generate learning path: ${pathData.message}`);
          return null;
        }
        
        // Fetch the newly created path
        learningPath = await prisma.learning_paths.findUnique({
          where: { career_id: selectedCareer.career_id },
          include: {
            learning_skills: {
              orderBy: { skill_order: "asc" },
            },
          },
        });
        
        if (!learningPath) {
          console.error(`[Learning Service] Learning path still not found after generation`);
          return null;
        }
      }

      console.log(`[Learning Service] Found learning path with ${learningPath.learning_skills.length} skills`);

      // Find the skill
      const skill = learningPath.learning_skills.find((s) => s.skill_id === skillId);
      
      if (!skill) {
        console.log(`[Learning Service] Skill ${skillId} not found in learning path. Available skills: ${learningPath.learning_skills.map(s => s.skill_id).join(", ")}`);
        return null;
      }

      console.log(`[Learning Service] Found skill: ${skill.name}`);

      // Format skill detail response
      // Prisma returns JSON fields as objects/arrays, but we need to handle both cases
      let youtubeVideos: any[] = [];
      let externalResources: any[] = [];
      
      // Handle youtube_videos
      if (skill.youtube_videos) {
        if (Array.isArray(skill.youtube_videos)) {
          youtubeVideos = skill.youtube_videos;
        } else if (typeof skill.youtube_videos === 'string') {
          try {
            youtubeVideos = JSON.parse(skill.youtube_videos);
          } catch (e) {
            console.error(`[Learning Service] Error parsing youtube_videos:`, e);
            youtubeVideos = [];
          }
        } else {
          // If it's an object, wrap it in an array
          youtubeVideos = [skill.youtube_videos];
        }
      }
      
      // Handle external_resources
      if (skill.external_resources) {
        if (Array.isArray(skill.external_resources)) {
          externalResources = skill.external_resources;
        } else if (typeof skill.external_resources === 'string') {
          try {
            externalResources = JSON.parse(skill.external_resources);
          } catch (e) {
            console.error(`[Learning Service] Error parsing external_resources:`, e);
            externalResources = [];
          }
        } else {
          // If it's an object, wrap it in an array
          externalResources = [skill.external_resources];
        }
      }
      
      const assignments = (skill.skill_test_questions as any) || { mcqs: 5, tasks: 1 };

      console.log(`[Learning Service] Skill data - Videos: ${youtubeVideos.length}, Resources: ${externalResources.length}, Assignments: ${JSON.stringify(assignments)}`);
      console.log(`[Learning Service] Raw youtube_videos type: ${typeof skill.youtube_videos}, isArray: ${Array.isArray(skill.youtube_videos)}`);
      console.log(`[Learning Service] Raw external_resources type: ${typeof skill.external_resources}, isArray: ${Array.isArray(skill.external_resources)}`);
      if (youtubeVideos.length > 0) {
        console.log(`[Learning Service] First video:`, JSON.stringify(youtubeVideos[0]));
      }
      if (externalResources.length > 0) {
        console.log(`[Learning Service] First resource:`, JSON.stringify(externalResources[0]));
      }

      return {
        id: skill.id.toString(),
        skill_id: skill.skill_id,
        name: skill.name,
        description: skill.description || "",
        long_description: skill.long_description || skill.description || "",
        videos: youtubeVideos.map((video: any, index: number) => ({
          id: `video-${index + 1}`,
          title: video.title || `Video ${index + 1}`,
          url: video.url || "",
          duration: video.duration || "",
        })),
        resources: externalResources.map((resource: any, index: number) => ({
          id: `resource-${index + 1}`,
          title: resource.title || resource.name || `Resource ${index + 1}`,
          url: resource.url || "",
          type: resource.type || "documentation",
        })),
        assignment: assignments.mcqs || assignments.tasks ? {
          id: `assignment-${skill.id}`,
          title: `${skill.name} Assignment`,
          mcqs: assignments.mcqs || 5,
          tasks: assignments.tasks || 1,
        } : null,
        test: {
          id: `test-${skill.id}`,
          title: skill.name,
          duration: 10,
        },
        career_title: selectedCareer.career_title,
      };
    } catch (error: any) {
      console.error("[Learning Service] Error getting skill detail:", error);
      throw error;
    }
  }

  /**
   * Update skill completion status
   */
  async updateSkillCompletion(
    studentId: string,
    skillId: number,
    isCompleted: boolean
  ): Promise<void> {
    // TODO: Mark skill as complete in student_learning_progress
  }
}

export const learningService = new LearningService();


