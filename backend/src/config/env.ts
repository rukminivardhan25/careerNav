/**
 * Environment configuration
 * Validates and exports environment variables
 */
import dotenv from "dotenv";

dotenv.config();

export const env = {
  // Database
  DATABASE_URL: process.env.DATABASE_URL || "",
  
  // Server
  PORT: parseInt(process.env.PORT || "5000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || "",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  
  // Session
  SESSION_SECRET: process.env.SESSION_SECRET || "",
  
  // AI Services
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  GROQ_API_KEY: process.env.GROQ_API_KEY || "",
} as const;

// Validate required environment variables
const requiredEnvVars = [
  "DATABASE_URL",
  "JWT_SECRET",
  "SESSION_SECRET",
] as const;

for (const varName of requiredEnvVars) {
  if (!env[varName]) {
    console.warn(`⚠️  Warning: ${varName} is not set in environment variables`);
  }
}





