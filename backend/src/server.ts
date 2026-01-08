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

const PORT = env.PORT;

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO
initializeSocketIO(httpServer);

// Start session status cron job
startSessionStatusCron();

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 OAuth endpoint: http://localhost:${PORT}/api/auth/google`);
  console.log(`📊 Environment: ${env.NODE_ENV}`);
  console.log(`🔌 Socket.IO initialized`);
  console.log(`⏰ Session status cron job started`);
  console.log(`📈 Industry insights weekly cron job started`);
  
  // Start industry insights cron
  startIndustryInsightsCron();
});
