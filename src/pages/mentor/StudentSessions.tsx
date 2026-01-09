import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/api";

interface Session {
  id: string;
  skillName: string;
  status: string;
  scheduledAt: string | null;
  createdAt: string;
}

interface SessionSchedule {
  id: string;
  sessionNumber: number;
  topicTitle: string;
  scheduledDate: string;
  scheduledTime: string;
  status: string;
}

export default function StudentSessions() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [studentName, setStudentName] = useState<string>("Student");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (studentId) {
      fetchStudentSessions();
    }
  }, [studentId]);

  const fetchStudentSessions = async () => {
    if (!studentId) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const apiUrl = API_BASE_URL;

      // Fetch all sessions for the mentor, then filter by studentId
      const response = await fetch(`${apiUrl}/mentors/dashboard/ongoing-sessions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // Also try completed sessions
        const completedResponse = await fetch(`${apiUrl}/mentors/dashboard/completed-sessions`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!completedResponse.ok) {
          throw new Error("Failed to fetch sessions");
        }

        const completedData = await completedResponse.json();
        const allSessions = Array.isArray(completedData) ? completedData : [];
        const studentSessions = allSessions.filter((s: any) => s.student?.id === studentId);
        
        // Get student name from first session if available
        if (studentSessions.length > 0 && studentSessions[0].student?.name) {
          setStudentName(studentSessions[0].student.name);
        }

        setSessions(studentSessions.map((s: any) => ({
          id: s.sessionId || s.id,
          skillName: s.skillName || s.skill_name || "Unknown Skill",
          status: s.status || "UNKNOWN",
          scheduledAt: s.scheduledAt || s.scheduled_at,
          createdAt: s.createdAt || s.created_at,
        })));

        setLoading(false);
        return;
      }

      const ongoingData = await response.json();
      const ongoingSessions = Array.isArray(ongoingData) ? ongoingData : [];
      
      // Also fetch completed sessions
      const completedResponse = await fetch(`${apiUrl}/mentors/dashboard/completed-sessions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let completedSessions: any[] = [];
      if (completedResponse.ok) {
        const completedData = await completedResponse.json();
        completedSessions = Array.isArray(completedData) ? completedData : [];
      }

      // Combine and filter by studentId
      const allSessions = [...ongoingSessions, ...completedSessions];
      const studentSessions = allSessions.filter((s: any) => s.student?.id === studentId);

      // Get student name from first session if available
      if (studentSessions.length > 0 && studentSessions[0].student?.name) {
        setStudentName(studentSessions[0].student.name);
      } else {
        // Try to get student name from student details endpoint
        try {
          const studentResponse = await fetch(`${apiUrl}/mentors/students/${studentId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (studentResponse.ok) {
            const studentData = await studentResponse.json();
            if (studentData.student?.name) {
              setStudentName(studentData.student.name);
            }
          }
        } catch (e) {
          console.error("Error fetching student details:", e);
        }
      }

      setSessions(studentSessions.map((s: any) => ({
        id: s.sessionId || s.id,
        skillName: s.skillName || s.skill_name || "Unknown Skill",
        status: s.status || "UNKNOWN",
        scheduledAt: s.scheduledAt || s.scheduled_at,
        createdAt: s.createdAt || s.created_at,
      })));

    } catch (err: any) {
      console.error("Error fetching student sessions:", err);
      setError(err.message || "Failed to load sessions");
      toast.error("Failed to load sessions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "SCHEDULED":
      case "ONGOING":
      case "PAID":
        return "bg-warning/10 text-warning border-warning/20";
      case "COMPLETED":
        return "bg-success/10 text-success border-success/20";
      case "CANCELLED":
      case "REJECTED":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted/10 text-muted-foreground border-muted/20";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case "SCHEDULED":
      case "ONGOING":
      case "PAID":
        return <AlertCircle className="h-4 w-4" />;
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4" />;
      case "CANCELLED":
      case "REJECTED":
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Date not scheduled";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (e) {
      return "Invalid date";
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "Time not scheduled";
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    } catch (e) {
      return "Invalid time";
    }
  };

  if (!studentId) {
    return (
      <DashboardLayout role="mentor" title="Student Not Found">
        <div className="text-center py-12">
          <p className="text-body text-muted-foreground">Student not found</p>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout role="mentor" title="Student Sessions">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-body text-muted-foreground">Loading sessions...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout role="mentor" title="Student Sessions">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <p className="text-body text-foreground mb-2">Error loading sessions</p>
          <p className="text-body-sm text-muted-foreground">{error}</p>
          <Button onClick={fetchStudentSessions} className="mt-4">
            Try Again
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="mentor" title="Student Sessions">
      <div className="space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate("/mentor/students")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Students
        </Button>

        {/* Header */}
        <div>
          <h1 className="text-headline text-foreground">Sessions with {studentName}</h1>
          <p className="text-body text-muted-foreground mt-1">
            Manage and track all mentorship sessions
          </p>
        </div>

        {/* Sessions List */}
        {sessions.length === 0 ? (
          <Card className="glass-card rounded-xl p-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-body text-muted-foreground">
              No sessions scheduled with this student yet.
            </p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((session, index) => (
              <Card
                key={session.id}
                className="glass-card rounded-xl hover:shadow-md transition-all cursor-pointer"
                onClick={() => navigate(`/mentor/sessions/${session.id}`)}
              >
                <CardHeader>
                  <CardTitle className="text-body-lg font-semibold text-foreground">
                    Session {index + 1}
                  </CardTitle>
                  <CardDescription>{session.skillName}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-body-sm font-medium text-foreground mb-1">Skill:</p>
                    <p className="text-body-sm text-muted-foreground">{session.skillName}</p>
                  </div>

                  <div className="space-y-2">
                    {session.scheduledAt && (
                      <>
                        <div className="flex items-center gap-2 text-body-sm text-foreground">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span>{formatDate(session.scheduledAt)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-body-sm text-foreground">
                          <Clock className="h-4 w-4 text-primary" />
                          <span>{formatTime(session.scheduledAt)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className={cn("text-caption flex items-center gap-1", getStatusColor(session.status))}
                    >
                      {getStatusIcon(session.status)}
                      {session.status.charAt(0).toUpperCase() + session.status.slice(1).toLowerCase()}
                    </Badge>
                  </div>

                  <Button
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/mentor/sessions/${session.id}`);
                    }}
                  >
                    View Session Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
    <DashboardLayout role="mentor" title="Student Sessions">
      <div className="space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate("/mentor/students")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Students
        </Button>

        {/* Header */}
        <div>
          <h1 className="text-headline text-foreground">Sessions with {studentName}</h1>
          <p className="text-body text-muted-foreground mt-1">
            Manage and track all mentorship sessions
          </p>
        </div>

        {/* Sessions List */}
        {sessions.length === 0 ? (
          <Card className="glass-card rounded-xl p-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-body text-muted-foreground">
              No sessions scheduled with this student yet.
            </p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((session, index) => (
              <Card
                key={session.id}
                className="glass-card rounded-xl hover:shadow-md transition-all cursor-pointer"
                onClick={() => navigate(`/mentor/sessions/${session.id}`)}
              >
                <CardHeader>
                  <CardTitle className="text-body-lg font-semibold text-foreground">
                    Session {index + 1}
                  </CardTitle>
                  <CardDescription>{session.skillName}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-body-sm font-medium text-foreground mb-1">Skill:</p>
                    <p className="text-body-sm text-muted-foreground">{session.skillName}</p>
                  </div>

                  <div className="space-y-2">
                    {session.scheduledAt && (
                      <>
                        <div className="flex items-center gap-2 text-body-sm text-foreground">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span>{formatDate(session.scheduledAt)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-body-sm text-foreground">
                          <Clock className="h-4 w-4 text-primary" />
                          <span>{formatTime(session.scheduledAt)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className={cn("text-caption flex items-center gap-1", getStatusColor(session.status))}
                    >
                      {getStatusIcon(session.status)}
                      {session.status.charAt(0).toUpperCase() + session.status.slice(1).toLowerCase()}
                    </Badge>
                  </div>

                  <Button
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/mentor/sessions/${session.id}`);
                    }}
                  >
                    View Session Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
