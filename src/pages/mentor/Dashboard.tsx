import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/cards/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Users,
  Calendar,
  ArrowRight,
  Clock,
  CheckCircle,
  Video,
  XCircle,
  Award,
  Loader2,
  Star,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { getCurrentUser, getAuthToken } from "@/lib/auth";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/api";
import { formatISTDateWithRelative, formatISTDate } from "@/utils/istTime";

// ============================================
// DATA NORMALIZATION UTILITIES (CRASH-PROOF)
// ============================================

/**
 * Normalizes API response to ensure it's an array
 * Handles: "not available", null, undefined, objects, strings
 */
const normalizeArray = (data: any, fallback: any[] = []): any[] => {
  // Handle string responses like "not available"
  if (typeof data === "string") {
    return fallback;
  }
  // Handle null/undefined
  if (data == null) {
    return fallback;
  }
  // Handle objects with data property (common API pattern)
  if (typeof data === "object" && !Array.isArray(data)) {
    if (Array.isArray(data.data)) {
      return data.data;
    }
    if (Array.isArray(data.sessions)) {
      return data.sessions;
    }
    if (Array.isArray(data.requests)) {
      return data.requests;
    }
    if (Array.isArray(data.courses)) {
      return data.courses;
    }
    return fallback;
  }
  // Handle actual arrays
  if (Array.isArray(data)) {
    return data;
  }
  // Fallback for any other type
  return fallback;
};

/**
 * Normalizes a value to a safe string for display
 * Handles: null, undefined, numbers, strings, objects
 */
const safeToString = (value: any, fallback: string = "0"): string => {
  if (value == null) {
    return fallback;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return value.toString();
  }
  if (typeof value === "object") {
    // If it's an object with a value property
    if (value.value != null) {
      return safeToString(value.value, fallback);
    }
    return fallback;
  }
  return fallback;
};

/**
 * Normalizes a number value
 */
const safeNumber = (value: any, fallback: number = 0): number => {
  if (value == null) {
    return fallback;
  }
  if (typeof value === "number") {
    return isNaN(value) ? fallback : value;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
};

/**
 * Normalizes stats object to ensure all fields are safe numbers
 */
const normalizeStats = (stats: any): {
  pendingRequests: number;
  todaySessions: number;
  verifiedCourses: number;
} => {
  if (!stats || typeof stats !== "object") {
    return {
      pendingRequests: 0,
      todaySessions: 0,
      verifiedCourses: 0,
    };
  }
  return {
    pendingRequests: safeNumber(stats.pendingRequests, 0),
    todaySessions: safeNumber(stats.todaySessions, 0),
    verifiedCourses: safeNumber(stats.verifiedCourses, 0),
  };
};

/**
 * Safely extracts nested property from object
 */
const safeGet = (obj: any, path: string, fallback: any = null): any => {
  if (!obj || typeof obj !== "object") {
    return fallback;
  }
  const keys = path.split(".");
  let current = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") {
      return fallback;
    }
    current = current[key];
  }
  return current ?? fallback;
};

// Mock data - will be replaced with API calls
// Students who have requested sessions with this mentor (course-specific)
const studentsRequestingSessions = [
  {
    id: 1,
    name: "Priya Sharma",
    avatar: "PS",
    email: "priya@example.com",
    course: "B.Tech CSE",
    courseId: 1,
    sessionRequest: {
      id: "sess_001",
      type: "Career Counseling",
      message: "I need guidance on transitioning to software engineering roles.",
      requestedAt: "2 hours ago",
      status: "PENDING", // PENDING, APPROVED, REJECTED
    },
  },
  {
    id: 2,
    name: "Rahul Kumar",
    avatar: "RK",
    email: "rahul@example.com",
    course: "B.Tech IT",
    courseId: 2,
    sessionRequest: {
      id: "sess_002",
      type: "Resume Review",
      message: "Please review my updated resume for data analyst positions.",
      requestedAt: "5 hours ago",
      status: "PENDING",
    },
  },
  {
    id: 3,
    name: "Ananya Patel",
    avatar: "AP",
    email: "ananya@example.com",
    course: "B.Tech ECE",
    courseId: 3,
    sessionRequest: {
      id: "sess_003",
      type: "Mock Interview",
      message: "I have an interview next week. Can we do a practice session?",
      requestedAt: "1 day ago",
      status: "APPROVED",
    },
  },
];

