import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/cards/StatCard";
import { StreakCalendar } from "@/components/dashboard/StreakCalendar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/api";
import {
  Target,
  FileText,
  Mic,
  TrendingUp,
  ArrowRight,
  Brain,
  CheckCircle2,
  Users,
  FileCheck,
  Star,
  Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { getCurrentUser, getAuthToken } from "@/lib/auth";

interface DashboardData {
  userName: string;
  streakCount: number;
  activityDates: string[];
  currentSkill: {
    name: string;
    completed: number;
    total: number;
    skillId: string;
  } | null;
}

interface DashboardMetrics {
  careerScore: {
    value: number;
    delta: number;
  };
  resumeStrength: {
    value: number;
    delta: number;
  };
  mockInterviews: {
    value: number;
    delta: number;
  };
  skillsGained: {
    value: number;
    delta: number;
  };
}

export default function StudentDashboard() {
  const [data, setData] = useState<DashboardData>({
    userName: "User",
    streakCount: 0,
    activityDates: [],
    currentSkill: null,
  });
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    careerScore: { value: 0, delta: 0 },
    resumeStrength: { value: 0, delta: 0 },
    mockInterviews: { value: 0, delta: 0 },
    skillsGained: { value: 0, delta: 0 },
  });
  const [loading, setLoading] = useState(true);
  
  // Rating modal state
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  useEffect(() => {
    // Initial fetch
    fetchDashboardData();
    fetchDashboardMetrics();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData();
      fetchDashboardMetrics();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const user = getCurrentUser();
      if (!user) return;

      const token = localStorage.getItem("authToken") || localStorage.getItem("accessToken");
      if (!token) return;

      // Fetch dashboard data
      const response = await fetch(
        `${API_BASE_URL}/dashboard`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const dashboardData = await response.json();
        setData({
          userName: dashboardData.userName || user.name || "User",
          streakCount: dashboardData.streakCount || 0,
          activityDates: dashboardData.activityDates || [],
          currentSkill: dashboardData.currentSkill || null,
        });
      } else {
        // Fallback to user data from localStorage
        setData({
          userName: user.name || "User",
          streakCount: 0,
          activityDates: [],
          currentSkill: null,
        });
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      // Fallback to user data from localStorage
      const user = getCurrentUser();
      setData({
        userName: user?.name || "User",
        streakCount: 0,
        activityDates: [],
        currentSkill: null,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardMetrics = async () => {
    try {
      const user = getCurrentUser();
      if (!user) return;

      const token = localStorage.getItem("authToken") || localStorage.getItem("accessToken");
      if (!token) return;

      // Fetch computed dashboard metrics
      const response = await fetch(
        `${API_BASE_URL}/dashboard/metrics`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const metricsData = await response.json();
        setMetrics(metricsData);
      } else {
        // On error, keep zeros (default state)
        console.error("Failed to fetch dashboard metrics");
      }
    } catch (error) {
      console.error("Failed to fetch dashboard metrics:", error);
      // On error, keep zeros (default state)
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="student" title="Dashboard">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-body text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="student" title="Dashboard">
      <div className="space-y-4 sm:space-y-6 w-full max-w-full box-border">
        {/* 1. Welcome Section */}
        <div className="glass-card rounded-xl p-4 sm:p-6 lg:p-8 relative overflow-hidden w-full max-w-full box-border">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5" />
          <div className="relative">
            <h1 className="text-lg sm:text-headline text-foreground mb-1 break-words">
              Welcome, {data.userName} 👋
            </h1>
            <p className="text-sm sm:text-body text-muted-foreground break-words">
              Your career journey starts here. Every step forward is progress towards your goals.
            </p>
          </div>
        </div>

        {/* 2. Top Action Row - Two Cards Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-full box-border">
          {/* Left Card: Take Assessment */}
          <div className="glass-card rounded-xl p-4 sm:p-5 hover:shadow-card-hover transition-all duration-300 relative overflow-hidden w-full max-w-full">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5" />
            <div className="relative space-y-3 sm:space-y-4">
              {/* Header */}
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-xl bg-primary/10 text-primary flex-shrink-0">
                  <Brain className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-headline font-semibold text-foreground mb-2 break-words">
                    Take Assessment
                  </h3>
                  <p className="text-sm sm:text-body text-muted-foreground break-words">
                    Discover your strengths and ideal career paths through comprehensive Aptitude & Personality tests. Get personalized recommendations based on your results.
                  </p>
                </div>
              </div>

              {/* 3-Point Checklist */}
              <div className="space-y-3 pt-1 bg-muted/20 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-body font-medium text-foreground">Aptitude test (10–15 mins)</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-body font-medium text-foreground">Personality insights</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-body font-medium text-foreground">Personalized career report</span>
                </div>
              </div>

              {/* CTA Button */}
              <Button variant="gradient" className="w-full text-sm sm:text-body font-semibold py-4 sm:py-6" asChild>
                <Link to="/assessment">
                  Start Assessment
                  <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 ml-2" />
                </Link>
              </Button>

              {/* Divider */}
              <div className="border-t border-border/50 pt-3 sm:pt-4 space-y-2 sm:space-y-3">
                {/* Helper Text */}
                <p className="text-xs sm:text-body text-muted-foreground text-center leading-relaxed break-words px-2">
                  Complete this assessment to unlock personalized learning paths and connect with expert mentors.
                </p>

                {/* Action Pills */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 justify-center">
                  <div className="px-3 sm:px-4 py-2 rounded-full bg-primary/10 text-primary text-xs sm:text-body font-semibold flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors">
                    <FileCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                    Career Report
                  </div>
                  <div className="px-3 sm:px-4 py-2 rounded-full bg-accent/10 text-accent text-xs sm:text-body font-semibold flex items-center justify-center gap-2 hover:bg-accent/20 transition-colors">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                    Mentors
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Card: Streak Calendar */}
          <div className="glass-card rounded-xl p-3 sm:p-4 relative overflow-hidden w-full max-w-full">
            <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-primary/5" />
            <div className="relative">
              <StreakCalendar
                activities={data.activityDates}
                currentStreak={data.streakCount}
              />
            </div>
          </div>
        </div>

        {/* 3. Middle Section: 4 Stat Cards - All values computed from database */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full max-w-full box-border">
          <StatCard
            title="Career Score"
            value={`${metrics.careerScore.value}%`}
            icon={<Target className="h-5 w-5" />}
            change={metrics.careerScore.delta}
            changeLabel="vs last week"
            iconColor="destructive"
          />
          <StatCard
            title="Resume Strength"
            value={`${metrics.resumeStrength.value}%`}
            icon={<FileText className="h-5 w-5" />}
            change={metrics.resumeStrength.delta}
            changeLabel="after AI review"
            iconColor="accent"
          />
          <StatCard
            title="Mock Interviews"
            value={metrics.mockInterviews.value.toString()}
            icon={<Mic className="h-5 w-5" />}
            change={metrics.mockInterviews.delta}
            changeLabel="this month"
            iconColor="success"
            changeIsPercentage={false}
          />
          <StatCard
            title="Skills Gained"
            value={metrics.skillsGained.value.toString()}
            icon={<TrendingUp className="h-5 w-5" />}
            change={metrics.skillsGained.delta}
            changeLabel="new skills"
            iconColor="warning"
            changeIsPercentage={false}
          />
        </div>

        {/* 4. Support Link & Rate CareerNav */}
        <div className="text-center space-y-2">
          <Link
            to="/support"
            className="text-body-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            Need Help? We're here to support you.
          </Link>
          <div>
            <button
              onClick={() => setIsRatingModalOpen(true)}
              className="text-body-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              <Star className="h-4 w-4" />
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

            changeLabel="this month"
            iconColor="success"
            changeIsPercentage={false}
          />
          <StatCard
            title="Skills Gained"
            value={metrics.skillsGained.value.toString()}
            icon={<TrendingUp className="h-5 w-5" />}
            change={metrics.skillsGained.delta}
            changeLabel="new skills"
            iconColor="warning"
            changeIsPercentage={false}
          />
        </div>

        {/* 4. Support Link & Rate CareerNav */}
        <div className="text-center space-y-2">
          <Link
            to="/support"
            className="text-body-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            Need Help? We're here to support you.
          </Link>
          <div>
            <button
              onClick={() => setIsRatingModalOpen(true)}
              className="text-body-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              <Star className="h-4 w-4" />
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
