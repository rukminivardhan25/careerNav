import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Star, Check, ArrowLeft, Clock, Users, MessageSquare, Briefcase, BookOpen, Info, Loader2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getAuthToken } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api";

interface MentorData {
  id: string;
  name: string;
  email: string;
  bio: string | null;
  currentRole: string | null;
  rating: number | null;
  totalReviews: number | null;
  verifiedCourses: Array<{
    courseId: number;
    courseCareerId: string;
    courseName: string;
    verifiedAt: Date | null;
    score: number;
  }>;
  sessionTypes: string[] | null;
  pricingPerHour: number | null;
  initials?: string;
}

// Plan interface matching API response
interface Plan {
  id: number;
  skillName: string;
  planKey: string;
  planTitle: string;
  price: number;
  durationWeeks: number;
  sessionsPerWeek: number;
  description: string | null;
  isActive: boolean;
}

interface PlanTopic {
  id: number;
  weekNumber: number;
  sessionNumber: number;
  topicTitle: string;
}

export default function MentorConnect() {
  const { mentorId } = useParams<{ mentorId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Uses mentor skills from mentor_tests table
  
  // Get mentorSkill from navigation state (passed from Top Mentors page)
  const locationState = location.state as { mentorSkill?: { skillId: string; skillName: string } } | null;
  const mentorSkill = locationState?.mentorSkill || null;
  
  const [mentor, setMentor] = useState<MentorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [planTopics, setPlanTopics] = useState<Record<number, PlanTopic[]>>({});
  const [loadingTopics, setLoadingTopics] = useState<Record<number, boolean>>({});
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  // Course will be resolved by backend from mentorSkill
  const [scheduledDate, setScheduledDate] = useState("");
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [studentMessage, setStudentMessage] = useState("");
  const [viewingPlanDetails, setViewingPlanDetails] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Generate time options (every 30 minutes from 9 AM to 9 PM)
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 9; hour <= 21; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        const displayTime = new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
        times.push({ value: timeString, label: displayTime });
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  // Fetch mentor data from API
  useEffect(() => {
    const fetchMentorData = async () => {
      if (!mentorId) {
        setError("Mentor ID is required");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const apiUrl = API_BASE_URL;
        const response = await fetch(`${apiUrl}/mentors/${mentorId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Mentor not found");
          }
          throw new Error("Failed to fetch mentor data");
        }
        
        const data = await response.json();
        const mentorData = data.mentor;
        
        console.log("📥 Mentor data received from API:", {
          mentorId: mentorData?.id,
          mentorName: mentorData?.name,
          verifiedCourses: mentorData?.verifiedCourses,
          verifiedCoursesLength: mentorData?.verifiedCourses?.length,
          verifiedCoursesType: typeof mentorData?.verifiedCourses,
          isArray: Array.isArray(mentorData?.verifiedCourses),
          fullMentorData: mentorData,
        });
        
        // Generate initials from name
        const nameParts = mentorData.name?.split(" ") || [];
        const initials = nameParts
          .map((part: string) => part[0])
          .join("")
          .toUpperCase()
          .substring(0, 2) || "??";
        
        setMentor({
          ...mentorData,
          initials,
        });
        
        // Safety check: validate no student course fields leaked in
        if (locationState && ('course' in locationState || 'courseName' in locationState || 'learningCourse' in locationState || 'studentCourse' in locationState || 'sessionCourse' in locationState)) {
          console.error(
            "INVALID DATA: Student course leaked into mentor connection flow",
            { locationState }
          );
        }
        
        // Set default date (backend will resolve course from mentorSkill)
        if (!scheduledDate) {
          setScheduledDate(new Date().toISOString().split("T")[0]);
        }
      } catch (err: any) {
        console.error("Error fetching mentor:", err);
        setError(err.message || "Failed to load mentor data");
      } finally {
        setLoading(false);
      }
    };

    fetchMentorData();
  }, [mentorId]);

  // Fetch plans when mentorSkill is available
  useEffect(() => {
    const fetchPlans = async () => {
      if (!mentorSkill?.skillName) {
        setPlans([]);
        return;
      }

      try {
        setLoadingPlans(true);
        const apiUrl = API_BASE_URL;
        const response = await fetch(`${apiUrl}/plans?skill=${encodeURIComponent(mentorSkill.skillName)}`);

        if (!response.ok) {
          throw new Error("Failed to fetch plans");
        }

        const data = await response.json();
        setPlans(Array.isArray(data) ? data : []);

        // If no plans found, show error
        if (!Array.isArray(data) || data.length === 0) {
          setError(`No mentorship plans available for ${mentorSkill.skillName}. Please contact support.`);
        }
      } catch (err: any) {
        console.error("Error fetching plans:", err);
        setError(err.message || "Failed to load mentorship plans");
      } finally {
        setLoadingPlans(false);
      }
    };

    fetchPlans();
  }, [mentorSkill?.skillName]);

  // Fetch plan topics when viewing plan details
  const fetchPlanTopics = async (planId: number) => {
    // Don't fetch if already loaded or currently loading
    if (planTopics[planId] || loadingTopics[planId]) {
      return;
    }

    try {
      setLoadingTopics((prev) => ({ ...prev, [planId]: true }));
      const apiUrl = API_BASE_URL;
      const response = await fetch(`${apiUrl}/plans/${planId}/topics`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || errorData.message || "Failed to fetch plan topics");
      }

      const topics = await response.json();
      
      if (!Array.isArray(topics)) {
        throw new Error("Invalid response format: expected array of topics");
      }

      setPlanTopics((prev) => ({
        ...prev,
        [planId]: topics,
      }));
    } catch (err: any) {
      console.error("Error fetching plan topics:", err);
      // Set empty array to prevent infinite retries
      setPlanTopics((prev) => ({
        ...prev,
        [planId]: [],
      }));
      toast({
        title: "Error Loading Topics",
        description: err.message || "Failed to load plan topics. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingTopics((prev) => ({ ...prev, [planId]: false }));
    }
  };

  // Auto-fetch topics when modal opens
  useEffect(() => {
    if (viewingPlanDetails) {
      const plan = plans.find((p) => p.id === viewingPlanDetails);
      if (plan && !planTopics[plan.id] && !loadingTopics[plan.id]) {
        fetchPlanTopics(plan.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingPlanDetails]); // Only depend on viewingPlanDetails, not plans (to avoid infinite loop)

  // Single source of truth for form validation
  // Mentor skill is required (passed from Top Mentors)
  // Plan is now mandatory
  const validateForm = useMemo(() => {
    // Skill is valid if we have mentorSkill
    const hasSkill = mentorSkill && mentorSkill.skillId && mentorSkill.skillName;
    const hasPlan = selectedPlan !== null;
    const hasDate = scheduledDate && scheduledDate.trim() !== "";
    const hasFromTime = fromTime && fromTime.trim() !== "";
    const hasToTime = toTime && toTime.trim() !== "";
    
    return {
      isValid: hasSkill && hasPlan && hasDate && hasFromTime && hasToTime,
      hasSkill,
      hasPlan,
      hasDate,
      hasFromTime,
      hasToTime,
      missing: [
        !hasSkill && "Skill",
        !hasPlan && "Plan",
        !hasDate && "Date",
        !hasFromTime && "From Time",
        !hasToTime && "To Time"
      ].filter(Boolean) as string[],
    };
  }, [mentorSkill, selectedPlan, scheduledDate, fromTime, toTime]);

  // Debug: Log state changes
  useEffect(() => {
    console.log("🔍 Form state updated:", {
      mentorSkill,
      selectedPlan,
      scheduledDate,
      fromTime,
      toTime,
      submitting,
      validation: validateForm,
      buttonEnabled: validateForm.isValid && !submitting,
    });
    
    // If skill is completely missing, redirect
    if (!validateForm.hasSkill && !loading) {
      console.warn("No mentor skill selected - redirecting to Top Mentors");
      toast({
        title: "Skill selection required",
        description: "Please select a mentor from the Top Mentors page.",
        variant: "destructive",
      });
      setTimeout(() => {
        navigate("/student/top-mentors");
      }, 2000);
    }
  }, [mentorSkill, selectedPlan, scheduledDate, fromTime, toTime, submitting, validateForm, navigate, toast, loading]);

  const handleRequestMentorship = async () => {
    console.log("Request Mentorship clicked", {
      mentorSkill,
      scheduledDate,
      fromTime,
      toTime,
      submitting,
    });

    // Validate mentorSkill is present
    if (!mentorSkill || !mentorSkill.skillId || !mentorSkill.skillName) {
      toast({
        title: "Skill selection required",
        description: "Please select a mentor from the Top Mentors page.",
        variant: "destructive",
      });
      navigate("/student/top-mentors");
      return;
    }

    if (!scheduledDate || !fromTime || !toTime) {
      toast({
        title: "Please select date and time",
        description: "Choose when you'd like to schedule the session (date, from time, and to time).",
        variant: "destructive",
      });
      return;
    }

    // Validate that to time is after from time
    const fromTimeStr = String(fromTime || "");
    const toTimeStr = String(toTime || "");
    const fromTimeParts = fromTimeStr.split(":");
    const toTimeParts = toTimeStr.split(":");
    const fromTimeMinutes = fromTimeParts.length === 2 
      ? parseInt(fromTimeParts[0], 10) * 60 + parseInt(fromTimeParts[1], 10)
      : 0;
    const toTimeMinutes = toTimeParts.length === 2
      ? parseInt(toTimeParts[0], 10) * 60 + parseInt(toTimeParts[1], 10)
      : 0;
    if (toTimeMinutes <= fromTimeMinutes) {
      toast({
        title: "Invalid time range",
        description: "End time must be after start time.",
        variant: "destructive",
      });
      return;
    }

    if (!mentorId) {
      toast({
        title: "Error",
        description: "Mentor ID is missing.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      
      // Defensive log before submission
      console.log("Submitting mentorship request", {
        mentorId,
        mentorSkill,
      });
      
      const token = getAuthToken();
      if (!token) {
        toast({
          title: "Authentication required",
          description: "Please log in to request a mentorship session.",
          variant: "destructive",
        });
        navigate("/student/login");
        return;
      }

      // Combine date and from time into ISO string (use from time as the scheduled time)
      const scheduledDateTime = new Date(`${scheduledDate}T${fromTime}`);
      if (isNaN(scheduledDateTime.getTime())) {
        toast({
          title: "Invalid date/time",
          description: "Please select a valid date and time.",
          variant: "destructive",
        });
        return;
      }

      // Get selected plan
      const plan = selectedPlan ? plans.find((p) => p.id === selectedPlan) : null;
      if (!plan) {
        toast({
          title: "Plan selection required",
          description: "Please select a mentorship plan.",
          variant: "destructive",
        });
        return;
      }

      const sessionType = `${plan.planTitle} - ${plan.sessionsPerWeek} sessions/week`;

      const apiUrl = API_BASE_URL;
      const response = await fetch(`${apiUrl}/sessions/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mentorId,
          skillId: mentorSkill.skillId,
          skillName: mentorSkill.skillName,
          planId: selectedPlan, // Send plan ID
          sessionType,
          scheduledAt: scheduledDateTime.toISOString(),
          studentMessage: studentMessage.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Failed to create session request");
      }

      toast({
        title: "Mentorship request sent!",
        description: "The mentor has been notified and will review your request soon.",
      });

      // Keep button disabled after successful submission
      // Don't reset submitting state - button stays disabled
      
      // Reset form (but keep mentorSkill - it's required and comes from navigation)
      setSelectedPlan(null);
      setScheduledDate("");
      setFromTime("");
      setToTime("");
      setStudentMessage("");

      // Navigate back after a short delay
      setTimeout(() => {
        navigate("/student/top-mentors");
      }, 2000);
    } catch (err: any) {
      console.error("Error creating session request:", err);
      toast({
        title: "Failed to send request",
        description: err.message || "Please try again later.",
        variant: "destructive",
      });
      // Only reset submitting state on error so user can retry
      setSubmitting(false);
    }
    // Note: Don't reset submitting state on success - button stays disabled
  };

  // Generate initials helper
  const getInitials = (name: string): string => {
    const parts = name.split(" ");
    return parts
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2) || "??";
  };

  if (!mentorId) {
    return (
      <DashboardLayout role="student" title="Mentor Not Found">
        <div className="text-center py-12">
          <p className="text-body text-muted-foreground">Mentor not found</p>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout role="student" title="Loading Mentor...">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-body text-muted-foreground">Loading mentor details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !mentor) {
    return (
      <DashboardLayout role="student" title="Error">
        <div className="text-center py-12">
          <p className="text-body text-muted-foreground">
            {error || "Failed to load mentor data"}
          </p>
          <Button
            variant="outline"
            onClick={() => navigate("/student/top-mentors")}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Top Mentors
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const selectedPlanData = plans.find((p) => p.id === selectedPlan);

  return (
    <DashboardLayout role="student" title="Connect with Mentor">
      <div className="space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Top Mentors
        </Button>

        {/* SECTION 1: Mentor Profile Header */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5" />
          <CardHeader className="relative">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Avatar */}
              <Avatar className="h-24 w-24">
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-2xl font-bold">
                  {mentor.initials || getInitials(mentor.name)}
                </AvatarFallback>
              </Avatar>

              {/* Mentor Info */}
              <div className="flex-1">
                <h1 className="text-headline text-foreground mb-2">{mentor.name}</h1>
                <p className="text-body-lg text-muted-foreground mb-3">
                  {mentor.currentRole || "Mentor"}
                </p>
                
                {/* Rating */}
                {mentor.rating != null && typeof mentor.rating === "number" && (
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="text-body font-semibold text-foreground">
                      {mentor.rating.toFixed(1)}
                    </span>
                    {mentor.totalReviews != null && typeof mentor.totalReviews === "number" && (
                      <span className="text-body-sm text-muted-foreground">
                        ({mentor.totalReviews} reviews)
                      </span>
                    )}
                  </div>
                )}

                {/* Mentor Skill - from navigation state */}
                {mentorSkill && (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-body-sm">
                      Skill: {mentorSkill.skillName}
                    </Badge>
                  </div>
                )}
                {!mentorSkill && (
                  <p className="text-body-sm text-muted-foreground">
                    Skill: Skill not available
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* SECTION 2: About the Mentor */}
        {mentor.bio && (
          <Card>
            <CardHeader>
              <CardTitle>About the Mentor</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-body text-foreground">{mentor.bio}</p>
            </CardContent>
          </Card>
        )}

        {/* SECTION 3: Course Display (Read-Only) - Already replaced above */}

        {/* SECTION 4: Mentorship Plans */}
        <div>
          <h2 className="text-title text-foreground font-semibold mb-4">Mentorship Plans</h2>
          {loadingPlans ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-3 text-body-sm text-muted-foreground">Loading plans...</span>
            </div>
          ) : error && plans.length === 0 ? (
            <Card className="glass-card rounded-xl p-8 text-center border-destructive/20">
              <p className="text-body text-destructive font-medium mb-2">Failed to Load Plans</p>
              <p className="text-body-sm text-muted-foreground mb-4">{error}</p>
              <Button
                variant="outline"
                onClick={() => {
                  // Retry fetching plans
                  const fetchPlans = async () => {
                    if (!mentorSkill?.skillName) return;
                    try {
                      setLoadingPlans(true);
                      setError(null);
                      const apiUrl = API_BASE_URL;
                      const response = await fetch(`${apiUrl}/plans?skill=${encodeURIComponent(mentorSkill.skillName)}`);
                      if (!response.ok) throw new Error("Failed to fetch plans");
                      const data = await response.json();
                      setPlans(Array.isArray(data) ? data : []);
                    } catch (err: any) {
                      setError(err.message || "Failed to load plans");
                    } finally {
                      setLoadingPlans(false);
                    }
                  };
                  fetchPlans();
                }}
              >
                Retry
              </Button>
            </Card>
          ) : plans.length === 0 ? (
            <Card className="glass-card rounded-xl p-8 text-center">
              <p className="text-body text-muted-foreground">
                No mentorship plans available for {mentorSkill?.skillName || "this skill"}.
              </p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {plans.map((plan) => {
                const isRecommended = plan.planKey === "STANDARD"; // Mark STANDARD as recommended
                return (
                  <Card
                    key={plan.id}
                    className={cn(
                      "relative transition-all hover:shadow-md",
                      selectedPlan === plan.id && "ring-2 ring-primary",
                      isRecommended && "border-primary"
                    )}
                  >
                    {isRecommended && (
                      <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 rounded-bl-lg rounded-tr-lg text-caption font-semibold">
                        Recommended
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="text-xl">{plan.planTitle}</CardTitle>
                      <CardDescription>
                        {plan.durationWeeks} weeks • {plan.sessionsPerWeek} sessions/week
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Description */}
                      {plan.description && (
                        <p className="text-body-sm text-muted-foreground">{plan.description}</p>
                      )}

                      <Separator />

                      {/* Price */}
                      <div>
                        <div className="flex items-baseline gap-1 mb-1">
                          <span className="text-headline font-bold text-foreground">₹{plan.price.toLocaleString()}</span>
                        </div>
                        <p className="text-caption text-muted-foreground">One-time payment</p>
                      </div>

                      <Separator />

                      {/* Action Buttons */}
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            setViewingPlanDetails(plan.id);
                            fetchPlanTopics(plan.id);
                          }}
                        >
                          <Info className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                        <Button
                          variant={selectedPlan === plan.id ? "default" : "outline"}
                          className="w-full"
                          onClick={() => setSelectedPlan(plan.id)}
                        >
                          {selectedPlan === plan.id ? "✓ Selected" : "Select Plan"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Plan Details Modal - Topics Only */}
        {viewingPlanDetails && (() => {
          const plan = plans.find((p) => p.id === viewingPlanDetails);
          if (!plan) {
            // Plan not found in current plans list
            return (
              <Dialog open={true} onOpenChange={(open) => !open && setViewingPlanDetails(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Plan Not Found</DialogTitle>
                  </DialogHeader>
                  <p className="text-body-sm text-muted-foreground">
                    The selected plan could not be found. Please try again.
                  </p>
                </DialogContent>
              </Dialog>
            );
          }

          const topics = planTopics[plan.id] || [];
          const isLoadingTopics = loadingTopics[plan.id] || false;

          // Group topics by week
          const topicsByWeek: Record<number, PlanTopic[]> = {};
          topics.forEach((topic) => {
            if (!topicsByWeek[topic.weekNumber]) {
              topicsByWeek[topic.weekNumber] = [];
            }
            topicsByWeek[topic.weekNumber].push(topic);
          });

          return (
            <Dialog open={!!viewingPlanDetails} onOpenChange={(open) => !open && setViewingPlanDetails(null)}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl">Topics Covered in This Plan</DialogTitle>
                </DialogHeader>

                <div className="mt-4">
                  {isLoadingTopics ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : topics.length === 0 ? (
                    <p className="text-body-sm text-muted-foreground">No topics available for this plan.</p>
                  ) : (
                    <div className="space-y-4">
                      {Object.keys(topicsByWeek)
                        .sort((a, b) => parseInt(a) - parseInt(b))
                        .map((weekNum) => {
                          const weekTopics = topicsByWeek[parseInt(weekNum)];
                          return (
                            <div key={weekNum} className="space-y-2">
                              <h4 className="text-body-sm font-semibold text-foreground">
                                Week {weekNum}
                              </h4>
                              <div className="grid sm:grid-cols-2 gap-2">
                                {weekTopics
                                  .sort((a, b) => a.sessionNumber - b.sessionNumber)
                                  .map((topic) => (
                                    <div
                                      key={topic.id}
                                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border"
                                    >
                                      <Check className="h-4 w-4 text-success flex-shrink-0" />
                                      <span className="text-body-sm text-foreground">
                                        {topic.topicTitle}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          );
        })()}

        {/* SECTION 5: Schedule Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Schedule Your Session</CardTitle>
            <CardDescription>Select when you'd like to have your mentorship session</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label htmlFor="scheduled-date" className="text-body-sm font-medium text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Course Start Date
                </label>
                <Input
                  id="scheduled-date"
                  name="scheduledDate"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="from-time" className="text-body-sm font-medium text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  From Time
                </label>
                <Select 
                  value={fromTime} 
                  onValueChange={(value) => {
                    console.log("From time selected:", value);
                    setFromTime(value);
                  }}
                >
                  <SelectTrigger id="from-time" name="fromTime" className="h-11">
                    <SelectValue placeholder="Select start time" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {timeOptions.map((time) => (
                      <SelectItem key={time.value} value={time.value}>
                        {time.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor="to-time" className="text-body-sm font-medium text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  To Time
                </label>
                <Select 
                  value={toTime} 
                  onValueChange={(value) => {
                    console.log("To time selected:", value);
                    setToTime(value);
                  }}
                >
                  <SelectTrigger id="to-time" name="toTime" className="h-11">
                    <SelectValue placeholder="Select end time" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {timeOptions.map((time) => (
                      <SelectItem key={time.value} value={time.value}>
                        {time.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="student-message" className="text-body-sm font-medium text-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Message (Optional)
              </label>
              <Textarea
                id="student-message"
                name="studentMessage"
                placeholder="Tell the mentor about your goals or any specific topics you'd like to cover..."
                value={studentMessage}
                onChange={(e) => setStudentMessage(e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* SECTION 6: Request Mentorship Button */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-body font-semibold text-foreground mb-1">
                  {selectedPlan
                    ? `Selected: ${selectedPlanData?.planTitle || "Plan"}`
                    : "Select a mentorship plan above (required)"}
                </p>
                {selectedPlan && selectedPlanData && (
                  <p className="text-body-sm text-muted-foreground">
                    ₹{selectedPlanData.price.toLocaleString()}
                  </p>
                )}
                {/* Status display */}
                <div className="mt-2 space-y-1">
                  <div className="text-caption text-muted-foreground">
                    Status: {
                      validateForm.isValid ? (
                        <span className="text-success font-semibold">✓ Ready to submit</span>
                      ) : (
                        <span className="text-warning">
                          Missing: {validateForm.missing.join(", ")}
                          {validateForm.hasSkill && mentorSkill && (
                            <span className="text-success ml-2">✓ Skill: {mentorSkill.skillName}</span>
                          )}
                        </span>
                      )
                    }
                  </div>
                  <div className="text-xs text-muted-foreground/70 font-mono">
                    Debug: Skill={mentorSkill ? `✓ ${mentorSkill.skillName}` : "✗"} | Date={scheduledDate ? "✓" : "✗"} | From={fromTime ? "✓" : "✗"} | To={toTime ? "✓" : "✗"}
                  </div>
                </div>
              </div>
              <Button
                type="button"
                size="lg"
                className="w-full sm:w-auto"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  console.log("🔘 Request Mentorship button clicked:", {
                    mentorSkill,
                    selectedPlan,
                    scheduledDate,
                    fromTime,
                    toTime,
                    submitting,
                    validation: validateForm,
                  });
                  
                  if (validateForm.isValid && !submitting) {
                    handleRequestMentorship();
                  } else {
                    // Show helpful message about what's missing
                    if (validateForm.missing.length > 0) {
                      toast({
                        title: "Please complete all required fields",
                        description: `Missing: ${validateForm.missing.join(", ")}`,
                        variant: "destructive",
                      });
                    }
                  }
                }}
                disabled={!validateForm.isValid || submitting}
                style={{
                  cursor: (!validateForm.isValid || submitting) ? "not-allowed" : "pointer"
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Request Mentorship
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 7: Footer Note */}
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-center justify-center">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <p className="text-body-sm text-muted-foreground">
                Payments and notifications will be enabled soon
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
