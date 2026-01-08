/**
 * Public routes (no authentication required)
 */
import express, { Request, Response } from "express";
import { PrismaClient, Role } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/public/random-review?role=MENTOR|STUDENT
 * Get a random review with rating > 3 for display on login pages
 */
router.get("/random-review", async (req: Request, res: Response): Promise<void> => {
  try {
    const { role } = req.query;

    // Validate role
    if (!role || (role !== "MENTOR" && role !== "STUDENT")) {
      res.status(200).json({ review: null });
      return;
    }

    // Fetch reviews with rating > 3 and valid comment
    const reviews = await prisma.career_nav_ratings.findMany({
      where: {
        user_role: role as Role,
        rating: {
          gt: 3,
        },
        comment: {
          not: null,
        },
      },
      include: {
        users: {
          include: {
            ...(role === "MENTOR" && { mentor_profiles: true }),
            ...(role === "STUDENT" && { student_profiles: true }),
          },
        },
      },
    });

    // Filter out any reviews with empty or null comments (double check)
    const validReviews = reviews.filter(
      (review) => review.comment && review.comment.trim() !== "" && review.comment.length > 0
    );

    if (validReviews.length === 0) {
      res.status(200).json({ review: null });
      return;
    }

    // Randomly select one review
    const randomIndex = Math.floor(Math.random() * validReviews.length);
    const selectedReview = validReviews[randomIndex];

    // Extract profile information
    let name: string | null = null;
    let designation: string | null = null;

    if (role === "MENTOR" && selectedReview.users.mentor_profiles) {
      const profile = selectedReview.users.mentor_profiles;
      name = profile.full_name || selectedReview.users.name || null;
      designation = profile.current_role || null;
    } else if (role === "STUDENT" && selectedReview.users.student_profiles) {
      const profile = selectedReview.users.student_profiles;
      name = profile.full_name || selectedReview.users.name || null;
      // For students, we can use grade_or_year or school_or_college as designation
      designation = profile.grade_or_year || profile.school_or_college || null;
    } else {
      // Fallback to user name if profile doesn't exist
      name = selectedReview.users.name || null;
    }

    // Return review data
    res.status(200).json({
      review: {
        comment: selectedReview.comment,
        name: name && name.trim() !== "" ? name : null,
        designation: designation && designation.trim() !== "" ? designation : null,
      },
    });
  } catch (error) {
    console.error("[Public] Error fetching random review:", error);
    // Return null on any error (never throw to frontend)
    res.status(200).json({ review: null });
  }
});

export default router;

