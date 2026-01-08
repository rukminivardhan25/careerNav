/**
 * Script to get all mentors and their data from the database
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function getMentorsData() {
  try {
    console.log("🔍 Fetching all mentors from database...\n");

    const mentors = await prisma.user.findMany({
      where: {
        role: "MENTOR",
      },
      include: {
        mentor_profiles: {
          include: {
            mentor_course_verifications: {
              where: {
                is_active: true,
              },
              include: {
                courses: true,
              },
            },
            mentor_tests: {
              where: {
                status: "PASSED",
              },
              orderBy: {
                score: "desc",
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (mentors.length === 0) {
      console.log("❌ No mentors found in the database.");
      return;
    }

    console.log(`✅ Found ${mentors.length} mentor(s)\n`);
    console.log("=" .repeat(80));
    console.log("\n");

    mentors.forEach((mentor, index) => {
      console.log(`📋 MENTOR #${index + 1}`);
      console.log("-".repeat(80));
      console.log(`ID: ${mentor.id}`);
      console.log(`Name: ${mentor.name}`);
      console.log(`Email: ${mentor.email}`);
      console.log(`Password: ${mentor.password || "No password set (OAuth user)"}`);
      console.log(`Role: ${mentor.role}`);
      console.log(`Profile Completed: ${mentor.profile_completed || false}`);
      console.log(`Created At: ${mentor.createdAt}`);

      if (mentor.mentor_profiles) {
        const profile = mentor.mentor_profiles;
        console.log("\n📝 PROFILE DATA:");
        console.log(`  Full Name: ${profile.full_name || "Not set"}`);
        console.log(`  Bio: ${profile.bio || "Not set"}`);
        console.log(`  Current Role: ${profile.current_role || "Not set"}`);
        console.log(`  Experience: ${profile.experience_years || 0} years`);
        console.log(`  Rating: ${profile.rating || 0}`);
        console.log(`  Total Reviews: ${profile.total_reviews || 0}`);
        console.log(`  Expertise Areas: ${profile.expertise_areas.join(", ") || "None"}`);
        console.log(`  Session Types: ${profile.session_types.join(", ") || "None"}`);
        console.log(`  Pricing: ₹${profile.pricing_per_hour || 0}/hour`);

        console.log("\n✅ VERIFIED COURSES:");
        if (profile.mentor_course_verifications.length === 0) {
          console.log("  No verified courses yet");
        } else {
          profile.mentor_course_verifications.forEach((vc) => {
            console.log(`  - ${vc.courses.title} (Score: ${vc.verification_score}%)`);
          });
        }

        console.log("\n📊 TEST RESULTS:");
        if (profile.mentor_tests.length === 0) {
          console.log("  No passed tests yet");
        } else {
          profile.mentor_tests.forEach((test) => {
            console.log(`  - ${test.course_name}: ${test.score}% (${test.status})`);
          });
        }
      } else {
        console.log("\n⚠️  No mentor profile created yet");
      }

      console.log("\n" + "=".repeat(80));
      console.log("\n");
    });

    // Summary
    console.log("\n📊 SUMMARY:");
    console.log(`Total Mentors: ${mentors.length}`);
    console.log(
      `With Profiles: ${mentors.filter((m) => m.mentor_profiles).length}`
    );
    console.log(
      `With Verified Courses: ${mentors.filter(
        (m) => m.mentor_profiles?.mentor_course_verifications.length > 0
      ).length}`
    );
    console.log(
      `With Passed Tests: ${mentors.filter(
        (m) => m.mentor_profiles?.mentor_tests.length > 0
      ).length}`
    );
  } catch (error) {
    console.error("❌ Error fetching mentors:", error);
  } finally {
    await prisma.$disconnect();
  }
}

getMentorsData();

