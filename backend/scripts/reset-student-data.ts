import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function resetStudentData() {
  try {
    console.log("=".repeat(60));
    console.log("Starting Student Data Reset");
    console.log("=".repeat(60));

    // Step 1: Get all student user IDs
    const students = await prisma.user.findMany({
      where: { role: Role.STUDENT },
      select: { id: true, email: true },
    });

    const studentIds = students.map((s) => s.id);

    console.log(`\nFound ${studentIds.length} students to delete`);

    if (studentIds.length === 0) {
      console.log("No students found. Proceeding to create new students...");
    } else {
      // Step 2: Delete dependent records in correct order (respecting foreign keys)

      console.log("\nDeleting dependent records...");

      // Delete session-related data (sessions cascade to many tables)
      const sessionsToDelete = await prisma.sessions.findMany({
        where: { student_id: { in: studentIds } },
        select: { id: true },
      });

      if (sessionsToDelete.length > 0) {
        const sessionIds = sessionsToDelete.map((s) => s.id);

        // Delete assignment submissions for student sessions
        const assignmentsForSessions = await prisma.assignments.findMany({
          where: { session_id: { in: sessionIds } },
          select: { id: true },
        });
        const assignmentIds = assignmentsForSessions.map((a) => a.id);

        if (assignmentIds.length > 0) {
          const deletedSubmissions = await prisma.assignment_submissions.deleteMany({
            where: { assignment_id: { in: assignmentIds } },
          });
          console.log(`  ✓ Deleted ${deletedSubmissions.count} assignment submissions`);
        }

        // Delete assignments
        if (assignmentIds.length > 0) {
          const deletedAssignments = await prisma.assignments.deleteMany({
            where: { session_id: { in: sessionIds } },
          });
          console.log(`  ✓ Deleted ${deletedAssignments.count} assignments`);
        }

        // Delete session messages
        const deletedMessages = await prisma.session_messages.deleteMany({
          where: { sender_id: { in: studentIds } },
        });
        console.log(`  ✓ Deleted ${deletedMessages.count} session messages`);

        // Delete payments and admin_ledger (cascade from sessions)
        // These will be deleted when sessions are deleted, but we can delete explicitly
        const deletedPayments = await prisma.payments.deleteMany({
          where: { session_id: { in: sessionIds } },
        });
        console.log(`  ✓ Deleted ${deletedPayments.count} payments`);

        // Delete sessions (this will cascade to session_schedule and session_resources)
        const deletedSessions = await prisma.sessions.deleteMany({
          where: { student_id: { in: studentIds } },
        });
        console.log(`  ✓ Deleted ${deletedSessions.count} sessions`);
      }

      // Delete assignment submissions directly linked to students
      const deletedDirectSubmissions = await prisma.assignment_submissions.deleteMany({
        where: { student_id: { in: studentIds } },
      });
      console.log(`  ✓ Deleted ${deletedDirectSubmissions.count} direct assignment submissions`);

      // Delete student assessments (cascades to assessment_answers)
      const deletedAssessments = await prisma.student_assessments.deleteMany({
        where: { student_id: { in: studentIds } },
      });
      console.log(`  ✓ Deleted ${deletedAssessments.count} student assessments`);

      // Delete career recommendations
      const deletedRecommendations = await prisma.career_recommendations.deleteMany({
        where: { student_id: { in: studentIds } },
      });
      console.log(`  ✓ Deleted ${deletedRecommendations.count} career recommendations`);

      // Delete selected careers
      const deletedSelectedCareers = await prisma.selected_careers.deleteMany({
        where: { student_id: { in: studentIds } },
      });
      console.log(`  ✓ Deleted ${deletedSelectedCareers.count} selected careers`);

      // Delete student learning progress (cascades to skill_completions)
      const deletedProgress = await prisma.student_learning_progress.deleteMany({
        where: { student_id: { in: studentIds } },
      });
      console.log(`  ✓ Deleted ${deletedProgress.count} student learning progress records`);

      // Delete cover letters
      const deletedCoverLetters = await prisma.cover_letters.deleteMany({
        where: { student_id: { in: studentIds } },
      });
      console.log(`  ✓ Deleted ${deletedCoverLetters.count} cover letters`);

      // Delete resumes
      const deletedResumes = await prisma.resumes.deleteMany({
        where: { student_id: { in: studentIds } },
      });
      console.log(`  ✓ Deleted ${deletedResumes.count} resumes`);

      // Delete student profiles
      const deletedProfiles = await prisma.student_profiles.deleteMany({
        where: { user_id: { in: studentIds } },
      });
      console.log(`  ✓ Deleted ${deletedProfiles.count} student profiles`);

      // Delete user activity
      const deletedActivity = await prisma.user_activity.deleteMany({
        where: { user_id: { in: studentIds } },
      });
      console.log(`  ✓ Deleted ${deletedActivity.count} user activity records`);

      // Delete notifications
      const deletedNotifications = await prisma.notifications.deleteMany({
        where: { user_id: { in: studentIds } },
      });
      console.log(`  ✓ Deleted ${deletedNotifications.count} notifications`);

      // Step 3: Delete student users (this will cascade to any remaining relations)
      console.log("\nDeleting student users...");
      const deletedUsers = await prisma.user.deleteMany({
        where: { role: Role.STUDENT },
      });
      console.log(`  ✓ Deleted ${deletedUsers.count} student users`);
    }

    // Step 4: Add 5 new mentors (skip if already exist)
    console.log("\n" + "=".repeat(60));
    console.log("Adding 5 new mentors...");
    console.log("=".repeat(60));

    const mentorPassword = await bcrypt.hash("12345678", 10); // Using same password for consistency
    const newMentors = [];

    for (let i = 6; i <= 10; i++) {
      const email = `mentor${i}@test.dev`;
      const name = `Mentor ${i}`;

      // Check if mentor already exists
      const existing = await prisma.user.findUnique({
        where: { email },
      });

      if (existing) {
        console.log(`  ⚠️  Mentor ${i} (${email}) already exists. Skipping...`);
        continue;
      }

      try {
        const mentor = await prisma.user.create({
          data: {
            email,
            name,
            role: Role.MENTOR,
            password: mentorPassword,
            provider: "local",
            profile_completed: true,
          },
        });
        newMentors.push(mentor);
        console.log(`  ✓ Created Mentor ${i}: ${email}`);
      } catch (error: any) {
        if (error.code === "P2002") {
          console.log(`  ⚠️  Mentor ${i} (${email}) already exists. Skipping...`);
        } else {
          throw error;
        }
      }
    }

    console.log(`\n✓ Successfully added ${newMentors.length} new mentors`);

    // Step 5: Create 10 new students
    console.log("\n" + "=".repeat(60));
    console.log("Creating 10 new students...");
    console.log("=".repeat(60));

    const studentPassword = await bcrypt.hash("12345678", 10);
    const newStudents = [];

    for (let i = 1; i <= 10; i++) {
      const email = `student${i}@test.dev`;
      const name = `Student ${i}`;

      try {
        const student = await prisma.user.create({
          data: {
            email,
            name,
            role: Role.STUDENT,
            password: studentPassword,
            provider: "local",
            profile_completed: false,
          },
        });
        newStudents.push(student);
        console.log(`  ✓ Created Student ${i}: ${email}`);
      } catch (error: any) {
        if (error.code === "P2002") {
          console.log(`  ⚠️  Student ${i} (${email}) already exists. Skipping...`);
        } else {
          throw error;
        }
      }
    }

    console.log(`\n✓ Successfully created ${newStudents.length} new students`);

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("SUMMARY");
    console.log("=".repeat(60));
    console.log(`✓ Deleted all existing student data`);
    console.log(`✓ Added ${newMentors.length} new mentors`);
    console.log(`✓ Created ${newStudents.length} new students`);
    console.log(`✓ All students have password: 12345678`);
    console.log("=".repeat(60));
    console.log("\n✅ Data reset completed successfully!");

  } catch (error) {
    console.error("\n❌ Error during data reset:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the script
resetStudentData()
  .then(() => {
    console.log("\nScript completed successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nScript failed:", error);
    process.exit(1);
  });








