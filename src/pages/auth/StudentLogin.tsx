import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brain, Mail, Lock, ArrowRight, Eye, EyeOff, Sun, Moon } from "lucide-react";
import { toast } from "sonner";
import { setAuthData } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api";

// Static fallback review
const FALLBACK_REVIEW = {
  comment: "CareerNav provides a structured and supportive mentoring experience that truly helps learners grow with confidence.",
  name: null,
  designation: "CareerNav Community",
};

interface Review {
  comment: string;
  name: string | null;
  designation: string | null;
}

export default function StudentLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [review, setReview] = useState<Review>(FALLBACK_REVIEW);
  const navigate = useNavigate();

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    setIsDark(savedTheme !== "light");
  }, []);

  // Fetch random review on mount
  useEffect(() => {
    const fetchReview = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/public/random-review?role=STUDENT`
        );
        const data = await response.json();
        
        if (data.review && data.review.comment) {
          setReview(data.review);
        } else {
          setReview(FALLBACK_REVIEW);
        }
      } catch (error) {
        // Silent fail - use fallback
        setReview(FALLBACK_REVIEW);
      }
    };

    fetchReview();
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
            role: "student",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Handle different error codes
        if (data.code === "ACCOUNT_NOT_FOUND") {
          toast.error("Account not found", {
            description: "No account exists with this email. Please sign up first.",
            duration: 5000,
          });
        } else if (data.code === "INVALID_PASSWORD") {
          toast.error("Incorrect password", {
            description: "The password you entered is incorrect. Please try again.",
            duration: 5000,
          });
        } else if (data.code === "ROLE_MISMATCH") {
          toast.error("Account type mismatch", {
            description: data.message || "This account is registered as a mentor, not a student.",
            duration: 5000,
          });
        } else if (data.code === "OAUTH_ONLY_ACCOUNT") {
          toast.error("Google account", {
            description: "This account was created with Google. Please use Google sign-in.",
            duration: 5000,
          });
        } else {
          toast.error("Login failed", {
            description: data.message || "Failed to sign in. Please try again.",
            duration: 5000,
          });
        }
        setIsLoading(false);
        return;
      }

      // Store tokens and user data
      // Backend returns accessToken and refreshToken
      const accessToken = data.accessToken || data.token;
      const refreshToken = data.refreshToken || data.accessToken;
      const user = data.user;

      if (accessToken && user) {
        // Normalize role to lowercase for frontend
        const normalizedUser = {
          ...user,
          role: user.role?.toLowerCase() || "student",
        };
        
        // Store using auth utility (stores as authToken)
        setAuthData(accessToken, normalizedUser);
        
        // Also store as accessToken for api.ts compatibility
        localStorage.setItem("accessToken", accessToken);
        if (refreshToken) {
          localStorage.setItem("refreshToken", refreshToken);
        }
        localStorage.setItem("role", normalizedUser.role);

        toast.success("Welcome back!", {
          description: `Signed in as ${normalizedUser.name || email}`,
        });

        // Check if profile is completed
        try {
          const profileCheckResponse = await fetch(
            `${API_BASE_URL}/profile/check`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          if (profileCheckResponse.ok) {
            const profileCheck = await profileCheckResponse.json();
            if (!profileCheck.completed) {
              // Profile incomplete - redirect to education form
              navigate("/profile/education");
              return;
            }
          }
        } catch (error) {
          console.error("Failed to check profile:", error);
          // If check fails, redirect to education form to be safe
          navigate("/profile/education");
          return;
        }

        // Profile is completed - redirect to dashboard
        navigate("/student/dashboard");
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error("Login failed", {
        description: error.message || "Unable to connect to server. Please try again later.",
        duration: 5000,
      });
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary/20 via-background to-accent/20 p-12 flex-col justify-between">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-primary/30 rounded-full blur-3xl animate-pulse-glow" />
          <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-accent/30 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
        </div>

        <div className="relative">
          <Link to="/" className="flex items-center gap-2">
            <Brain className="h-10 w-10 text-primary" />
            <span className="text-2xl font-bold">CareerNav</span>
          </Link>
        </div>

        <div className="relative space-y-6">
          <h1 className="text-display">
            Unlock Your <span className="gradient-text">Career Potential</span>
          </h1>
          <p className="text-body-lg text-muted-foreground max-w-md">
            Access AI-powered assessments, personalized learning paths, and
            expert mentorship to accelerate your career journey.
          </p>
        </div>

        <div className="relative glass-card p-6 rounded-xl max-w-md">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-success/20 to-success/10 flex items-center justify-center">
              <span className="text-success text-xl">✨</span>
            </div>
            <div>
              <p className="text-body text-foreground italic">
                "{review.comment}"
              </p>
              {review.name || review.designation ? (
                <p className="text-body-sm text-muted-foreground mt-2">
                  — {[review.name, review.designation].filter(Boolean).join(", ")}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* Theme toggle - top right */}
        <div className="absolute top-8 right-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        </div>

        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center">
            <Link to="/" className="inline-flex items-center gap-2">
              <Brain className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">CareerNav</span>
            </Link>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-display-sm">Welcome back</h2>
            <p className="text-body text-muted-foreground mt-2">
              Sign in to continue your career journey
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-body-sm">
                <input
                  type="checkbox"
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-muted-foreground">Remember me</span>
              </label>
              <a
                href="#"
                className="text-body-sm text-primary hover:underline"
              >
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              variant="gradient"
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                "Signing in..."
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-body-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link
              to="/student/signup"
              className="text-primary hover:underline font-medium"
            >
              Sign up
            </Link>
          </p>

          <p className="text-center text-body-sm text-muted-foreground">
            Are you a mentor?{" "}
            <Link
              to="/mentor/login"
              className="text-primary hover:underline font-medium"
            >
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-body-sm">
                <input
                  type="checkbox"
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-muted-foreground">Remember me</span>
              </label>
              <a
                href="#"
                className="text-body-sm text-primary hover:underline"
              >
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              variant="gradient"
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                "Signing in..."
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-body-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link
              to="/student/signup"
              className="text-primary hover:underline font-medium"
            >
              Sign up
            </Link>
          </p>

          <p className="text-center text-body-sm text-muted-foreground">
            Are you a mentor?{" "}
            <Link
              to="/mentor/login"
              className="text-primary hover:underline font-medium"
            >
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
