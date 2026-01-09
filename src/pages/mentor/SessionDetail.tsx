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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  MessageSquare,
  Video,
  FileText,
  Calendar,
  Clock,
  CheckCircle2,
  Lock,
  Loader2,
  Send,
  Upload,
  Download,
  File,
  Plus,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getAuthToken } from "@/lib/auth";
import { API_BASE_URL, BASE_URL } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { formatISTTime, formatISTDate, formatISTTimeFromString, formatISTDateTime } from "@/utils/istTime";

interface SessionData {
  id: string;
  student: {
    id: string;
    name: string;
    email: string;
  };
  skillName: string;
  status: string;
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

export default function MentorSessionDetail() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log("[MentorSessionDetail] Component rendered with sessionId:", sessionId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [schedule, setSchedule] = useState<SessionScheduleItem[]>([]);
  const [zoomLinkInput, setZoomLinkInput] = useState("");
  const [sharingZoomLink, setSharingZoomLink] = useState(false);
  const [completingSession, setCompletingSession] = useState(false);
  const [completingScheduleItem, setCompletingScheduleItem] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Assignments state
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [createAssignmentOpen, setCreateAssignmentOpen] = useState(false);
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDescription, setAssignmentDescription] = useState("");
  const [creatingAssignment, setCreatingAssignment] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [viewSubmissionsOpen, setViewSubmissionsOpen] = useState(false);
  
