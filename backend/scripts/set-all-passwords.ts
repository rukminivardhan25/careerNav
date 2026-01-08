import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function setAllPasswords() {
  try {
    console.log("=".repeat(60));
    console.log("Setting All Passwords to 12345678");
    console.log("=".repeat(60));

    // Hash the password
    const hashedPassword = await bcrypt.hash("12345678", 10);
    console.log("\n✓ Password hashed successfully");

    // Update all students
    console.log("\nUpdating student passwords...");
    const updatedStudents = await prisma.user.updateMany({
      where: {
        role: Role.STUDENT,
      },
      data: {
        password: hashedPassword,
      },
    });
    console.log(`  ✓ Updated ${updatedStudents.count} student passwords`);

    // Update all mentors
    console.log("\nUpdating mentor passwords...");
    const updatedMentors = await prisma.user.updateMany({
      where: {
        role: Role.MENTOR,
      },
      data: {
        password: hashedPassword,
      },
    });
    console.log(`  ✓ Updated ${updatedMentors.count} mentor passwords`);

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("SUMMARY");
    console.log("=".repeat(60));
    console.log(`✓ Updated ${updatedStudents.count} student passwords`);
    console.log(`✓ Updated ${updatedMentors.count} mentor passwords`);
    console.log(`✓ All passwords set to: 12345678`);
    console.log("=".repeat(60));
    console.log("\n✅ Password update completed successfully!");

  } catch (error) {
    console.error("\n❌ Error updating passwords:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the script
setAllPasswords()
  .then(() => {
    console.log("\nScript completed successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nScript failed:", error);
    process.exit(1);
  });








