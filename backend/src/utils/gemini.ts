/**
 * Gemini AI Service
 * Handles all interactions with Google Gemini AI
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env";

const GEMINI_API_KEY = env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn("⚠️  GEMINI_API_KEY not found in environment variables");
}

// Initialize Gemini client
let genAI: GoogleGenerativeAI | null = null;
let model: any = null;

export function initializeGemini() {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set in environment variables");
  }

  if (!genAI) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
  }

  return model;
}

/**
 * Generate assessment questions using Gemini AI
 */
export async function generateAssessmentQuestions(
  profileData: any,
  assessmentType: "aptitude" | "personality",
  numQuestions: number = 50
): Promise<any[]> {
  try {
    const model = initializeGemini();
    const prompt = buildAssessmentPrompt(profileData, assessmentType, numQuestions);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON response from Gemini
    const questions = parseQuestionsFromResponse(text, assessmentType);
    
    if (questions.length < numQuestions) {
      console.warn(`⚠️  Generated only ${questions.length} questions, expected ${numQuestions}`);
    }
    
    return questions;
  } catch (error) {
    console.error("[Gemini] Error generating questions:", error);
    throw new Error("Failed to generate assessment questions");
  }
}

/**
 * Generate career recommendations using Gemini AI
 */
export async function generateCareerReport(
  assessmentResults: any,
  profileData: any
): Promise<any> {
  try {
    const model = initializeGemini();
    const prompt = buildCareerReportPrompt(assessmentResults, profileData);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return parseCareerReportFromResponse(text);
  } catch (error) {
    console.error("[Gemini] Error generating career report:", error);
    throw new Error("Failed to generate career recommendations");
  }
}

function buildAssessmentPrompt(
  profileData: any,
  assessmentType: string,
  numQuestions: number
): string {
  // Build prompt based on assessment type and profile
  return `Generate ${numQuestions} ${assessmentType} assessment questions...`;
}

function parseQuestionsFromResponse(text: string, assessmentType: string): any[] {
  try {
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]).questions || [];
    }
    return [];
  } catch (error) {
    console.error("[Gemini] Error parsing questions:", error);
    return [];
  }
}

function buildCareerReportPrompt(assessmentResults: any, profileData: any): string {
  return `Generate career recommendations based on assessment results...`;
}

function parseCareerReportFromResponse(text: string): any {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return {};
  } catch (error) {
    console.error("[Gemini] Error parsing career report:", error);
    return {};
  }
}





