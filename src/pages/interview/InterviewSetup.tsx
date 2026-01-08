import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Mic, Mic2, ArrowRight, CheckCircle } from "lucide-react";

interface InterviewOption {
  id: string;
  title: string;
  skill: string;
  role: string;
  interviewType: string;
  difficulty: string;
  questionCount: number;
  estimatedDuration: number;
  description: string;
}

type AnswerMode = "text" | "voice" | "both";

export default function InterviewSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const interview = location.state?.interview as InterviewOption | undefined;

  const [questionCount, setQuestionCount] = useState<number>(10);
  const [answerMode, setAnswerMode] = useState<AnswerMode>("both");
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (!interview) {
      // Redirect to hub if no interview selected
      navigate("/interview/mock");
    }
  }, [interview, navigate]);

  if (!interview) {
    return null;
  }

  const handleStartInterview = () => {
    setIsStarting(true);
    // Navigate to interview session with configuration
    navigate("/interview/session", {
      state: {
        interview,
        questionCount,
        answerMode,
      },
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-success/10 text-success border-success/20";
      case "Intermediate":
        return "bg-warning/10 text-warning border-warning/20";
      case "Hard":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <DashboardLayout role="student" title="Interview Setup">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="glass-card rounded-xl p-6">
          <h1 className="text-headline text-foreground mb-2">Interview Setup</h1>
          <p className="text-body text-muted-foreground">
            Configure your interview settings before starting
          </p>
        </div>

        {/* Interview Summary Card */}
        <Card className="glass-card rounded-xl border-l-4 border-primary">
          <CardHeader>
            <div className="flex items-start justify-between mb-2">
              <CardTitle className="text-title text-foreground">{interview.title}</CardTitle>
              <Badge variant="outline" className={getDifficultyColor(interview.difficulty)}>
                {interview.difficulty}
              </Badge>
            </div>
            <CardDescription className="text-body-sm text-muted-foreground">
              {interview.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-body-sm">
              <div>
                <span className="text-muted-foreground">Skill:</span>
                <span className="ml-2 font-medium text-foreground">{interview.skill}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Role:</span>
                <span className="ml-2 font-medium text-foreground">{interview.role}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Type:</span>
                <span className="ml-2 font-medium text-foreground">{interview.interviewType}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Duration:</span>
                <span className="ml-2 font-medium text-foreground">
                  ~{interview.estimatedDuration} minutes
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Options */}
        <div className="glass-card rounded-xl p-6 space-y-6">
          {/* Question Count Selection */}
          <div className="space-y-3">
            <Label className="text-body font-semibold text-foreground">
              Number of Questions
            </Label>
            <Select
              value={questionCount.toString()}
              onValueChange={(value) => setQuestionCount(parseInt(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 Questions (~15 minutes)</SelectItem>
                <SelectItem value="10">10 Questions (~30 minutes)</SelectItem>
                <SelectItem value="15">15 Questions (~45 minutes)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-body-sm text-muted-foreground">
              Choose how many questions you want to practice. More questions provide better practice but take longer.
            </p>
          </div>

          {/* Answer Mode Selection */}
          <div className="space-y-3">
            <Label className="text-body font-semibold text-foreground">
              Answer Mode
            </Label>
            <RadioGroup value={answerMode} onValueChange={(value) => setAnswerMode(value as AnswerMode)}>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="text" id="mode-text" className="mt-1" />
                  <label
                    htmlFor="mode-text"
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="text-body font-medium text-foreground">Text Only</span>
                    </div>
                    <p className="text-body-sm text-muted-foreground">
                      Type your answers. Best for detailed, structured responses.
                    </p>
                  </label>
                </div>

                <div className="flex items-start space-x-3 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="voice" id="mode-voice" className="mt-1" />
                  <label
                    htmlFor="mode-voice"
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Mic className="h-5 w-5 text-primary" />
                      <span className="text-body font-medium text-foreground">Voice Only</span>
                    </div>
                    <p className="text-body-sm text-muted-foreground">
                      Record your answers. Best for practicing verbal communication.
                    </p>
                  </label>
                </div>

                <div className="flex items-start space-x-3 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="both" id="mode-both" className="mt-1" />
                  <label
                    htmlFor="mode-both"
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Mic2 className="h-5 w-5 text-primary" />
                      <span className="text-body font-medium text-foreground">Both (Text + Voice)</span>
                    </div>
                    <p className="text-body-sm text-muted-foreground">
                      Use both text and voice. Record your answer and add written notes.
                    </p>
                  </label>
                </div>
              </div>
            </RadioGroup>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={() => navigate("/interview/mock")}
            disabled={isStarting}
          >
            Back to Hub
          </Button>
          <Button
            variant="gradient"
            onClick={handleStartInterview}
            disabled={isStarting}
            className="min-w-[200px]"
          >
            {isStarting ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Starting...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Start Interview
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}



