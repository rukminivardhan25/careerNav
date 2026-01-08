/**
 * Seed CareerNav ratings with realistic sample data
 * Run with: npx tsx scripts/seed-careernav-ratings.ts
 */
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

// Student review comments (variations)
const studentComments = [
  "The mentoring sessions are very structured and easy to follow.",
  "CareerNav helped me understand my learning path clearly.",
  "Booking sessions is smooth, but notifications could be better.",
  "Really liked how mentors explain concepts practically.",
  "The platform UI is clean and beginner friendly.",
  "Great experience overall, helped me prepare confidently.",
  "Some loading delays, but sessions quality is excellent.",
  "Very useful for career guidance and interview prep.",
  "The assessment feature helped me identify my strengths.",
  "Mentors are responsive and provide valuable feedback.",
  "Easy to schedule sessions and track my progress.",
  "The mock interview feature is incredibly helpful for practice.",
  "Would love more mentor availability options.",
  "Overall great platform for career development.",
  "The learning paths are well organized and comprehensive.",
  "Session recordings would be a nice addition.",
  "Found the perfect mentor for my career goals.",
  "The platform makes career guidance accessible and affordable.",
];

// Mentor review comments (variations)
const mentorComments = [
  "Managing students and sessions is very smooth.",
  "Dashboard insights are helpful for tracking performance.",
  "Session scheduling works well, but calendar view could improve.",
  "Payment flow is simple and transparent.",
  "The platform helps me focus more on mentoring than admin work.",
  "Would love more analytics, but overall experience is great.",
  "Easy to connect with students and manage sessions.",
  "The student progress tracking is very useful.",
  "Communication tools work well for staying in touch.",
  "Payment processing is reliable and timely.",
  "The platform streamlines the mentoring process effectively.",
  "Would appreciate more customization options in the dashboard.",
];

// Generate rating distribution array for a given total
function generateRatingDistribution(total: number): number[] {
  const fiveStarCount = Math.floor(total * 0.45);
  const fourStarCount = Math.floor(total * 0.35);
  const threeStarCount = Math.floor(total * 0.15);
  const twoStarCount = Math.max(1, Math.floor(total * 0.05)); // At least 1 two-star
  const oneStarCount = total >= 25 ? 1 : 0; // Only 1 one-star if total >= 25, otherwise 0
  
  // Build distribution array
  const distribution: number[] = [];
  for (let i = 0; i < fiveStarCount; i++) distribution.push(5);
  for (let i = 0; i < fourStarCount; i++) distribution.push(4);
  for (let i = 0; i < threeStarCount; i++) distribution.push(3);
  for (let i = 0; i < twoStarCount; i++) distribution.push(2);
  for (let i = 0; i < oneStarCount; i++) distribution.push(1);
  
  // Fill remaining slots with 4 or 5 stars (most common)
  while (distribution.length < total) {
    distribution.push(Math.random() > 0.5 ? 5 : 4);
  }
  
  // Shuffle to randomize
  distribution.sort(() => Math.random() - 0.5);
  
  return distribution;
}

// Generate random date within last 3-4 months
function getRandomDate(): Date {
  const now = new Date();
  const fourMonthsAgo = new Date(now);
  fourMonthsAgo.setMonth(now.getMonth() - 4);
  
  const timeDiff = now.getTime() - fourMonthsAgo.getTime();
  const randomTime = fourMonthsAgo.getTime() + Math.random() * timeDiff;
  
  return new Date(randomTime);
}

