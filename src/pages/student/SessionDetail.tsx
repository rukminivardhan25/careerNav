import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  MessageSquare,
  Video,
  FileText,
  Star,
  Calendar,
  Clock,
  CheckCircle2,
  Lock,
  Loader2,
  Send,
  Upload,
  Download,
  File,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getAuthToken } from "@/lib/auth";
import { getSocket } from "@/lib/socket";

interface SessionData {
  id: string;
  mentor: {
    id: string;
    name: string;
    email: string | null;
  };
  skillName: string;
  planName: string | null;
  planDuration: number | null;
  planSessionsPerWeek: number | null;
  status: string;
  scheduledAt: string | null;
  createdAt: string | null;
  zoomLink?: string | null;
}

interface Message {
  id: number;
  senderId: string;
  senderRole: string;
  message: string | null;
  messageType: "text" | "file" | "zoom_link" | "system";
  fileData: {
    fileName: string;
    fileType: string;
    fileURL: string;
    fileSize: number;
  } | null;
  zoomLink?: string | null;
  createdAt: string;
}

interface SessionScheduleItem {
  id: number;
  weekNumber: number;
  sessionNumber: number;
  topicTitle: string;
  scheduledDate: string | null;
  scheduledTime: string | null;
  status: "LOCKED" | "UPCOMING" | "COMPLETED";
}

