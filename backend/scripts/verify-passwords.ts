import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function verifyPasswords() {
  try {
    console.log("=".repeat(60));
    console.log("Verifying Passwords");
    console.log("=".repeat(60));

    const testPassword = "12345678";

    // Check students
    const students = await prisma.user.findMany({
      where: { role: Role.STUDENT },
      select: { id: true, email: true, password: true },
    });

    console.log(`\nChecking ${students.length} students...`);
    let studentsWithCorrectPassword = 0;
    for (const student of students) {
      if (student.password) {
        const isValid = await bcrypt.compare(testPassword, student.password);
        if (isValid) {
          studentsWithCorrectPassword++;
        }
      }
    }
    console.log(`  ✓ ${studentsWithCorrectPassword}/${students.length} students have correct password`);

    // Check mentors
    const mentors = await prisma.user.findMany({
      where: { role: Role.MENTOR },
      select: { id: true, email: true, password: true },
    });

    console.log(`\nChecking ${mentors.length} mentors...`);
    let mentorsWithCorrectPassword = 0;
    for (const mentor of mentors) {
      if (mentor.password) {
        const isValid = await bcrypt.compare(testPassword, mentor.password);
        if (isValid) {
          mentorsWithCorrectPassword++;
        }
      }
    }
    console.log(`  ✓ ${mentorsWithCorrectPassword}/${mentors.length} mentors have correct password`);

    console.log("\n" + "=".repeat(60));
    if (studentsWithCorrectPassword === students.length && mentorsWithCorrectPassword === mentors.length) {
      console.log("✅ All passwords verified successfully!");
    } else {
      console.log("⚠️  Some passwords may not be set correctly");
    }
    console.log("=".repeat(60));

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyPasswords();
















