/**
 * Update existing mentors with missing data
 * DO NOT delete any mentors - only add missing data
 * Run with: npx tsx scripts/update-mentors-data.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Skill to mentor mapping - ensure at least 3 mentors per major skill
const skillMentorMapping: Record<string, string[]> = {
  "JavaScript": ["mentor_001", "mentor_002", "mentor_010"],
  "React": ["mentor_002", "mentor_010", "mentor_007"],
  "Node.js": ["mentor_001", "mentor_002", "mentor_009"],
  "Python": ["mentor_003", "mentor_005", "mentor_008"],
  "Machine Learning": ["mentor_003", "mentor_005", "mentor_012"],
  "Data Structures": ["mentor_001", "mentor_004", "mentor_012"],
  "System Design": ["mentor_001", "mentor_009", "mentor_011"],
  "Java": ["mentor_001", "mentor_009", "mentor_012"],
  "Cybersecurity": ["mentor_004", "mentor_008", "mentor_011"],
  "AI": ["mentor_005", "mentor_003", "mentor_012"],
  "DevOps": ["mentor_008", "mentor_001", "mentor_009"],
  "Mobile Development": ["mentor_007", "mentor_005", "mentor_002"],
  "Web Development": ["mentor_002", "mentor_010", "mentor_007"],
  "Data Science": ["mentor_003", "mentor_005", "mentor_012"],
  "Embedded Systems": ["mentor_011", "mentor_004", "mentor_008"],
};

async function main() {
  console.log(" Updating existing mentors with missing data...\n");

  // Hash password
  const hashedPassword = await bcrypt.hash("12345678", 10);

  // Get all existing mentors
  const mentors = await prisma.user.findMany({
    where: {
      role: "MENTOR",
    },
    include: {
      mentor_profiles: true,
    },
  });

  console.log(`Found ${mentors.length} existing mentors\n`);

  // Update each mentor
  for (const mentor of mentors) {
    console.log(`Updating mentor: ${mentor.name} (${mentor.id})`);

    // 1. Ensure password is set
    if (!mentor.password) {
      await prisma.user.update({
        where: { id: mentor.id },
        data: { password: hashedPassword },
      });
      console.log("    Password set");
    }

    // 2. Update mentor profile if exists, or create if missing
    if (mentor.mentor_profiles) {
      const profile = mentor.mentor_profiles;
      
      // Ensure rating is set (default to 4.5 if missing)
      if (!profile.rating || Number(profile.rating) === 0) {
        const defaultRating = 4.5 + Math.random() * 0.5; // 4.5 to 5.0
        await prisma.mentor_profiles.update({
          where: { user_id: mentor.id },
          data: {
            rating: defaultRating,
            total_reviews: profile.total_reviews || Math.floor(Math.random() * 30) + 10,
          },
        });
        console.log(`    Rating set to ${defaultRating.toFixed(2)}`);
      }

      // Ensure expertise_areas is not empty
      if (!profile.expertise_areas || profile.expertise_areas.length === 0) {
        // Assign default expertise based on mentor ID
        const defaultExpertise = getDefaultExpertise(mentor.id);
        await prisma.mentor_profiles.update({
          where: { user_id: mentor.id },
          data: { expertise_areas: defaultExpertise },
        });
        console.log(`    Expertise areas set: ${defaultExpertise.join(", ")}`);
      }

      // Ensure experience_years is set
      if (!profile.experience_years) {
        const defaultExperience = Math.floor(Math.random() * 8) + 5; // 5-12 years
        await prisma.mentor_profiles.update({
          where: { user_id: mentor.id },
          data: { experience_years: defaultExperience },
        });
        console.log(`    Experience years set to ${defaultExperience}`);
      }

      // Ensure profile_completed is true
      if (!profile.profile_completed) {
        await prisma.mentor_profiles.update({
          where: { user_id: mentor.id },
          data: { profile_completed: true },
        });
        console.log("    Profile marked as completed");
      }
    } else {
      // Create basic profile if missing
      await prisma.mentor_profiles.create({
        data: {
          user_id: mentor.id,
          full_name: mentor.name,
          bio: `Experienced professional in technology and mentoring.`,
          profile_completed: true,
          rating: 4.5 + Math.random() * 0.5,
          total_reviews: Math.floor(Math.random() * 30) + 10,
          expertise_areas: getDefaultExpertise(mentor.id),
          experience_years: Math.floor(Math.random() * 8) + 5,
        },
      });
      console.log("    Created missing profile");
    }

    // 3. Create exam/test data for skills this mentor should have
    const mentorSkills = getMentorSkills(mentor.id);
    
    for (const skillName of mentorSkills) {
      // Check if exam already exists
      const existingTest = await prisma.mentor_tests.findFirst({
        where: {
          mentor_id: mentor.id,
          course_name: skillName,
          status: "PASSED",
        },
      });

      if (!existingTest) {
        // Create exam record
        const score = 70 + Math.floor(Math.random() * 26); // 70-95
        
        try {
          await prisma.mentor_tests.create({
            data: {
              mentor_id: mentor.id,
              course_name: skillName,
              course_category: getSkillCategory(skillName),
              score: score,
              status: "PASSED",
              test_duration: 35 + Math.floor(Math.random() * 15), // 35-50 minutes
              total_questions: 20,
              correct_answers: Math.floor((score / 100) * 20),
              strengths: [`Strong understanding of ${skillName}`, "Excellent problem-solving"],
              weaknesses: ["Minor improvements in advanced topics"],
              feedback: `Excellent performance in ${skillName}. Ready to mentor students.`,
              attempted_at: new Date(),
              completed_at: new Date(),
            },
          });
          console.log(`    Created exam for ${skillName} (Score: ${score}%)`);
        } catch (error: any) {
          // Ignore if unique constraint violation (exam already exists)
          if (!error.message?.includes("unique")) {
            console.log(`     Could not create exam for ${skillName}: ${error.message}`);
          }
        }
      }
    }
  }

  console.log("\n Mentor data update completed!");
  console.log("\n Summary:");
  console.log(`- ${mentors.length} mentors processed`);
  console.log("- Passwords ensured");
  console.log("- Ratings and expertise areas updated");
  console.log("- Exam data created for skills");
}

function getDefaultExpertise(mentorId: string): string[] {
  const expertiseMap: Record<string, string[]> = {
    "mentor_001": ["Java", "Spring Boot", "Microservices", "System Design"],
    "mentor_002": ["React", "Node.js", "JavaScript", "Web Development"],
    "mentor_003": ["Python", "Machine Learning", "Data Science", "SQL"],
    "mentor_004": ["Cybersecurity", "Network Security", "Penetration Testing"],
    "mentor_005": ["AI", "Machine Learning", "TensorFlow", "PyTorch"],
    "mentor_006": ["Product Management", "Product Strategy", "Agile"],
    "mentor_007": ["Android", "iOS", "Mobile Development", "Flutter"],
    "mentor_008": ["DevOps", "Docker", "Kubernetes", "AWS"],
    "mentor_009": ["Backend Development", "Go", "Python", "System Design"],
    "mentor_010": ["Frontend Development", "React", "Vue.js", "TypeScript"],
    "mentor_011": ["Embedded Systems", "IoT", "C/C++", "EEE"],
    "mentor_012": ["Data Structures", "Algorithms", "C++", "Java"],
  };

  return expertiseMap[mentorId] || ["Software Engineering", "Programming"];
}

function getMentorSkills(mentorId: string): string[] {
  const skills: string[] = [];
  
  // Get skills this mentor should have exams for
  for (const [skill, mentorIds] of Object.entries(skillMentorMapping)) {
    if (mentorIds.includes(mentorId)) {
      skills.push(skill);
    }
  }

  // If no specific mapping, assign 2-3 default skills
  if (skills.length === 0) {
    const defaultSkills = ["JavaScript", "Python", "System Design"];
    return defaultSkills.slice(0, 2 + Math.floor(Math.random() * 2));
  }

  return skills;
}

function getSkillCategory(skillName: string): string {
  const categoryMap: Record<string, string> = {
    "JavaScript": "Programming",
    "React": "Web",
    "Node.js": "Web",
    "Python": "Programming",
    "Machine Learning": "Data Science",
    "Data Structures": "DSA",
    "System Design": "System",
    "Java": "Programming",
    "Cybersecurity": "Security",
    "AI": "Data Science",
    "DevOps": "DevOps",
    "Mobile Development": "Mobile",
    "Web Development": "Web",
    "Data Science": "Data Science",
    "Embedded Systems": "Hardware",
  };

  return categoryMap[skillName] || "General";
}

main()
  .catch((e) => {
    console.error(" Error updating mentor data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
