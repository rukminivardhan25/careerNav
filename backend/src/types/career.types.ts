/**
 * Career-related type definitions
 */

export interface Career {
  id: string;
  title: string;
  description?: string;
  category?: string;
  skills?: string[];
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
    unit: string;
  };
  growthIndicator?: string;
  growthType?: "high" | "medium" | "low";
}

export interface CareerRecommendation {
  id: number;
  studentId: string;
  careerTitle: string;
  careerId: string;
  matchPercentage: number;
  description?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryUnit?: string;
  growthIndicator?: string;
  growthType?: string;
  skills?: string[];
  basedOnAssessmentId?: number;
  generatedFromProfile?: any;
  generatedFromAssessment?: any;
  aiProvider?: string;
  promptVersion?: string;
  createdAt: Date;
}

export interface LearningPath {
  id: number;
  careerId: string;
  title: string;
  description?: string;
  estimatedDuration?: number;
  difficulty?: "beginner" | "intermediate" | "advanced";
  createdAt: Date;
}

export interface LearningPathSkill {
  id: number;
  learningPathId: number;
  skillName: string;
  description?: string;
  resources?: string[];
  order: number;
  isCompleted?: boolean;
}





