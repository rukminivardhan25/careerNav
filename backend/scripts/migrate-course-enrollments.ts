/**
 * Migration script to backfill course_enrollments table
 * 
 * This script:
 * 1. Creates course_enrollments records for all existing courses
 * 2. Calculates and sets course_status based on current payment/schedule data
 * 
 * Run: npx tsx scripts/migrate-course-enrollments.ts
 */

import { PrismaClient } from "@prisma/client";
import { recalculateAllCourseStatuses } from "../src/services/courseStatus.service";

const prisma = new PrismaClient();

async function migrate() {
  console.log("=== Starting Course Enrollments Migration ===\n");

  try {
    // Step 1: Recalculate all course statuses
    // This will create/update course_enrollments records for all courses
    await recalculateAllCourseStatuses();

    // Step 2: Verify migration
    const enrollmentCount = await prisma.course_enrollments.count();
    console.log(`\n=== Migration Complete ===`);
    console.log(`Total course enrollments: ${enrollmentCount}`);

    // Show breakdown by status
    const statusBreakdown = await prisma.course_enrollments.groupBy({
      by: ["course_status"],
      _count: true,
    });

    console.log("\nStatus breakdown:");
    for (const item of statusBreakdown) {
      console.log(`  ${item.course_status}: ${item._count}`);
    }

    console.log("\n✅ Migration successful!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();








