import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { QuestionCard } from "@/components/assessment/QuestionCard";
import { Button } from "@/components/ui/button";
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
import { ArrowLeft, ArrowRight, Clock, CheckCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

const TOTAL_QUESTIONS = 50;
const QUESTIONS_PER_PAGE = 10;
const TIME_LIMIT_SECONDS = 10 * 60; // 10 minutes

interface Question {
  id: number;
  question: string;
  question_text?: string;
  options?: string[]; // Array of actual option values (Likert scale or choice options)
}

export default function PersonalityAssessment() {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [currentRange, setCurrentRange] = useState(1); // Range 1 = 1-10, Range 2 = 11-20, etc.
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(TIME_LIMIT_SECONDS);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);
  const [assessmentAttemptId, setAssessmentAttemptId] = useState<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoSubmittedRef = useRef(false);

  const totalRanges = Math.ceil(TOTAL_QUESTIONS / QUESTIONS_PER_PAGE);
  const rangeStart = (currentRange - 1) * QUESTIONS_PER_PAGE + 1;
  const rangeEnd = Math.min(currentRange * QUESTIONS_PER_PAGE, TOTAL_QUESTIONS);
  const currentQ = questions[currentQuestion - 1];

  useEffect(() => {
    // Check if questions are already in sessionStorage
    const storedQuestions = sessionStorage.getItem("personality_questions");
    const storedAttemptId = sessionStorage.getItem("personality_assessmentAttemptId");
    
    if (storedQuestions && storedAttemptId) {
      try {
        const parsedQuestions = JSON.parse(storedQuestions);
        setQuestions(parsedQuestions);
        setAssessmentAttemptId(parseInt(storedAttemptId, 10));
        setLoading(false);
        console.log("[Personality] Loaded questions from sessionStorage");
      } catch (e) {
        console.error("Failed to load questions from sessionStorage:", e);
        fetchQuestions();
      }
    } else {
      fetchQuestions();
    }
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Load saved answers from sessionStorage
    const savedAnswers = sessionStorage.getItem("personality_answers");
    if (savedAnswers) {
      try {
        setAnswers(JSON.parse(savedAnswers));
      } catch (e) {
        console.error("Failed to load saved answers:", e);
      }
    }

    // Load current question from sessionStorage
    const savedQuestion = sessionStorage.getItem("personality_current_question");
    if (savedQuestion) {
      const qNum = parseInt(savedQuestion, 10);
      if (qNum >= 1 && qNum <= TOTAL_QUESTIONS) {
        setCurrentQuestion(qNum);
        // Set current range based on question number
        setCurrentRange(Math.ceil(qNum / QUESTIONS_PER_PAGE));
      }
    }
  }, []);

  useEffect(() => {
    // Start timer when questions are loaded and component is mounted
    if (questions.length > 0 && !loading) {
      // Small delay to ensure component is fully rendered
      const timer = setTimeout(() => {
        startTimer();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [questions, loading]);

  useEffect(() => {
    // Auto-save answers to sessionStorage
    sessionStorage.setItem("personality_answers", JSON.stringify(answers));
  }, [answers]);

  useEffect(() => {
    // Save current question to sessionStorage
    sessionStorage.setItem("personality_current_question", currentQuestion.toString());
    // Update current range when question changes
    setCurrentRange(Math.ceil(currentQuestion / QUESTIONS_PER_PAGE));
  }, [currentQuestion]);

  const fetchQuestions = async () => {
    try {
      const token = localStorage.getItem("authToken") || localStorage.getItem("accessToken");
      if (!token) {
        navigate("/student/login");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/assessments/start?type=personality`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const apiQuestions = data.questions || [];
        const attemptId = data.assessmentAttemptId;
        
        console.log("[Personality] API Response:", {
          assessmentAttemptId: attemptId,
          questionCount: apiQuestions.length,
          firstQuestion: apiQuestions[0],
        });
        
        if (apiQuestions.length > 0 && attemptId) {
          // Transform API questions to match our structure
          const transformedQuestions: Question[] = apiQuestions.map((q: any, index: number) => {
            return {
              id: q.id || index + 1,
              question: q.question || q.question_text || "",
              options: Array.isArray(q.options) && q.options.length > 0 ? q.options : [
                "Strongly Disagree",
                "Disagree",
                "Neutral",
                "Agree",
                "Strongly Agree"
              ],
            };
          });
          
          // Store questions and attemptId in sessionStorage (NOT in database)
          sessionStorage.setItem("personality_questions", JSON.stringify(transformedQuestions));
          sessionStorage.setItem("personality_assessmentAttemptId", attemptId.toString());
          
          setQuestions(transformedQuestions);
          setAssessmentAttemptId(attemptId);
          console.log(`[Personality] Loaded ${transformedQuestions.length} questions and stored in sessionStorage`);
        } else {
          console.error("[Personality] API returned no questions or attemptId! Check backend logs.");
          toast({
            title: "Error",
            description: "Failed to generate questions. Please try again.",
            variant: "destructive",
          });
          setQuestions(generateMockQuestions());
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("[Personality] API call failed:", response.status, errorData);
        toast({
          title: "Error",
          description: errorData.message || "Failed to fetch questions. Please try again.",
          variant: "destructive",
        });
        setQuestions(generateMockQuestions());
      }
    } catch (error) {
      console.error("Failed to fetch questions:", error);
      setQuestions(generateMockQuestions());
    } finally {
      setLoading(false);
    }
  };

  const generateMockQuestions = (): Question[] => {
    const questionTemplates = [
      "I enjoy meeting new people and socializing at events.",
      "I prefer to plan things ahead rather than be spontaneous.",
      "I find it easy to express my emotions to others.",
      "I prefer working in a team rather than working alone.",
      "I often think about the deeper meaning of life and events.",
      "I stay calm under pressure and handle stress well.",
      "I enjoy trying new things and stepping out of my comfort zone.",
      "I pay attention to details and notice things others might miss.",
      "I find it easy to adapt when plans change unexpectedly.",
      "I prefer to lead rather than follow in group situations.",
    ];
    
    // Mock questions with Likert scale options (fallback only)
    return Array.from({ length: TOTAL_QUESTIONS }, (_, i) => ({
      id: i + 1,
      question: questionTemplates[i % questionTemplates.length],
      options: [
        "Strongly Disagree",
        "Disagree",
        "Neutral",
        "Agree",
        "Strongly Agree"
      ],
    }));
  };

  const startTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time's up - auto submit
          if (!autoSubmittedRef.current) {
            autoSubmittedRef.current = true;
            handleAutoSubmit();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSelect = (questionId: number, optionValue: string) => {
    // Store the actual option value, not an ID
    setAnswers((prev) => ({ ...prev, [questionId]: optionValue }));
    // Show save feedback briefly
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 1500);
  };

  const handlePrevious = () => {
    if (currentQuestion > 1) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleNext = () => {
    if (currentQuestion < TOTAL_QUESTIONS) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handleRangeJump = (rangeNum: number) => {
    if (rangeNum >= 1 && rangeNum <= totalRanges) {
      const rangeStartQ = (rangeNum - 1) * QUESTIONS_PER_PAGE + 1;
      setCurrentQuestion(rangeStartQ);
      setCurrentRange(rangeNum);
    }
  };

  const handleQuestionJump = (questionNum: number) => {
    if (questionNum >= 1 && questionNum <= TOTAL_QUESTIONS) {
      setCurrentQuestion(questionNum);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem("authToken") || localStorage.getItem("accessToken");
      if (!token) {
        navigate("/student/login");
        return;
      }

      if (!assessmentAttemptId) {
        toast({
          title: "Error",
          description: "Assessment attempt not found. Please start the test again.",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/assessments/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            assessmentAttemptId: assessmentAttemptId,
            type: "personality",
            answers: answers,
          }),
        }
      );

      if (response.ok) {
        // Clear session storage (questions and answers are transient)
        sessionStorage.removeItem("personality_answers");
        sessionStorage.removeItem("personality_current_question");
        sessionStorage.removeItem("personality_questions");
        sessionStorage.removeItem("personality_assessmentAttemptId");

        // Stop timer
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }

        // Update completion state in sessionStorage BEFORE navigation
        const existingState = sessionStorage.getItem("assessment_completion");
        let completionState = { aptitude: false, personality: false };
        if (existingState) {
          try {
            completionState = JSON.parse(existingState);
          } catch (e) {
            console.error("Failed to parse completion state:", e);
          }
        }
        completionState.personality = true;
        sessionStorage.setItem("assessment_completion", JSON.stringify(completionState));
        sessionStorage.setItem("assessment_completion_timestamp", Date.now().toString());

        // Dispatch completion event
        window.dispatchEvent(
          new CustomEvent("test-complete", { detail: { testType: "personality" } })
        );

        // Small delay to ensure event is processed, then navigate
        setTimeout(() => {
          navigate("/assessment");
        }, 100);
      } else {
        const error = await response.json();
        toast({
          title: "Submission Failed",
          description: error.error || "Failed to submit test. Please try again.",
        });
      }
    } catch (error) {
      console.error("Failed to submit test:", error);
      toast({
        title: "Error",
        description: "Failed to submit test. Please try again.",
      });
    } finally {
      setSubmitting(false);
      setShowSubmitDialog(false);
    }
  };

  const handleAutoSubmit = async () => {
    if (autoSubmittedRef.current) return;

    autoSubmittedRef.current = true;

    // Stop timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    toast({
      title: "Time's Up",
      description: "Your test has been submitted automatically.",
    });

    // Submit automatically
    await handleSubmit();
  };

  if (loading) {
    return (
      <DashboardLayout role="student" title="Personality Test">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-body text-muted-foreground">Loading questions...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="student" title="Personality Test">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Sticky Timer Header */}
        <div className="glass-card rounded-xl p-4 sticky top-4 z-10">
          <div className="flex items-center justify-between">
            <h1 className="text-title text-foreground">Personality Test</h1>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-300 ${
              timeRemaining <= 30 
                ? "bg-destructive/20 text-destructive animate-pulse" 
                : timeRemaining <= 120 
                ? "bg-warning/20 text-warning" 
                : "bg-muted"
            }`}>
              <Clock className="h-4 w-4" />
              <span className="text-body font-semibold">
                ⏱ {formatTime(timeRemaining)}
              </span>
            </div>
          </div>
        </div>

        {/* Current Question */}
        {currentQ ? (
          <div className="relative">
            <QuestionCard
              questionNumber={currentQuestion}
              question={currentQ.question}
              options={currentQ.options || [
                "Strongly Disagree",
                "Disagree",
                "Neutral",
                "Agree",
                "Strongly Agree"
              ]}
              selectedOption={answers[currentQ.id]}
              onSelect={(optionValue) => handleSelect(currentQ.id, optionValue)}
              type="likert"
            />
            {saveFeedback && (
              <div className="absolute bottom-4 right-4 text-caption text-muted-foreground animate-fade-in">
                Answer saved
              </div>
            )}
          </div>
        ) : (
          <div className="glass-card rounded-xl p-8 text-center">
            <p className="text-body text-muted-foreground">Loading question...</p>
          </div>
        )}

        {/* Navigation Controls */}
        <div className="glass-card rounded-xl p-4 space-y-6">
          {/* Previous/Next Buttons */}
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestion === 1}
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>

            <div className="text-body-sm text-muted-foreground font-medium">
              Question {currentQuestion} of {TOTAL_QUESTIONS}
            </div>

            <Button
              variant="default"
              onClick={handleNext}
              disabled={currentQuestion === TOTAL_QUESTIONS}
              className="flex-1"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Individual Question Buttons for Current Range */}
          <div className="space-y-3">
            <div className="text-body-sm font-semibold text-foreground text-center">
              Questions {rangeStart}-{rangeEnd}:
            </div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {Array.from({ length: rangeEnd - rangeStart + 1 }).map((_, i) => {
                const questionNum = rangeStart + i;
                const isAnswered = answers[questionNum] !== undefined;
                const isCurrent = questionNum === currentQuestion;

                return (
                  <button
                    key={questionNum}
                    onClick={() => handleQuestionJump(questionNum)}
                    className={`w-10 h-10 rounded-lg text-body-sm font-semibold transition-all duration-200 ${
                      isCurrent
                        ? "bg-accent text-accent-foreground shadow-lg ring-2 ring-accent ring-offset-2 scale-110"
                        : isAnswered
                        ? "bg-success text-success-foreground hover:bg-success/90 border-2 border-success"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 border-2 border-transparent"
                    }`}
                    title={isCurrent ? "Current question" : isAnswered ? "Answered" : "Unanswered"}
                  >
                    {questionNum}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Range Buttons (1-10, 11-20, etc.) */}
          <div className="space-y-3">
            <div className="text-body-sm font-semibold text-foreground text-center">
              Ranges:
            </div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {Array.from({ length: totalRanges }).map((_, i) => {
                const rangeNum = i + 1;
                const rangeStartQ = (rangeNum - 1) * QUESTIONS_PER_PAGE + 1;
                const rangeEndQ = Math.min(rangeNum * QUESTIONS_PER_PAGE, TOTAL_QUESTIONS);
                const isCurrent = rangeNum === currentRange;
                const hasAnswered = Array.from({ length: rangeEndQ - rangeStartQ + 1 }, (_, idx) => rangeStartQ + idx)
                  .some(qNum => answers[qNum] !== undefined);

                return (
                  <button
                    key={rangeNum}
                    onClick={() => handleRangeJump(rangeNum)}
                    className={`px-4 py-2 rounded-lg text-body-sm font-semibold transition-all duration-200 ${
                      isCurrent
                        ? "bg-accent text-accent-foreground shadow-lg ring-2 ring-accent ring-offset-2 scale-105"
                        : hasAnswered
                        ? "bg-success/20 text-success hover:bg-success/30 border-2 border-success/30"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 border-2 border-transparent"
                    }`}
                  >
                    {rangeStartQ}–{rangeEndQ}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center pt-4 border-t border-border">
            <Button
              variant="gradient"
              onClick={() => setShowSubmitDialog(true)}
              disabled={submitting || Object.keys(answers).length === 0}
              className="min-w-[250px] h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              {submitting ? "Submitting..." : "Submit Test"}
            </Button>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Test?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit? You cannot retake this test.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