// Scheduled sessions (APPROVED, PAID, SCHEDULED status)
const scheduledSessions = [
  {
    id: "sess_003",
    student: {
      name: "Ananya Patel",
      avatar: "AP",
      email: "ananya@example.com",
    },
    course: "B.Tech ECE",
    type: "Mock Interview",
    scheduledAt: "2025-01-20T15:00:00Z",
    status: "SCHEDULED",
    zoomLink: null,
  },
  {
    id: "sess_004",
    student: {
      name: "Sneha Reddy",
      avatar: "SR",
      email: "sneha@example.com",
    },
    course: "B.Tech CSE",
    type: "Career Counseling",
    scheduledAt: "2025-01-21T10:00:00Z",
    status: "SCHEDULED",
    zoomLink: "https://zoom.us/j/123456789",
  },
  {
    id: "sess_005",
    student: {
      name: "Vikram Singh",
      avatar: "VS",
      email: "vikram@example.com",
    },
    course: "BCA",
    type: "Resume Review",
    scheduledAt: "2025-01-22T14:00:00Z",
    status: "PAID",
    zoomLink: null,
  },
];

export default function MentorDashboard() {
  const [mentorName, setMentorName] = useState("Mentor");
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [scheduledSessions, setScheduledSessions] = useState<any[]>([]);
  const [stats, setStats] = useState({
    pendingRequests: 0,
    todaySessions: 0,
    verifiedCourses: 0,
  });
  const [verifiedCourses, setVerifiedCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // Rating modal state
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  useEffect(() => {
    // Get mentor name from auth
    const user = getCurrentUser();
    if (user?.name) {
      setMentorName(user.name);
    }

    // Initial fetch
    fetchDashboardData();

    // Auto-refresh at 12:00 AM IST daily
    const setupMidnightRefresh = () => {
      const checkMidnight = () => {
        const now = new Date();
        
        // Get IST time using Intl.DateTimeFormat
        const istFormatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Kolkata",
          hour: "numeric",
          minute: "numeric",
          hour12: false,
        });
        
        const istTimeString = istFormatter.format(now);
        const [istHours, istMinutes] = istTimeString.split(":").map(Number);
        
        // Check if it's 12:00 AM IST
        if (istHours === 0 && istMinutes === 0) {
          console.log("[MentorDashboard] Midnight IST detected. Refreshing dashboard...");
          fetchDashboardData();
        }
      };

      // Check every minute for midnight
      const midnightInterval = setInterval(checkMidnight, 60 * 1000);
      
      return () => clearInterval(midnightInterval);
    };

    // Polling: Refresh every 5 minutes to catch real-time updates
    const pollingInterval = setInterval(() => {
      fetchDashboardData();
    }, 5 * 60 * 1000); // 5 minutes

    // Setup midnight refresh
    const cleanupMidnight = setupMidnightRefresh();

    return () => {
      clearInterval(pollingInterval);
      cleanupMidnight();
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("authToken") || localStorage.getItem("accessToken");
      if (!token) {
        setLoading(false);
        return;
      }

      const apiUrl = API_BASE_URL;

      // Fetch all data in parallel with error handling
      const [statsRes, pendingRes, scheduledRes, coursesRes] = await Promise.all([
        fetch(`${apiUrl}/mentors/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
        fetch(`${apiUrl}/mentors/dashboard/pending-requests`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
        fetch(`${apiUrl}/mentors/dashboard/scheduled-sessions`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
        fetch(`${apiUrl}/mentors/profile/verified-courses`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
      ]);

      // Normalize stats data
      if (statsRes?.ok) {
        try {
          const statsData = await statsRes.json();
          // API returns { stats: {...} }, extract the stats object
          setStats(normalizeStats(statsData.stats || statsData));
        } catch (e) {
          console.error("Error parsing stats:", e);
          setStats(normalizeStats(null));
        }
      } else if (statsRes?.status === 403) {
        // Handle 403 gracefully - don't crash, just use defaults
        console.warn("403 Forbidden for stats endpoint - using defaults");
        setStats(normalizeStats(null));
      } else {
        setStats(normalizeStats(null));
      }

      // Normalize pending requests data
      if (pendingRes?.ok) {
        try {
          const pendingData = await pendingRes.json();
          // API returns { requests: [...] }, extract the requests array
          setPendingRequests(normalizeArray(pendingData.requests || pendingData, []));
        } catch (e) {
          console.error("Error parsing pending requests:", e);
          setPendingRequests([]);
        }
      } else if (pendingRes?.status === 403) {
        console.warn("403 Forbidden for pending requests - using empty array");
        setPendingRequests([]);
      } else {
        setPendingRequests([]);
      }

      // Normalize scheduled sessions data
      if (scheduledRes?.ok) {
        try {
          const scheduledData = await scheduledRes.json();
          // API returns { sessions: [...] }, extract the sessions array
          setScheduledSessions(normalizeArray(scheduledData.sessions || scheduledData, []));
        } catch (e) {
          console.error("Error parsing scheduled sessions:", e);
          setScheduledSessions([]);
        }
      } else if (scheduledRes?.status === 403) {
        console.warn("403 Forbidden for scheduled sessions - using empty array");
        setScheduledSessions([]);
      } else {
        setScheduledSessions([]);
      }

      // Normalize verified courses data
      if (coursesRes?.ok) {
        try {
          const coursesData = await coursesRes.json();
          // API returns { courses: [...] }, extract the courses array
          setVerifiedCourses(normalizeArray(coursesData.courses || coursesData, []));
        } catch (e) {
          console.error("Error parsing verified courses:", e);
          setVerifiedCourses([]);
        }
      } else if (coursesRes?.status === 403) {
        console.warn("403 Forbidden for verified courses - using empty array");
        setVerifiedCourses([]);
      } else {
        setVerifiedCourses([]);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      // Set safe defaults on any error
      setStats(normalizeStats(null));
      setPendingRequests([]);
      setScheduledSessions([]);
      setVerifiedCourses([]);
    } finally {
      setLoading(false);
    }
  };

  // Safely filter today's sessions with defensive checks
  const todaySessions = normalizeArray(scheduledSessions, []).filter((session) => {
    if (!session || typeof session !== "object") {
      return false;
    }
    const scheduledAt = session.scheduledAt || session.scheduled_at;
    if (!scheduledAt) {
      return false;
    }
    try {
      const sessionDate = new Date(scheduledAt);
      const today = new Date();
      if (isNaN(sessionDate.getTime())) {
        return false;
      }
      const status = session.status || "";
      return (
        sessionDate.toDateString() === today.toDateString() &&
        (status === "SCHEDULED" || status === "PAID")
      );
    } catch (e) {
      return false;
    }
  });

  const formatSessionTime = (dateString: string | null | undefined): string => {
    if (!dateString) {
      return "Date not available";
    }
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const sessionDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );

      // Use IST formatting
      return formatISTDateWithRelative(dateString);
    } catch (e) {
      return "Date error";
    }
  };

  const handleApproveSession = async (sessionId: string) => {
    try {
      const token = localStorage.getItem("authToken") || localStorage.getItem("accessToken");
      if (!token) return;

      const apiUrl = API_BASE_URL;
      const response = await fetch(`${apiUrl}/mentors/sessions/${sessionId}/approve`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        toast.success("Session request approved");
        // Refresh data
        fetchDashboardData();
      } else {
        toast.error("Failed to approve session");
      }
    } catch (error) {
      console.error("Error approving session:", error);
      toast.error("Failed to approve session");
    }
  };

  const handleRejectSession = async (sessionId: string, reason?: string) => {
    try {
      const token = localStorage.getItem("authToken") || localStorage.getItem("accessToken");
      if (!token) return;

      const apiUrl = API_BASE_URL;
      const response = await fetch(`${apiUrl}/mentors/sessions/${sessionId}/reject`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      });

      if (response.ok) {
        toast.success("Session request rejected");
        // Refresh data
        fetchDashboardData();
      } else {
        toast.error("Failed to reject session");
      }
    } catch (error) {
      console.error("Error rejecting session:", error);
      toast.error("Failed to reject session");
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="mentor" title="Dashboard">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-body text-muted-foreground">Loading dashboard...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="mentor" title="Dashboard">
      <div className="space-y-4 sm:space-y-6 lg:space-y-8 w-full max-w-full box-border">
        {/* Welcome section */}
        <div className="glass-card rounded-xl p-4 sm:p-6 lg:p-8 relative overflow-hidden w-full max-w-full box-border">
          <div className="absolute inset-0 bg-gradient-to-r from-secondary/5 to-primary/5" />
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-headline text-foreground mb-2 break-words">
                Good afternoon, {mentorName}! 👋
              </h1>
              <p className="text-sm sm:text-body text-muted-foreground break-words">
                You have{" "}
                <span className="text-primary font-semibold">
                  {normalizeArray(pendingRequests, []).length} session request{normalizeArray(pendingRequests, []).length !== 1 ? "s" : ""}
                </span>{" "}
                and{" "}
                <span className="text-accent font-semibold">
                  {safeNumber(stats.todaySessions, 0)} session{safeNumber(stats.todaySessions, 0) !== 1 ? "s" : ""} left today
                </span>
                .
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate("/mentor/students")}>
                View All Students
              </Button>
              <Button variant="gradient" className="w-full sm:w-auto" onClick={() => navigate("/mentor/reviews")}>
                View Reviews
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 w-full max-w-full box-border">
          <StatCard
            title="Pending Requests"
            value={safeToString(stats.pendingRequests, "0")}
            icon={<Users className="h-5 w-5" />}
            changeLabel="awaiting approval"
          />
          <StatCard
            title="Today Sessions Left"
            value={safeToString(stats.todaySessions, "0")}
            icon={<Clock className="h-5 w-5" />}
            changeLabel="scheduled today"
          />
          <StatCard
            title="Verified Courses"
            value={safeToString(stats.verifiedCourses, "0")}
            icon={<CheckCircle className="h-5 w-5" />}
            changeLabel="courses verified"
          />
        </div>

        {/* Verified Courses Section */}
        <div className="glass-card rounded-xl p-4 sm:p-6 w-full max-w-full">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <Award className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <h2 className="text-base sm:text-title text-foreground break-words">Your Verified Courses</h2>
                <p className="text-xs sm:text-body-sm text-muted-foreground break-words">
                  Courses you can mentor students in
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => navigate("/mentor/skill-test")}>
              Verify New Course
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {normalizeArray(verifiedCourses, []).length === 0 ? (
              <div className="col-span-full text-center py-8">
                <p className="text-body text-muted-foreground">
                  No verified courses yet. Take a skill test to get verified!
                </p>
              </div>
            ) : (
              normalizeArray(verifiedCourses, []).map((course, index) => {
                const courseId = course?.id || course?.course_id || `course-${index}`;
                // Backend returns { skill: "JavaScript", score: 85, verifiedAt: ... }
                const courseName = safeGet(course, "skill") || safeGet(course, "courseName") || safeGet(course, "course_name") || safeGet(course, "title") || "Unknown Skill";
                const score = safeNumber(safeGet(course, "score") || safeGet(course, "verification_score"), 0);
                return (
                  <div
                    key={courseId}
                    className="p-4 border border-success/20 bg-success/5 rounded-lg"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="text-body font-medium text-foreground">{courseName}</span>
                    </div>
                    <p className="text-caption text-muted-foreground">
                      Score: {score}% • Verified
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 w-full max-w-full box-border">
          {/* Students Requesting Sessions */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-4 w-full max-w-full box-border min-w-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
              <h2 className="text-base sm:text-title text-foreground break-words">
                Students Requesting Sessions
              </h2>
              <Badge variant="outline" className="flex-shrink-0">
                {normalizeArray(pendingRequests, []).length} Pending
              </Badge>
            </div>

            {normalizeArray(pendingRequests, []).length === 0 ? (
              <div className="glass-card rounded-xl p-12 text-center w-full max-w-full box-border">
                <Users className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-body text-foreground">No session requests</p>
                <p className="text-body-sm text-muted-foreground mt-2">
                  Students who request sessions for your courses will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 w-full max-w-full box-border">
                {normalizeArray(pendingRequests, []).map((request, index) => {
                  const requestId = request?.id || `request-${index}`;
                  const student = request?.student || {};
                  const studentName = safeGet(student, "name") || "Unknown Student";
                  const studentEmail = safeGet(student, "email") || "No email";
                  // Use skill_name from sessions table (snapshot saved at connection time) - it's at the top level of the request object
                  const courseName = safeGet(request, "skill_name") || safeGet(request, "skillName") || safeGet(request, "courseName") || "Unknown Course";
                  
                  // Safely generate initials
                  let initials = "??";
                  try {
                    if (studentName && typeof studentName === "string") {
                      initials = studentName
                        .split(" ")
                        .map((n: string) => n?.[0] || "")
                        .join("")
                        .toUpperCase()
                        .substring(0, 2) || "??";
                    }
                  } catch (e) {
                    initials = "??";
                  }
                  
                  // Safely format date
                  const requestedAt = request?.requestedAt || request?.requested_at || request?.created_at;
                  let dateString = "Date not available";
                  try {
                    if (requestedAt) {
                      dateString = formatISTDate(requestedAt);
                    }
                  } catch (e) {
                    dateString = "Invalid date";
                  }
                  
                  return (
                    <div
                      key={requestId}
                      className="glass-card rounded-xl p-4 sm:p-6 hover:shadow-card-hover transition-all duration-300 w-full max-w-full"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start gap-3 sm:gap-4">
                        {/* Student Info */}
                        <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-xs sm:text-body-sm flex-shrink-0">
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                              <h3 className="text-sm sm:text-body font-semibold text-foreground break-words">
                                {studentName}
                              </h3>
                              <Badge
                                variant="outline"
                                className="bg-warning/10 text-warning border-warning/20 flex-shrink-0 w-fit"
                              >
                                PENDING
                              </Badge>
                            </div>
                            <p className="text-xs sm:text-body-sm text-muted-foreground mb-2 break-words truncate">
                              {studentEmail}
                            </p>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-body-sm text-muted-foreground">
                              <span className="font-medium text-foreground break-words">
                                Course: {courseName}
                              </span>
                              <span className="flex items-center gap-1 flex-shrink-0">
                                <Clock className="h-3 w-3" />
                                {dateString}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full sm:w-auto"
                            onClick={() => handleRejectSession(requestId)}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                          <Button
                            variant="gradient"
                            size="sm"
                            className="w-full sm:w-auto"
                            onClick={() => handleApproveSession(requestId)}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                        </div>
                      </div>

                      {/* Session Request Details */}
                      <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                          <span className="text-xs sm:text-body-sm font-medium text-foreground break-words">
                            {safeGet(request, "sessionType") || safeGet(request, "session_type") || "Session"}
                          </span>
                        </div>
                        <p className="text-xs sm:text-body-sm text-foreground break-words">
                          {safeGet(request, "studentMessage") || safeGet(request, "student_message") || "No message provided"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right sidebar - Scheduled Sessions */}
          <div className="space-y-4 sm:space-y-6 w-full max-w-full box-border min-w-0">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base sm:text-title text-foreground break-words">Scheduled Sessions</h2>
                <Badge variant="outline" className="flex-shrink-0">
                  {normalizeArray(scheduledSessions, []).length}
                </Badge>
              </div>
              {normalizeArray(scheduledSessions, []).length === 0 ? (
                <div className="glass-card rounded-xl p-8 text-center w-full max-w-full box-border">
                  <Calendar className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-body-sm text-muted-foreground">
                    No scheduled sessions
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 w-full max-w-full box-border">
                  {normalizeArray(scheduledSessions, []).map((session, index) => {
                    const sessionId = session?.id || `session-${index}`;
                    const student = session?.student || {};
                    const studentName = safeGet(student, "name") || "Unknown Student";
                    
                    // Safely generate initials
                    let initials = "??";
                    try {
                      if (studentName && typeof studentName === "string") {
                        initials = studentName
                          .split(" ")
                          .map((n: string) => n?.[0] || "")
                          .join("")
                          .toUpperCase()
                          .substring(0, 2) || "??";
                      }
                    } catch (e) {
                      initials = "??";
                    }
                    
                    // Use skill_name from sessions table (snapshot saved at connection time)
                    const courseName = safeGet(session, "skill_name") || safeGet(session, "skillName") || safeGet(session, "course.name") || safeGet(session, "course.title") || safeGet(session, "course_name") || "Unknown Course";
                    const sessionType = safeGet(session, "sessionType") || safeGet(session, "session_type") || "Session";
                    const scheduledAt = safeGet(session, "scheduledAt") || safeGet(session, "scheduled_at");
                    const status = safeGet(session, "status") || "UNKNOWN";
                    const zoomLink = safeGet(session, "zoomLink") || safeGet(session, "zoom_link");
                    
                    return (
                      <div
                        key={sessionId}
                        className="glass-card p-3 sm:p-4 rounded-xl hover:shadow-card-hover transition-all duration-300 border-l-4 border-primary w-full max-w-full"
                      >
                        <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-xs sm:text-body-sm flex-shrink-0">
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm sm:text-body font-medium text-foreground break-words">
                              {studentName}
                            </p>
                            <p className="text-xs sm:text-caption text-muted-foreground break-words truncate">
                              {courseName}
                            </p>
                          </div>
                        </div>
                        <div className="mb-2 sm:mb-3">
                          <p className="text-xs sm:text-body-sm font-medium text-foreground mb-1 break-words">
                            {sessionType}
                          </p>
                          <div className="flex items-center gap-2 text-xs sm:text-caption text-muted-foreground">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            <span className="break-words">{formatSessionTime(scheduledAt)}</span>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <Badge
                            variant="outline"
                            className={
                              status === "SCHEDULED"
                                ? "bg-success/10 text-success border-success/20 flex-shrink-0 w-fit"
                                : "bg-primary/10 text-primary border-primary/20 flex-shrink-0 w-fit"
                            }
                          >
                            {status}
                          </Badge>
                          {zoomLink && (
                            <Button variant="outline" size="sm" className="flex-1 sm:flex-1">
                              <Video className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                              Join Zoom
                            </Button>
                          )}
                          {!zoomLink && status === "SCHEDULED" && (
                            <Button variant="ghost" size="sm" className="flex-1 sm:flex-1">
                              Add Zoom Link
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Support Link & Rate CareerNav */}
        <div className="text-center space-y-2 px-2">
          <Link
            to="/support"
            className="text-xs sm:text-body-sm text-primary hover:underline inline-flex items-center gap-1 break-words"
          >
            Need Help? We're here to support you.
          </Link>
          <div>
            <button
              onClick={() => setIsRatingModalOpen(true)}
              className="text-xs sm:text-body-sm text-primary hover:underline inline-flex items-center gap-1 break-words"
            >
              <Star className="h-3 w-3 sm:h-4 sm:w-4" />
              Rate CareerNav
            </button>
          </div>
        </div>

        {/* Rating Modal */}
        <Dialog open={isRatingModalOpen} onOpenChange={setIsRatingModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rate CareerNav</DialogTitle>
              <DialogDescription>
                Your feedback helps us improve CareerNav for everyone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Star Rating */}
              <div>
                <label className="text-body-sm font-medium text-foreground mb-2 block">
                  Rating <span className="text-destructive">*</span>
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="focus:outline-none transition-transform hover:scale-110"
                      aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                    >
                      <Star
                        className={`h-8 w-8 ${
                          rating && star <= rating
                            ? "fill-warning text-warning"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="text-body-sm font-medium text-foreground mb-2 block">
                  Comment (Optional)
                </label>
                <Textarea
                  placeholder="Tell us what you liked or what we can improve..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={500}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-caption text-muted-foreground mt-1">
                  {comment.length}/500 characters
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsRatingModalOpen(false);
                  setRating(null);
                  setComment("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!rating) {
                    toast.error("Please select a rating");
                    return;
                  }

                  setIsSubmittingRating(true);
                  try {
                    const token = getAuthToken();
                    if (!token) {
                      toast.error("Authentication required");
                      setIsSubmittingRating(false);
                      return;
                    }
                    const response = await fetch(
                      `${API_BASE_URL}/ratings/careernav`,
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                          rating,
                          comment: comment.trim() || null,
                        }),
                      }
                    );

                    if (response.ok) {
                      toast.success("Thanks for rating CareerNav!");
                      setIsRatingModalOpen(false);
                      setRating(null);
                      setComment("");
                    } else {
                      const error = await response.json();
                      toast.error(error.error || "Failed to submit rating");
                    }
                  } catch (error) {
                    console.error("Error submitting rating:", error);
                    toast.error("Failed to submit rating. Please try again.");
                  } finally {
                    setIsSubmittingRating(false);
                  }
                }}
                disabled={!rating || isSubmittingRating}
              >
                {isSubmittingRating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
