/**
 * Assessment-related type definitions
 */

export type AssessmentType = "aptitude" | "personality";

export type AssessmentStatus = "not-started" | "in-progress" | "completed";

export interface Assessment {
  id: number;
  title: string;
  description?: string;
  type: AssessmentType;
  totalQuestions: number;
  duration?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Question {
  id: number;
  assessmentId: number;
  questionText: string;
  questionType: "multiple-choice" | "text" | "rating";
  options?: string[];
  correctAnswer?: string | number;
  points: number;
  order: number;
}

export interface StudentAssessment {
  id: number;
  studentId: string;
  assessmentId: number;
  status: AssessmentStatus;
  currentQuestionIndex: number;
  score?: number;
  completedAt?: Date;
  startedAt: Date;
  createdAt: Date;
}

export interface AssessmentAnswer {
  id: number;
  studentAssessmentId: number;
  questionId: number;
  answer: string | number;
  isCorrect?: boolean;
  answeredAt: Date;
}

export interface AssessmentResult {
  assessment: Assessment;
  studentAssessment: StudentAssessment;
  answers: AssessmentAnswer[];
  totalScore: number;
  percentage: number;
}





