import { PrismaClient, Role, TestStatus } from "@prisma/client";

const prisma = new PrismaClient();

// All available skills from the plans we created
const allSkills = [
  "Web Development",
  "Java Programming",
  "Android Development",
  "Data Structures",
  "Machine Learning",
  "System Design",
];

async function addMentorSkills() {
  try {
    console.log("=".repeat(60));
    console.log("Adding Skills to Mentors");
    console.log("=".repeat(60));

    // Get all mentors
    const mentors = await prisma.user.findMany({
      where: { role: Role.MENTOR },
      select: { id: true, email: true, name: true },
      orderBy: { email: "asc" },
    });

    console.log(`\nFound ${mentors.length} mentors`);

    // Get existing mentor profiles (create if needed)
    const mentorProfiles = [];
    for (const mentor of mentors) {
      let profile = await prisma.mentor_profiles.findUnique({
        where: { user_id: mentor.id },
      });

      if (!profile) {
        profile = await prisma.mentor_profiles.create({
          data: {
            user_id: mentor.id,
            profile_completed: false,
          },
        });
        console.log(`  ✓ Created profile for ${mentor.email}`);
      }
      mentorProfiles.push({ ...mentor, profile });
    }

    // Get existing skills for each mentor
    const existingSkills = new Map<string, Set<string>>();
    for (const mentor of mentors) {
      const tests = await prisma.mentor_tests.findMany({
        where: { mentor_id: mentor.id },
        select: { course_name: true },
      });
      existingSkills.set(mentor.id, new Set(tests.map((t) => t.course_name)));
    }

    // Assign skills to mentors
    // Ensure each skill is assigned to at least one mentor
    // Then randomly assign additional skills
    console.log("\nAssigning skills to mentors...");

    // First, ensure each skill has at least one mentor
    for (let i = 0; i < allSkills.length; i++) {
      const skill = allSkills[i];
      const mentorIndex = i % mentors.length;
      const mentor = mentors[mentorIndex];

      if (!existingSkills.get(mentor.id)?.has(skill)) {
        try {
          await prisma.mentor_tests.create({
            data: {
              mentor_id: mentor.id,
              course_name: skill,
              course_category: getCategoryForSkill(skill),
              score: 85.0 + Math.random() * 10, // Random score between 85-95
              status: TestStatus.PASSED,
              total_questions: 20,
              correct_answers: 18,
              test_duration: 30,
              attempted_at: new Date(),
              completed_at: new Date(),
            },
          });
          console.log(`  ✓ Assigned "${skill}" to ${mentor.email}`);
          existingSkills.get(mentor.id)?.add(skill);
        } catch (error: any) {
          if (error.code === "P2002") {
            console.log(`  ⚠️  ${mentor.email} already has "${skill}". Skipping...`);
            existingSkills.get(mentor.id)?.add(skill);
          } else {
            throw error;
          }
        }
      }
    }

    // Randomly assign additional skills to mentors
    // Each mentor gets 2-4 additional random skills
    for (const mentor of mentors) {
      const mentorSkills = existingSkills.get(mentor.id) || new Set();
      const availableSkills = allSkills.filter((s) => !mentorSkills.has(s));
      
      // Shuffle available skills
      const shuffled = availableSkills.sort(() => Math.random() - 0.5);
      
      // Assign 2-4 random additional skills
      const numAdditionalSkills = 2 + Math.floor(Math.random() * 3); // 2, 3, or 4
      const skillsToAdd = shuffled.slice(0, Math.min(numAdditionalSkills, shuffled.length));

      for (const skill of skillsToAdd) {
        try {
          await prisma.mentor_tests.create({
            data: {
              mentor_id: mentor.id,
              course_name: skill,
              course_category: getCategoryForSkill(skill),
              score: 80.0 + Math.random() * 15, // Random score between 80-95
              status: TestStatus.PASSED,
              total_questions: 20,
              correct_answers: 17 + Math.floor(Math.random() * 3), // 17-19
              test_duration: 25 + Math.floor(Math.random() * 10), // 25-35 minutes
              attempted_at: new Date(),
              completed_at: new Date(),
            },
          });
          console.log(`  ✓ Assigned "${skill}" to ${mentor.email}`);
          mentorSkills.add(skill);
        } catch (error: any) {
          if (error.code === "P2002") {
            console.log(`  ⚠️  ${mentor.email} already has "${skill}". Skipping...`);
            mentorSkills.add(skill);
          } else {
            throw error;
          }
        }
      }
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("SUMMARY");
    console.log("=".repeat(60));

    for (const mentor of mentors) {
      const tests = await prisma.mentor_tests.findMany({
        where: { mentor_id: mentor.id },
        select: { course_name: true },
      });
      const skills = tests.map((t) => t.course_name);
      console.log(`\n${mentor.name} (${mentor.email}):`);
      console.log(`  Skills (${skills.length}): ${skills.join(", ")}`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ Skills assignment completed!");
    console.log("=".repeat(60));

  } catch (error) {
    console.error("\n❌ Error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function getCategoryForSkill(skill: string): string {
  const categories: Record<string, string> = {
    "Web Development": "Web",
    "Java Programming": "Programming",
    "Android Development": "Mobile",
    "Data Structures": "DSA",
    "Machine Learning": "AI/ML",
    "System Design": "Architecture",
  };
  return categories[skill] || "General";
}

// Execute
addMentorSkills()
  .then(() => {
    console.log("\nScript completed successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nScript failed:", error);
    process.exit(1);
  });

