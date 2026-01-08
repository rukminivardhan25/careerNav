import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Mic,
  MicOff,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Clock,
  Lightbulb,
  SkipForward,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getAuthToken } from "@/lib/auth";
import { toast } from "sonner";

interface InterviewQuestion {
  id: number;
  question: string;
  tip: string;
}

interface InterviewConfig {
  interview: {
    id: string;
    title: string;
    skill: string;
    role: string;
    interviewType: string;
    difficulty: string;
  };
  questionCount: number;
  answerMode: "text" | "voice" | "both";
}

/**
 * Generate interview questions based on interview type and skill
 * Note: This is a placeholder. In production, questions come from backend API
 * which uses AI (Groq) to generate personalized questions.
 */
const generateQuestions = (
  interviewType: string,
  skill: string,
  count: number
): InterviewQuestion[] => {
  // For now, return sample questions. In production, this would call an API
  // The actual implementation fetches questions from /api/interviews/generate
  const baseQuestions: InterviewQuestion[] = [
    {
      id: 1,
      question: "Tell me about yourself and your background.",
      tip: "Keep it concise, focus on relevant experience, and end with why you're interested in this role.",
    },
    {
      id: 2,
      question: `What experience do you have with ${skill}?`,
      tip: "Provide specific examples of projects or work you've done with this technology.",
    },
    {
      id: 3,
      question: "Describe a challenging technical problem you solved.",
      tip: "Use the STAR method: Situation, Task, Action, Result.",
    },
    {
      id: 4,
      question: "How do you approach debugging a complex issue?",
      tip: "Explain your systematic approach to problem-solving.",
    },
    {
      id: 5,
      question: "What are your greatest strengths as a developer?",
      tip: "Choose 2-3 strengths relevant to the role and back them up with examples.",
    },
    {
      id: 6,
      question: "How do you stay updated with new technologies?",
      tip: "Mention specific resources, communities, or learning methods you use.",
    },
    {
      id: 7,
      question: "Describe a time you had to work under pressure.",
      tip: "Give specific examples of how you've successfully managed stress and deadlines.",
    },
    {
      id: 8,
      question: "Why should we hire you for this role?",
      tip: "Summarize your unique value proposition and how you can contribute.",
    },
    {
      id: 9,
      question: "What questions do you have for us?",
      tip: "Always have thoughtful questions prepared about the role, team, or company culture.",
    },
    {
      id: 10,
      question: "Where do you see yourself in 5 years?",
      tip: "Show ambition while demonstrating commitment to the company's growth.",
    },
  ];

  // Return only the requested number of questions
  return baseQuestions.slice(0, count);
};

