/**
 * Application constants
 */

export const ROLES = {
  STUDENT: "STUDENT",
  MENTOR: "MENTOR",
} as const;

export const ASSESSMENT_TYPES = {
  APTITUDE: "aptitude",
  PERSONALITY: "personality",
} as const;

export const ASSESSMENT_STATUS = {
  NOT_STARTED: "not-started",
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed",
} as const;

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
} as const;

export const AI_PROVIDERS = {
  GEMINI: "gemini",
  GROQ: "groq",
} as const;

export const PROMPT_VERSIONS = {
  V1: "v1",
  V2: "v2",
} as const;





