import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function verifyReset() {
  try {
    console.log("=".repeat(60));
    console.log("Verifying Data Reset");
    console.log("=".repeat(60));

    // Check mentors
    const allMentors = await prisma.user.findMany({
      where: { role: Role.MENTOR },
      select: { id: true, email: true, name: true },
      orderBy: { email: "asc" },
    });

    console.log(`\nTotal Mentors: ${allMentors.length}`);
    const newMentors = allMentors.filter((m) => m.email.startsWith("mentor") && m.email.endsWith("@test.dev"));
    console.log(`  - New mentors (mentor6-10@test.dev): ${newMentors.length}`);
    newMentors.forEach((m) => {
      console.log(`    ✓ ${m.email} - ${m.name}`);
    });

    // Check students
    const allStudents = await prisma.user.findMany({
      where: { role: Role.STUDENT },
      select: { id: true, email: true, name: true, password: true },
      orderBy: { email: "asc" },
    });

    console.log(`\nTotal Students: ${allStudents.length}`);
    const newStudents = allStudents.filter((s) => s.email.startsWith("student") && s.email.endsWith("@test.dev"));
    console.log(`  - New students (student1-10@test.dev): ${newStudents.length}`);
    
    if (newStudents.length === 10) {
      console.log("  ✓ All 10 students created successfully");
      const studentsWithPassword = newStudents.filter((s) => s.password !== null);
      console.log(`  ✓ ${studentsWithPassword.length} students have passwords set`);
    } else {
      console.log(`  ⚠️  Expected 10 students, found ${newStudents.length}`);
    }

    // Check for any old student data
    const oldStudents = allStudents.filter((s) => !s.email.startsWith("student") || !s.email.endsWith("@test.dev"));
    if (oldStudents.length > 0) {
      console.log(`\n⚠️  Found ${oldStudents.length} old students still in database:`);
      oldStudents.forEach((s) => {
        console.log(`    - ${s.email}`);
      });
    } else {
      console.log("\n✓ No old student data found - all cleaned up!");
    }

    console.log("\n" + "=".repeat(60));
    console.log("Verification Complete");
    console.log("=".repeat(60));

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyReset();








