import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar, Loader2, AlertCircle, CreditCard, Eye, Trash2, X, Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TodayScheduleItem {
  id: number;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  topic_title: string;
  week_number: number;
  session_number: number;
  scheduledDateTime: string;
  endTime: string;
  isCompleted: boolean;
}

interface Session {
  sessionId: string;
  mentorId: string | null;
  mentorName: string;
  skillName: string;
  planId: number | null;
  planName: string | null;
  planPrice: number | null;
  planDuration: number | null;
  status: string; // DB status: "PENDING", "APPROVED", "PAID", "SCHEDULED", "COMPLETED"
  lastUpdated: string | null;
  scheduledAt: string | null;
  hasPayment: boolean;
  // NEW: Day-based schedule items for today
  todayScheduleItems?: TodayScheduleItem[];
}

interface GroupedSessions {
  pendingApproval: Session[];
  pendingPayment: Session[];
  ongoing: Session[];
  completed: Session[];
}

interface DashboardSummary {
  ongoingSkills: Array<{
    mentorName: string;
    skillName: string;
    startDate: string | null;
    endDate: string | null;
    startTime: string | null;
    endTime: string | null;
    sessionsPerWeek: number | null;
  }>;
  completedSkills: Array<{
    mentorName: string;
    skillName: string;
    startDate: string | null;
    endDate: string | null;
    startTime: string | null;
    endTime: string | null;
    sessionsPerWeek: number | null;
  }>;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "PENDING":
      return { label: "Waiting for mentor approval", color: "bg-destructive/10 text-destructive border-destructive/20" };
    case "APPROVED":
      return { label: "Payment Pending", color: "bg-warning/10 text-warning border-warning/20" };
    case "PAID":
    case "SCHEDULED":
      return { label: "Ongoing", color: "bg-success/10 text-success border-success/20" };
    case "COMPLETED":
      return { label: "Completed", color: "bg-primary/10 text-primary border-primary/20" };
    default:
      return { label: status, color: "bg-muted/10 text-muted-foreground border-muted/20" };
  }
};

const getMentorInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
};