export default function InterviewSession() {
  const navigate = useNavigate();
  const location = useLocation();
  const config = location.state as InterviewConfig | undefined;

  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isRecording, setIsRecording] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [timePerQuestion, setTimePerQuestion] = useState(0); // in seconds
  const [questionStartTime, setQuestionStartTime] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize questions and timer
  useEffect(() => {
    if (!config) {
      navigate("/interview/mock");
      return;
    }

    const generatedQuestions = generateQuestions(
      config.interview.interviewType,
      config.interview.skill,
      config.questionCount
    );
    setQuestions(generatedQuestions);
    setQuestionStartTime(new Date());
  }, [config, navigate]);

  // Timer for current question
  useEffect(() => {
    if (questionStartTime && !isCompleted) {
      intervalRef.current = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - questionStartTime.getTime()) / 1000);
        setTimePerQuestion(elapsed);
      }, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [questionStartTime, isCompleted]);

  if (!config) {
    return null;
  }

  const progress = questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0;
  const question = questions[currentQuestion];
  const canUseVoice = config.answerMode === "voice" || config.answerMode === "both";
  const canUseText = config.answerMode === "text" || config.answerMode === "both";

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setShowTip(false);
      setQuestionStartTime(new Date());
      setTimePerQuestion(0);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setShowTip(false);
      setQuestionStartTime(new Date());
      setTimePerQuestion(0);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleComplete = async () => {
    try {
      // Save mock interview completion to backend
      const token = getAuthToken();
      if (!token) {
        toast.error("Authentication required");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "https://career-nav-backend.onrender.com/api"}/interviews/complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            interviewTitle: config.interview.title,
            skill: config.interview.skill,
            role: config.interview.role,
            interviewType: config.interview.interviewType,
            difficulty: config.interview.difficulty,
            questionCount: questions.length,
            answers: answers,
          }),
        }
      );

      if (response.ok) {
        setIsCompleted(true);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        toast.success("Mock interview completed and saved!");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save interview completion");
        // Still mark as completed locally even if save fails
        setIsCompleted(true);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }
    } catch (error) {
      console.error("Error saving interview completion:", error);
      toast.error("Failed to save interview completion. Please try again.");
      // Still mark as completed locally even if save fails
      setIsCompleted(true);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  };

  if (isCompleted) {
    return (
      <DashboardLayout role="student" title="Interview Complete">
        <div className="max-w-2xl mx-auto">
          <div className="glass-card rounded-xl p-8 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-success" />
            </div>
            <h1 className="text-display-sm text-foreground">Interview Complete!</h1>
            <p className="text-body-lg text-muted-foreground">
              Great job completing your mock interview. Your responses have been saved for AI analysis.
            </p>
            <div className="glass-card p-6 rounded-xl bg-muted/50">
              <h3 className="text-title text-foreground mb-4">Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-left">
                <div>
                  <p className="text-body-sm text-muted-foreground">Questions Answered</p>
                  <p className="text-headline text-foreground">
                    {Object.keys(answers).length}/{questions.length}
                  </p>
                </div>
                <div>
                  <p className="text-body-sm text-muted-foreground">Interview Type</p>
                  <p className="text-headline text-foreground">{config.interview.interviewType}</p>
                </div>
                <div>
                  <p className="text-body-sm text-muted-foreground">Skill</p>
                  <p className="text-headline text-foreground">{config.interview.skill}</p>
                </div>
                <div>
                  <p className="text-body-sm text-muted-foreground">Answer Mode</p>
                  <p className="text-headline text-foreground capitalize">{config.answerMode}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-4 justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  navigate("/interview/mock");
                }}
              >
                Back to Hub
              </Button>
              <Button variant="gradient">View AI Feedback</Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (questions.length === 0) {
    return (
      <DashboardLayout role="student" title="Loading Interview">
        <div className="max-w-2xl mx-auto">
          <div className="glass-card rounded-xl p-8 text-center">
            <p className="text-body text-foreground">Loading interview questions...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="student" title="Mock Interview">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-headline text-foreground">{config.interview.title}</h1>
              <p className="text-body-sm text-muted-foreground mt-1">
                {config.interview.interviewType} Interview - {config.interview.skill}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-body font-semibold text-foreground">
                  {formatTime(timePerQuestion)}
                </span>
              </div>
              <Badge variant="outline">{config.interview.difficulty}</Badge>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-body-sm">
              <span className="text-muted-foreground">
                Question {currentQuestion + 1} of {questions.length}
              </span>
              <span className="text-foreground font-medium">{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        {/* Question */}
        <div className="glass-card rounded-xl p-6 lg:p-8 space-y-6">
          <div className="flex items-start gap-4">
            <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent text-white font-bold text-body flex items-center justify-center">
              {currentQuestion + 1}
            </span>
            <div className="space-y-2 flex-1">
              <h2 className="text-title text-foreground">{question.question}</h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary"
                onClick={() => setShowTip(!showTip)}
              >
                <Lightbulb className="h-4 w-4" />
                {showTip ? "Hide Tip" : "Show Tip"}
              </Button>
            </div>
          </div>

          {showTip && (
            <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                <p className="text-body-sm text-foreground">{question.tip}</p>
              </div>
            </div>
          )}

          {/* Answer area */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-body font-medium text-foreground">Your Answer</label>
              {canUseVoice && (
                <Button
                  variant={isRecording ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => setIsRecording(!isRecording)}
                >
                  {isRecording ? (
                    <>
                      <MicOff className="h-4 w-4" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4" />
                      Record Answer
                    </>
                  )}
                </Button>
              )}
            </div>

            {isRecording && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
                  <p className="text-body-sm text-foreground">Recording in progress...</p>
                </div>
              </div>
            )}

            {canUseText && (
              <Textarea
                placeholder={
                  canUseVoice
                    ? "Type your answer here or use the record button above..."
                    : "Type your answer here..."
                }
                value={answers[question.id] || ""}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))
                }
                className="min-h-[200px] resize-none"
                disabled={!canUseText}
              />
            )}

            {!canUseText && canUseVoice && (
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="text-body-sm text-muted-foreground text-center">
                  Voice-only mode. Use the record button to answer.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentQuestion === 0}
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>

            {/* Question dots */}
            <div className="hidden sm:flex items-center gap-1">
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setCurrentQuestion(i);
                    setShowTip(false);
                    setQuestionStartTime(new Date());
                    setTimePerQuestion(0);
                  }}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    i === currentQuestion
                      ? "bg-primary"
                      : answers[questions[i].id]
                      ? "bg-success"
                      : "bg-muted"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {currentQuestion < questions.length - 1 && (
                <Button variant="outline" onClick={handleSkip}>
                  <SkipForward className="h-4 w-4 mr-2" />
                  Skip
                </Button>
              )}
              {currentQuestion === questions.length - 1 ? (
                <Button variant="gradient" onClick={handleComplete}>
                  <CheckCircle className="h-4 w-4" />
                  Complete Interview
                </Button>
              ) : (
                <Button variant="default" onClick={handleNext}>
                  Next Question
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}




