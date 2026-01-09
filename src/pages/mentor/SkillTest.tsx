import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  FileCheck,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  BookOpen,
  Search,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getAuthToken } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api";

const API_URL = API_BASE_URL;

interface Course {
  id: number;
  careerId: string;
  name: string;
  description: string | null;
  testStatus: string | null;
  testScore: number | null;
  retryAvailableAfter: string | null;
}

interface TestResult {
  id: number;
  courseName: string;
  score?: number;
  completedAt?: string;
  retryAvailableAfter?: string;
  status?: string;
  attemptedAt?: string;
}

export default function SkillTest() {
  const navigate = useNavigate();
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [testReady, setTestReady] = useState(false);
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);
  const [showTestInterface, setShowTestInterface] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [testResults, setTestResults] = useState<{
    passed: TestResult[];
    failed: TestResult[];
    pending: TestResult[];
  }>({
    passed: [],
    failed: [],
    pending: [],
  });
  const [testQuestions, setTestQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeRemaining, setTimeRemaining] = useState(2700); // 45 minutes in seconds
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load courses and test results on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error("Please login to view skill tests");
        return;
      }

      // Fetch available courses
      const coursesResponse = await fetch(`${API_URL}/mentors/skill-test/courses`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (coursesResponse.ok) {
        const coursesData = await coursesResponse.json();
        setAvailableCourses(coursesData.courses || []);
      }

      // Fetch test results
      const resultsResponse = await fetch(`${API_URL}/mentors/skill-test/results`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (resultsResponse.ok) {
        const resultsData = await resultsResponse.json();
        setTestResults(resultsData.results || { passed: [], failed: [], pending: [] });
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load skill test data");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter courses based on search query
  const filteredCourses = availableCourses.filter((course) => {
    const query = searchQuery.toLowerCase();
    return (
      course.name.toLowerCase().includes(query) ||
      (course.description && course.description.toLowerCase().includes(query))
    );
  });

  // Get eligible courses (PASSED are already filtered by backend)
  // Allow retest for PENDING, IN_PROGRESS, and FAILED tests
  const eligibleCourses = filteredCourses.filter((course) => {
    // PASSED tests are already filtered out by backend
    // Allow all other statuses (null, PENDING, IN_PROGRESS, FAILED) for retest
    return true;
  });

  const selectedCourseData = availableCourses.find(
    (c) => c.id === selectedCourseId
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCourseSelect = (courseId: number, courseName: string) => {
    setSelectedCourseId(courseId);
    setSearchQuery(courseName);
    setIsDropdownOpen(false);
  };

  const handleStartTest = async () => {
    // Require course selection from dropdown
    if (!selectedCourseId) {
      toast.error("Please select a skill from the dropdown");
      return;
    }

    const course = availableCourses.find((c) => c.id === selectedCourseId);
    if (!course) {
      toast.error("Selected course not found");
      return;
    }

    // PASSED tests are already filtered out by backend, so no need to check here
    
    // Check if failed and retry date not passed
    if (course.testStatus === "FAILED" && course.retryAvailableAfter) {
      const retryDate = new Date(course.retryAvailableAfter);
      const today = new Date();
      if (today < retryDate) {
        toast.error(`You can retry this test after ${retryDate.toLocaleDateString()}`);
        return;
      }
    }

    // Allow retest for PENDING and IN_PROGRESS tests
    // The backend will handle creating a new test or resuming existing one

    // Start test preparation
    setIsPreparing(true);
    toast.info("Preparing your test... Loading questions from database...");

    try {
      const token = getAuthToken();
      if (!token) {
        toast.error("Please login to generate test");
        return;
      }

      const response = await fetch(`${API_URL}/mentors/skill-test/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseId: selectedCourseId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const testData = data.test || data;
        const testId = testData.id?.toString() || testData.testId?.toString();
        
        console.log("[SkillTest] Generate response:", {
          hasTest: !!data.test,
          testDataKeys: Object.keys(testData),
          hasQuestions: !!testData.questions,
          questionCount: testData.questions?.length || 0,
          testId
        });
        
        // Verify questions were generated
        let questions = testData.questions || [];
        
        if (!testId) {
          throw new Error("Test ID not returned from server");
        }
        
        // Format questions if they exist
        if (questions.length > 0) {
          console.log("[SkillTest] Questions found in generate response, formatting...");
          questions = questions.map((q: any, index: number) => {
            // Parse options if it's a string
            let options = q.options || [];
            if (typeof options === 'string') {
              try {
                options = JSON.parse(options);
              } catch (e) {
                console.error(`[SkillTest] Failed to parse options for question ${index}:`, e);
                options = [];
              }
            }
            
            // Ensure options is an array
            if (!Array.isArray(options)) {
              console.error(`[SkillTest] Invalid options for question ${index}:`, typeof options, options);
              options = [];
            }
            
            // Ensure question_text exists
            const questionText = q.question_text || q.question || `Question ${index + 1}`;
            
            return {
              id: q.id || index,
              question_text: questionText,
              question_type: q.question_type || "conceptual",
              options: options,
              correct_answer: q.correct_answer,
              explanation: q.explanation || "",
              points: q.points || 1,
              difficulty: q.difficulty || "INTERMEDIATE",
            };
          });
        }
        
        if (questions.length === 0) {
          console.log("[SkillTest] No questions in generate response, fetching from test details endpoint...");
          // Questions should always be available from DB, but if not, fetch from test details
          toast.info("Loading questions from database...");
          
          const checkResponse = await fetch(`${API_URL}/mentors/skill-test/${testId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          
          if (checkResponse.ok) {
            const checkData = await checkResponse.json();
            const checkTestData = checkData.test || checkData;
            let checkQuestions = checkTestData.questions || [];
            
            // Format questions
            if (checkQuestions.length > 0) {
              checkQuestions = checkQuestions.map((q: any, index: number) => {
                let options = q.options || [];
                if (typeof options === 'string') {
                  try {
                    options = JSON.parse(options);
                  } catch (e) {
                    console.error(`[SkillTest] Failed to parse options for question ${index}:`, e);
                    options = [];
                  }
                }
                if (!Array.isArray(options)) {
                  options = [];
                }
                return {
                  id: q.id || index,
                  question_text: q.question_text || q.question || `Question ${index + 1}`,
                  question_type: q.question_type || "conceptual",
                  options: options,
                  correct_answer: q.correct_answer,
                  explanation: q.explanation || "",
                  points: q.points || 1,
                  difficulty: q.difficulty || "INTERMEDIATE",
                };
              });
            }
            
            if (checkQuestions.length === 0) {
              throw new Error("No questions available for this skill. Please contact admin.");
            }
            
            setIsPreparing(false);
            setTestReady(true);
            setCurrentTestId(testId);
            toast.success(`Test is ready with ${checkQuestions.length} questions! Click 'Start Test' to begin.`);
          } else {
            throw new Error("Failed to load test questions. Please try again.");
          }
        } else {
          // Questions are already in response
          setIsPreparing(false);
          setTestReady(true);
          setCurrentTestId(testId);
          toast.success(`Test is ready with ${questions.length} questions! Click 'Start Test' to begin.`);
        }
        
        // Reload data to update test results
        await loadData();
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate test");
      }
    } catch (error: any) {
      console.error("Failed to generate test:", error);
      toast.error(error.message || "Failed to generate test");
      setIsPreparing(false);
    }
  };

  const handleBeginTest = async () => {
    if (!currentTestId) {
      toast.error("Test ID not found. Please generate the test again.");
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) {
        toast.error("Please login to start test");
        return;
      }

      // Show loading state
      setIsPreparing(true);
      toast.info("Loading test questions...");

      // Fetch test details including questions
      const response = await fetch(`${API_URL}/mentors/skill-test/${currentTestId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const responseData = await response.json();
        // Controller returns { test: {...} }
        const testData = responseData.test || responseData;
        let questions = (testData.questions || []);
        
        console.log("[SkillTest] Test data received:", { 
          responseKeys: Object.keys(responseData),
          hasTest: !!responseData.test, 
          hasQuestions: !!testData.questions, 
          questionCount: questions.length,
          testStatus: testData.status
        });
        
        // Questions should always be available from DB
        if (!questions || questions.length === 0) {
          console.error("[SkillTest] No questions in response. Full response:", JSON.stringify(responseData, null, 2));
          toast.error("No questions found. Please contact admin or try generating the test again.");
          setIsPreparing(false);
          return;
        }

        // Ensure questions are properly formatted
        questions = questions.map((q: any, index: number) => {
          // Parse options if it's a string
          let options = q.options || [];
          if (typeof options === 'string') {
            try {
              options = JSON.parse(options);
            } catch (e) {
              console.error(`[SkillTest] Failed to parse options for question ${index}:`, e);
              options = [];
            }
          }
          
          // Ensure options is an array
          if (!Array.isArray(options)) {
            console.error(`[SkillTest] Invalid options for question ${index}:`, typeof options, options);
            options = [];
          }
          
          // Ensure question_text exists
          const questionText = q.question_text || q.question || `Question ${index + 1}`;
          
          return {
            id: q.id || index,
            question_text: questionText,
            question_type: q.question_type || "conceptual",
            options: options,
            correct_answer: q.correct_answer,
            explanation: q.explanation || "",
            points: q.points || 1,
            difficulty: q.difficulty || "INTERMEDIATE",
          };
        });

        console.log("[SkillTest] Formatted questions:", questions.slice(0, 2)); // Log first 2 questions for debugging
        
        setTestQuestions(questions);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setTimeRemaining(2700); // 45 minutes
        setShowTestInterface(true);
        setIsPreparing(false);
        toast.success(`Test started! ${questions.length} questions loaded. Good luck!`);
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to load test");
      }
    } catch (error: any) {
      console.error("Failed to start test:", error);
      toast.error(error.message || "Failed to start test");
      setIsPreparing(false);
    }
  };

  // Timer countdown effect
  useEffect(() => {
    if (!showTestInterface || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time's up - auto submit
          handleSubmitTest(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showTestInterface, timeRemaining]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnswerSelect = (questionIndex: number, answerIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionIndex]: answerIndex,
    }));
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < testQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleSubmitTest = async (isAutoSubmit = false) => {
    if (isAutoSubmit) {
      toast.warning("Time's up! Submitting your test automatically...");
    } else {
      const unansweredCount = testQuestions.length - Object.keys(answers).length;
      if (unansweredCount > 0) {
        const confirm = window.confirm(
          `You have ${unansweredCount} unanswered question(s). Are you sure you want to submit?`
        );
        if (!confirm) return;
      }
    }

    setIsSubmitting(true);

    try {
      const token = getAuthToken();
      if (!token || !currentTestId) {
        toast.error("Please login to submit test");
        return;
      }

      // Prepare answers array
      const answersArray = testQuestions.map((q, idx) => ({
        questionIndex: idx,
        selectedAnswer: answers[idx] ?? null,
      }));

      const response = await fetch(`${API_URL}/mentors/skill-test/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          testId: currentTestId,
          answers: answersArray,
        }),
      });

      if (response.ok) {
        const responseData = await response.json();
        // Handle both { result: {...} } and direct result object
        const result = responseData.result || responseData;
        
        console.log("[SkillTest] Submission result:", result);
        
        if (!result) {
          throw new Error("No result returned from server");
        }
        
        const score = result.score ?? 0;
        const status = result.status || "UNKNOWN";
        const passed = status === "PASSED";
        
        toast.success(
          `Test submitted! Score: ${score}% - ${passed ? "Congratulations!" : "Better luck next time!"}`
        );
        setShowTestInterface(false);
        setTestQuestions([]);
        setAnswers({});
        setCurrentQuestionIndex(0);
        setTimeRemaining(2700);
        await loadData();
      } else {
        const error = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(error.error || "Failed to submit test");
      }
    } catch (error: any) {
      console.error("Failed to submit test:", error);
      toast.error(error.message || "Failed to submit test");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout role="mentor" title="Skill Test">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }


  return (
    <DashboardLayout role="mentor" title="Skill Test">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-headline text-foreground">Mentor Skill Test</h1>
          <p className="text-body text-muted-foreground mt-2">
            Verify your expertise in courses to mentor students. Pass AI-generated tests to unlock mentorship opportunities.
          </p>
        </div>

        {!showTestInterface ? (
          <>
            {/* Course Selection */}
            <Card className="p-6 space-y-6">
              <div className="flex items-center gap-3">
                <FileCheck className="h-6 w-6 text-primary" />
                <div>
                  <h2 className="text-title text-foreground">Select Course to Test</h2>
                  <p className="text-body-sm text-muted-foreground">
                    Choose a course you want to verify your expertise in
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <label className="text-body-sm font-medium text-foreground mb-2 block">
                    Select Skill *
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                    <Input
                      ref={inputRef}
                      type="text"
                      placeholder="Search skills (e.g., Java, Python, Web Development...)"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsDropdownOpen(e.target.value.length > 0);
                        // Clear selection if typing new text
                        if (e.target.value && !availableCourses.some(c => c.name.toLowerCase() === e.target.value.toLowerCase())) {
                          setSelectedCourseId(null);
                        }
                      }}
                      onFocus={() => setIsDropdownOpen(searchQuery.length > 0 || eligibleCourses.length > 0)}
                      className="pl-10 pr-10"
                    />
                    <ChevronDown
                      className={cn(
                        "absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-transform cursor-pointer",
                        isDropdownOpen && "rotate-180"
                      )}
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    />
                  </div>

                  {/* Dropdown */}
                  {isDropdownOpen && (
                    <div
                      ref={dropdownRef}
                      className="absolute z-50 w-full mt-2 bg-background border border-border rounded-lg shadow-lg max-h-80 overflow-y-auto"
                    >
                      {eligibleCourses.length === 0 ? (
                        <div className="p-4 text-center text-body-sm text-muted-foreground">
                          {searchQuery ? "No matching skills found" : "No available skills"}
                        </div>
                      ) : (
                        <div className="p-2">
                          {eligibleCourses.map((course) => {
                            const isFailed = course.testStatus === "FAILED";
                            const isPending = course.testStatus === "PENDING" || course.testStatus === "IN_PROGRESS";
                            // Allow retest for PENDING, IN_PROGRESS, and FAILED (if retry date passed)
                            // PASSED tests are already filtered out by backend
                            const isDisabled = false; // Allow all eligible courses to be selected

                            return (
                              <button
                                key={course.id}
                                type="button"
                                onClick={() => handleCourseSelect(course.id, course.name)}
                                disabled={isDisabled}
                                className={cn(
                                  "w-full text-left p-3 rounded-lg transition-colors mb-1",
                                  "hover:bg-muted focus:bg-muted focus:outline-none",
                                  isDisabled && "opacity-50 cursor-not-allowed",
                                  selectedCourseId === course.id &&
                                    "bg-primary/10 border border-primary"
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-body font-medium text-foreground truncate">
                                        {course.name}
                                      </span>
                                    </div>
                                    {course.description && (
                                      <p className="text-caption text-muted-foreground mt-1">
                                        {course.description}
                                      </p>
                                    )}
                                  </div>
                                  <div className="ml-3 shrink-0 flex flex-col items-end gap-1">
                                    {isFailed && (
                                      <XCircle className="h-4 w-4 text-destructive" />
                                    )}
                                    {isPending && (
                                      <Badge variant="outline" className="text-xs">
                                        Resume
                                      </Badge>
                                    )}
                                    {!isFailed && !isPending && (
                                      <Badge variant="outline" className="text-xs text-muted-foreground">
                                        New
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {selectedCourseData && (
                  <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-body font-medium text-foreground">
                        {selectedCourseData.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-body-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        45 minutes
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4" />
                        AI-Generated Questions
                      </span>
                    </div>
                    {selectedCourseData.testStatus === "PASSED" && (
                      <div className="mt-2 p-2 bg-success/10 border border-success/20 rounded text-body-sm text-success">
                        ✓ You have already passed this test
                      </div>
                    )}
                    {selectedCourseData.testStatus === "FAILED" && selectedCourseData.retryAvailableAfter && (
                      <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-body-sm text-destructive">
                        Previous attempt: {selectedCourseData.testScore}%. Retry available after{" "}
                        {new Date(selectedCourseData.retryAvailableAfter).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    onClick={handleStartTest}
                    disabled={!selectedCourseId || isPreparing}
                    className="flex-1"
                  >
                    {isPreparing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Preparing Test...
                      </>
                    ) : (
                      <>
                        <FileCheck className="h-4 w-4 mr-2" />
                        Generate Test
                      </>
                    )}
                  </Button>
                  {testReady && (
                    <Button onClick={handleBeginTest} variant="gradient">
                      Start Test
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {/* Test Results Summary */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Verified Courses */}
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-success/10">
                    <CheckCircle className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <h3 className="text-body font-semibold text-foreground">
                      Verified Courses
                    </h3>
                    <p className="text-caption text-muted-foreground">
                      {testResults.passed.length} passed
                    </p>
                  </div>
                </div>
                {testResults.passed.length === 0 ? (
                  <p className="text-body-sm text-muted-foreground">
                    No verified courses yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {testResults.passed.map((result) => (
                      <div
                        key={result.id}
                        className="p-2 bg-success/5 border border-success/20 rounded text-body-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground">
                            {result.courseName}
                          </span>
                          <Badge variant="outline" className="bg-success/10 text-success">
                            {result.score}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Failed Tests */}
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <XCircle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <h3 className="text-body font-semibold text-foreground">
                      Failed Tests
                    </h3>
                    <p className="text-caption text-muted-foreground">
                      {testResults.failed.length} failed
                    </p>
                  </div>
                </div>
                {testResults.failed.length === 0 ? (
                  <p className="text-body-sm text-muted-foreground">
                    No failed tests
                  </p>
                ) : (
                  <div className="space-y-2">
                    {testResults.failed.map((result) => (
                      <div
                        key={result.id}
                        className="p-2 bg-destructive/5 border border-destructive/20 rounded text-body-sm"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-foreground">
                            {result.courseName}
                          </span>
                          <Badge variant="destructive">{result.score}%</Badge>
                        </div>
                        {result.retryAvailableAfter && (
                          <p className="text-caption text-muted-foreground">
                            Retry: {new Date(result.retryAvailableAfter).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* In Progress */}
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-warning/10">
                    <AlertCircle className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <h3 className="text-body font-semibold text-foreground">
                      In Progress
                    </h3>
                    <p className="text-caption text-muted-foreground">
                      {testResults.pending.length} preparing
                    </p>
                  </div>
                </div>
                {testResults.pending.length === 0 ? (
                  <p className="text-body-sm text-muted-foreground">
                    No tests in progress
                  </p>
                ) : (
                  <div className="space-y-2">
                    {testResults.pending.map((result) => (
                      <div
                        key={result.id}
                        className="p-2 bg-warning/5 border border-warning/20 rounded text-body-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground">
                            {result.courseName}
                          </span>
                          <Badge variant="outline" className="bg-warning/10 text-warning">
                            {result.status === "IN_PROGRESS" ? "In Progress" : "Preparing"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </>
        ) : (
          /* Test Interface - AI-Generated Questions */
          testQuestions.length > 0 ? (
            <Card className="p-6 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div>
                  <h2 className="text-title text-foreground">
                    {selectedCourseData?.name || "Skill"} Test
                  </h2>
                  <p className="text-body-sm text-muted-foreground mt-1">
                    Answer all questions to verify your expertise
                  </p>
                </div>
                <div
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg",
                    timeRemaining < 300
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted"
                  )}
                >
                  <Clock className="h-5 w-5" />
                  <span className="text-body font-semibold">{formatTime(timeRemaining)}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-body-sm">
                  <span className="text-muted-foreground">
                    Question {currentQuestionIndex + 1} of {testQuestions.length}
                  </span>
                  <span className="text-muted-foreground">
                    {Object.keys(answers).length} answered
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${((currentQuestionIndex + 1) / testQuestions.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Current Question */}
              {testQuestions[currentQuestionIndex] && (
                <div className="space-y-4">
                  <div className="p-6 bg-muted/50 rounded-lg space-y-4">
                    <div>
                      <Badge
                        variant="outline"
                        className="mb-3"
                      >
                        {testQuestions[currentQuestionIndex].question_type || "Question"}
                      </Badge>
                      <h3 className="text-body font-semibold text-foreground">
                        {testQuestions[currentQuestionIndex].question_text}
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {testQuestions[currentQuestionIndex].options?.map(
                        (option: string, idx: number) => (
                          <label
                            key={idx}
                            className={cn(
                              "flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors",
                              answers[currentQuestionIndex] === idx
                                ? "border-primary bg-primary/5"
                                : "border-border hover:bg-muted"
                            )}
                          >
                            <input
                              type="radio"
                              name={`question-${currentQuestionIndex}`}
                              checked={answers[currentQuestionIndex] === idx}
                              onChange={() => handleAnswerSelect(currentQuestionIndex, idx)}
                              className="w-4 h-4"
                            />
                            <span className="text-body text-foreground flex-1">{option}</span>
                          </label>
                        )
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={handlePreviousQuestion}
                      disabled={currentQuestionIndex === 0}
                    >
                      Previous
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (
                            window.confirm(
                              "Are you sure you want to exit? Your progress will be saved."
                            )
                          ) {
                            setShowTestInterface(false);
                          }
                        }}
                      >
                        Save & Exit
                      </Button>
                      {currentQuestionIndex < testQuestions.length - 1 ? (
                        <Button onClick={handleNextQuestion}>
                          Next Question
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleSubmitTest(false)}
                          disabled={isSubmitting}
                          variant="gradient"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            "Submit Test"
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Question Navigation Dots */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                {testQuestions.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={cn(
                      "w-8 h-8 rounded-full text-body-sm transition-colors",
                      idx === currentQuestionIndex
                        ? "bg-primary text-primary-foreground"
                        : answers[idx] !== undefined
                          ? "bg-success/20 text-success border border-success/30"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="p-6">
              <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            </Card>
          )
        )}
      </div>
    </DashboardLayout>
  );
}
                            const isPending = course.testStatus === "PENDING" || course.testStatus === "IN_PROGRESS";
                            // Allow retest for PENDING, IN_PROGRESS, and FAILED (if retry date passed)
                            // PASSED tests are already filtered out by backend
                            const isDisabled = false; // Allow all eligible courses to be selected

                            return (
                              <button
                                key={course.id}
                                type="button"
                                onClick={() => handleCourseSelect(course.id, course.name)}
                                disabled={isDisabled}
                                className={cn(
                                  "w-full text-left p-3 rounded-lg transition-colors mb-1",
                                  "hover:bg-muted focus:bg-muted focus:outline-none",
                                  isDisabled && "opacity-50 cursor-not-allowed",
                                  selectedCourseId === course.id &&
                                    "bg-primary/10 border border-primary"
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-body font-medium text-foreground truncate">
                                        {course.name}
                                      </span>
                                    </div>
                                    {course.description && (
                                      <p className="text-caption text-muted-foreground mt-1">
                                        {course.description}
                                      </p>
                                    )}
                                  </div>
                                  <div className="ml-3 shrink-0 flex flex-col items-end gap-1">
                                    {isFailed && (
                                      <XCircle className="h-4 w-4 text-destructive" />
                                    )}
                                    {isPending && (
                                      <Badge variant="outline" className="text-xs">
                                        Resume
                                      </Badge>
                                    )}
                                    {!isFailed && !isPending && (
                                      <Badge variant="outline" className="text-xs text-muted-foreground">
                                        New
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {selectedCourseData && (
                  <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-body font-medium text-foreground">
                        {selectedCourseData.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-body-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        45 minutes
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4" />
                        AI-Generated Questions
                      </span>
                    </div>
                    {selectedCourseData.testStatus === "PASSED" && (
                      <div className="mt-2 p-2 bg-success/10 border border-success/20 rounded text-body-sm text-success">
                        ✓ You have already passed this test
                      </div>
                    )}
                    {selectedCourseData.testStatus === "FAILED" && selectedCourseData.retryAvailableAfter && (
                      <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-body-sm text-destructive">
                        Previous attempt: {selectedCourseData.testScore}%. Retry available after{" "}
                        {new Date(selectedCourseData.retryAvailableAfter).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    onClick={handleStartTest}
                    disabled={!selectedCourseId || isPreparing}
                    className="flex-1"
                  >
                    {isPreparing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Preparing Test...
                      </>
                    ) : (
                      <>
                        <FileCheck className="h-4 w-4 mr-2" />
                        Generate Test
                      </>
                    )}
                  </Button>
                  {testReady && (
                    <Button onClick={handleBeginTest} variant="gradient">
                      Start Test
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {/* Test Results Summary */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Verified Courses */}
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-success/10">
                    <CheckCircle className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <h3 className="text-body font-semibold text-foreground">
                      Verified Courses
                    </h3>
                    <p className="text-caption text-muted-foreground">
                      {testResults.passed.length} passed
                    </p>
                  </div>
                </div>
                {testResults.passed.length === 0 ? (
                  <p className="text-body-sm text-muted-foreground">
                    No verified courses yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {testResults.passed.map((result) => (
                      <div
                        key={result.id}
                        className="p-2 bg-success/5 border border-success/20 rounded text-body-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground">
                            {result.courseName}
                          </span>
                          <Badge variant="outline" className="bg-success/10 text-success">
                            {result.score}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Failed Tests */}
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <XCircle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <h3 className="text-body font-semibold text-foreground">
                      Failed Tests
                    </h3>
                    <p className="text-caption text-muted-foreground">
                      {testResults.failed.length} failed
                    </p>
                  </div>
                </div>
                {testResults.failed.length === 0 ? (
                  <p className="text-body-sm text-muted-foreground">
                    No failed tests
                  </p>
                ) : (
                  <div className="space-y-2">
                    {testResults.failed.map((result) => (
                      <div
                        key={result.id}
                        className="p-2 bg-destructive/5 border border-destructive/20 rounded text-body-sm"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-foreground">
                            {result.courseName}
                          </span>
                          <Badge variant="destructive">{result.score}%</Badge>
                        </div>
                        {result.retryAvailableAfter && (
                          <p className="text-caption text-muted-foreground">
                            Retry: {new Date(result.retryAvailableAfter).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* In Progress */}
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-warning/10">
                    <AlertCircle className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <h3 className="text-body font-semibold text-foreground">
                      In Progress
                    </h3>
                    <p className="text-caption text-muted-foreground">
                      {testResults.pending.length} preparing
                    </p>
                  </div>
                </div>
                {testResults.pending.length === 0 ? (
                  <p className="text-body-sm text-muted-foreground">
                    No tests in progress
                  </p>
                ) : (
                  <div className="space-y-2">
                    {testResults.pending.map((result) => (
                      <div
                        key={result.id}
                        className="p-2 bg-warning/5 border border-warning/20 rounded text-body-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground">
                            {result.courseName}
                          </span>
                          <Badge variant="outline" className="bg-warning/10 text-warning">
                            {result.status === "IN_PROGRESS" ? "In Progress" : "Preparing"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </>
        ) : (
          /* Test Interface - AI-Generated Questions */
          testQuestions.length > 0 ? (
            <Card className="p-6 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div>
                  <h2 className="text-title text-foreground">
                    {selectedCourseData?.name || "Skill"} Test
                  </h2>
                  <p className="text-body-sm text-muted-foreground mt-1">
                    Answer all questions to verify your expertise
                  </p>
                </div>
                <div
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg",
                    timeRemaining < 300
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted"
                  )}
                >
                  <Clock className="h-5 w-5" />
                  <span className="text-body font-semibold">{formatTime(timeRemaining)}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-body-sm">
                  <span className="text-muted-foreground">
                    Question {currentQuestionIndex + 1} of {testQuestions.length}
                  </span>
                  <span className="text-muted-foreground">
                    {Object.keys(answers).length} answered
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${((currentQuestionIndex + 1) / testQuestions.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Current Question */}
              {testQuestions[currentQuestionIndex] && (
                <div className="space-y-4">
                  <div className="p-6 bg-muted/50 rounded-lg space-y-4">
                    <div>
                      <Badge
                        variant="outline"
                        className="mb-3"
                      >
                        {testQuestions[currentQuestionIndex].question_type || "Question"}
                      </Badge>
                      <h3 className="text-body font-semibold text-foreground">
                        {testQuestions[currentQuestionIndex].question_text}
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {testQuestions[currentQuestionIndex].options?.map(
                        (option: string, idx: number) => (
                          <label
                            key={idx}
                            className={cn(
                              "flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors",
                              answers[currentQuestionIndex] === idx
                                ? "border-primary bg-primary/5"
                                : "border-border hover:bg-muted"
                            )}
                          >
                            <input
                              type="radio"
                              name={`question-${currentQuestionIndex}`}
                              checked={answers[currentQuestionIndex] === idx}
                              onChange={() => handleAnswerSelect(currentQuestionIndex, idx)}
                              className="w-4 h-4"
                            />
                            <span className="text-body text-foreground flex-1">{option}</span>
                          </label>
                        )
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={handlePreviousQuestion}
                      disabled={currentQuestionIndex === 0}
                    >
                      Previous
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (
                            window.confirm(
                              "Are you sure you want to exit? Your progress will be saved."
                            )
                          ) {
                            setShowTestInterface(false);
                          }
                        }}
                      >
                        Save & Exit
                      </Button>
                      {currentQuestionIndex < testQuestions.length - 1 ? (
                        <Button onClick={handleNextQuestion}>
                          Next Question
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleSubmitTest(false)}
                          disabled={isSubmitting}
                          variant="gradient"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            "Submit Test"
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Question Navigation Dots */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                {testQuestions.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={cn(
                      "w-8 h-8 rounded-full text-body-sm transition-colors",
                      idx === currentQuestionIndex
                        ? "bg-primary text-primary-foreground"
                        : answers[idx] !== undefined
                          ? "bg-success/20 text-success border border-success/30"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="p-6">
              <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            </Card>
          )
        )}
      </div>
    </DashboardLayout>
  );
}
