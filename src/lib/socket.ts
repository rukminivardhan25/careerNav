/**
 * Singleton Socket.IO client for real-time communication
 * Ensures only ONE socket connection per browser tab (even with React StrictMode)
 */
import { io, Socket } from "socket.io-client";
import { getAuthToken } from "./auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Module-level singleton - ensures only ONE socket instance
// This persists across React StrictMode remounts and hot reloads
let socket: Socket | null = null;

/**
 * Get or create SINGLETON Socket.IO connection
 * Returns the same socket instance every time, even with React StrictMode
 */
export function getSocket(): Socket | null {
  // CRITICAL: Return existing socket if it exists (even if not connected)
  // This ensures only ONE socket instance per browser tab
  if (socket) {
    return socket;
  }

  const token = getAuthToken();
  if (!token) {
    console.warn("[Socket] No auth token available");
    return null;
  }

  // Create socket ONLY ONCE (module-level singleton)
  // This will only execute once per browser tab, even with React StrictMode
  console.log("[Socket] Creating singleton socket instance (this should only happen once)");
  
  socket = io(API_URL, {
    auth: {
      token: token,
    },
    transports: ["websocket"], // Use websocket only
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity,
    reconnectionDelayMax: 5000,
  });

  socket.on("connect", () => {
    console.log("[Socket] Connected with ID:", socket?.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("[Socket] Disconnected, reason:", reason);
    // Don't set socket to null - keep instance for reconnection
  });

  socket.on("connect_error", (error) => {
    console.error("[Socket] Connection error:", error);
  });

  socket.on("error", (error) => {
    console.error("[Socket] Error:", error);
  });

  socket.on("joined-session", (data) => {
    console.log("[Socket] Successfully joined session:", data.sessionId);
  });

  // Global listener for debugging
  socket.on("new-message", (message) => {
    console.log("[Socket] Global new-message event received:", message);
  });

  return socket;
}

/**
 * Disconnect socket completely
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Join a session room
 * Emits join-session event to server
 */
export function joinSession(sessionId: string) {
  const socketInstance = getSocket();
  if (!socketInstance) {
    console.warn("[Socket] Cannot join session: socket not available");
    return;
  }

  if (socketInstance.connected) {
    console.log("[Socket] Joining session:", sessionId);
    socketInstance.emit("join-session", sessionId);
  } else {
    // Wait for connection, then join
    console.log("[Socket] Socket not connected, waiting for connection...");
    socketInstance.once("connect", () => {
      console.log("[Socket] Connected, now joining session:", sessionId);
      socketInstance.emit("join-session", sessionId);
    });
  }
}

/**
 * Leave a session room
 * Emits leave-session event to server
 */
export function leaveSession(sessionId: string) {
  const socketInstance = getSocket();
  if (socketInstance && socketInstance.connected) {
    console.log("[Socket] Leaving session:", sessionId);
    socketInstance.emit("leave-session", sessionId);
  }
}

/**
 * Listen for new messages
 * Registers a callback that will be called when new messages arrive
 */
export function onNewMessage(callback: (message: any) => void) {
  const socketInstance = getSocket();
  if (socketInstance) {
    console.log("[Socket] Registering new-message listener");
    socketInstance.on("new-message", callback);
  }
}

/**
 * Remove new message listener
 * Unregisters a previously registered callback
 */
export function offNewMessage(callback: (message: any) => void) {
  const socketInstance = getSocket();
  if (socketInstance) {
    socketInstance.off("new-message", callback);
    console.log("[Socket] Removed new-message listener");
  }
}

export default { getSocket, disconnectSocket, joinSession, leaveSession, onNewMessage, offNewMessage };
