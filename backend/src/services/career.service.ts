/**
 * Career Service
 * Business logic for career recommendations
 */
import * as careerUtils from "../utils/careers";
import { aiService } from "./ai.service";
import { CareerRecommendation, Career } from "../types/career.types";

export class CareerService {
  /**
   * Get career recommendations for a student
   */
  async getCareerRecommendations(
    studentId: string
  ): Promise<CareerRecommendation[]> {
    return await careerUtils.getCareerRecommendations(studentId);
  }

  /**
   * Generate career recommendations using AI
   */
  async generateCareerRecommendations(
    studentId: string,
    assessmentResults: any,
    profileData: any
  ): Promise<CareerRecommendation[]> {
    const aiRecommendations = await aiService.generateCareerRecommendations(
      assessmentResults,
      profileData
    );

    return await careerUtils.createCareerRecommendations(
      studentId,
      aiRecommendations,
      {
        ai_provider: "gemini",
        prompt_version: "v1",
      }
    );
  }

  /**
   * Select a career for a student
   */
  async selectCareer(
    studentId: string,
    careerId: string
  ): Promise<CareerRecommendation | null> {
    return await careerUtils.selectCareer(studentId, careerId) as any;
  }

  /**
   * Get selected career for a student
   */
  async getSelectedCareer(
    studentId: string
  ): Promise<CareerRecommendation | null> {
    return await careerUtils.getSelectedCareer(studentId) as any;
  }
}

export const careerService = new CareerService();





