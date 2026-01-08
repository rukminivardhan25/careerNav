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
  options: string[]; // Array of actual option values (e.g., ["60 km/h", "70 km/h", "80 km/h", "90 km/h"])
}

export default function AptitudeAssessment() {
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
    const storedQuestions = sessionStorage.getItem("aptitude_questions");
    const storedAttemptId = sessionStorage.getItem("aptitude_assessmentAttemptId");
    
    if (storedQuestions && storedAttemptId) {
      try {
        const parsedQuestions = JSON.parse(storedQuestions);
        setQuestions(parsedQuestions);
        setAssessmentAttemptId(parseInt(storedAttemptId, 10));
        setLoading(false);
        console.log("[Aptitude] Loaded questions from sessionStorage");
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
    const savedAnswers = sessionStorage.getItem("aptitude_answers");
    if (savedAnswers) {
      try {
        setAnswers(JSON.parse(savedAnswers));
      } catch (e) {
        console.error("Failed to load saved answers:", e);
      }
    }

    // Load current question from sessionStorage
    const savedQuestion = sessionStorage.getItem("aptitude_current_question");
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
    sessionStorage.setItem("aptitude_answers", JSON.stringify(answers));
  }, [answers]);

  useEffect(() => {
    // Save current question to sessionStorage
    sessionStorage.setItem("aptitude_current_question", currentQuestion.toString());
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
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/assessments/start?type=aptitude`,
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
        
        console.log("[Aptitude] API Response:", {
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
              options: Array.isArray(q.options) ? q.options : [],
            };
          });
          
          // Store questions and attemptId in sessionStorage (NOT in database)
          sessionStorage.setItem("aptitude_questions", JSON.stringify(transformedQuestions));
          sessionStorage.setItem("aptitude_assessmentAttemptId", attemptId.toString());
          
          setQuestions(transformedQuestions);
          setAssessmentAttemptId(attemptId);
          console.log(`[Aptitude] Loaded ${transformedQuestions.length} questions and stored in sessionStorage`);
        } else {
          console.error("[Aptitude] API returned no questions or attemptId! Check backend logs.");
          toast({
            title: "Error",
            description: "Failed to generate questions. Please try again.",
            variant: "destructive",
          });
          setQuestions(generateMockQuestions());
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("[Aptitude] API call failed:", response.status, errorData);
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
      "What is the next number in the sequence: 2, 6, 12, 20, 30, ?",
      "If a train travels 120 km in 2 hours, what is its average speed?",
      "A shopkeeper sells an item for ₹500 and makes a profit of 25%. What was the cost price?",
      "If 3x + 5 = 20, what is the value of x?",
      "What is 15% of 240?",
      "If the ratio of boys to girls in a class is 3:2 and there are 30 students, how many girls are there?",
      "A rectangle has length 8 cm and width 5 cm. What is its area?",
      "If 2^3 × 2^4 = 2^x, what is the value of x?",
      "What is the square root of 144?",
      "If a clock shows 3:15, what is the angle between the hour and minute hands?",
      "A number is increased by 20% and then decreased by 20%. What is the net change?",
      "If 5 workers can complete a job in 8 days, how many days will 10 workers take?",
      "What is the sum of the first 10 natural numbers?",
      "If the perimeter of a square is 24 cm, what is its area?",
      "A car travels 60 km in the first hour and 80 km in the second hour. What is the average speed?",
      "What is the value of 2^5?",
      "If 40% of a number is 80, what is the number?",
      "What is the least common multiple (LCM) of 6 and 8?",
      "If a triangle has sides of 3, 4, and 5 units, what type of triangle is it?",
      "What is 25% of 200?",
      "If x + y = 10 and x - y = 4, what is the value of x?",
      "A circle has a radius of 7 cm. What is its area? (Use π = 22/7)",
      "What is the greatest common divisor (GCD) of 12 and 18?",
      "If 3/4 of a number is 45, what is the number?",
      "What is the value of 10^3?",
      "A bag contains 5 red and 3 blue balls. What is the probability of drawing a red ball?",
      "If the selling price is ₹600 and the profit is 20%, what is the cost price?",
      "What is the next prime number after 17?",
      "If 2x = 16, what is the value of x?",
      "What is the area of a rectangle with length 12 cm and width 8 cm?",
      "If a number is divided by 5, the remainder is 3. If divided by 7, the remainder is 5. What is the smallest such number?",
      "What is 1/2 + 1/3?",
      "If the sum of two numbers is 15 and their difference is 5, what are the numbers?",
      "What is the value of 5! (5 factorial)?",
      "A train 150m long passes a platform 200m long in 10 seconds. What is the speed of the train?",
      "What is the cube root of 27?",
      "If 30% of students are girls and there are 210 students, how many are boys?",
      "What is the next number: 1, 4, 9, 16, 25, ?",
      "If a discount of 15% is given on ₹1000, what is the final price?",
      "What is the value of 2^6?",
      "A rectangle's length is twice its width. If the perimeter is 36 cm, what is the area?",
      "What is 3/5 expressed as a percentage?",
      "If 4x - 3 = 13, what is the value of x?",
      "What is the sum of angles in a triangle?",
      "If a number is multiplied by 3 and then 5 is added, the result is 26. What is the number?",
      "What is the value of 7^2?",
      "A shop has 20% discount on all items. If an item costs ₹500 after discount, what was the original price?",
      "What is the next number: 2, 4, 8, 16, 32, ?",
      "If the area of a circle is 154 cm² (π = 22/7), what is its radius?",
      "What is 1/4 of 200?",
    ];

    // Mock questions with real option values (fallback only)
    return Array.from({ length: TOTAL_QUESTIONS }, (_, i) => ({
      id: i + 1,
      question: questionTemplates[i % questionTemplates.length] || `Aptitude Question ${i + 1}: Solve this problem.`,
      options: ["40", "42", "36", "48"], // Example real values - will be replaced by API
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
            type: "aptitude",
            answers: answers,
          }),
        }
      );

      if (response.ok) {
        // Clear session storage (questions and answers are transient)
        sessionStorage.removeItem("aptitude_answers");
        sessionStorage.removeItem("aptitude_current_question");
        sessionStorage.removeItem("aptitude_questions");
        sessionStorage.removeItem("aptitude_assessmentAttemptId");

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
        completionState.aptitude = true;
        sessionStorage.setItem("assessment_completion", JSON.stringify(completionState));
        sessionStorage.setItem("assessment_completion_timestamp", Date.now().toString());

        // Dispatch completion event
        window.dispatchEvent(
          new CustomEvent("test-complete", { detail: { testType: "aptitude" } })
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
      <DashboardLayout role="student" title="Aptitude Test">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-body text-muted-foreground">Loading questions...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="student" title="Aptitude Test">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Sticky Timer Header */}
        <div className="glass-card rounded-xl p-4 sticky top-4 z-10">
          <div className="flex items-center justify-between">
            <h1 className="text-title text-foreground">Aptitude Test</h1>
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
              options={currentQ.options}
              selectedOption={answers[currentQ.id]}
              onSelect={(optionValue) => handleSelect(currentQ.id, optionValue)}
              type="mcq"
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
                        ? "bg-primary text-primary-foreground shadow-lg ring-2 ring-primary ring-offset-2 scale-110"
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
                        ? "bg-primary text-primary-foreground shadow-lg ring-2 ring-primary ring-offset-2 scale-105"
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
