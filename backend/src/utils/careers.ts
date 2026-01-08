/**
 * Career Recommendations database utility functions
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Note: This file will need database schema updates for careers
// For now, this is a placeholder structure

export async function getCareerRecommendations(studentId: string) {
  // TODO: Implement with Prisma when career_recommendations table is added
  return [];
}

export async function createCareerRecommendations(
  studentId: string,
  recommendations: any[],
  aiContext?: any
) {
  // TODO: Implement
  return [];
}

export async function selectCareer(studentId: string, careerId: string) {
  try {
    // Find the career recommendation by ID or title
    let recommendation = null;
    
    // Try to find by ID first (if careerId is a number)
    const careerIdNum = parseInt(careerId);
    if (!isNaN(careerIdNum)) {
      recommendation = await prisma.career_recommendations.findFirst({
        where: {
          student_id: studentId,
          id: careerIdNum,
        },
      });
    }

    // If not found by ID, try to find by title
    if (!recommendation) {
      recommendation = await prisma.career_recommendations.findFirst({
        where: {
          student_id: studentId,
          career_title: careerId,
        },
        orderBy: {
          created_at: "desc",
        },
      });
    }

    if (!recommendation) {
      // If no recommendation found, create a basic selected career record
      const selectedCareer = await prisma.selected_careers.upsert({
        where: {
          student_id: studentId,
        },
        update: {
          career_id: careerId,
          career_title: careerId,
          selected_at: new Date(),
          updated_at: new Date(),
        },
        create: {
          student_id: studentId,
          career_id: careerId,
          career_title: careerId,
          selected_from_recommendation_id: null,
        },
      });
      return selectedCareer;
    }

    // Create or update selected career
    const selectedCareer = await prisma.selected_careers.upsert({
      where: {
        student_id: studentId,
      },
      update: {
        career_id: recommendation.career_id,
        career_title: recommendation.career_title,
        selected_from_recommendation_id: recommendation.id,
        updated_at: new Date(),
      },
      create: {
        student_id: studentId,
        career_id: recommendation.career_id,
        career_title: recommendation.career_title,
        selected_from_recommendation_id: recommendation.id,
      },
    });

    return selectedCareer;
  } catch (error) {
    console.error("[selectCareer] Error:", error);
    throw error;
  }
}

export async function getSelectedCareer(studentId: string) {
  try {
    const selectedCareer = await prisma.selected_careers.findUnique({
      where: { student_id: studentId },
    });
    return selectedCareer;
  } catch (error) {
    console.error("[getSelectedCareer] Error:", error);
    return null;
  }
}

// Add more career utility functions as needed


