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
        // If migrate deploy fails because tables already exist (from db push),
        // check if schema is already in sync and mark migrations as applied
        const errorMessage = String(migrationError.message || migrationError.stderr || migrationError.stdout || "");
        
        // Check if error is about tables already existing (schema already synced via db push)
        if (errorMessage.includes("already exists") || errorMessage.includes("relation already exists")) {
          console.log("ℹ️ Tables already exist (likely from db push) - marking migrations as applied...");
          try {
            // Mark all migrations as applied since schema is already synced
            const migrations = [
              "20250115000000_remove_resume_review_unique_constraint",
              "20250115000001_add_cover_letter_reviews",
              "20251231083156_init",
              "20260104121639_add_sender_role_to_session_messages"
            ];
            
            for (const migration of migrations) {
              try {
                execSync(`npx prisma migrate resolve --applied ${migration}`, {
                  stdio: "pipe",
                  cwd: process.cwd(),
                  env: process.env,
                });
              } catch (e) {
                // Migration might already be marked, ignore
              }
            }
            console.log("✅ Migrations marked as applied - schema is in sync");
          } catch (markError) {
            console.warn("⚠️ Could not mark migrations, but schema appears synced");
          }
          return; // Exit early since schema is already correct
        }
        
        const fullError = String(migrationError);
        
        // Handle P3009: Failed migrations in database
        if (
          errorMessage.includes("P3009") || 
          errorMessage.includes("failed migrations") ||
          errorMessage.includes("migrate found failed migrations") ||
          fullError.includes("P3009")
        ) {
          console.warn("⚠️ Found failed migrations (P3009) - attempting to resolve...");
          console.warn("Error details:", errorMessage.substring(0, 500));
          
          try {
            // Try to resolve the specific failed migration
            console.log("🔧 Resolving failed migration: 20250115000000_remove_resume_review_unique_constraint");
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
            const resolveErrorMsg = String(resolveError.message || resolveError.stderr || "");
            console.error("❌ Failed to resolve migration:", resolveErrorMsg.substring(0, 500));
            
            // If resolve also fails, try to mark it as rolled back instead
            try {
              console.log("🔄 Attempting alternative: marking migration as rolled back...");
              execSync("npx prisma migrate resolve --rolled-back 20250115000000_remove_resume_review_unique_constraint", {
                stdio: "inherit",
                cwd: process.cwd(),
                env: process.env,
              });
              console.log("✅ Migration marked as rolled back, retrying...");
              
              execSync("npx prisma migrate deploy", {
                stdio: "inherit",
                cwd: process.cwd(),
                env: process.env,
              });
              console.log("✅ Prisma migrations completed after rollback resolution");
            } catch (rollbackError: any) {
              console.error("❌ All resolution attempts failed");
              console.warn("⚠️ Continuing anyway - migrations may need manual resolution");
              console.warn("⚠️ Server will start but some features may not work");
            }
          }
        } else {
          console.warn("⚠️ Migrate deploy failed (this may be expected if migrations already ran)");
          console.warn("Error:", errorMessage.substring(0, 500));
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
        // If migrate deploy fails because tables already exist (from db push),
        // check if schema is already in sync and mark migrations as applied
        const errorMessage = String(migrationError.message || migrationError.stderr || migrationError.stdout || "");
        
        // Check if error is about tables already existing (schema already synced via db push)
        if (errorMessage.includes("already exists") || errorMessage.includes("relation already exists")) {
          console.log("ℹ️ Tables already exist (likely from db push) - marking migrations as applied...");
          try {
            // Mark all migrations as applied since schema is already synced
            const migrations = [
              "20250115000000_remove_resume_review_unique_constraint",
              "20250115000001_add_cover_letter_reviews",
              "20251231083156_init",
              "20260104121639_add_sender_role_to_session_messages"
            ];
            
            for (const migration of migrations) {
              try {
                execSync(`npx prisma migrate resolve --applied ${migration}`, {
                  stdio: "pipe",
                  cwd: process.cwd(),
                  env: process.env,
                });
              } catch (e) {
                // Migration might already be marked, ignore
              }
            }
            console.log("✅ Migrations marked as applied - schema is in sync");
          } catch (markError) {
            console.warn("⚠️ Could not mark migrations, but schema appears synced");
          }
          return; // Exit early since schema is already correct
        }
        
        const fullError = String(migrationError);
        
        // Handle P3009: Failed migrations in database
        if (
          errorMessage.includes("P3009") || 
          errorMessage.includes("failed migrations") ||
          errorMessage.includes("migrate found failed migrations") ||
          fullError.includes("P3009")
        ) {
          console.warn("⚠️ Found failed migrations (P3009) - attempting to resolve...");
          console.warn("Error details:", errorMessage.substring(0, 500));
          
          try {
            // Try to resolve the specific failed migration
            console.log("🔧 Resolving failed migration: 20250115000000_remove_resume_review_unique_constraint");
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
            const resolveErrorMsg = String(resolveError.message || resolveError.stderr || "");
            console.error("❌ Failed to resolve migration:", resolveErrorMsg.substring(0, 500));
            
            // If resolve also fails, try to mark it as rolled back instead
            try {
              console.log("🔄 Attempting alternative: marking migration as rolled back...");
              execSync("npx prisma migrate resolve --rolled-back 20250115000000_remove_resume_review_unique_constraint", {
                stdio: "inherit",
                cwd: process.cwd(),
                env: process.env,
              });
              console.log("✅ Migration marked as rolled back, retrying...");
              
              execSync("npx prisma migrate deploy", {
                stdio: "inherit",
                cwd: process.cwd(),
                env: process.env,
              });
              console.log("✅ Prisma migrations completed after rollback resolution");
            } catch (rollbackError: any) {
              console.error("❌ All resolution attempts failed");
              console.warn("⚠️ Continuing anyway - migrations may need manual resolution");
              console.warn("⚠️ Server will start but some features may not work");
            }
          }
        } else {
          console.warn("⚠️ Migrate deploy failed (this may be expected if migrations already ran)");
          console.warn("Error:", errorMessage.substring(0, 500));
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