export default function SessionDetail() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [schedule, setSchedule] = useState<SessionScheduleItem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fetchingMessagesRef = useRef(false);
  const lastFetchedSessionIdRef = useRef<string | null>(null);
  
  // Assignments state
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [submittingAssignment, setSubmittingAssignment] = useState<number | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Map<number, File>>(new Map());
  const assignmentFileInputsRef = useRef<Map<number, HTMLInputElement>>(new Map());
  
  // Session resources state
  const [viewResourcesOpen, setViewResourcesOpen] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [scheduleResourcesCount, setScheduleResourcesCount] = useState<Map<number, number>>(new Map());

  // Fetch session details
  useEffect(() => {
    const fetchSession = async () => {
      if (!sessionId) {
        setError("Session ID is required");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const token = getAuthToken();
        if (!token) {
          throw new Error("Authentication required");
        }

        const apiUrl = import.meta.env.VITE_API_URL || "https://career-nav-backend.onrender.com/api";
        const response = await fetch(`${apiUrl}/sessions/${sessionId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Session not found");
          }
          if (response.status === 403) {
            throw new Error("You don't have access to this session");
          }
          throw new Error("Failed to fetch session details");
        }

        const data = await response.json();
        setSession(data);
      } catch (err: any) {
        console.error("Error fetching session:", err);
        setError(err.message || "Failed to load session");
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  // Fetch session schedule
  const fetchSchedule = async () => {
    if (!sessionId) return;

    try {
      const token = getAuthToken();
      if (!token) {
        setSchedule([]);
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || "https://career-nav-backend.onrender.com/api";
      const response = await fetch(`${apiUrl}/sessions/${sessionId}/schedule`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setSchedule([]);
        return;
      }

      const data = await response.json();
      setSchedule(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Error fetching schedule:", err);
      setSchedule([]);
    }
  };

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!sessionId) return;

    // Guard: prevent duplicate fetches
    if (fetchingMessagesRef.current && lastFetchedSessionIdRef.current === sessionId) {
      console.log("[StudentSessionDetail] Already fetching messages for this session, skipping");
      return;
    }

    fetchingMessagesRef.current = true;
    lastFetchedSessionIdRef.current = sessionId;

    try {
      setLoadingMessages(true);
      const token = getAuthToken();
      if (!token) {
        setMessages([]);
        fetchingMessagesRef.current = false;
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || "https://career-nav-backend.onrender.com/api";
      const response = await fetch(`${apiUrl}/sessions/${sessionId}/messages`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // On error, set empty array instead of crashing
        setMessages([]);
        fetchingMessagesRef.current = false;
        return;
      }

      const data = await response.json();
      console.log("[StudentSessionDetail] Fetched messages:", data);
      // Ensure data is always an array
      const messagesArray = Array.isArray(data) ? data : [];
      console.log("[StudentSessionDetail] Setting messages:", messagesArray);
      setMessages(messagesArray);

      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err: any) {
      // On any error, set empty array and continue rendering UI
      setMessages([]);
    } finally {
      setLoadingMessages(false);
      fetchingMessagesRef.current = false;
    }
  }, [sessionId]);

  // Load schedule, messages and notes when session is loaded
  useEffect(() => {
    if (session && session.id) {
      fetchSchedule();
      // Only fetch messages if we haven't already fetched for this session
      if (lastFetchedSessionIdRef.current !== session.id) {
        fetchMessages();
      }
    }
  }, [session, fetchMessages]);

  // Socket.IO real-time messaging
  // useRef guard to prevent duplicate joins (even with React StrictMode)
  const joinedRef = useRef(false);
  const currentSessionIdRef = useRef<string | null>(null);
  const connectHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    // Hard guard: prevent duplicate joins
    if (joinedRef.current && currentSessionIdRef.current === sessionId) {
      console.log("[StudentSessionDetail] Already joined this session, skipping");
      return;
    }

    // Leave previous session if switching
    if (currentSessionIdRef.current && currentSessionIdRef.current !== sessionId) {
      console.log("[StudentSessionDetail] Leaving previous session:", currentSessionIdRef.current);
      const socketInstance = getSocket();
      if (socketInstance) {
        socketInstance.emit("leave-session", currentSessionIdRef.current);
      }
      joinedRef.current = false;
      // Remove previous connect handler if it exists
      if (connectHandlerRef.current && socketInstance) {
        socketInstance.off("connect", connectHandlerRef.current);
        connectHandlerRef.current = null;
      }
    }

    // Mark as joined and update current session
    joinedRef.current = true;
    currentSessionIdRef.current = sessionId;

    console.log("[StudentSessionDetail] Joining session:", sessionId);

    // Get socket instance (singleton)
    const socketInstance = getSocket();
    if (!socketInstance) {
      console.warn("[StudentSessionDetail] Socket not available");
      joinedRef.current = false;
      return;
    }

    // Join session room (only once per sessionId)
    const doJoin = () => {
      // Double-check we haven't already joined (race condition protection)
      if (currentSessionIdRef.current !== sessionId) {
        console.log("[StudentSessionDetail] Session changed, skipping join");
        return;
      }
      console.log("[StudentSessionDetail] Emitting join-session for:", sessionId);
      socketInstance.emit("join-session", sessionId);
    };

    // Create a stable connect handler
    const connectHandler = () => {
      console.log("[StudentSessionDetail] Socket connected, joining session");
      doJoin();
    };

    if (socketInstance.connected) {
      doJoin();
    } else {
      // Remove any existing connect handler first
      if (connectHandlerRef.current) {
        socketInstance.off("connect", connectHandlerRef.current);
      }
      // Store the handler reference for cleanup
      connectHandlerRef.current = connectHandler;
      // Wait for connection, then join
      socketInstance.once("connect", connectHandler);
    }

    // Handle new messages
    const handleNewMessage = (newMessage: Message) => {
      console.log("[StudentSessionDetail] handleNewMessage called with:", newMessage);
      console.log("[StudentSessionDetail] Current sessionId:", currentSessionIdRef.current, "Message session check:", sessionId);
      
      // Only process messages for current session
      if (currentSessionIdRef.current !== sessionId) {
        console.log("[StudentSessionDetail] Ignoring message - wrong session");
        return;
      }

      console.log("[StudentSessionDetail] Processing new message:", newMessage);
      setMessages((prev) => {
        // Prevent duplicates by ID
        if (prev.some((msg) => msg.id === newMessage.id)) {
          console.log("[StudentSessionDetail] Duplicate message detected, skipping");
          return prev;
        }
        console.log("[StudentSessionDetail] Adding message to state. Previous count:", prev.length);
        return [...prev, newMessage];
      });
      
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    };

    // Attach ONE "new-message" listener
    // Use a wrapper to ensure we always use the current sessionId from closure
    const messageHandler = (newMessage: Message) => {
      // Use the sessionId from the closure, not from ref (which might be stale)
      handleNewMessage(newMessage);
    };
    
    // Handle session updates
    const handleSessionUpdate = (update: any) => {
      console.log("[StudentSessionDetail] Session updated:", update);
      if (update.sessionId === sessionId && session) {
        setSession({
          ...session,
          status: update.status,
          zoomLink: update.zoomLink || null,
        });
        // If session was reactivated (COMPLETED -> SCHEDULED), refetch to get latest data
        if (update.status === "SCHEDULED" && session.status === "COMPLETED") {
          const fetchSession = async () => {
            try {
              const token = getAuthToken();
              if (!token) return;
              const apiUrl = import.meta.env.VITE_API_URL || "https://career-nav-backend.onrender.com/api";
              const response = await fetch(`${apiUrl}/sessions/${sessionId}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (response.ok) {
                const data = await response.json();
                if (data.session) {
                  setSession({
                    ...session,
                    id: data.session.id,
                    status: data.session.status,
                    zoomLink: data.session.zoomLink || null,
                  });
                }
              }
            } catch (err) {
              console.error("Error refetching session:", err);
            }
          };
          fetchSession();
        }
      }
    };

    // Handle mentorship status updates (when all scheduled sessions are completed)
    const handleMentorshipStatusUpdate = (update: any) => {
      console.log("[StudentSessionDetail] Mentorship status updated:", update);
      if (update.sessionId === sessionId && session) {
        setSession({
          ...session,
          status: update.status,
        });
      }
    };
    
    console.log("[StudentSessionDetail] Attaching new-message listener to socket:", socketInstance.id || "connecting...");
    socketInstance.on("new-message", messageHandler);
    socketInstance.on("session-updated", handleSessionUpdate);
    socketInstance.on("mentorship-status-updated", handleMentorshipStatusUpdate);

    // Cleanup on unmount or sessionId change
    return () => {
      console.log("[StudentSessionDetail] Cleaning up Socket.IO for session:", sessionId);
      
      // Remove listeners
      if (socketInstance) {
        socketInstance.off("new-message", messageHandler);
        socketInstance.off("session-updated", handleSessionUpdate);
        socketInstance.off("mentorship-status-updated", handleMentorshipStatusUpdate);
        
        // Remove connect handler if it exists
        if (connectHandlerRef.current) {
          socketInstance.off("connect", connectHandlerRef.current);
          connectHandlerRef.current = null;
        }
        
        // Leave session only if still connected
        if (socketInstance.connected && currentSessionIdRef.current === sessionId) {
          socketInstance.emit("leave-session", sessionId);
        }
      }
      
      // Reset guards only if this was the current session
      if (currentSessionIdRef.current === sessionId) {
        joinedRef.current = false;
        currentSessionIdRef.current = null;
      }
    };
  }, [sessionId]); // Only depend on sessionId

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !sessionId || sendingMessage) return;

    const messageText = messageInput.trim();
    setMessageInput(""); // Clear input immediately for better UX (like WhatsApp)

    try {
      setSendingMessage(true);
      const token = getAuthToken();
      if (!token) {
        setMessageInput(messageText); // Restore message on error
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || "https://career-nav-backend.onrender.com/api";
      const response = await fetch(`${apiUrl}/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: messageText,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Error sending message:", errorData.error || "Failed to send message");
        setMessageInput(messageText); // Restore message on error
        return;
      }

      // Get the sent message from response and add it optimistically
      const sentMessage = await response.json();
      console.log("[StudentSessionDetail] Message sent, response:", sentMessage);
      
      // Add message optimistically (Socket will also emit, but this ensures immediate display)
      if (sentMessage && sentMessage.id) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((msg) => msg.id === sentMessage.id)) {
            return prev;
          }
          return [...prev, sentMessage];
        });
        
        // Scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
      
      // Socket will also handle real-time update for other users
    } catch (err: any) {
      console.error("Error sending message:", err);
      setMessageInput(messageText); // Restore message on error
    } finally {
      setSendingMessage(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !sessionId || uploadingFile) return;

    // Validate file type
    const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/png", "image/jpeg", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      alert("Invalid file type. Allowed: PDF, DOC, DOCX, PNG, JPG");
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("File size too large. Maximum size: 10MB");
      return;
    }

    try {
      setUploadingFile(true);
      const token = getAuthToken();
      if (!token) {
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      const apiUrl = import.meta.env.VITE_API_URL || "https://career-nav-backend.onrender.com/api";
      const response = await fetch(`${apiUrl}/sessions/${sessionId}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || "Failed to upload file");
        return;
      }

      // Socket will handle real-time update
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: any) {
      console.error("Error uploading file:", err);
      alert("Failed to upload file");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDownloadFile = (fileURL: string, fileName: string) => {
    const apiUrl = import.meta.env.VITE_API_URL || "https://career-nav-backend.onrender.com";
    const fullURL = fileURL.startsWith("http") ? fileURL : `${apiUrl}${fileURL}`;
    window.open(fullURL, "_blank");
  };

  // Fetch assignments
  const fetchAssignments = useCallback(async () => {
    if (!sessionId) return;

    try {
      setLoadingAssignments(true);
      const token = getAuthToken();
      if (!token) {
        setAssignments([]);
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || "https://career-nav-backend.onrender.com/api";
      const response = await fetch(`${apiUrl}/assignments?sessionId=${sessionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setAssignments([]);
        return;
      }

      const data = await response.json();
      setAssignments(data.assignments || []);
    } catch (err: any) {
      console.error("Error fetching assignments:", err);
      setAssignments([]);
    } finally {
      setLoadingAssignments(false);
    }
  }, [sessionId]);

  // Handle file selection
  const handleFileChange = (assignmentId: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFiles((prev) => {
        const newMap = new Map(prev);
        newMap.set(assignmentId, file);
        return newMap;
      });
    } else {
      setSelectedFiles((prev) => {
        const newMap = new Map(prev);
        newMap.delete(assignmentId);
        return newMap;
      });
    }
  };

  // Submit assignment
  const handleSubmitAssignment = async (assignmentId: number) => {
    const file = selectedFiles.get(assignmentId);
    if (!file || submittingAssignment) return;

    const fileInput = assignmentFileInputsRef.current.get(assignmentId);
    
    try {
      setSubmittingAssignment(assignmentId);
      const token = getAuthToken();
      if (!token) {
        alert("Authentication required");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      const apiUrl = import.meta.env.VITE_API_URL || "https://career-nav-backend.onrender.com/api";
      const response = await fetch(`${apiUrl}/assignments/${assignmentId}/submit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || "Failed to submit assignment");
        return;
      }

      // Clear file input and selected file
      if (fileInput) {
        fileInput.value = "";
      }
      setSelectedFiles((prev) => {
        const newMap = new Map(prev);
        newMap.delete(assignmentId);
        return newMap;
      });

      // Refresh assignments (Socket will also update)
      await fetchAssignments();
    } catch (err: any) {
      console.error("Error submitting assignment:", err);
      alert("Failed to submit assignment");
    } finally {
      setSubmittingAssignment(null);
    }
  };

  // Calculate time remaining
  const getTimeRemaining = (dueAt: string) => {
    const now = new Date();
    const due = new Date(dueAt);
    const diff = due.getTime() - now.getTime();

    if (diff <= 0) {
      return "Overdue";
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? "s" : ""} remaining`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? "s" : ""} ${minutes} minute${minutes > 1 ? "s" : ""} remaining`;
    } else {
      return `${minutes} minute${minutes > 1 ? "s" : ""} remaining`;
    }
  };

  // Fetch assignments when sessionId changes
  useEffect(() => {
    if (sessionId) {
      fetchAssignments();
    }
  }, [sessionId, fetchAssignments]);

  // Socket.IO listeners for assignments
  useEffect(() => {
    if (!sessionId) return;

    const socketInstance = getSocket();
    if (!socketInstance) return;

    const handleAssignmentCreated = (data: any) => {
      console.log("[StudentSessionDetail] Assignment created:", data);
      fetchAssignments();
    };

    socketInstance.on("assignment-created", handleAssignmentCreated);

    // Listen for schedule updates
    const handleScheduleUpdate = (data: any) => {
      console.log("[StudentSessionDetail] Schedule updated:", data);
      if (data.sessionId === sessionId && data.schedule) {
        setSchedule(data.schedule);
      }
    };

    socketInstance.on("schedule-updated", handleScheduleUpdate);

    return () => {
      if (socketInstance) {
        socketInstance.off("assignment-created", handleAssignmentCreated);
        socketInstance.off("schedule-updated", handleScheduleUpdate);
      }
    };
  }, [sessionId, fetchAssignments]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTimeFromString = (timeString: string | null) => {
    if (!timeString) return "N/A";
    // Handle formats like "09:00:00" or "09:00 AM"
    try {
      const [hours, minutes] = timeString.split(":");
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? "PM" : "AM";
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes.substring(0, 2)} ${ampm}`;
    } catch {
      return timeString;
    }
  };

  const getMentorInitials = (name: string) => {
    const nameParts = name?.split(" ") || [];
    return nameParts
      .map((part: string) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2) || "??";
  };

  // Handle view resources
  const handleViewResources = async (scheduleId: number) => {
    if (!sessionId) return;
    
    setSelectedScheduleId(scheduleId);
    setViewResourcesOpen(true);
    setLoadingResources(true);

    try {
      const token = getAuthToken();
      if (!token) {
        alert("Authentication required");
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || "https://career-nav-backend.onrender.com/api";
      const response = await fetch(`${apiUrl}/sessions/${sessionId}/schedule/${scheduleId}/resources`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || "Failed to fetch resources");
        setResources([]);
        return;
      }

      const data = await response.json();
      setResources(data.resources || []);
    } catch (err: any) {
      console.error("Error fetching resources:", err);
      setResources([]);
    } finally {
      setLoadingResources(false);
    }
  };

  // Check if schedule item has resources (for showing eye icon)
  const fetchResourcesCount = async (scheduleId: number) => {
    if (!sessionId) return;
    
    try {
      const token = getAuthToken();
      if (!token) return;

      const apiUrl = import.meta.env.VITE_API_URL || "https://career-nav-backend.onrender.com/api";
      const response = await fetch(`${apiUrl}/sessions/${sessionId}/schedule/${scheduleId}/resources`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setScheduleResourcesCount((prev) => {
          const newMap = new Map(prev);
          newMap.set(scheduleId, data.resources?.length || 0);
          return newMap;
        });
      }
    } catch (err: any) {
      console.error("Error fetching resources count:", err);
    }
  };

  // Fetch resources count for completed sessions
  useEffect(() => {
    if (schedule.length > 0) {
      schedule.forEach((item) => {
        if (item.status === "COMPLETED") {
          fetchResourcesCount(item.id);
        }
      });
    }
  }, [schedule, sessionId]);

  if (loading) {
    return (
      <DashboardLayout role="student" title="Session Details">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !session) {
    return (
      <DashboardLayout role="student" title="Session Details">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-body text-foreground mb-4">{error || "Session not found"}</p>
          <Button variant="outline" onClick={() => navigate("/student/sessions")}>
            Back to Sessions
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const mentorInitials = getMentorInitials(session.mentor.name);

  return (
    <DashboardLayout role="student" title="Session Details">
      <div className="space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate("/student/sessions")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sessions
        </Button>

        {/* HEADER SECTION - Mentor Card */}
        <Card className="glass-card rounded-xl">
          <CardHeader>
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-xl font-bold">
                  {mentorInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-headline text-foreground mb-1">{session.mentor.name}</CardTitle>
                <CardDescription className="text-body text-muted-foreground mb-2">
                  {session.skillName} Mentor
                </CardDescription>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-body-sm font-medium text-foreground">4.8</span>
                  </div>
                  <span className="text-body-sm text-muted-foreground">5+ years experience</span>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                    Ongoing
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div>
              <p className="text-body-sm font-medium text-foreground mb-1">Course:</p>
              <p className="text-body text-foreground">{session.skillName}</p>
            </div>
          </CardContent>
        </Card>

        {/* ALL SESSIONS SCHEDULE */}
        <Card className="glass-card rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              All Sessions Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {schedule.length > 0 ? (
              <div className="space-y-3">
                {schedule.map((item) => {
                  const isCompleted = item.status === "COMPLETED";
                  const isUpcoming = item.status === "UPCOMING";
                  const isLocked = item.status === "LOCKED";
                  
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-lg border",
                        isCompleted && "bg-success/5 border-success/20",
                        isUpcoming && "bg-primary/5 border-primary/20 ring-2 ring-primary/20",
                        isLocked && "bg-muted/50 border-border opacity-60"
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                      ) : isUpcoming ? (
                        <Clock className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      ) : (
                        <Lock className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-body font-medium text-foreground mb-1">
                          Session {item.sessionNumber} – {item.topicTitle}
                        </p>
                        <div className="flex items-center gap-4 flex-wrap">
                          {item.scheduledDate && (
                            <div className="flex items-center gap-1.5 text-body-sm text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>{formatDate(item.scheduledDate)}</span>
                            </div>
                          )}
                          {item.scheduledTime && (
                            <div className="flex items-center gap-1.5 text-body-sm text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{formatTimeFromString(item.scheduledTime)}</span>
                            </div>
                          )}
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-caption capitalize",
                              isCompleted && "bg-success/10 text-success border-success/20",
                              isUpcoming && "bg-primary/10 text-primary border-primary/20",
                              isLocked && "bg-muted text-muted-foreground"
                            )}
                          >
                            {isCompleted && "Completed"}
                            {isUpcoming && "Upcoming"}
                            {isLocked && "Locked"}
                          </Badge>
                        </div>
                      </div>
                      {/* Eye icon: show EyeOff for locked sessions, Eye for unlocked */}
                      {(() => {
                        // Session is UNLOCKED if status is UPCOMING or COMPLETED
                        // All other statuses (LOCKED) are considered locked
                        const isUnlocked = item.status === "UPCOMING" || item.status === "COMPLETED";
                        const isLocked = !isUnlocked;

                        return (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={isLocked ? undefined : () => handleViewResources(item.id)}
                            disabled={isLocked}
                            title={isLocked ? "Session is locked" : "View resources"}
                            className={cn(
                              isLocked && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            {isLocked ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-body-sm text-muted-foreground text-center py-4">
                No schedule available yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* TABS SECTION */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="video">Video Call</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <Card className="glass-card rounded-xl">
              <CardHeader>
                <CardTitle>Session Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-body-sm font-medium text-foreground mb-2">Course Progress</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-body-sm text-muted-foreground">Modules Completed</span>
                      <span className="text-body-sm font-medium text-foreground">
                        {(() => {
                          // Count only COMPLETED sessions (mentor must click "Complete Session")
                          const completedSessions = schedule.filter((item) => item.status === "COMPLETED").length;
                          const totalSessions = schedule.length || 0;
                          return `${completedSessions} of ${totalSessions}`;
                        })()}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{
                          width: (() => {
                            // Calculate progress based on completed sessions only
                            const completedSessions = schedule.filter((item) => item.status === "COMPLETED").length;
                            const totalSessions = schedule.length || 0;
                            const progressPercentage = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;
                            return `${Math.min(progressPercentage, 100)}%`;
                          })(),
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CHAT TAB */}
          <TabsContent value="chat" className="space-y-4 mt-4">
            <Card className="glass-card rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Chat
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4 h-[400px] flex flex-col">
                  {/* Messages */}
                  <div className="flex-1 space-y-4 overflow-y-auto pr-2">
                    {loadingMessages && messages.length === 0 ? (
                      <div className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
                        <p className="text-body-sm text-muted-foreground">Loading messages...</p>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-body-sm text-muted-foreground">No messages yet</p>
                      </div>
                    ) : (
                      messages.map((message) => {
                        const isStudent = message.senderRole === "STUDENT";
                        const isFile = message.messageType === "file";
                        const isZoomLink = message.messageType === "zoom_link";
                        const isSystem = message.messageType === "system";
                        const isCompleted = session?.status === "COMPLETED";
                        
                        // Check if this is an old zoom link (doesn't match current session zoom link)
                        const isOldZoomLink = isZoomLink && message.zoomLink && session?.zoomLink && message.zoomLink !== session.zoomLink;
                        
                        // If zoom link message and (session is completed OR it's an old link), show system message instead
                        if (isZoomLink && (isCompleted || isOldZoomLink)) {
                          return (
                            <div key={message.id} className="flex justify-center w-full">
                              <div className="max-w-[70%] rounded-lg p-3 bg-muted/50 border border-border text-foreground">
                                <p className="text-body-sm text-center italic">
                                  This video call has ended.
                                </p>
                              </div>
                            </div>
                          );
                        }
                        
                        return (
                          <div
                            key={message.id}
                            className={cn("flex", isStudent && !isSystem ? "justify-end" : "justify-start")}
                          >
                            <div
                              className={cn(
                                "max-w-[70%] rounded-lg p-3",
                                isSystem
                                  ? "bg-muted/50 border border-border text-foreground mx-auto"
                                  : isStudent
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-foreground"
                              )}
                            >
                              {isFile && message.fileData ? (
                                <div className="flex items-start gap-3">
                                  <File className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-body-sm font-medium mb-1">{message.fileData.fileName}</p>
                                    <p className="text-caption opacity-70 mb-2">
                                      {(message.fileData.fileSize / 1024).toFixed(1)} KB
                                    </p>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDownloadFile(message.fileData!.fileURL, message.fileData!.fileName)}
                                      className={cn(
                                        "h-7",
                                        isStudent
                                          ? "bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20"
                                          : ""
                                      )}
                                    >
                                      <Download className="h-3.5 w-3.5 mr-1.5" />
                                      Download
                                    </Button>
                                  </div>
                                </div>
                              ) : isZoomLink && message.zoomLink && session?.status === "SCHEDULED" && message.zoomLink === session.zoomLink ? (
                                <div className="flex items-start gap-3">
                                  <Video className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-body-sm font-medium mb-2">{message.message || "Video call link shared"}</p>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => window.open(message.zoomLink!, "_blank")}
                                      className={cn(
                                        "h-7",
                                        isStudent
                                          ? "bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20"
                                          : ""
                                      )}
                                    >
                                      <Video className="h-3.5 w-3.5 mr-1.5" />
                                      Join Zoom Meeting
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <p className={cn("text-body-sm", isSystem && "text-center italic")}>
                                  {message.message}
                                </p>
                              )}
                              {!isSystem && (
                                <p
                                  className={cn(
                                    "text-caption mt-1",
                                    isStudent
                                      ? "text-primary-foreground/70"
                                      : "text-muted-foreground"
                                  )}
                                >
                                  {formatTime(message.createdAt)}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  {session && (session.status === "SCHEDULED" || session.status === "COMPLETED") ? (
                    <div className="flex gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                        className="hidden"
                        disabled={uploadingFile}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingFile || sendingMessage || session.status === "COMPLETED"}
                      >
                        {uploadingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      </Button>
                      <Input
                        placeholder="Type a message..."
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        disabled={sendingMessage || uploadingFile || session.status === "COMPLETED"}
                        className="flex-1"
                      />
                      <Button onClick={handleSendMessage} disabled={sendingMessage || uploadingFile || !messageInput.trim() || session.status === "COMPLETED"} size="icon">
                        {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-body-sm text-muted-foreground">
                      Chat is only available for scheduled or completed sessions.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* VIDEO CALL TAB */}
          <TabsContent value="video" className="space-y-4 mt-4">
            <Card className="glass-card rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Video Call
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {session && session.status === "SCHEDULED" && session.zoomLink ? (
                  <div className="text-center py-8 space-y-4">
                    <Video className="h-16 w-16 mx-auto mb-4 text-primary" />
                    <p className="text-body font-medium text-foreground mb-2">Ready to join the video call</p>
                    <p className="text-body-sm text-muted-foreground mb-6">
                      Click the button below to join the Zoom meeting with your mentor.
                    </p>
                    <Button
                      variant="default"
                      size="lg"
                      onClick={() => window.open(session.zoomLink!, "_blank")}
                      className="px-8"
                    >
                      <Video className="h-5 w-5 mr-2" />
                      🎥 Join Zoom Meeting
                    </Button>
                    {session.zoomLink && (
                      <p className="text-caption text-muted-foreground mt-4 break-all">
                        {session.zoomLink}
                      </p>
                    )}
                  </div>
                ) : session && session.status === "COMPLETED" ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-body font-medium text-foreground mb-2">Waiting for next meeting</p>
                    <p className="text-body-sm text-muted-foreground">
                      The previous meeting has ended. Waiting for mentor to start the next meeting. A new video call link will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-body-sm text-muted-foreground">
                      Waiting for mentor to share the video call link.
                    </p>
                    <p className="text-body-sm text-muted-foreground mt-2">
                      The link will appear here and in the chat once shared.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ASSIGNMENTS TAB */}
          <TabsContent value="assignments" className="space-y-4 mt-4">
            <Card className="glass-card rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Assignments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingAssignments ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-body-sm text-muted-foreground">Loading assignments...</p>
                  </div>
                ) : assignments.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-body-sm text-muted-foreground">No assignments yet</p>
                    <p className="text-body-sm text-muted-foreground mt-2">
                      Your mentor will share assignments here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assignments.map((assignment) => {
                      const submission = assignment.submission;
                      const isSubmitted = !!submission;
                      const isLate = submission?.status === "LATE";
                      const isVerified = submission?.reviewStatus === "VERIFIED";
                      const isPendingVerification = isSubmitted && submission?.reviewStatus === "PENDING";
                      const dueDate = new Date(assignment.dueAt);
                      const isOverdue = !isSubmitted && dueDate < new Date();

                      return (
                        <div
                          key={assignment.id}
                          className="glass-card rounded-xl p-6 border-l-4"
                          style={{
                            borderLeftColor: isSubmitted
                              ? "hsl(var(--success))"
                              : isOverdue
                              ? "hsl(var(--destructive))"
                              : "hsl(var(--primary))",
                          }}
                        >
                          <div className="space-y-4">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-body font-semibold text-foreground">
                                  {assignment.title}
                                </h3>
                                <Badge
                                  variant="outline"
                                  className={
                                    isSubmitted
                                      ? "bg-success/10 text-success border-success/20"
                                      : isOverdue
                                      ? "bg-destructive/10 text-destructive border-destructive/20"
                                      : "bg-warning/10 text-warning border-warning/20"
                                  }
                                >
                                  {isSubmitted
                                    ? isLate
                                      ? "Late"
                                      : "Submitted"
                                    : isOverdue
                                    ? "Overdue"
                                    : "Pending"}
                                </Badge>
                              </div>
                              {assignment.description && (
                                <p className="text-body-sm text-foreground mt-2">
                                  {assignment.description}
                                </p>
                              )}
                              <div className="flex items-center gap-4 mt-3">
                                <div className="flex items-center gap-1 text-body-sm text-muted-foreground">
                                  <Clock className="h-4 w-4" />
                                  {isSubmitted && submission.submittedAt
                                    ? `Submitted: ${new Date(submission.submittedAt).toLocaleString()}`
                                    : !isSubmitted
                                    ? getTimeRemaining(assignment.dueAt)
                                    : "Submitted"}
                                </div>
                                <div className="text-body-sm text-muted-foreground">
                                  Due: {dueDate.toLocaleString()}
                                </div>
                              </div>
                            </div>

                            {!isSubmitted && (
                              <div className="space-y-2">
                                <div>
                                  <label className="text-body-sm font-medium text-foreground mb-2 block">
                                    Upload Assignment File (PDF, DOC, DOCX, ZIP)
                                  </label>
                                  <Input
                                    ref={(el) => {
                                      if (el) {
                                        assignmentFileInputsRef.current.set(assignment.id, el);
                                      } else {
                                        assignmentFileInputsRef.current.delete(assignment.id);
                                      }
                                    }}
                                    type="file"
                                    accept=".pdf,.doc,.docx,.zip"
                                    disabled={submittingAssignment === assignment.id || isOverdue}
                                    className="cursor-pointer"
                                    onChange={(e) => handleFileChange(assignment.id, e)}
                                  />
                                </div>
                                <Button
                                  onClick={() => handleSubmitAssignment(assignment.id)}
                                  disabled={
                                    !selectedFiles.has(assignment.id) ||
                                    submittingAssignment === assignment.id ||
                                    isOverdue
                                  }
                                  size="sm"
                                >
                                  {submittingAssignment === assignment.id ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Submitting...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="h-4 w-4 mr-2" />
                                      Submit Assignment
                                    </>
                                  )}
                                </Button>
                                {isOverdue && (
                                  <p className="text-caption text-destructive mt-2">
                                    This assignment is overdue and cannot be submitted
                                  </p>
                                )}
                              </div>
                            )}

                            {isSubmitted && (
                              <div className="space-y-3">
                                <div className="p-4 bg-success/5 rounded-lg border border-success/20">
                                  <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle2 className="h-4 w-4 text-success" />
                                    <p className="text-body-sm font-medium text-foreground">
                                      Assignment Submitted
                                    </p>
                                  </div>
                                  <p className="text-body-sm text-muted-foreground">
                                    Submitted on: {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : "N/A"}
                                  </p>
                                  {isLate && (
                                    <p className="text-caption text-destructive mt-2">
                                      This assignment was submitted after the deadline
                                    </p>
                                  )}
                                </div>

                                {isPendingVerification && (
                                  <div className="p-4 bg-warning/5 rounded-lg border border-warning/20">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Clock className="h-4 w-4 text-warning" />
                                      <p className="text-body-sm font-medium text-foreground">
                                        Assignment verification pending
                                      </p>
                                    </div>
                                    <p className="text-body-sm text-muted-foreground">
                                      Waiting for mentor to review your submission.
                                    </p>
                                  </div>
                                )}

                                {isVerified && (
                                  <div className="p-4 bg-success/5 rounded-lg border border-success/20">
                                    <div className="flex items-center gap-2 mb-2">
                                      <CheckCircle2 className="h-4 w-4 text-success" />
                                      <p className="text-body-sm font-medium text-foreground">
                                        Verified
                                      </p>
                                    </div>
                                    {submission.mentorFeedback && (
                                      <div className="mt-3">
                                        <p className="text-body-sm font-medium text-foreground mb-2">
                                          Mentor Feedback:
                                        </p>
                                        <p className="text-body-sm text-foreground bg-background p-3 rounded-lg border border-border">
                                          {submission.mentorFeedback}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* View Resources Dialog */}
        <Dialog open={viewResourcesOpen} onOpenChange={setViewResourcesOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Session Resources</DialogTitle>
              <DialogDescription>
                View all PDF resources uploaded for this session
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {loadingResources ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-body-sm text-muted-foreground">Loading resources...</p>
                </div>
              ) : resources.length === 0 ? (
                <div className="text-center py-8">
                  <File className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-body-sm text-muted-foreground">No resources uploaded for this session yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {resources.map((resource) => (
                    <div key={resource.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <File className="h-5 w-5 text-primary" />
                          <p className="text-body-sm font-medium text-foreground">{resource.fileName}</p>
                        </div>
                        {resource.fileSize && (
                          <p className="text-body-sm text-muted-foreground">
                            {(resource.fileSize / 1024).toFixed(1)} KB
                          </p>
                        )}
                      </div>
                      <div className="w-full h-[600px] border rounded-lg overflow-hidden">
                        <iframe
                          src={resource.fileUrl.startsWith("http") ? resource.fileUrl : `${import.meta.env.VITE_API_URL || "https://career-nav-backend.onrender.com"}${resource.fileUrl}`}
                          className="w-full h-full"
                          title={resource.fileName}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewResourcesOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