  // Session resources state
  const [uploadResourceOpen, setUploadResourceOpen] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [uploadingResource, setUploadingResource] = useState(false);
  const [uploadedResources, setUploadedResources] = useState<any[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const resourceFileInputRef = useRef<HTMLInputElement>(null);

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

        const apiUrl = API_BASE_URL;
        const response = await fetch(`${apiUrl}/mentors/sessions/${sessionId}`, {
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
        console.log("[MentorSessionDetail] Fetched session data:", data);
        
        // API returns { student: {...}, session: {...} }
        if (!data.session || !data.student) {
          throw new Error("Invalid session data received from server");
        }
        
        setSession({
          id: data.session.id,
          student: data.student,
          skillName: data.session.skillName || data.session.courseName || "N/A",
          status: data.session.status,
          zoomLink: data.session.zoomLink || null,
        });
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

      const apiUrl = API_BASE_URL;
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

    try {
      setLoadingMessages(true);
      const token = getAuthToken();
      if (!token) {
        setMessages([]);
        return;
      }

      const apiUrl = API_BASE_URL;
      const response = await fetch(`${apiUrl}/sessions/${sessionId}/messages`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setMessages([]);
        return;
      }

      const data = await response.json();
      console.log("[MentorSessionDetail] Fetched messages:", data);
      const messagesArray = Array.isArray(data) ? data : [];
      console.log("[MentorSessionDetail] Setting messages:", messagesArray);
      setMessages(messagesArray);

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err: any) {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, [sessionId]);

  // Load schedule, messages when session is loaded
  useEffect(() => {
    if (session) {
      fetchSchedule();
      fetchMessages();
    }
  }, [session, fetchMessages]);

  // Handle complete schedule item
  const handleCompleteScheduleItem = async (scheduleId: number) => {
    if (!sessionId || completingScheduleItem) return;

    try {
      setCompletingScheduleItem(scheduleId);
      const token = getAuthToken();
      if (!token) {
        alert("Authentication required");
        return;
      }

      const apiUrl = API_BASE_URL;
      const response = await fetch(`${apiUrl}/sessions/${sessionId}/schedule/${scheduleId}/complete`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || "Failed to complete session");
        return;
      }

      // Refresh schedule (Socket will also update)
      await fetchSchedule();
    } catch (err: any) {
      console.error("Error completing schedule item:", err);
      alert("Failed to complete session");
    } finally {
      setCompletingScheduleItem(null);
    }
  };

  // Socket.IO real-time messaging
  // useRef guard to prevent duplicate joins (even with React StrictMode)
  const joinedRef = useRef(false);
  const currentSessionIdRef = useRef<string | null>(null);
  const connectHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    // Hard guard: prevent duplicate joins
    if (joinedRef.current && currentSessionIdRef.current === sessionId) {
      console.log("[MentorSessionDetail] Already joined this session, skipping");
      return;
    }

    // Leave previous session if switching
    if (currentSessionIdRef.current && currentSessionIdRef.current !== sessionId) {
      console.log("[MentorSessionDetail] Leaving previous session:", currentSessionIdRef.current);
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

    console.log("[MentorSessionDetail] Joining session:", sessionId);

    // Get socket instance (singleton)
    const socketInstance = getSocket();
    if (!socketInstance) {
      console.warn("[MentorSessionDetail] Socket not available");
      joinedRef.current = false;
      return;
    }

    // Join session room (only once per sessionId)
    const doJoin = () => {
      // Double-check we haven't already joined (race condition protection)
      if (currentSessionIdRef.current !== sessionId) {
        console.log("[MentorSessionDetail] Session changed, skipping join");
        return;
      }
      console.log("[MentorSessionDetail] Emitting join-session for:", sessionId);
      socketInstance.emit("join-session", sessionId);
    };

    // Create a stable connect handler
    const connectHandler = () => {
      console.log("[MentorSessionDetail] Socket connected, joining session");
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

    // Handle new messages - use closure to capture sessionId
    const handleNewMessage = (newMessage: Message) => {
      console.log("[MentorSessionDetail] handleNewMessage called with:", newMessage);
      console.log("[MentorSessionDetail] Current sessionId from closure:", sessionId);
      
      // Only process messages for current session (use closure sessionId, not ref)
      // The ref might be stale, but the closure sessionId is always correct for this effect
      if (currentSessionIdRef.current !== sessionId) {
        console.log("[MentorSessionDetail] Ignoring message - session changed");
        return;
      }

      console.log("[MentorSessionDetail] Processing new message:", newMessage);
      setMessages((prev) => {
        // Prevent duplicates by ID
        if (prev.some((msg) => msg.id === newMessage.id)) {
          console.log("[MentorSessionDetail] Duplicate message detected, skipping");
          return prev;
        }
        console.log("[MentorSessionDetail] Adding message to state. Previous count:", prev.length);
        return [...prev, newMessage];
      });
      
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    };

    // Handle session updates
    const handleSessionUpdate = (update: any) => {
      console.log("[MentorSessionDetail] Session updated:", update);
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
              const apiUrl = API_BASE_URL;
              const response = await fetch(`${apiUrl}/mentors/sessions/${sessionId}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (response.ok) {
                const data = await response.json();
                if (data.session && data.student) {
                  setSession({
                    id: data.session.id,
                    student: data.student,
                    skillName: data.session.skillName || data.session.courseName || "N/A",
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
      console.log("[MentorSessionDetail] Mentorship status updated:", update);
      if (update.sessionId === sessionId && session) {
        setSession({
          ...session,
          status: update.status,
        });
      }
    };
    
    console.log("[MentorSessionDetail] Attaching new-message listener to socket:", socketInstance.id || "connecting...");
    socketInstance.on("new-message", handleNewMessage);
    socketInstance.on("session-updated", handleSessionUpdate);
    socketInstance.on("mentorship-status-updated", handleMentorshipStatusUpdate);
    socketInstance.on("mentorship-status-updated", handleMentorshipStatusUpdate);

    // Cleanup on unmount or sessionId change
    return () => {
      console.log("[MentorSessionDetail] Cleaning up Socket.IO for session:", sessionId);
      
      // Remove listeners
      if (socketInstance) {
        socketInstance.off("new-message", handleNewMessage);
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
    setMessageInput(""); // Clear input immediately for better UX

    try {
      setSendingMessage(true);
      const token = getAuthToken();
      if (!token) {
        setMessageInput(messageText);
        return;
      }

      const apiUrl = API_BASE_URL;
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
        setMessageInput(messageText);
        return;
      }

      // Get the sent message from response and add it optimistically
      const sentMessage = await response.json();
      console.log("[MentorSessionDetail] Message sent, response:", sentMessage);
      
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
      setMessageInput(messageText);
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

      const apiUrl = API_BASE_URL;
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
    const apiUrl = BASE_URL;
    const fullURL = fileURL.startsWith("http") ? fileURL : `${apiUrl}${fileURL}`;
    window.open(fullURL, "_blank");
  };

  const handleShareZoomLink = async () => {
    if (!sessionId || !zoomLinkInput.trim()) return;

    try {
      setSharingZoomLink(true);
      const token = getAuthToken();
      if (!token) {
        alert("Authentication required");
        return;
      }

      const apiUrl = API_BASE_URL;
      const response = await fetch(`${apiUrl}/sessions/${sessionId}/zoom-link`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          zoomLink: zoomLinkInput.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || "Failed to share Zoom link");
        return;
      }

      const data = await response.json();
      
      // Update session with zoom link and status
      if (session) {
        setSession({
          ...session,
          zoomLink: data.zoomLink || data.message?.zoomLink || null,
          status: "SCHEDULED", // Session is reactivated when new link is shared
        });
      }

      // Add message optimistically (Socket will also emit)
      if (data.message) {
        setMessages((prev) => {
          if (prev.some((msg) => msg.id === data.message.id)) {
            return prev;
          }
          return [...prev, data.message];
        });
      }

      // Clear input
      setZoomLinkInput("");
    } catch (err: any) {
      console.error("Error sharing Zoom link:", err);
      alert("Failed to share Zoom link");
    } finally {
      setSharingZoomLink(false);
    }
  };

  const handleCompleteSession = async () => {
    if (!sessionId) return;

    try {
      setCompletingSession(true);
      const token = getAuthToken();
      if (!token) {
        alert("Authentication required");
        return;
      }

      const apiUrl = API_BASE_URL;
      const response = await fetch(`${apiUrl}/sessions/${sessionId}/complete`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || "Failed to complete session");
        return;
      }

      const data = await response.json();
      
      // Update session status
      if (session) {
        setSession({
          ...session,
          status: "COMPLETED",
          zoomLink: null,
        });
      }

      // Add system message optimistically (Socket will also emit)
      if (data.message) {
        setMessages((prev) => {
          if (prev.some((msg) => msg.id === data.message.id)) {
            return prev;
          }
          return [...prev, data.message];
        });
      }
    } catch (err: any) {
      console.error("Error completing session:", err);
      alert("Failed to complete session");
    } finally {
      setCompletingSession(false);
    }
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

      const apiUrl = API_BASE_URL;
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

  // Create assignment
  const handleCreateAssignment = async () => {
    if (!sessionId || !assignmentTitle.trim() || creatingAssignment) return;

    try {
      setCreatingAssignment(true);
      const token = getAuthToken();
      if (!token) {
        alert("Authentication required");
        return;
      }

      const apiUrl = API_BASE_URL;
      const response = await fetch(`${apiUrl}/assignments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          title: assignmentTitle.trim(),
          description: assignmentDescription.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || "Failed to create assignment");
        return;
      }

      // Reset form
      setAssignmentTitle("");
      setAssignmentDescription("");
      setCreateAssignmentOpen(false);

      // Refresh assignments (Socket will also update)
      await fetchAssignments();
    } catch (err: any) {
      console.error("Error creating assignment:", err);
      alert("Failed to create assignment");
    } finally {
      setCreatingAssignment(false);
    }
  };

  // View assignment submissions
  const handleViewSubmissions = async (assignment: any) => {
    try {
      const token = getAuthToken();
      if (!token) {
        alert("Authentication required");
        return;
      }

      const apiUrl = API_BASE_URL;
      const response = await fetch(`${apiUrl}/assignments/${assignment.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || "Failed to fetch assignment details");
        return;
      }

      const data = await response.json();
      setSelectedAssignment(data.assignment);
      setViewSubmissionsOpen(true);
    } catch (err: any) {
      console.error("Error fetching assignment details:", err);
      alert("Failed to fetch assignment details");
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
      console.log("[MentorSessionDetail] Assignment created:", data);
      fetchAssignments();
    };

    const handleAssignmentSubmitted = (data: any) => {
      console.log("[MentorSessionDetail] Assignment submitted:", data);
      fetchAssignments();
      // Update selected assignment if viewing it
      if (selectedAssignment && selectedAssignment.id === data.assignmentId) {
        handleViewSubmissions(selectedAssignment);
      }
    };

    socketInstance.on("assignment-created", handleAssignmentCreated);
    socketInstance.on("assignment-submitted", handleAssignmentSubmitted);

    // Listen for schedule updates
    const handleScheduleUpdate = (data: any) => {
      console.log("[MentorSessionDetail] Schedule updated:", data);
      if (data.sessionId === sessionId && data.schedule) {
        setSchedule(data.schedule);
      }
    };

    socketInstance.on("schedule-updated", handleScheduleUpdate);

    return () => {
      if (socketInstance) {
        socketInstance.off("assignment-created", handleAssignmentCreated);
        socketInstance.off("assignment-submitted", handleAssignmentSubmitted);
        socketInstance.off("schedule-updated", handleScheduleUpdate);
      }
    };
  }, [sessionId, fetchAssignments, selectedAssignment]);

  const formatTime = (timestamp: string) => {
    return formatISTTime(timestamp, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString: string | null) => {
    return formatISTDate(dateString, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTimeFromString = (timeString: string | null) => {
    return formatISTTimeFromString(timeString);
  };

  const getStudentInitials = (name: string) => {
    const nameParts = name?.split(" ") || [];
    return nameParts
      .map((part: string) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2) || "??";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SCHEDULED":
      case "ONGOING":
        return <Badge className="bg-success/10 text-success border-success/20">Ongoing</Badge>;
      case "COMPLETED":
        return <Badge className="bg-muted text-muted-foreground">Completed</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Handle resource upload
  const handleUploadResource = (scheduleId: number) => {
    setSelectedScheduleId(scheduleId);
    setUploadResourceOpen(true);
    setSelectedFileName(null);
    // Fetch existing resources when modal opens
    fetchUploadedResources(scheduleId);
  };

  // Fetch uploaded resources for a schedule item
  const fetchUploadedResources = async (scheduleId: number) => {
    if (!sessionId || !scheduleId) return;

    try {
      setLoadingResources(true);
      const token = getAuthToken();
      if (!token) {
        setUploadedResources([]);
        return;
      }

      const apiUrl = API_BASE_URL;
      const response = await fetch(`${apiUrl}/sessions/${sessionId}/schedule/${scheduleId}/resources`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUploadedResources(data.resources || []);
      } else {
        setUploadedResources([]);
      }
    } catch (err: any) {
      console.error("Error fetching resources:", err);
      setUploadedResources([]);
    } finally {
      setLoadingResources(false);
    }
  };

  const handleResourceFileSelect = async (event?: React.ChangeEvent<HTMLInputElement>) => {
    const file = event?.target.files?.[0] || resourceFileInputRef.current?.files?.[0];
    if (!file || !sessionId || !selectedScheduleId || uploadingResource) return;

    // Validate file type (PDF only)
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      alert("Only PDF files are allowed");
      if (resourceFileInputRef.current) {
        resourceFileInputRef.current.value = "";
      }
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("File size too large. Maximum size: 10MB");
      if (resourceFileInputRef.current) {
        resourceFileInputRef.current.value = "";
      }
      return;
    }

    try {
      setUploadingResource(true);
      const token = getAuthToken();
      if (!token) {
        alert("Authentication required");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      const apiUrl = API_BASE_URL;
      const response = await fetch(`${apiUrl}/sessions/${sessionId}/schedule/${selectedScheduleId}/resources`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || "Failed to upload resource");
        return;
      }

      // Success - clear file input and re-fetch resources list
      if (resourceFileInputRef.current) {
        resourceFileInputRef.current.value = "";
      }
      setSelectedFileName(null);
      // Re-fetch uploaded resources to update the list
      if (selectedScheduleId) {
        await fetchUploadedResources(selectedScheduleId);
      }
    } catch (err: any) {
      console.error("Error uploading resource:", err);
      alert("Failed to upload resource");
    } finally {
      setUploadingResource(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="mentor" title="Session Details">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !session) {
    return (
      <DashboardLayout role="mentor" title="Session Details">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-body text-foreground mb-4">{error || "Session not found"}</p>
          <Button variant="outline" onClick={() => navigate("/mentor/students")}>
            Back to Students
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (!session.student) {
    return (
      <DashboardLayout role="mentor" title="Session Details">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-body text-foreground mb-4">Invalid session data: Student information missing</p>
          <Button variant="outline" onClick={() => navigate("/mentor/students")}>
            Back to Students
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const studentInitials = getStudentInitials(session.student?.name || "Unknown");

  return (
    <DashboardLayout role="mentor" title="Session Details">
      <div className="space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate("/mentor/students")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Students
        </Button>

        {/* HEADER SECTION - Student Card */}
        <Card className="glass-card rounded-xl">
          <CardHeader>
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-xl font-bold">
                  {studentInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-headline text-foreground mb-1">{session.student.name}</CardTitle>
                <CardDescription className="text-body text-muted-foreground mb-2">
                  {session.student.email}
                </CardDescription>
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <p className="text-body-sm font-medium text-foreground mb-1">Skill:</p>
                    <p className="text-body-sm text-muted-foreground">{session.skillName}</p>
                  </div>
                  {getStatusBadge(session.status)}
                </div>
              </div>
            </div>
          </CardHeader>
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
                      <div className="flex items-center gap-2">
                        {/* Always show + icon for mentors - disabled only for LOCKED */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => !isLocked && handleUploadResource(item.id)}
                          disabled={isLocked || uploadingResource}
                          title={isLocked ? "Session is locked" : "Upload / Share PDF"}
                          className={isLocked ? "opacity-50 cursor-not-allowed" : ""}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
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
                        const isMentor = message.senderRole === "MENTOR";
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
                            className={cn("flex", isMentor && !isSystem ? "justify-end" : "justify-start")}
                          >
                            <div
                              className={cn(
                                "max-w-[70%] rounded-lg p-3",
                                isSystem
                                  ? "bg-muted/50 border border-border text-foreground mx-auto"
                                  : isMentor
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
                                        isMentor
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
                                        isMentor
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
                                    isMentor
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

                  {session && (
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
                        disabled={uploadingFile || sendingMessage}
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
                        disabled={sendingMessage || uploadingFile}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={sendingMessage || uploadingFile || !messageInput.trim()}
                        size="icon"
                      >
                        {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
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
                {session && (session.status === "SCHEDULED" || session.status === "COMPLETED") ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-body-sm font-medium text-foreground mb-2 block">
                        {session.status === "COMPLETED" ? "Start New Video Call" : "Share Zoom Meeting Link"}
                      </label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Paste Zoom meeting link here (https://zoom.us/j/...)"
                          value={zoomLinkInput}
                          onChange={(e) => setZoomLinkInput(e.target.value)}
                          disabled={sharingZoomLink}
                          className="flex-1"
                        />
                        <Button
                          onClick={handleShareZoomLink}
                          disabled={!zoomLinkInput.trim() || sharingZoomLink}
                          size="default"
                        >
                          {sharingZoomLink ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Sharing...
                            </>
                          ) : (
                            <>
                              <Video className="h-4 w-4 mr-2" />
                              {session.status === "COMPLETED" ? "Start New Video Call" : "Share Link"}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    {session.zoomLink && session.status === "SCHEDULED" && (
                      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                        <p className="text-body-sm font-medium text-foreground mb-2">Current Zoom Link:</p>
                        <p className="text-body-sm text-muted-foreground break-all mb-3">{session.zoomLink}</p>
                        <Button
                          variant="outline"
                          onClick={() => window.open(session.zoomLink!, "_blank")}
                          className="w-full"
                        >
                          <Video className="h-4 w-4 mr-2" />
                          Join Video Call
                        </Button>
                      </div>
                    )}
                    {session.status === "SCHEDULED" && (
                      <div className="pt-4 border-t">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              className="w-full"
                              disabled={completingSession}
                            >
                              {completingSession ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Ending Meeting...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  End Meeting
                                </>
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>End Meeting</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to end this meeting? This will:
                                <ul className="list-disc list-inside mt-2 space-y-1">
                                  <li>Mark the meeting as ended</li>
                                  <li>Invalidate the current Zoom meeting link</li>
                                  <li>Allow starting a new meeting later</li>
                                </ul>
                                You can share a new Zoom link to start another meeting in this session.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={completingSession}>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleCompleteSession}
                                disabled={completingSession}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {completingSession ? "Ending..." : "End Meeting"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-body-sm text-muted-foreground">
                      Video calls are only available for scheduled or completed sessions.
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
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Assignments
                  </CardTitle>
                  <Dialog open={createAssignmentOpen} onOpenChange={setCreateAssignmentOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="default">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Assignment
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Assignment</DialogTitle>
                        <DialogDescription>
                          Create an assignment for the student. They will have 24 hours to submit.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <label className="text-body-sm font-medium text-foreground mb-2 block">
                            Title *
                          </label>
                          <Input
                            placeholder="Assignment title"
                            value={assignmentTitle}
                            onChange={(e) => setAssignmentTitle(e.target.value)}
                            disabled={creatingAssignment}
                          />
                        </div>
                        <div>
                          <label className="text-body-sm font-medium text-foreground mb-2 block">
                            Description
                          </label>
                          <Textarea
                            placeholder="Assignment description (optional)"
                            value={assignmentDescription}
                            onChange={(e) => setAssignmentDescription(e.target.value)}
                            disabled={creatingAssignment}
                            rows={4}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setCreateAssignmentOpen(false)}
                          disabled={creatingAssignment}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleCreateAssignment}
                          disabled={!assignmentTitle.trim() || creatingAssignment}
                        >
                          {creatingAssignment ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            "Create Assignment"
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
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
                      Create an assignment to get started
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assignments.map((assignment) => {
                      const submissions = Array.isArray(assignment.submission)
                        ? assignment.submission
                        : assignment.submission
                        ? [assignment.submission]
                        : [];
                      const hasSubmission = submissions.length > 0;

                      return (
                        <div
                          key={assignment.id}
                          className="glass-card rounded-xl p-6 hover:shadow-card-hover transition-all duration-300"
                        >
                          <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                            <div className="flex items-start gap-4 flex-1">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-body-sm">
                                {session?.student.name.charAt(0).toUpperCase() || "S"}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="text-body font-semibold text-foreground">
                                    {assignment.title}
                                  </h3>
                                  <Badge
                                    variant="outline"
                                    className={
                                      hasSubmission
                                        ? "bg-success/10 text-success border-success/20"
                                        : "bg-warning/10 text-warning border-warning/20"
                                    }
                                  >
                                    {hasSubmission ? "Submitted" : "Pending"}
                                  </Badge>
                                </div>
                                <p className="text-body-sm text-muted-foreground">
                                  {session?.student.name} • {session?.student.email}
                                </p>
                                {assignment.description && (
                                  <p className="text-body-sm text-foreground mt-2">
                                    {assignment.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-4 mt-3">
                                  <div className="flex items-center gap-1 text-body-sm text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                    Due: {formatISTDateTime(assignment.dueAt)}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewSubmissions(assignment)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* View Submissions Dialog */}
            <Dialog open={viewSubmissionsOpen} onOpenChange={setViewSubmissionsOpen}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{selectedAssignment?.title}</DialogTitle>
                  <DialogDescription>
                    View student submissions for this assignment
                  </DialogDescription>
                </DialogHeader>
                {selectedAssignment && (
                  <div className="space-y-4 py-4">
                    {selectedAssignment.description && (
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-body-sm text-foreground">{selectedAssignment.description}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-body-sm font-medium text-foreground mb-2">
                        Submissions ({selectedAssignment.submissions?.length || 0})
                      </p>
                      {selectedAssignment.submissions && selectedAssignment.submissions.length > 0 ? (
                        <div className="space-y-3">
                          {selectedAssignment.submissions.map((submission: any) => (
                            <div
                              key={submission.id}
                              className="p-4 border rounded-lg bg-card"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <p className="text-body-sm font-medium text-foreground">
                                    {submission.student?.name || "Student"}
                                  </p>
                                  <p className="text-caption text-muted-foreground">
                                    Submitted: {formatISTDateTime(submission.submittedAt)}
                                  </p>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={
                                    submission.status === "LATE"
                                      ? "bg-destructive/10 text-destructive border-destructive/20"
                                      : "bg-success/10 text-success border-success/20"
                                  }
                                >
                                  {submission.status}
                                </Badge>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(submission.fileUrl, "_blank")}
                                className="mt-2"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download File
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-body-sm text-muted-foreground">
                            No submissions yet
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>

        {/* Upload Resource Dialog */}
        <Dialog open={uploadResourceOpen} onOpenChange={setUploadResourceOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Upload PDF Resource</DialogTitle>
              <DialogDescription>
                Upload and manage PDF files for this session. Only PDF files are allowed (max 10MB).
              </DialogDescription>
            </DialogHeader>
            
            {/* (A) UPLOADED PDFs SECTION - TOP */}
            <div className="space-y-3 py-4 border-b">
              <h3 className="text-body font-semibold text-foreground">Uploaded PDFs</h3>
              {loadingResources ? (
                <div className="text-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-body-sm text-muted-foreground">Loading resources...</p>
                </div>
              ) : uploadedResources.length === 0 ? (
                <p className="text-body-sm text-muted-foreground py-2">No resources uploaded yet.</p>
              ) : (
                <div className="space-y-2">
                  {uploadedResources.map((resource) => (
                    <div key={resource.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-body-sm font-medium text-foreground truncate">{resource.fileName}</p>
                        <p className="text-caption text-muted-foreground">
                          Uploaded: {formatISTDate(resource.uploadedAt)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const fileUrl = resource.fileUrl.startsWith("http") 
                            ? resource.fileUrl 
                            : `${BASE_URL}${resource.fileUrl}`;
                          window.open(fileUrl, "_blank");
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* (B) UPLOAD SECTION - MIDDLE */}
            <div className="space-y-3 py-4 border-b">
              <h3 className="text-body font-semibold text-foreground">Upload New PDF</h3>
              <input
                type="file"
                ref={resourceFileInputRef}
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    const file = e.target.files[0];
                    // Validate file type (PDF only)
                    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
                      alert("Only PDF files are allowed");
                      e.target.value = "";
                      setSelectedFileName(null);
                      return;
                    }
                    // Validate file size (10MB)
                    if (file.size > 10 * 1024 * 1024) {
                      alert("File size too large. Maximum size: 10MB");
                      e.target.value = "";
                      setSelectedFileName(null);
                      return;
                    }
                    setSelectedFileName(file.name);
                  } else {
                    setSelectedFileName(null);
                  }
                }}
                accept="application/pdf"
                className="hidden"
                disabled={uploadingResource}
              />
              <Button
                variant="outline"
                onClick={() => resourceFileInputRef.current?.click()}
                disabled={uploadingResource}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Select PDF File
              </Button>
              {selectedFileName && (
                <p className="text-body-sm text-foreground p-2 bg-muted rounded">
                  Selected: <span className="font-medium">{selectedFileName}</span>
                </p>
              )}
            </div>

            {/* (C) ACTION SECTION - BOTTOM */}
            <div className="py-4">
              <Button
                onClick={() => {
                  if (resourceFileInputRef.current?.files?.[0]) {
                    handleResourceFileSelect();
                  } else {
                    alert("Please select a PDF file first");
                  }
                }}
                disabled={uploadingResource || !selectedFileName}
                className="w-full"
                size="lg"
              >
                {uploadingResource ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload / Share PDF
                  </>
                )}
              </Button>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setUploadResourceOpen(false);
                  setSelectedScheduleId(null);
                  setSelectedFileName(null);
                  setUploadedResources([]);
                  if (resourceFileInputRef.current) {
                    resourceFileInputRef.current.value = "";
                  }
                }}
                disabled={uploadingResource}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
