import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle,
  Lock,
  MessageSquare,
  Video,
  Copy,
  CheckCircle2,
  FileText,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Assignment {
  id: string;
  title: string;
  module: string;
  status: "completed" | "pending" | "locked";
  order: number;
}

interface Message {
  id: string;
  sender: "mentor" | "student";
  text: string;
  timestamp: string;
}

interface SessionHistory {
  id: string;
  date: string;
  topic: string;
  duration: string;
  status: string;
}

// Static mock data
const getSessionData = (studentId: string, sessionId: string) => {
  const sessions: Record<string, Record<string, any>> = {
    "1": {
      "1": {
        studentName: "Priya Sharma",
        studentInitials: "PS",
        courseName: "Data Structures & Algorithms",
        sessionTitle: "Introduction to DSA",
        sessionNumber: 1,
        status: "completed",
        scheduledDate: "2024-01-10",
        scheduledTime: "10:00 AM",
        duration: "60 min",
        videoCallLink: "https://zoom.us/j/1234567890",
        modules: [
          { name: "Module 1: Basics", status: "completed" },
          { name: "Module 2: Control Flow", status: "current" },
          { name: "Module 3: OOP Concepts", status: "locked" },
          { name: "Module 4: Mini Project", status: "locked" },
        ],
        assignments: [
          { id: "1", title: "Arrays Basics", module: "Module 1: Basics", status: "completed", order: 1 },
          { id: "2", title: "Array Operations", module: "Module 1: Basics", status: "completed", order: 2 },
          { id: "3", title: "Control Flow", module: "Module 2: Control Flow", status: "pending", order: 3 },
          { id: "4", title: "Loops & Iterations", module: "Module 2: Control Flow", status: "pending", order: 4 },
          { id: "5", title: "OOP Concepts", module: "Module 3: OOP Concepts", status: "locked", order: 5 },
        ],
        messages: [
          {
            id: "1",
            sender: "mentor",
            text: "Hello Priya! Welcome to the DSA mentorship program.",
            timestamp: "2024-01-10T10:00:00",
          },
          {
            id: "2",
            sender: "student",
            text: "Thank you! I'm excited to learn.",
            timestamp: "2024-01-10T10:05:00",
          },
        ],
        history: {
          ongoing: [],
          completed: [
            {
              id: "1",
              date: "2024-01-10",
              topic: "Introduction to DSA",
              duration: "60 min",
              status: "Completed",
            },
          ],
          discontinued: [],
        },
      },
    },
  };

  return sessions[studentId]?.[sessionId] || {
    studentName: "Student",
    studentInitials: "ST",
    courseName: "Course",
    sessionTitle: "Session",
    sessionNumber: 1,
    status: "upcoming",
    scheduledDate: new Date().toISOString().split("T")[0],
    scheduledTime: "10:00 AM",
    duration: "60 min",
    videoCallLink: "",
    modules: [],
    assignments: [],
    messages: [],
    history: { ongoing: [], completed: [], discontinued: [] },
  };
};

