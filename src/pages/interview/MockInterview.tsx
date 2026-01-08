import { useState } from "react";
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
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const interviewQuestions = [
  {
    id: 1,
    question: "Tell me about yourself and your background.",
    tip: "Keep it concise, focus on relevant experience, and end with why you're interested in this role.",
  },
  {
    id: 2,
    question: "What are your greatest strengths?",
    tip: "Choose 2-3 strengths relevant to the job and back them up with examples.",
  },
  {
    id: 3,
    question: "Where do you see yourself in 5 years?",
    tip: "Show ambition while demonstrating commitment to the company's growth.",
  },
  {
    id: 4,
    question: "Why do you want to work for our company?",
    tip: "Research the company beforehand and mention specific aspects that appeal to you.",
  },
  {
    id: 5,
    question: "Describe a challenging situation you faced and how you handled it.",
    tip: "Use the STAR method: Situation, Task, Action, Result.",
  },
  {
    id: 6,
    question: "What is your greatest weakness?",
    tip: "Be honest but show how you're actively working to improve.",
  },
  {
    id: 7,
    question: "How do you handle pressure and tight deadlines?",
    tip: "Give specific examples of how you've successfully managed stress.",
  },
  {
    id: 8,
    question: "Why should we hire you?",
    tip: "Summarize your unique value proposition and how you can contribute.",
  },
  {
    id: 9,
    question: "What questions do you have for us?",
    tip: "Always have thoughtful questions prepared about the role, team, or company culture.",
  },
  {
    id: 10,
    question: "What are your salary expectations?",
    tip: "Research market rates and provide a range rather than a specific number.",
  },
];

export default function MockInterview() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isRecording, setIsRecording] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const progress = ((currentQuestion + 1) / interviewQuestions.length) * 100;
  const question = interviewQuestions[currentQuestion];

  const handleNext = () => {
    if (currentQuestion < interviewQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setShowTip(false);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setShowTip(false);
    }
  };

  const handleComplete = () => {
    setIsCompleted(true);
  };

  if (isCompleted) {
    return (
      <DashboardLayout role="student" title="Mock Interview">
        <div className="max-w-2xl mx-auto">
          <div className="glass-card rounded-xl p-8 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-success" />
            </div>
            <h1 className="text-display-sm text-foreground">
              Interview Complete!
            </h1>
            <p className="text-body-lg text-muted-foreground">
              Great job completing your mock interview. Your responses have been
              saved for AI analysis.
            </p>
            <div className="glass-card p-6 rounded-xl bg-muted/50">
              <h3 className="text-title text-foreground mb-4">Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-left">
                <div>
                  <p className="text-body-sm text-muted-foreground">
                    Questions Answered
                  </p>
                  <p className="text-headline text-foreground">
                    {Object.keys(answers).length}/{interviewQuestions.length}
                  </p>
                </div>
                <div>
                  <p className="text-body-sm text-muted-foreground">
                    Time Spent
                  </p>
                  <p className="text-headline text-foreground">~15 mins</p>
                </div>
              </div>
            </div>
            <div className="flex gap-4 justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCompleted(false);
                  setCurrentQuestion(0);
                  setAnswers({});
                }}
              >
                Start Over
              </Button>
              <Button variant="gradient">View AI Feedback</Button>
            </div>
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
              <h1 className="text-headline text-foreground">
                Behavioral Interview Practice
              </h1>
              <p className="text-body-sm text-muted-foreground mt-1">
                Practice answering common interview questions
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-body font-semibold text-foreground">
                ~2 min per question
              </span>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-body-sm">
              <span className="text-muted-foreground">
                Question {currentQuestion + 1} of {interviewQuestions.length}
              </span>
              <span className="text-foreground font-medium">
                {Math.round(progress)}% complete
              </span>
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
            <div className="space-y-2">
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
              <label className="text-body font-medium text-foreground">
                Your Answer
              </label>
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
            </div>

            {isRecording && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
                  <p className="text-body-sm text-foreground">
                    Recording in progress...
                  </p>
                </div>
              </div>
            )}

            <Textarea
              placeholder="Type your answer here or use the record button above..."
              value={answers[question.id] || ""}
              onChange={(e) =>
                setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))
              }
              className="min-h-[200px] resize-none"
            />
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
              {interviewQuestions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentQuestion(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    i === currentQuestion
                      ? "bg-primary"
                      : answers[interviewQuestions[i].id]
                      ? "bg-success"
                      : "bg-muted"
                  }`}
                />
              ))}
            </div>

            {currentQuestion === interviewQuestions.length - 1 ? (
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
    </DashboardLayout>
  );
}
