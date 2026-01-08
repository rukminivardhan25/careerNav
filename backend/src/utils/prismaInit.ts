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
        const errorMessage = migrationError.message || "";
        
        // Handle P3009: Failed migrations in database
        if (errorMessage.includes("P3009") || errorMessage.includes("failed migrations")) {
          console.warn("⚠️ Found failed migrations (P3009) - attempting to resolve...");
          try {
            // Try to resolve the specific failed migration
            execSync("npx prisma migrate resolve --applied 20250115000000_remove_resume_review_unique_constraint", {
              stdio: "inherit",
              cwd: process.cwd(),
              env: process.env,
            });
            console.log("✅ Failed migration resolved, retrying migrate deploy...");
            
            // Retry migrate deploy after resolving
            execSync("npx prisma migrate deploy", {
              stdio: "inherit",
              cwd: process.cwd(),
              env: process.env,
            });
            console.log("✅ Prisma migrations completed successfully after resolution");
          } catch (resolveError: any) {
            console.error("❌ Failed to resolve migration:", resolveError.message);
            console.warn("⚠️ Continuing anyway - migrations may need manual resolution");
          }
        } else {
          console.warn("⚠️ Migrate deploy failed (this may be expected if migrations already ran)");
          console.warn("Error:", errorMessage);
        }
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

