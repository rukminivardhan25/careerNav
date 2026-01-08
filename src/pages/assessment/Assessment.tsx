import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Brain, User, CheckCircle, ArrowRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

interface TestCompletionState {
  aptitude: boolean;
  personality: boolean;
}

export default function Assessment() {
  const navigate = useNavigate();
  const location = useLocation();
  const [testCompletion, setTestCompletion] = useState<TestCompletionState>({
    aptitude: false,
    personality: false,
  });
  const [profileCompleted, setProfileCompleted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    checkProfileStatus();
    // Load session-based completion state from sessionStorage
    // State is only valid for the current page session (clears on refresh/navigation)
    const sessionState = sessionStorage.getItem("assessment_completion");
    const sessionTimestamp = sessionStorage.getItem("assessment_completion_timestamp");
    
    if (sessionState && sessionTimestamp) {
      try {
        const timestamp = parseInt(sessionTimestamp, 10);
        const now = Date.now();
        // State is valid for 2 minutes (enough time to complete both tests in one session)
        // This ensures it clears on refresh but persists during normal redirect flow
        if (now - timestamp < 2 * 60 * 1000) {
          const state = JSON.parse(sessionState);
          setTestCompletion(state);
        } else {
          // Timestamp expired (likely a refresh), clear stale state
          sessionStorage.removeItem("assessment_completion");
          sessionStorage.removeItem("assessment_completion_timestamp");
          setTestCompletion({ aptitude: false, personality: false });
        }
      } catch (e) {
        console.error("Failed to parse session state:", e);
        sessionStorage.removeItem("assessment_completion");
        sessionStorage.removeItem("assessment_completion_timestamp");
        setTestCompletion({ aptitude: false, personality: false });
      }
    } else {
      // No state found, ensure it's cleared
      setTestCompletion({ aptitude: false, personality: false });
    }
  }, []);

  // Note: We don't clear sessionStorage on unmount anymore
  // The state persists until explicitly cleared (on refresh after 2 minutes or when generating report)

  const checkProfileStatus = async () => {
    try {
      const user = getCurrentUser();
      if (!user) {
        navigate("/student/login");
        return;
      }

      const token = localStorage.getItem("authToken") || localStorage.getItem("accessToken");
      if (!token) {
        navigate("/student/login");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/profile/check`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Backend returns 'completed' field, not 'profile_completed'
        console.log("[Assessment] Profile check response:", data);
        setProfileCompleted(data.completed || false);
      } else {
        // If endpoint doesn't exist or returns error, check if profile exists
        console.warn("[Assessment] Profile check failed, checking profile directly...");
        // Try to fetch profile directly
        try {
          const profileResponse = await fetch(
            `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/profile`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          if (profileResponse.ok) {
            const profile = await profileResponse.json();
            // Check if educational details are filled
            const hasEducationDetails = 
              profile.school_or_college && 
              profile.education_type && 
              profile.branch && 
              profile.grade_or_year;
            setProfileCompleted(hasEducationDetails);
            console.log("[Assessment] Profile found, education details:", hasEducationDetails);
          } else {
            setProfileCompleted(false);
          }
        } catch (err) {
          console.error("[Assessment] Failed to check profile:", err);
          setProfileCompleted(false);
        }
      }
    } catch (error) {
      console.error("Failed to check profile status:", error);
      // Assume profile is completed if check fails
      setProfileCompleted(true);
    } finally {
      setLoading(false);
    }
  };

  const handleTestStart = (testType: "aptitude" | "personality") => {
    if (!profileCompleted) {
      toast({
        title: "Profile Required",
        description: "Please complete your profile before taking assessments",
      });
      return;
    }

    navigate(`/assessment/${testType}`);
  };

  const isTestInProgress = (testType: "aptitude" | "personality") => {
    const answersKey = testType === "aptitude" ? "aptitude_answers" : "personality_answers";
    const answers = sessionStorage.getItem(answersKey);
    return answers !== null && answers !== "{}";
  };

  const handleTestComplete = (testType: "aptitude" | "personality") => {
    const newState = {
      ...testCompletion,
      [testType]: true,
    };
    setTestCompletion(newState);
    // Save to sessionStorage
    sessionStorage.setItem("assessment_completion", JSON.stringify(newState));
  };

  const handleGenerateReport = async () => {
    // This should never happen due to conditional rendering, but add safety check
    if (!testCompletion.aptitude || !testCompletion.personality) {
      return;
    }

    setGeneratingReport(true);

    try {
      const token = localStorage.getItem("authToken") || localStorage.getItem("accessToken");
      if (!token) {
        navigate("/student/login");
        return;
      }

      // Optionally get answers from sessionStorage if still available
      // (They should be cleared after submission, but check just in case)
      const aptitudeAnswers = sessionStorage.getItem("aptitude_answers");
      const personalityAnswers = sessionStorage.getItem("personality_answers");
      
      const requestBody: any = {};
      
      // If answers are still in sessionStorage, include them for better AI evaluation
      if (aptitudeAnswers) {
        try {
          requestBody.answers = {
            aptitude: JSON.parse(aptitudeAnswers),
            personality: personalityAnswers ? JSON.parse(personalityAnswers) : {},
          };
        } catch (e) {
          console.warn("Failed to parse answers from sessionStorage:", e);
        }
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/assessments/generate-report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: Object.keys(requestBody).length > 0 ? JSON.stringify(requestBody) : undefined,
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Clear session state before navigating away
        sessionStorage.removeItem("assessment_completion");
        sessionStorage.removeItem("assessment_completion_timestamp");
        // Navigate to career report page
        navigate(`/assessment/report/${data.reportId || "new"}`);
      } else {
        const error = await response.json();
        toast({
          title: "Failed to Generate Report",
          description: error.error || "An error occurred while generating your report",
        });
      }
    } catch (error) {
      console.error("Failed to generate report:", error);
      toast({
        title: "Error",
        description: "Failed to generate career report. Please try again.",
      });
    } finally {
      setGeneratingReport(false);
    }
  };

  // Listen for test completion events from child pages
  useEffect(() => {
    const handleTestCompleteEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const testType = customEvent.detail?.testType as "aptitude" | "personality";
      if (testType) {
        setTestCompletion((prev) => {
          const newState = {
            ...prev,
            [testType]: true,
          };
          // Save to sessionStorage with timestamp
          sessionStorage.setItem("assessment_completion", JSON.stringify(newState));
          sessionStorage.setItem("assessment_completion_timestamp", Date.now().toString());
          return newState;
        });
      }
    };

    window.addEventListener("test-complete", handleTestCompleteEvent);
    return () => {
      window.removeEventListener("test-complete", handleTestCompleteEvent);
    };
  }, []);

  if (loading) {
    return (
      <DashboardLayout role="student" title="Career Assessment">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-body text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  const bothTestsCompleted = testCompletion.aptitude && testCompletion.personality;

  return (
    <DashboardLayout role="student" title="Career Assessment">
      <div className="space-y-6">
        {/* Header */}
        <div className="glass-card rounded-xl p-6 lg:p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5" />
          <div className="relative text-center space-y-2">
            <h1 className="text-headline text-foreground">Career Assessment</h1>
            <p className="text-body text-muted-foreground">
              Complete both tests to unlock your career report
            </p>
          </div>
        </div>

        {/* Profile Incomplete Message */}
        {!profileCompleted && (
          <div className="glass-card rounded-xl p-6 bg-warning/10 border border-warning/20">
            <p className="text-body text-center text-foreground">
              Please complete your profile before taking assessments
            </p>
          </div>
        )}

        {/* Assessment Cards */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Aptitude Test Card */}
          <div className="glass-card rounded-xl p-6 hover:shadow-card-hover transition-all duration-300 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
            <div className="relative space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-4 rounded-xl bg-primary/10 text-primary flex-shrink-0">
                  <Brain className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h2 className="text-title text-foreground">Aptitude Test</h2>
                    {testCompletion.aptitude && (
                      <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                  <p className="text-body-sm text-muted-foreground mb-3">
                    Measures logical, numerical, and problem-solving ability
                  </p>
                  <div className="flex flex-wrap gap-4 text-body-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">⏱</span>
                      <span>10 min</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">📝</span>
                      <span>50 questions</span>
                    </div>
                  </div>
                </div>
              </div>
              <Button
                variant={testCompletion.aptitude ? "outline" : "gradient"}
                className="w-full"
                onClick={() => handleTestStart("aptitude")}
                disabled={!profileCompleted}
              >
                {testCompletion.aptitude ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Completed
                  </>
                ) : isTestInProgress("aptitude") ? (
                  <>
                    Continue Test
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                ) : (
                  <>
                    Start Test
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Personality Test Card */}
          <div className="glass-card rounded-xl p-6 hover:shadow-card-hover transition-all duration-300 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent" />
            <div className="relative space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-4 rounded-xl bg-accent/10 text-accent flex-shrink-0">
                  <User className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h2 className="text-title text-foreground">Personality Test</h2>
                    {testCompletion.personality && (
                      <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                  <p className="text-body-sm text-muted-foreground mb-3">
                    Identifies your interests, strengths, and work preferences
                  </p>
                  <div className="flex flex-wrap gap-4 text-body-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">⏱</span>
                      <span>10 min</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">📝</span>
                      <span>50 questions</span>
                    </div>
                  </div>
                </div>
              </div>
              <Button
                variant={testCompletion.personality ? "outline" : "gradient"}
                className="w-full"
                onClick={() => handleTestStart("personality")}
                disabled={!profileCompleted}
              >
                {testCompletion.personality ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Completed
                  </>
                ) : isTestInProgress("personality") ? (
                  <>
                    Continue Test
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                ) : (
                  <>
                    Start Test
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        {!bothTestsCompleted ? (
          <div className="glass-card rounded-xl p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-muted/10 to-transparent" />
            <div className="relative text-center">
              <p className="text-body text-muted-foreground">
                Complete both assessments to generate your career report
              </p>
            </div>
          </div>
        ) : (
          <div className="glass-card rounded-xl p-6 lg:p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-success/5 via-primary/5 to-accent/5" />
            <div className="relative space-y-4">
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle className="h-6 w-6 text-success" />
                  <p className="text-body font-semibold text-foreground">
                    Both assessments completed!
                  </p>
                </div>
                <p className="text-body-sm text-muted-foreground">
                  Your report is ready based on your assessment results
                </p>
              </div>
              <div className="flex justify-center">
                <Button
                  variant="gradient"
                  size="lg"
                  onClick={handleGenerateReport}
                  disabled={generatingReport}
                  className="min-w-[280px] h-12 text-base font-semibold"
                >
                  {generatingReport ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Analyzing your profile and test results...
                    </>
                  ) : (
                    <>
                      Generate Career Report
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

