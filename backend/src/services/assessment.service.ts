/**
 * Assessment Service
 * Business logic for assessments
 */
import * as assessmentUtils from "../utils/assessments";
import { aiService } from "./ai.service";
import { Assessment, Question, StudentAssessment } from "../types/assessment.types";

export class AssessmentService {
  /**
   * Get all active assessments
   */
  async getAllAssessments(): Promise<Assessment[]> {
    return await assessmentUtils.getAllAssessments();
  }

  /**
   * Get assessment by ID
   */
  async getAssessmentById(id: number): Promise<Assessment | null> {
    return await assessmentUtils.getAssessmentById(id);
  }

  /**
   * Get assessment questions
   */
  async getAssessmentQuestions(assessmentId: number): Promise<Question[]> {
    return await assessmentUtils.getAssessmentQuestions(assessmentId);
  }

  /**
   * Generate AI-powered assessment questions
   */
  async generateAIQuestions(
    profileData: any,
    assessmentType: "aptitude" | "personality",
    numQuestions: number = 50
  ): Promise<Question[]> {
    return await aiService.generateAssessmentQuestions(
      profileData,
      assessmentType,
      numQuestions
    );
  }

  /**
   * Create student assessment attempt
   */
  async createStudentAssessment(
    studentId: string,
    assessmentId: number
  ): Promise<StudentAssessment> {
    // TODO: Need to create student_assessments record when student starts assessment
    throw new Error("Not yet implemented");
  }

  /**
   * Get student assessment
   */
  async getStudentAssessment(
    studentId: string,
    assessmentId: number
  ): Promise<StudentAssessment | null> {
    // TODO: Fetch student assessment by ID from database
    return null;
  }
}

export const assessmentService = new AssessmentService();





