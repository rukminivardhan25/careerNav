/**
 * Prisma initialization and migration bootstrap
 * Ensures database is ready before server starts
 * This is critical for Render free tier where migrations don't run automatically
 */
import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
import { env } from "../config/env";

const prisma = new PrismaClient();

/**
 * Run Prisma migrations and ensure database is ready
 */
export async function initializePrisma(): Promise<void> {
  try {
    console.log("🛠 Running Prisma migrations and checking database connection...");
    
    // Test database connection first
    await prisma.$connect();
    console.log("✅ Database connected");

    // In production, try to run migrations programmatically
    if (env.NODE_ENV === "production") {
      try {
        console.log("🔄 Attempting to run Prisma migrations...");
        execSync("npx prisma migrate deploy", {
          stdio: "inherit",
          cwd: process.cwd(),
          env: process.env,
        });
        console.log("✅ Prisma migrations completed successfully");
      } catch (migrationError: any) {
        console.warn("⚠️ Migrate deploy failed (this may be expected if migrations already ran)");
        console.warn("Error:", migrationError.message);
        // Continue - migrations might already be applied
      }
    }

    // Verify connection with a simple query
    await prisma.$executeRawUnsafe(`SELECT 1`);
    console.log("✅ Database is ready and Prisma initialized");
  } catch (err: any) {
    console.error("❌ Prisma initialization failed:", err.message);
    console.error("⚠️ Server will start but database queries may fail");
    // Don't throw - let the app start and show errors on first query
  }
}

export { prisma };
export default prisma;

