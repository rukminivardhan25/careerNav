import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Search,
  Eye,
  Trash2,
  Loader2,
  AlertCircle,
  Clock,
  Calendar,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Session {
  id: string;
  student: {
    id: string;
    name: string;
    email: string;
  };
  skill_name: string | null;
  sessionType?: string;
  scheduledAt?: string;
  completedAt?: string;
  requestedAt?: string;
  status?: string;
}

export default function Students() {
  const navigate = useNavigate();
  const [paymentPendingSessions, setPaymentPendingSessions] = useState<Session[]>([]);
  const [ongoingSessions, setOngoingSessions] = useState<Session[]>([]);
  const [completedSessions, setCompletedSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelSessionId, setCancelSessionId] = useState<string | null>(null);
  const [cancelSessionType, setCancelSessionType] = useState<"payment-pending" | "completed" | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchSessions();

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
          console.log("[Students] Midnight IST detected. Refreshing sessions...");
          fetchSessions();
        }
      };

      // Check every minute for midnight
      const midnightInterval = setInterval(checkMidnight, 60 * 1000);
      
      return () => clearInterval(midnightInterval);
    };

    // Polling: Refresh every 5 minutes to catch real-time updates
    const pollingInterval = setInterval(() => {
      fetchSessions();
    }, 5 * 60 * 1000); // 5 minutes

    // Setup midnight refresh
    const cleanupMidnight = setupMidnightRefresh();

    return () => {
      clearInterval(pollingInterval);
      cleanupMidnight();
    };
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("authToken");
      const apiUrl = API_BASE_URL;

      // Fetch all three types of sessions in parallel
      const [paymentPendingRes, ongoingRes, completedRes] = await Promise.all([
        fetch(`${apiUrl}/mentors/dashboard/payment-pending-sessions`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
        fetch(`${apiUrl}/mentors/dashboard/ongoing-sessions`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
        fetch(`${apiUrl}/mentors/dashboard/completed-sessions`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
      ]);

      if (paymentPendingRes?.ok) {
        const data = await paymentPendingRes.json();
        setPaymentPendingSessions(Array.isArray(data) ? data : []);
      } else {
        setPaymentPendingSessions([]);
      }

      if (ongoingRes?.ok) {
        const data = await ongoingRes.json();
        setOngoingSessions(Array.isArray(data) ? data : []);
      } else {
        setOngoingSessions([]);
      }

      if (completedRes?.ok) {
        const data = await completedRes.json();
        setCompletedSessions(Array.isArray(data) ? data : []);
      } else {
        setCompletedSessions([]);
      }
    } catch (err: any) {
      console.error("Error fetching sessions:", err);
      setError(err.message || "Failed to load sessions");
      toast.error("Failed to load sessions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSession = (sessionId: string, type: "payment-pending" | "completed") => {
    setCancelSessionId(sessionId);
    setCancelSessionType(type);
    setCancelDialogOpen(true);
  };

  const confirmCancelSession = async () => {
    if (!cancelSessionId) return;

    setCancelling(true);
    try {
      const token = localStorage.getItem("authToken");
      const apiUrl = API_BASE_URL;

      const response = await fetch(`${apiUrl}/mentors/sessions/${cancelSessionId}/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        toast.success(
          cancelSessionType === "payment-pending"
            ? "Session request cancelled"
            : "Completed session removed"
        );
        setCancelDialogOpen(false);
        setCancelSessionId(null);
        setCancelSessionType(null);
        fetchSessions(); // Refresh data
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to cancel session");
      }
    } catch (err: any) {
      console.error("Error cancelling session:", err);
      toast.error(err.message || "Failed to cancel session");
    } finally {
      setCancelling(false);
    }
  };

  // Filter sessions by search query
  const filterSessions = (sessions: Session[]) => {
    if (!searchQuery.trim()) return sessions;
    const query = searchQuery.toLowerCase();
    return sessions.filter(
      (session) =>
        session.student.name?.toLowerCase().includes(query) ||
        session.student.email?.toLowerCase().includes(query) ||
        session.skill_name?.toLowerCase().includes(query)
    );
  };

  // Generate avatar initials
  const getAvatarInitials = (name: string): string => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Format date and time
  const formatDateTime = (dateString: string | null | undefined): string => {
    if (!dateString) return "Date not available";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid date";
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch (e) {
      return "Invalid date";
    }
  };

  const filteredPaymentPending = filterSessions(paymentPendingSessions);
  const filteredOngoing = filterSessions(ongoingSessions);
  const filteredCompleted = filterSessions(completedSessions);

  return (
    <DashboardLayout role="mentor" title="Students">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-headline text-foreground">Your Students</h1>
            <p className="text-body text-muted-foreground mt-1">
              Manage your mentorship sessions
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="glass-card rounded-xl p-4 border-l-4 border-warning">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body-sm text-muted-foreground">Payment Pending</p>
                <p className="text-title text-foreground mt-1">
                  {paymentPendingSessions.length}
                </p>
              </div>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4 border-l-4 border-primary">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body-sm text-muted-foreground">Ongoing</p>
                <p className="text-title text-foreground mt-1">
                  {ongoingSessions.length}
                </p>
              </div>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4 border-l-4 border-success">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body-sm text-muted-foreground">Completed</p>
                <p className="text-title text-foreground mt-1">
                  {completedSessions.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="glass-card rounded-xl p-4">
          <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
              placeholder="Search by student name, email, or skill..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
          </div>
            </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-body text-foreground mb-2">{error}</p>
            <Button variant="outline" onClick={fetchSessions}>
              Retry
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Payment Pending Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-title text-foreground">Payment Pending</h2>
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                  {filteredPaymentPending.length}
                </Badge>
        </div>
              {filteredPaymentPending.length === 0 ? (
                <div className="glass-card rounded-xl p-8 text-center">
                  <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                        <p className="text-body-sm text-muted-foreground">
                    No payment pending sessions
                        </p>
                      </div>
                ) : (
                <div className="space-y-4">
                  {filteredPaymentPending.map((session) => (
                    <div
                      key={session.id}
                      className="glass-card rounded-xl p-6 hover:shadow-card-hover transition-all duration-300 border-l-4 border-warning"
                    >
                      <div className="overflow-x-auto">
                        <div className="flex items-center gap-6 min-w-max">
                        {/* Left: Student Info */}
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-warning to-warning/50 flex items-center justify-center text-white font-semibold text-body-sm">
                            {getAvatarInitials(session.student.name)}
                          </div>
                          <div>
                            <h3 className="text-body font-semibold text-foreground">
                              {session.student.name}
                            </h3>
                            <p className="text-caption text-muted-foreground">
                              {session.student.email}
                            </p>
                          </div>
                        </div>

                        {/* Middle: Skill & Date */}
                        <div className="flex items-center gap-6 flex-shrink-0">
                        <div>
                            <p className="text-body-sm text-muted-foreground mb-1">Skill</p>
                            <p className="text-body-sm font-medium text-foreground">
                              {session.skill_name || "Skill not available"}
                          </p>
                          </div>
                          {session.scheduledAt && (
                            <div>
                              <p className="text-body-sm text-muted-foreground mb-1">Session Date</p>
                              <div className="flex items-center gap-2 text-body-sm text-foreground">
                                <Calendar className="h-4 w-4" />
                                {formatDateTime(session.scheduledAt)}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right: Status & Actions */}
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <Badge
                            variant="outline"
                            className="bg-warning/10 text-warning border-warning/20"
                          >
                            Payment Pending
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelSession(session.id, "payment-pending")}
                            title="Cancel session"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ongoing Sessions Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-title text-foreground">Ongoing Sessions</h2>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  {filteredOngoing.length}
                </Badge>
              </div>
              {filteredOngoing.length === 0 ? (
                <div className="glass-card rounded-xl p-8 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-body-sm text-muted-foreground">
                    No ongoing sessions
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredOngoing.map((session) => (
                    <div
                      key={session.id}
                      className="glass-card rounded-xl p-6 hover:shadow-card-hover transition-all duration-300 border-l-4 border-primary"
                    >
                      <div className="overflow-x-auto">
                        <div className="flex items-center gap-6 min-w-max">
                        {/* Left: Student Info */}
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-body-sm">
                            {getAvatarInitials(session.student.name)}
                          </div>
                          <div>
                            <h3 className="text-body font-semibold text-foreground">
                              {session.student.name}
                            </h3>
                            <p className="text-caption text-muted-foreground">
                              {session.student.email}
                            </p>
                        </div>
                        </div>

                        {/* Middle: Skill & Schedule */}
                        <div className="flex items-center gap-6 flex-shrink-0">
                          <div>
                            <p className="text-body-sm text-muted-foreground mb-1">Skill</p>
                            <p className="text-body-sm font-medium text-foreground">
                              {session.skill_name || "Skill not available"}
                            </p>
                        </div>
                          {session.scheduledAt && (
                            <div>
                              <p className="text-body-sm text-muted-foreground mb-1">Session Schedule</p>
                              <div className="flex items-center gap-2 text-body-sm text-foreground">
                                <Calendar className="h-4 w-4" />
                                {formatDateTime(session.scheduledAt)}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/mentor/sessions/${session.id}`)}
                            title="View session details"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
        </div>

            {/* Completed Sessions Section */}
            <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-title text-foreground">Completed Sessions</h2>
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                  {filteredCompleted.length}
                </Badge>
              </div>
              {filteredCompleted.length === 0 ? (
                <div className="glass-card rounded-xl p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-body-sm text-muted-foreground">
                    No completed sessions
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredCompleted.map((session) => (
                    <div
                      key={session.id}
                      className="glass-card rounded-xl p-6 hover:shadow-card-hover transition-all duration-300 border-l-4 border-success/50"
                    >
                      <div className="overflow-x-auto">
                        <div className="flex items-center gap-6 min-w-max">
                        {/* Left: Student Info */}
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-success to-success/50 flex items-center justify-center text-white font-semibold text-body-sm">
                            {getAvatarInitials(session.student.name)}
                          </div>
                          <div>
                            <h3 className="text-body font-semibold text-foreground">
                              {session.student.name}
                            </h3>
                            <p className="text-caption text-muted-foreground">
                              {session.student.email}
                            </p>
            </div>
          </div>

                        {/* Middle: Skill & Completed Date */}
                        <div className="flex items-center gap-6 flex-shrink-0">
              <div>
                            <p className="text-body-sm text-muted-foreground mb-1">Skill</p>
                            <p className="text-body-sm font-medium text-foreground">
                              {session.skill_name || "Skill not available"}
                </p>
              </div>
                          {session.completedAt && (
                            <div>
                              <p className="text-body-sm text-muted-foreground mb-1">Completed Date</p>
                              <div className="flex items-center gap-2 text-body-sm text-foreground">
                                <CheckCircle className="h-4 w-4" />
                                {formatDateTime(session.completedAt)}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/mentor/sessions/${session.id}`)}
                            title="View session details (read-only)"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cancel Confirmation Dialog */}
        <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Session</AlertDialogTitle>
              <AlertDialogDescription>
                {cancelSessionType === "payment-pending"
                  ? "Cancel this pending session request?"
                  : "Remove this completed session from your list?"}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={cancelling}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmCancelSession}
                disabled={cancelling}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {cancelling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  "Confirm"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