export default function SessionsList() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<GroupedSessions>({
    pendingApproval: [],
    pendingPayment: [],
    ongoing: [],
    completed: [],
  });
  const [summary, setSummary] = useState<DashboardSummary>({
    ongoingSkills: [],
    completedSkills: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);
  const [cancellingSession, setCancellingSession] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [sessionToPay, setSessionToPay] = useState<{ sessionId: string; planPrice: number | null; planName: string | null } | null>(null);
  const [selectedUPI, setSelectedUPI] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
    fetchSummary();
    // Auto-refresh every 30 seconds to get updated statuses
    const interval = setInterval(() => {
      fetchSessions();
      fetchSummary();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSummary = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const apiUrl = API_BASE_URL;
      const response = await fetch(`${apiUrl}/students/dashboard/summary`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Sort by start time (increasing order)
        const sortByStartTime = (courses: any[]) => {
          return [...courses].sort((a, b) => {
            // First try to sort by startTime
            if (a.startTime && b.startTime) {
              return a.startTime.localeCompare(b.startTime);
            }
            // Fallback to startDate if startTime not available
            if (a.startDate && b.startDate) {
              return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
            }
            return 0;
          });
        };
        
        setSummary({
          ongoingSkills: sortByStartTime(data.ongoingSkills || []),
          completedSkills: sortByStartTime(data.completedSkills || []),
        });
      }
    } catch (err: any) {
      console.error("Error fetching dashboard summary:", err);
    }
  };

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const apiUrl = API_BASE_URL;
      const response = await fetch(`${apiUrl}/students/sessions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch sessions");
      }

      const data = await response.json();
      setSessions({
        pendingApproval: data.pendingApproval || [],
        pendingPayment: data.pendingPayment || [],
        ongoing: data.ongoing || [],
        completed: data.completed || [],
      });
    } catch (err: any) {
      console.error("Error fetching sessions:", err);
      setError(err.message || "Failed to load sessions");
      toast.error("Failed to load sessions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompletePaymentClick = (session: Session, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessionToPay({
      sessionId: session.sessionId,
      planPrice: session.planPrice,
      planName: session.planName,
    });
    setSelectedUPI(null); // Reset UPI selection
    setPaymentModalOpen(true);
  };

  const handleCompletePayment = async () => {
    if (!sessionToPay || !selectedUPI) {
      toast.error("Please select a UPI payment method");
      return;
    }

    setProcessingPayment(sessionToPay.sessionId);

    try {
      // Simulate payment processing delay (1-2 seconds)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const apiUrl = API_BASE_URL;
      const response = await fetch(`${apiUrl}/sessions/${sessionToPay.sessionId}/mock-payment`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentMethod: selectedUPI, // Send selected UPI method
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || "Payment failed");
      }

      toast.success("Payment Successful!");
      setPaymentModalOpen(false);
      setSessionToPay(null);
      setSelectedUPI(null);
      await fetchSessions();
    } catch (err: any) {
      console.error("Error processing payment:", err);
      toast.error(err.message || "Failed to process payment");
    } finally {
      setProcessingPayment(null);
    }
  };

  const handleCancelSession = async (sessionId: string) => {
    setCancellingSession(sessionId);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const apiUrl = API_BASE_URL;
      const response = await fetch(`${apiUrl}/sessions/${sessionId}/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to cancel session");
      }

      toast.success("Session cancelled successfully");
      await fetchSessions();
      setDeleteConfirmOpen(false);
      setSessionToDelete(null);
    } catch (err: any) {
      console.error("Error cancelling session:", err);
      toast.error(err.message || "Failed to cancel session");
    } finally {
      setCancellingSession(null);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    setCancellingSession(sessionId);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const apiUrl = API_BASE_URL;
      const response = await fetch(`${apiUrl}/sessions/${sessionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete session");
      }

      toast.success("Session deleted successfully");
      await fetchSessions();
      setDeleteConfirmOpen(false);
      setSessionToDelete(null);
    } catch (err: any) {
      console.error("Error deleting session:", err);
      toast.error(err.message || "Failed to delete session");
    } finally {
      setCancellingSession(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    } catch {
      return "Invalid date";
    }
  };

  const handleOpenSession = (sessionId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    navigate(`/student/sessions/${sessionId}`);
  };

  const renderSessionCard = (session: Session, showCancel: boolean, showPayment: boolean, showOpen: boolean, showDelete: boolean) => {
    const statusBadge = getStatusBadge(session.status);
    const mentorInitials = getMentorInitials(session.mentorName);
    const isOngoing = showOpen && !showPayment; // Ongoing sessions should not show payment info

  return (
              <Card
        key={session.sessionId}
        className="glass-card rounded-xl hover:shadow-md transition-all"
              >
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-semibold">
                {mentorInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-body-lg font-semibold text-foreground mb-1">
                        {session.mentorName}
                      </CardTitle>
                      <CardDescription className="text-caption text-muted-foreground line-clamp-1">
                {session.skillName} Mentor
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
            <p className="text-body-sm font-medium text-foreground mb-1">Skill:</p>
            <p className="text-body-sm text-muted-foreground">{session.skillName}</p>
                  </div>

          {/* DAY-BASED: Show today's schedule items if available */}
          {session.todayScheduleItems && session.todayScheduleItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-body-sm font-medium text-foreground mb-1">Today's Session:</p>
              {session.todayScheduleItems.map((item, idx) => (
                <div key={item.id || idx} className="p-2 bg-muted/30 rounded-lg">
                  <p className="text-body-sm font-medium text-foreground">{item.topic_title}</p>
                  <p className="text-caption text-muted-foreground">
                    {new Date(item.scheduledDateTime).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })} - {new Date(item.endTime).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Plan info - show only for pending/payment pending, NOT for ongoing */}
          {session.planName && !isOngoing && (
            <div>
              <p className="text-body-sm font-medium text-foreground mb-1">Plan:</p>
              <p className="text-body-sm text-muted-foreground">{session.planName}</p>
              {session.planPrice && (
                <p className="text-body-sm text-muted-foreground">₹{session.planPrice.toLocaleString()}</p>
              )}
              {session.planDuration && (
                <p className="text-body-sm text-muted-foreground">{session.planDuration} weeks</p>
              )}
            </div>
          )}

          {/* For ongoing sessions, show only plan name (optional) without price/duration */}
          {session.planName && isOngoing && (
            <div>
              <p className="text-body-sm font-medium text-foreground mb-1">Plan:</p>
              <p className="text-body-sm text-muted-foreground">{session.planName}</p>
            </div>
          )}

                  <div className="flex items-center justify-between">
            {/* Hide badge for completed and ongoing sessions since sections are already labeled */}
            {session.status !== "COMPLETED" && session.status !== "PAID" && session.status !== "SCHEDULED" && (
              <Badge variant="outline" className={cn("text-caption", statusBadge.color)}>
                {statusBadge.label}
              </Badge>
            )}
                    <span className="text-caption text-muted-foreground">
              {/* DAY-BASED: Show schedule item time if available, otherwise fallback */}
              {session.todayScheduleItems && session.todayScheduleItems.length > 0
                ? formatDate(session.todayScheduleItems[0].scheduledDateTime)
                : session.scheduledAt 
                  ? formatDate(session.scheduledAt) 
                  : session.lastUpdated 
                    ? formatDate(session.lastUpdated) 
                    : "N/A"}
                    </span>
                  </div>

          <div className="flex gap-2">
            {showPayment && (
              <Button
                className="flex-1"
                onClick={(e) => handleCompletePaymentClick(session, e)}
                disabled={processingPayment === session.sessionId}
              >
                {processingPayment === session.sessionId ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Complete Payment
                  </>
                )}
              </Button>
            )}

            {showOpen && (
              <Button
                className="flex-1"
                onClick={(e) => handleOpenSession(session.sessionId, e)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Open Session
              </Button>
            )}

            {showCancel && (
              <Button
                variant="outline"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setSessionToDelete(session.sessionId);
                  setDeleteConfirmOpen(true);
                }}
                disabled={cancellingSession === session.sessionId}
              >
                {cancellingSession === session.sessionId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </Button>
            )}

            {showDelete && (
                  <Button
                variant="outline"
                size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                  setSessionToDelete(session.sessionId);
                  setDeleteConfirmOpen(true);
                    }}
                disabled={cancellingSession === session.sessionId}
              >
                {cancellingSession === session.sessionId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                  </Button>
            )}
          </div>
                </CardContent>
              </Card>
    );
  };

  if (loading) {
    return (
      <DashboardLayout role="student" title="My Mentorship Sessions">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout role="student" title="My Mentorship Sessions">
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-body text-foreground mb-2">{error}</p>
          <Button variant="outline" onClick={fetchSessions}>
            Retry
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const totalSessions = sessions.pendingApproval.length + sessions.pendingPayment.length + sessions.ongoing.length + sessions.completed.length;

  return (
    <DashboardLayout role="student" title="My Mentorship Sessions">
      <div className="space-y-6">
        {totalSessions === 0 ? (
          <Card className="glass-card rounded-xl p-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-body text-muted-foreground">
              You don't have any active mentorship sessions yet.
            </p>
          </Card>
        ) : (
          <>
            {/* Pending Approval Section */}
            {sessions.pendingApproval.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-title font-semibold text-foreground">Pending Sessions</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sessions.pendingApproval.map((session) =>
                    renderSessionCard(session, true, false, false, false)
                  )}
                </div>
              </div>
            )}

            {/* Pending Payment Section */}
            {sessions.pendingPayment.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-title font-semibold text-foreground">Payment Pending</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sessions.pendingPayment.map((session) =>
                    renderSessionCard(session, true, true, false, false)
                  )}
                </div>
              </div>
            )}

            {/* Ongoing Sessions Section */}
            {sessions.ongoing.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-title font-semibold text-foreground">Ongoing Sessions</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sessions.ongoing.map((session) =>
                    renderSessionCard(session, false, false, true, false)
                  )}
                </div>
              </div>
            )}

            {/* Completed Sessions Section */}
            {sessions.completed.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-title font-semibold text-foreground">Completed Sessions</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sessions.completed.map((session) =>
                    renderSessionCard(session, false, false, true, false)
                  )}
                </div>
          </div>
            )}
          </>
        )}

        {/* Header Section - Just above summary cards */}
        <div className="mb-6 mt-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">My Mentorship Sessions</h1>
          <p className="text-body-sm text-muted-foreground">
            Manage your active and completed mentorship sessions
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Card 1: Ongoing Learning */}
          <Card className="glass-card rounded-xl border-l-4 border-success">
            <CardHeader>
              <CardTitle className="text-title font-semibold text-foreground flex items-center gap-2">
                <Calendar className="h-5 w-5 text-success" />
                Ongoing Learning
              </CardTitle>
              <CardDescription>
                Active courses in progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              {summary.ongoingSkills.length === 0 ? (
                <p className="text-body-sm text-muted-foreground">No ongoing courses</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {summary.ongoingSkills.map((course, idx) => {
                    // Format time to remove seconds (HH:mm instead of HH:mm:ss)
                    const formatTime = (time: string | null) => {
                      if (!time) return null;
                      return time.substring(0, 5); // Take only HH:mm
                    };

                    return (
                      <div key={idx} className="p-3 bg-success/5 rounded-lg flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-body-sm font-medium text-foreground">{course.mentorName}</p>
                          <p className="text-caption text-muted-foreground">{course.skillName}</p>
                          <Badge variant="outline" className="mt-2 bg-success/10 text-success border-success/20">
                            Ongoing
                          </Badge>
                        </div>
                        <div className="text-right space-y-1.5 min-w-[180px]">
                          {course.startDate && course.endDate && (
                            <div className="text-caption text-muted-foreground flex items-center gap-1 justify-end">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {new Date(course.startDate).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })} - {new Date(course.endDate).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                          )}
                          {course.startTime && course.endTime && (
                            <div className="text-caption text-muted-foreground flex items-center gap-1 justify-end">
                              <Clock className="h-3 w-3" />
                              <span>{formatTime(course.startTime)} - {formatTime(course.endTime)}</span>
                            </div>
                          )}
                          {course.sessionsPerWeek && (
                            <div className="text-caption text-muted-foreground">
                              {course.sessionsPerWeek} sessions/week
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

          {/* Card 2: Completed Learning */}
          <Card className="glass-card rounded-xl border-l-4 border-primary">
            <CardHeader>
              <CardTitle className="text-title font-semibold text-foreground flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                Completed Learning
              </CardTitle>
              <CardDescription>
                Finished courses
              </CardDescription>
            </CardHeader>
            <CardContent>
              {summary.completedSkills.length === 0 ? (
                <p className="text-body-sm text-muted-foreground">No completed courses</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {summary.completedSkills.map((course, idx) => {
                    // Format time to remove seconds (HH:mm instead of HH:mm:ss)
                    const formatTime = (time: string | null) => {
                      if (!time) return null;
                      return time.substring(0, 5); // Take only HH:mm
                    };

                    return (
                      <div key={idx} className="p-3 bg-primary/5 rounded-lg flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-body-sm font-medium text-foreground">{course.mentorName}</p>
                          <p className="text-caption text-muted-foreground">{course.skillName}</p>
                          <Badge variant="outline" className="mt-2 bg-primary/10 text-primary border-primary/20">
                            Skill Completed
                          </Badge>
                        </div>
                        <div className="text-right space-y-1.5 min-w-[180px]">
                          {course.startDate && course.endDate && (
                            <div className="text-caption text-muted-foreground flex items-center gap-1 justify-end">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {new Date(course.startDate).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })} - {new Date(course.endDate).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                          )}
                          {course.startTime && course.endTime && (
                            <div className="text-caption text-muted-foreground flex items-center gap-1 justify-end">
                              <Clock className="h-3 w-3" />
                              <span>{formatTime(course.startTime)} - {formatTime(course.endTime)}</span>
                            </div>
                          )}
                          {course.sessionsPerWeek && (
                            <div className="text-caption text-muted-foreground">
                              {course.sessionsPerWeek} sessions/week
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
        </div>
      </div>

      {/* UPI Payment Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={(open) => {
        setPaymentModalOpen(open);
        if (!open) {
          setSessionToPay(null);
          setSelectedUPI(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
            <DialogDescription>
              {sessionToPay && (
                <>
                  Pay ₹{sessionToPay.planPrice?.toLocaleString() || "N/A"} for {sessionToPay.planName || "mentorship plan"}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* UPI Options */}
            <div className="space-y-2">
              <p className="text-body-sm font-medium text-foreground">Select UPI Payment Method</p>
              <div className="space-y-2">
                {[
                  { id: "GOOGLE_PAY", name: "Google Pay", icon: "📱" },
                  { id: "PHONEPE", name: "PhonePe", icon: "💳" },
                  { id: "PAYTM", name: "Paytm", icon: "💵" },
                  { id: "BHIM_UPI", name: "BHIM UPI", icon: "🏦" },
                ].map((upi) => (
                  <button
                    key={upi.id}
                    type="button"
                    onClick={() => setSelectedUPI(upi.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all",
                      selectedUPI === upi.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{upi.icon}</span>
                      <span className="text-body font-medium text-foreground">{upi.name}</span>
                    </div>
                    {selectedUPI === upi.id && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Pay Button */}
            <Button
              className="w-full"
              onClick={handleCompletePayment}
              disabled={!selectedUPI || processingPayment === sessionToPay?.sessionId}
            >
              {processingPayment === sessionToPay?.sessionId ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing Payment...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay ₹{sessionToPay?.planPrice?.toLocaleString() || "N/A"}
                </>
              )}
            </Button>

            <p className="text-caption text-center text-muted-foreground">
              This is a mock payment. No real transaction will be processed.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel/Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              {sessionToDelete && sessions.pendingApproval.find((s) => s.sessionId === sessionToDelete) ? (
                "Are you sure you want to cancel this pending session request? This action cannot be undone."
              ) : sessionToDelete && sessions.completed.find((s) => s.sessionId === sessionToDelete) ? (
                "Are you sure you want to remove this completed session from your list? This action cannot be undone."
              ) : (
                "Are you sure you want to cancel this session? This action cannot be undone."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (sessionToDelete) {
                  const isPending = sessions.pendingApproval.find((s) => s.sessionId === sessionToDelete);
                  const isCompleted = sessions.completed.find((s) => s.sessionId === sessionToDelete);
                  
                  if (isPending) {
                    handleCancelSession(sessionToDelete);
                  } else if (isCompleted) {
                    handleDeleteSession(sessionToDelete);
                  } else {
                    handleCancelSession(sessionToDelete);
                  }
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancellingSession ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