export default function StudentSessionDetail() {
  const { studentId, sessionId } = useParams<{ studentId: string; sessionId: string }>();
  const navigate = useNavigate();
  const [linkCopied, setLinkCopied] = useState(false);
  const [messageInput, setMessageInput] = useState("");

  if (!studentId || !sessionId) {
    return (
      <DashboardLayout role="mentor" title="Session Not Found">
        <div className="text-center py-12">
          <p className="text-body text-muted-foreground">Session not found</p>
        </div>
      </DashboardLayout>
    );
  }

  const session = getSessionData(studentId, sessionId);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success/10 text-success border-success/20";
      case "upcoming":
        return "bg-warning/10 text-warning border-warning/20";
      case "cancelled":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "";
    }
  };

  const getAssignmentStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case "pending":
        return <Clock className="h-5 w-5 text-warning" />;
      case "locked":
        return <Lock className="h-5 w-5 text-muted-foreground" />;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout role="mentor" title="Session Details">
      <div className="space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate(`/mentor/students/${studentId}/sessions`)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sessions
        </Button>

        {/* A. Session Overview */}
        <Card className="glass-card rounded-xl">
          <CardHeader>
            <CardTitle>Session Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-semibold">
                  {session.studentInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-body-lg font-semibold text-foreground">{session.studentName}</p>
                <p className="text-body-sm text-muted-foreground">Student</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-body-sm font-medium text-foreground mb-1">Course:</p>
                <p className="text-body text-foreground">{session.courseName}</p>
              </div>
              <div>
                <p className="text-body-sm font-medium text-foreground mb-1">Session:</p>
                <p className="text-body text-foreground">
                  Session {session.sessionNumber} – {session.sessionTitle}
                </p>
              </div>
              <div>
                <p className="text-body-sm font-medium text-foreground mb-1">Scheduled Date & Time:</p>
                <div className="flex items-center gap-2 text-body text-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(session.scheduledDate)}</span>
                  <Clock className="h-4 w-4 ml-2" />
                  <span>{session.scheduledTime}</span>
                </div>
              </div>
              <div>
                <p className="text-body-sm font-medium text-foreground mb-1">Status:</p>
                <Badge variant="outline" className={cn("text-caption", getStatusColor(session.status))}>
                  {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* B. Course Schedule Tracker */}
        <Card className="glass-card rounded-xl">
          <CardHeader>
            <CardTitle>Course Schedule Tracker</CardTitle>
          </CardHeader>
          <CardContent>
            {session.modules && session.modules.length > 0 ? (
              <div className="space-y-3">
                {session.modules.map((module: any, index: number) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border",
                      module.status === "completed" && "bg-success/5 border-success/20",
                      module.status === "current" && "bg-primary/5 border-primary/20 ring-2 ring-primary/20",
                      module.status === "locked" && "bg-muted/50 border-border opacity-60"
                    )}
                  >
                    {module.status === "completed" ? (
                      <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                    ) : module.status === "locked" ? (
                      <Lock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <Clock className="h-5 w-5 text-primary flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-body font-medium text-foreground">{module.name}</p>
                      <p className="text-body-sm text-muted-foreground capitalize">{module.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-body-sm text-muted-foreground text-center py-4">
                No modules available yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* C. Assignments Section */}
        <Card className="glass-card rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {session.assignments && session.assignments.length > 0 ? (
              <div className="space-y-3">
                {session.assignments.map((assignment: Assignment, index: number) => {
                  const isLocked = assignment.status === "locked";
                  const isUnlocked = index < 4; // First 4 assignments unlocked
                  const isActuallyLocked = isLocked || !isUnlocked;

                  return (
                    <Card
                      key={assignment.id}
                      className={cn(
                        "transition-all",
                        isActuallyLocked && "opacity-60",
                        !isActuallyLocked && "hover:shadow-md"
                      )}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {getAssignmentStatusIcon(assignment.status)}
                              <CardTitle className="text-body-lg">{assignment.title}</CardTitle>
                            </div>
                            <CardDescription>{assignment.module}</CardDescription>
                            {isActuallyLocked && (
                              <p className="text-caption text-muted-foreground mt-2 flex items-center gap-1">
                                <Lock className="h-3 w-3" />
                                Complete previous modules to unlock
                              </p>
                            )}
                          </div>
                          <Button
                            variant={isActuallyLocked ? "outline" : "default"}
                            disabled={isActuallyLocked}
                            onClick={() => {
                              // TODO: Need to build assignment evaluation page
                            }}
                          >
                            {isActuallyLocked ? (
                              <>
                                <Lock className="h-4 w-4 mr-2" />
                                Locked
                              </>
                            ) : assignment.status === "completed" ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Evaluate
                              </>
                            ) : (
                              "Review"
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <p className="text-body-sm text-muted-foreground text-center py-4">
                No assignments available
              </p>
            )}
          </CardContent>
        </Card>

        {/* D. Chat & Video */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Chat Section */}
          <Card className="glass-card rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Chat
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                className="w-full"
                onClick={() => {
                  // TODO: Real-time chat is partially done, need to wire up UI properly
                }}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Open Chat
              </Button>

              {/* Messages Preview */}
              <div className="space-y-2 h-[200px] overflow-y-auto pr-2">
                {session.messages.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-body-sm text-muted-foreground">No messages yet</p>
                  </div>
                ) : (
                  session.messages.map((message: Message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        message.sender === "student" ? "justify-start" : "justify-end"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg p-2 text-body-sm",
                          message.sender === "student"
                            ? "bg-muted text-foreground"
                            : "bg-primary text-primary-foreground"
                        )}
                      >
                        {message.text}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  disabled
                  className="flex-1"
                />
                <Button disabled>
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-caption text-muted-foreground text-center">
                {/* TODO: Implement real-time chat with WebSocket */}
                Chat feature will be enabled during active sessions
              </p>
            </CardContent>
          </Card>

          {/* Video Call Section */}
          <Card className="glass-card rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Video Call
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                className="w-full"
                onClick={() => {
                  // TODO: Implement video call integration (Zoom/Meet API)
                }}
              >
                <Video className="h-4 w-4 mr-2" />
                Start Video Call
              </Button>

              {session.videoCallLink && (
                <div className="space-y-2">
                  <label className="text-body-sm font-medium text-foreground">
                    Zoom / Meet Link
                  </label>
                  <div className="flex gap-2">
                    <Input value={session.videoCallLink} readOnly className="flex-1" />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(session.videoCallLink);
                        setLinkCopied(true);
                        setTimeout(() => setLinkCopied(false), 2000);
                      }}
                    >
                      {linkCopied ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-caption text-muted-foreground">
                    Video link is shared with the student before the session.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* E. Session History */}
        <Card className="glass-card rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Session History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="ongoing" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="ongoing">Ongoing Sessions</TabsTrigger>
                <TabsTrigger value="completed">Completed Sessions</TabsTrigger>
                <TabsTrigger value="discontinued">Discontinued Sessions</TabsTrigger>
              </TabsList>

              <TabsContent value="ongoing" className="mt-4">
                {session.history.ongoing.length === 0 ? (
                  <p className="text-body-sm text-muted-foreground text-center py-4">
                    No ongoing sessions
                  </p>
                ) : (
                  <div className="space-y-3">
                    {session.history.ongoing.map((item: SessionHistory) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                      >
                        <div>
                          <p className="text-body font-medium text-foreground">{item.topic}</p>
                          <div className="flex items-center gap-4 text-body-sm text-muted-foreground mt-1">
                            <span>{formatDate(item.date)}</span>
                            <span>•</span>
                            <span>{item.duration}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-caption">
                          {item.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="completed" className="mt-4">
                {session.history.completed.length === 0 ? (
                  <p className="text-body-sm text-muted-foreground text-center py-4">
                    No completed sessions
                  </p>
                ) : (
                  <div className="space-y-3">
                    {session.history.completed.map((item: SessionHistory) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                      >
                        <div>
                          <p className="text-body font-medium text-foreground">{item.topic}</p>
                          <div className="flex items-center gap-4 text-body-sm text-muted-foreground mt-1">
                            <span>{formatDate(item.date)}</span>
                            <span>•</span>
                            <span>{item.duration}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-caption bg-success/10 text-success border-success/20">
                          {item.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="discontinued" className="mt-4">
                {session.history.discontinued.length === 0 ? (
                  <p className="text-body-sm text-muted-foreground text-center py-4">
                    No discontinued sessions
                  </p>
                ) : (
                  <div className="space-y-3">
                    {session.history.discontinued.map((item: SessionHistory) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                      >
                        <div>
                          <p className="text-body font-medium text-foreground">{item.topic}</p>
                          <div className="flex items-center gap-4 text-body-sm text-muted-foreground mt-1">
                            <span>{formatDate(item.date)}</span>
                            <span>•</span>
                            <span>{item.duration}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-caption bg-destructive/10 text-destructive border-destructive/20">
                          {item.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

