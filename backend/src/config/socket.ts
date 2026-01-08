/**
 * Socket.IO configuration
 */
import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { verifyToken } from "../utils/jwt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

let io: SocketIOServer;

export function initializeSocketIO(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(" ")[1];

      if (!token) {
        return next(new Error("Authentication error: Token required"));
      }

      const decoded = verifyToken(token);
      (socket as any).user = decoded;
      next();
    } catch (error) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = (socket as any).user;
    if (!user) {
      console.error("Socket connected without user");
      socket.disconnect();
      return;
    }
    console.log(`Socket connected: ${user.userId} (${user.role})`);

    // Join session room
    socket.on("join-session", async (sessionId: string) => {
      try {
        // Verify user has access to this session
        const session = await prisma.sessions.findUnique({
          where: { id: sessionId },
          select: {
            id: true,
            student_id: true,
            mentor_id: true,
          },
        });

        if (!session) {
          socket.emit("error", { message: "Session not found" });
          return;
        }

        if (session.student_id !== user.userId && session.mentor_id !== user.userId) {
          socket.emit("error", { message: "Access denied" });
          return;
        }

        const roomName = `session:${sessionId}`;
        socket.join(roomName);
        console.log(`👤 User ${user.userId} joined session ${sessionId} (room: ${roomName})`);
        socket.emit("joined-session", { sessionId });
      } catch (error) {
        console.error("[Socket] Error joining session:", error);
        socket.emit("error", { message: "Failed to join session" });
      }
    });

    // Leave session room
    socket.on("leave-session", (sessionId: string) => {
      socket.leave(`session:${sessionId}`);
      console.log(`👋 User ${user.userId} left session ${sessionId}`);
    });

    socket.on("disconnect", () => {
      const disconnectedUser = (socket as any).user;
      if (disconnectedUser) {
        console.log(`Socket disconnected: ${disconnectedUser.userId}`);
      } else {
        console.log(`Socket disconnected: unknown user`);
      }
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error("Socket.IO not initialized. Call initializeSocketIO first.");
  }
  return io;
}

