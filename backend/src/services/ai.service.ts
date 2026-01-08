/**
 * AI Service
 * Central service for all AI operations (Gemini/Groq)
 */
import { generateAssessmentQuestions as geminiGenerateQuestions, generateCareerReport as geminiGenerateReport } from "../utils/gemini";
import { generateAssessmentQuestionsWithGroq } from "../utils/groq";
import { AI_PROVIDERS } from "../config/constants";

export class AIService {
  /**
   * Generate assessment questions using specified AI provider
   */
  async generateAssessmentQuestions(
    profileData: any,
    assessmentType: "aptitude" | "personality",
    numQuestions: number = 50,
    provider: string = AI_PROVIDERS.GEMINI
  ): Promise<any[]> {
    if (provider === AI_PROVIDERS.GROQ) {
      return await generateAssessmentQuestionsWithGroq(
        profileData,
        assessmentType,
        numQuestions
      );
    } else {
      return await geminiGenerateQuestions(
        profileData,
        assessmentType,
        numQuestions
      );
    }
  }

  /**
   * Generate career recommendations using AI
   */
  async generateCareerRecommendations(
    assessmentResults: any,
    profileData: any,
    provider: string = AI_PROVIDERS.GEMINI
  ): Promise<any> {
    if (provider === AI_PROVIDERS.GROQ) {
      // TODO: Implement Groq career generation
      throw new Error("Groq career generation not yet implemented");
    } else {
      return await geminiGenerateReport(assessmentResults, profileData);
    }
  }
}

export const aiService = new AIService();





