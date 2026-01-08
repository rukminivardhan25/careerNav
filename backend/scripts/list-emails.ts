import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function listEmails() {
  try {
    console.log("=".repeat(60));
    console.log("MENTOR AND STUDENT EMAIL ADDRESSES");
    console.log("=".repeat(60));

    // Get all mentors
    const mentors = await prisma.user.findMany({
      where: { role: Role.MENTOR },
      select: {
        id: true,
        email: true,
        name: true,
        mentor_profiles: {
          select: {
            mentor_tests: {
              select: {
                course_name: true,
              },
            },
          },
        },
      },
      orderBy: { email: "asc" },
    });

    // Get all students
    const students = await prisma.user.findMany({
      where: { role: Role.STUDENT },
      select: {
        id: true,
        email: true,
        name: true,
      },
      orderBy: { email: "asc" },
    });

    console.log("\n📧 MENTORS (" + mentors.length + "):");
    console.log("-".repeat(60));
    mentors.forEach((mentor, index) => {
      const skills = mentor.mentor_profiles?.mentor_tests?.map((t) => t.course_name) || [];
      console.log(`${index + 1}. ${mentor.email}`);
      console.log(`   Name: ${mentor.name}`);
      console.log(`   Skills (${skills.length}): ${skills.length > 0 ? skills.join(", ") : "None"}`);
    });

    console.log("\n📧 STUDENTS (" + students.length + "):");
    console.log("-".repeat(60));
    students.forEach((student, index) => {
      console.log(`${index + 1}. ${student.email}`);
      console.log(`   Name: ${student.name}`);
    });

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total Mentors: ${mentors.length}`);
    console.log(`Total Students: ${students.length}`);
    console.log("=".repeat(60));

    // Export email lists
    console.log("\n📋 EMAIL LIST (Copy-Paste Friendly):");
    console.log("-".repeat(60));
    console.log("\nMENTORS:");
    mentors.forEach((m) => console.log(m.email));
    console.log("\nSTUDENTS:");
    students.forEach((s) => console.log(s.email));

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

listEmails();











