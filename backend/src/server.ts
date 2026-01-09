/**
 * Server startup
 * Separated from app.ts for better organization
 */
import { createServer } from "http";
import app from "./app";
import { env } from "./config/env";
import { initializeSocketIO } from "./config/socket";
import { startSessionStatusCron } from "./jobs/sessionStatusCron";
import { startIndustryInsightsCron } from "./jobs/industryInsightsCron";
import { initializePrisma } from "./utils/prismaInit";

const PORT = env.PORT;

// Initialize Prisma and run migrations before starting server
initializePrisma().then(() => {
  console.log("✅ Prisma initialization complete");
}).catch((err) => {
  console.error("⚠️ Prisma initialization had issues, but continuing server start:", err);
});

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO
initializeSocketIO(httpServer);

// Start server
httpServer.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Environment: ${env.NODE_ENV}`);
  console.log(`🔌 Socket.IO initialized`);
  
  // Only start cron jobs after Prisma is initialized and in production
  // This prevents crashes if tables don't exist yet
  if (env.NODE_ENV === "production") {
    try {
      // Wait a bit to ensure migrations are complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log(`⏰ Starting cron jobs...`);
      startSessionStatusCron();
      startIndustryInsightsCron();
      console.log(`✅ Cron jobs started`);
    } catch (err) {
      console.error("⚠️ Failed to start cron jobs:", err);
      console.log("ℹ️ Server will continue without cron jobs");
    }
  } else {
    console.log(`ℹ️ Development mode - cron jobs disabled`);
  }
});

}).catch((err) => {
  console.error("⚠️ Prisma initialization had issues, but continuing server start:", err);
});

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO
initializeSocketIO(httpServer);

// Start server
httpServer.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Environment: ${env.NODE_ENV}`);
  console.log(`🔌 Socket.IO initialized`);
  
  // Only start cron jobs after Prisma is initialized and in production
  // This prevents crashes if tables don't exist yet
  if (env.NODE_ENV === "production") {
    try {
      // Wait a bit to ensure migrations are complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log(`⏰ Starting cron jobs...`);
      startSessionStatusCron();
      startIndustryInsightsCron();
      console.log(`✅ Cron jobs started`);
    } catch (err) {
      console.error("⚠️ Failed to start cron jobs:", err);
      console.log("ℹ️ Server will continue without cron jobs");
    }
  } else {
    console.log(`ℹ️ Development mode - cron jobs disabled`);
  }
});
