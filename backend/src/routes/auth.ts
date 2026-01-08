import express, { Request, Response } from "express";
import { Role } from "@prisma/client";
import { generateToken } from "../utils/jwt";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/auth/test-db
 * Test database connection (development only)
 */
router.get("/test-db", async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ error: "Not found" });
  }
  
  try {
    await prisma.$connect();
    const userCount = await prisma.user.count();
    res.json({
      status: "connected",
      message: "Database connection successful",
      userCount,
    });
  } catch (error: any) {
    res.status(500).json({
      status: "error",
      message: error?.message || "Database connection failed",
      code: error?.code,
    });
  }
});

/**
 * POST /api/auth/signup
 * Email/password signup endpoint
 */
router.post("/signup", async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;

    // Validate input
    if (!email || !password || !name || !role) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "Email, password, name, and role are required",
      });
    }

    // Validate role
    if (role !== "student" && role !== "mentor") {
      return res.status(400).json({
        error: "Invalid role",
        message: "Role must be 'student' or 'mentor'",
      });
    }

    // Normalize email to lowercase to avoid case sensitivity issues
    const normalizedEmail = email.toLowerCase().trim();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        error: "Invalid email format",
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        error: "Password too short",
        message: "Password must be at least 6 characters long",
      });
    }

    // Check if user already exists (using normalized email)
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({
        error: "User already exists",
        message: "An account with this email already exists",
        code: "ACCOUNT_EXISTS",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user (using normalized email)
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name,
        password: hashedPassword,
        role: role === "student" ? Role.STUDENT : Role.MENTOR,
        provider: "email",
      },
    });

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Prepare user data for frontend (exclude password)
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    res.status(201).json({
      message: "Account created successfully",
      accessToken: token,
      refreshToken: token, // In production, use separate refresh token
      user: userData,
    });
  } catch (error: any) {
    console.error("Signup error:", error);
    console.error("Error stack:", error?.stack);
    console.error("Error message:", error?.message);
    
    // Check if it's a Prisma connection error
    if (error?.code === "P1001" || error?.code === "P1017") {
      return res.status(500).json({
        error: "Database connection error",
        message: "Unable to connect to database. Please check your database configuration.",
        code: "DATABASE_ERROR",
      });
    }
    
    // Check if it's a unique constraint violation
    if (error?.code === "P2002") {
      return res.status(409).json({
        error: "User already exists",
        message: "An account with this email already exists",
        code: "ACCOUNT_EXISTS",
      });
    }
    
    res.status(500).json({
      error: "Internal server error",
      message: error?.message || "Failed to create account. Please try again later.",
      details: process.env.NODE_ENV === "development" ? error?.stack : undefined,
    });
  }
});

/**
 * POST /api/auth/login
 * Email/password login endpoint
 */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;

    // Normalize email to lowercase to avoid case sensitivity issues
    const normalizedEmail = email.toLowerCase().trim();

    console.log("[Login] Attempting login for:", normalizedEmail);
    console.log("[Login] Role requested:", role);

    // Validate input
    if (!normalizedEmail || !password) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "Email and password are required",
      });
    }

    // Find user by email (using normalized email)
    console.log("[Login] Searching for user in database...");
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      console.log("[Login] User not found:", normalizedEmail);
      return res.status(401).json({
        error: "Invalid credentials",
        message: "No account found with this email",
        code: "ACCOUNT_NOT_FOUND",
      });
    }

    console.log("[Login] User found:", user.id, "Role:", user.role);

    // Check if user has a password
    if (!user.password) {
      console.log("[Login] User has no password");
      return res.status(401).json({
        error: "Invalid credentials",
        message: "Account does not have a password set. Please contact support.",
        code: "NO_PASSWORD",
      });
    }

    // Verify password
    console.log("[Login] Verifying password...");
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log("[Login] Password incorrect");
      return res.status(401).json({
        error: "Invalid credentials",
        message: "Incorrect password",
        code: "INVALID_PASSWORD",
      });
    }

    console.log("[Login] Password verified successfully");

    // Validate role if provided
    if (role) {
      const requestedRole = role === "student" ? Role.STUDENT : Role.MENTOR;
      if (user.role !== requestedRole) {
        console.log("[Login] Role mismatch. User role:", user.role, "Requested:", requestedRole);
        return res.status(403).json({
          error: "Role mismatch",
          message: `This account is registered as ${user.role.toLowerCase()}, not ${role}`,
          code: "ROLE_MISMATCH",
        });
      }
    }

    // Generate JWT token
    console.log("[Login] Generating JWT token...");
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Prepare user data for frontend (exclude password)
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    console.log("[Login] Login successful for:", normalizedEmail);
    res.json({
      message: "Login successful",
      accessToken: token,
      refreshToken: token, // In production, use separate refresh token
      user: userData,
    });
  } catch (error: any) {
    console.error("[Login] Error occurred:", error);
    console.error("[Login] Error name:", error?.name);
    console.error("[Login] Error message:", error?.message);
    console.error("[Login] Error code:", error?.code);
    console.error("[Login] Error stack:", error?.stack);
    
    // Check if it's a Prisma connection error
    if (error?.code === "P1001" || error?.code === "P1017") {
      console.error("[Login] Database connection error detected");
      return res.status(500).json({
        error: "Database connection error",
        message: "Unable to connect to database. Please check your database configuration.",
        code: "DATABASE_ERROR",
      });
    }
    
    res.status(500).json({
      error: "Internal server error",
      message: error?.message || "Failed to login. Please try again later.",
      code: "INTERNAL_ERROR",
      details: process.env.NODE_ENV === "development" ? error?.stack : undefined,
    });
  }
});

export default router;
