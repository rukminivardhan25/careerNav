/**
 * Express app setup
 * Separated from server.ts for better organization
 */
import express from "express";
import cors from "cors";
import session from "express-session";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";
import path from "path";

// Import routes
import authRoutes from "./routes/auth";
import assessmentRoutes from "./routes/assessments";
import careerRoutes from "./routes/careers";
import learningRoutes from "./routes/learning";
import mentorRoutes from "./routes/mentors";
import dashboardRoutes from "./routes/dashboard";
import profileRoutes from "./routes/profile";
import industryRoutes from "./routes/industry";
import notificationRoutes from "./routes/notifications";
import sessionRoutes from "./routes/sessions";
import studentsRoutes from "./routes/students";
import plansRoutes from "./routes/plans";
import assignmentRoutes from "./routes/assignments";
import resumeRoutes from "./routes/resumes";
import coverLetterRoutes from "./routes/coverLetters";
import resumeReviewRoutes from "./routes/resumeReviews";
import interviewRoutes from "./routes/interviews";
import ratingsRoutes from "./routes/ratings";
import publicRoutes from "./routes/public";

const app = express();

// Middleware
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(
  session({
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Serve uploaded files statically
app.use("/api/uploads", express.static(path.join(process.cwd(), "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/assessments", assessmentRoutes);
app.use("/api/careers", careerRoutes);
app.use("/api/learning-paths", learningRoutes);
app.use("/api/mentors", mentorRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/industry", industryRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/students", studentsRoutes);
app.use("/api/plans", plansRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/resumes", resumeRoutes);
app.use("/api/cover-letters", coverLetterRoutes);
app.use("/api/resume-reviews", resumeReviewRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/ratings", ratingsRoutes);
app.use("/api/public", publicRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "CareerNav API is running" });
});

// Error handling (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