async function main() {
  console.log("🌱 Seeding CareerNav ratings...");

  try {
    // Fetch existing users
    const mentors = await prisma.user.findMany({
      where: { role: Role.MENTOR },
      select: { id: true },
    });

    const students = await prisma.user.findMany({
      where: { role: Role.STUDENT },
      select: { id: true },
    });

    if (mentors.length === 0) {
      console.error("❌ No mentors found in database. Please seed mentors first.");
      return;
    }

    if (students.length === 0) {
      console.error("❌ No students found in database. Please seed students first.");
      return;
    }

    console.log(`Found ${mentors.length} mentors and ${students.length} students`);

    // Check if ratings already exist
    const existingCount = await prisma.career_nav_ratings.count();
    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing ratings. Clearing them first...`);
      await prisma.career_nav_ratings.deleteMany({});
      console.log("✅ Cleared existing ratings");
    }

    // Calculate distribution: 60% students, 40% mentors
    const totalReviews = 25; // Middle of 20-30 range
    const studentReviewCount = Math.floor(totalReviews * 0.6); // 15 reviews
    const mentorReviewCount = totalReviews - studentReviewCount; // 10 reviews

    console.log(`Creating ${studentReviewCount} student reviews and ${mentorReviewCount} mentor reviews`);

    const reviews: Array<{
      user_id: string;
      user_role: Role;
      rating: number;
      comment: string;
      created_at: Date;
    }> = [];

    // Shuffle arrays to randomize selection
    const shuffledStudents = [...students].sort(() => Math.random() - 0.5);
    const shuffledMentors = [...mentors].sort(() => Math.random() - 0.5);
    const shuffledStudentComments = [...studentComments].sort(() => Math.random() - 0.5);
    const shuffledMentorComments = [...mentorComments].sort(() => Math.random() - 0.5);

    // Pre-calculate rating distributions
    const studentRatingDistribution = generateRatingDistribution(studentReviewCount);
    const mentorRatingDistribution = generateRatingDistribution(mentorReviewCount);

    // Create student reviews
    for (let i = 0; i < studentReviewCount; i++) {
      const student = shuffledStudents[i % shuffledStudents.length];
      const rating = studentRatingDistribution[i];
      const comment = shuffledStudentComments[i % shuffledStudentComments.length];
      const createdAt = getRandomDate();

      reviews.push({
        user_id: student.id,
        user_role: Role.STUDENT,
        rating,
        comment,
        created_at: createdAt,
      });
    }

    // Create mentor reviews
    for (let i = 0; i < mentorReviewCount; i++) {
      const mentor = shuffledMentors[i % shuffledMentors.length];
      const rating = mentorRatingDistribution[i];
      const comment = shuffledMentorComments[i % shuffledMentorComments.length];
      const createdAt = getRandomDate();

      reviews.push({
        user_id: mentor.id,
        user_role: Role.MENTOR,
        rating,
        comment,
        created_at: createdAt,
      });
    }

    // Shuffle reviews to mix student and mentor reviews
    reviews.sort(() => Math.random() - 0.5);

    // Insert reviews into database
    console.log("Inserting reviews into database...");
    for (const review of reviews) {
      await prisma.career_nav_ratings.create({
        data: review,
      });
    }

    // Verify insertion
    const count = await prisma.career_nav_ratings.count();
    const studentCount = await prisma.career_nav_ratings.count({
      where: { user_role: Role.STUDENT },
    });
    const mentorCount = await prisma.career_nav_ratings.count({
      where: { user_role: Role.MENTOR },
    });

    console.log("\n✅ Seeding completed!");
    console.log(`📊 Total reviews: ${count}`);
    console.log(`👨‍🎓 Student reviews: ${studentCount}`);
    console.log(`👨‍🏫 Mentor reviews: ${mentorCount}`);

    // Show rating distribution
    const ratingStats = await prisma.career_nav_ratings.groupBy({
      by: ["rating"],
      _count: true,
    });

    console.log("\n⭐ Rating distribution:");
    ratingStats
      .sort((a, b) => b.rating - a.rating)
      .forEach((stat) => {
        const stars = "⭐".repeat(stat.rating);
        console.log(`  ${stars} (${stat.rating}): ${stat._count} reviews`);
      });
  } catch (error) {
    console.error("❌ Error seeding ratings:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

