/**
 * Profile routes
 */
import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken, requireRole, AuthRequest } from "../middlewares/auth.middleware";
import { ROLES } from "../config/constants";
import { uploadProfilePhoto, getFileURL } from "../utils/fileUpload";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/profile
 * Get current user's profile
 */
router.get(
  "/",
  authenticateToken,
  requireRole(ROLES.STUDENT),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;

      const profile = await prisma.student_profiles.findUnique({
        where: { user_id: userId },
      });

      if (!profile) {
        return res.status(404).json({
          error: "Profile not found",
          message: "Please complete your profile",
        });
      }

      res.json(profile);
    } catch (error: any) {
      console.error("[Get Profile] Error:", error);
      res.status(500).json({
        error: "Failed to fetch profile",
        message: error?.message,
      });
    }
  }
);

/**
 * POST /api/profile
 * Create or update student profile
 */
router.post(
  "/",
  authenticateToken,
  requireRole(ROLES.STUDENT),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const {
        school_or_college,
        education_type,
        branch,
        grade_or_year,
        full_name,
        interests,
        career_goals,
        bio,
        primary_domain,
        existing_skills,
        other_skills,
        experience_level,
        phone,
        date_of_birth,
        gpa,
        profile_badges,
        linkedin_url,
        github_url,
        portfolio_url,
        twitter_url,
        website_url,
      } = req.body;

      // Validate required fields
      if (!school_or_college || !school_or_college.trim()) {
        return res.status(400).json({
          error: "Validation error",
          message: "Institution (school_or_college) is required",
        });
      }

      if (!education_type || !education_type.trim()) {
        return res.status(400).json({
          error: "Validation error",
          message: "Education Type is required",
        });
      }

      if (!branch || !branch.trim()) {
        return res.status(400).json({
          error: "Validation error",
          message: "Branch is required",
        });
      }

      if (!grade_or_year || !grade_or_year.trim()) {
        return res.status(400).json({
          error: "Validation error",
          message: "Grade/Year is required",
        });
      }

      // Check if profile exists
      const existingProfile = await prisma.student_profiles.findUnique({
        where: { user_id: userId },
      });

      console.log("[Save Profile] User ID:", userId);
      console.log("[Save Profile] Existing profile:", existingProfile ? "Yes" : "No");
      console.log("[Save Profile] Education data received:", {
        school_or_college,
        education_type,
        branch,
        grade_or_year,
        full_name,
      });

      // Prepare profile data - ONLY educational details
      const profileData: any = {
        school_or_college: school_or_college.trim(),
        education_type: education_type.trim(),
        branch: branch.trim(),
        grade_or_year: grade_or_year.trim(),
        profile_completed: true, // Mark as completed when all required fields are filled
        updated_at: new Date(),
      };

      // Only save full_name if provided (auto from auth)
      if (full_name && full_name.trim()) {
        profileData.full_name = full_name.trim();
      }

      // Optional fields - only save if provided (not required for education form)
      if (interests && Array.isArray(interests) && interests.length > 0) {
        profileData.interests = interests;
      }
      if (career_goals && career_goals.trim()) {
        profileData.career_goals = career_goals.trim();
      }
      if (bio && bio.trim()) {
        profileData.bio = bio.trim();
      }
      if (primary_domain && primary_domain.trim()) {
        profileData.primary_domain = primary_domain.trim();
      }
      if (existing_skills && Array.isArray(existing_skills) && existing_skills.length > 0) {
        profileData.existing_skills = existing_skills;
      }
      if (other_skills && other_skills.trim()) {
        profileData.other_skills = other_skills.trim();
      }
      if (experience_level && experience_level.trim()) {
        profileData.experience_level = experience_level.trim();
      }
      if (phone && phone.trim()) {
        profileData.phone = phone.trim();
      }
      if (date_of_birth) {
        profileData.date_of_birth = new Date(date_of_birth);
      }
      if (gpa && gpa.trim()) {
        profileData.gpa = gpa.trim();
      }
      if (profile_badges && Array.isArray(profile_badges)) {
        profileData.profile_badges = profile_badges;
      }
      if (linkedin_url && linkedin_url.trim()) {
        profileData.linkedin_url = linkedin_url.trim();
      }
      if (github_url && github_url.trim()) {
        profileData.github_url = github_url.trim();
      }
      if (portfolio_url && portfolio_url.trim()) {
        profileData.portfolio_url = portfolio_url.trim();
      }
      if (twitter_url && twitter_url.trim()) {
        profileData.twitter_url = twitter_url.trim();
      }
      if (website_url && website_url.trim()) {
        profileData.website_url = website_url.trim();
      }

      console.log("[Save Profile] Profile data to save:", profileData);

      // Verify user exists in database (in case database was cleared)
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        console.error(`[Save Profile] User ${userId} not found in database. User may need to sign up/login again.`);
        return res.status(404).json({
          error: "User not found",
          message: "Your session is invalid. Please sign up or log in again.",
        });
      }

      let profile;
      if (existingProfile) {
        // Update existing profile
        console.log("[Save Profile] Updating existing profile...");
        profile = await prisma.student_profiles.update({
          where: { user_id: userId },
          data: profileData,
        });
        console.log("[Save Profile] Profile updated successfully:", profile.id);
      } else {
        // Create new profile
        console.log("[Save Profile] Creating new profile...");
        profile = await prisma.student_profiles.create({
          data: {
            user_id: userId,
            ...profileData,
          },
        });
        console.log("[Save Profile] Profile created successfully:", profile.id);
      }

      // Update user's profile_completed status
      console.log("[Save Profile] Updating user profile_completed status...");
      await prisma.user.update({
        where: { id: userId },
        data: { profile_completed: true },
      });
      console.log("[Save Profile] User profile_completed set to true");

      console.log("[Save Profile] Save operation completed successfully");

      res.status(existingProfile ? 200 : 201).json({
        message: existingProfile ? "Profile updated successfully" : "Profile created successfully",
        profile,
      });
    } catch (error: any) {
      console.error("[Save Profile] Error:", error);
      res.status(500).json({
        error: "Failed to save profile",
        message: error?.message,
      });
    }
  }
);

/**
 * GET /api/profile/check
 * Check if profile is completed
 */
router.get(
  "/check",
  authenticateToken,
  requireRole(ROLES.STUDENT),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;

      const profile = await prisma.student_profiles.findUnique({
        where: { user_id: userId },
        select: {
          profile_completed: true,
          school_or_college: true,
          education_type: true,
          branch: true,
          grade_or_year: true,
        },
      });

      if (!profile) {
        return res.json({
          completed: false,
          message: "Profile not found",
        });
      }

      // Check if all required educational fields are filled
      const hasRequiredFields =
        profile.school_or_college &&
        profile.education_type &&
        profile.branch &&
        profile.grade_or_year;

      // Profile is considered complete if educational details are filled
      // (profile_completed flag OR has all required fields)
      const completed = hasRequiredFields || profile.profile_completed;

      console.log("[Profile Check] User ID:", userId);
      console.log("[Profile Check] Has required fields:", hasRequiredFields);
      console.log("[Profile Check] Profile completed flag:", profile.profile_completed);
      console.log("[Profile Check] Final completed status:", completed);

      res.json({
        completed,
        message: completed ? "Profile is completed" : "Profile is incomplete - please fill educational details",
        hasEducationDetails: hasRequiredFields,
      });
    } catch (error: any) {
      console.error("[Check Profile] Error:", error);
      res.status(500).json({
        error: "Failed to check profile",
        message: error?.message,
      });
    }
  }
);

/**
 * POST /api/profile/photo
 * Upload profile photo for student
 */
router.post(
  "/photo",
  authenticateToken,
  requireRole(ROLES.STUDENT),
  uploadProfilePhoto.single("photo"),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;

      if (!req.file) {
        return res.status(400).json({
          error: "No file uploaded",
          message: "Please select an image file",
        });
      }

      const fileURL = getFileURL(req.file.path);

      // Update student profile with photo URL
      const profile = await prisma.student_profiles.update({
        where: { user_id: userId },
        data: { profile_photo_url: fileURL },
      });

      res.json({
        success: true,
        photoUrl: fileURL,
        profile,
      });
    } catch (error: any) {
      console.error("[Upload Profile Photo] Error:", error);
      res.status(500).json({
        error: "Failed to upload profile photo",
        message: error?.message,
      });
    }
  }
);

/**
 * DELETE /api/profile/photo
 * Delete profile photo for student
 */
router.delete(
  "/photo",
  authenticateToken,
  requireRole(ROLES.STUDENT),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;

      // Update student profile to remove photo URL
      const profile = await prisma.student_profiles.update({
        where: { user_id: userId },
        data: { profile_photo_url: null },
      });

      res.json({
        success: true,
        photoUrl: null,
        profile,
      });
    } catch (error: any) {
      console.error("[Delete Profile Photo] Error:", error);
      res.status(500).json({
        error: "Failed to delete profile photo",
        message: error?.message,
      });
    }
  }
);

export default router;

