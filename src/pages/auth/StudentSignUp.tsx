import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brain, Mail, Lock, User, ArrowRight, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function StudentSignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords match
    if (password !== confirmPassword) {
      toast.error("Passwords don't match", {
        description: "Please make sure both passwords are the same.",
        duration: 5000,
      });
      return;
    }

    // Validate password strength
    if (password.length < 6) {
      toast.error("Password too short", {
        description: "Password must be at least 6 characters long.",
        duration: 5000,
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "https://career-nav-backend.onrender.com/api"}/auth/signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
            name,
            role: "student",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Handle different error codes
        if (data.code === "ACCOUNT_EXISTS") {
          toast.error("Account already exists", {
            description: "An account with this email already exists. Please sign in instead.",
            duration: 5000,
          });
          navigate("/student/login");
          return;
        } else {
          toast.error("Sign up failed", {
            description: data.message || "Failed to create account. Please try again.",
            duration: 5000,
          });
        }
        setIsLoading(false);
        return;
      }

      // Account created successfully
      // Store tokens temporarily for education form completion
      // Will be cleared after form submission, then user must login manually
      const accessToken = data.accessToken || data.token;
      const refreshToken = data.refreshToken || data.accessToken;
      const user = data.user;

      if (accessToken && user) {
        // Normalize role to lowercase for frontend consistency
        // Backend returns uppercase (STUDENT/MENTOR), frontend uses lowercase
        const normalizedUser = {
          ...user,
          role: user.role?.toLowerCase() || "student",
        };
        
        // Store tokens temporarily in sessionStorage (not localStorage)
        // sessionStorage is cleared when browser tab closes, ensuring temporary nature
        // This allows education form to save profile data, but user is not "fully signed in"
        // After education form submission, these are cleared and user is redirected to login
        sessionStorage.setItem("tempAuthToken", accessToken);
        sessionStorage.setItem("tempAccessToken", accessToken);
        if (refreshToken) {
          sessionStorage.setItem("tempRefreshToken", refreshToken);
        }
        sessionStorage.setItem("tempUser", JSON.stringify(normalizedUser));
        sessionStorage.setItem("tempRole", normalizedUser.role);
        sessionStorage.setItem("isSignupFlow", "true"); // Flag to indicate this is signup flow

        toast.success("Account created successfully!", {
          description: `Welcome to CareerNav, ${normalizedUser.name || email}! Please complete your education details.`,
        });

        // Redirect to education form
        navigate("/profile/education");
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error: any) {
      console.error("Sign up error:", error);
      toast.error("Sign up failed", {
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
            Start Your <span className="gradient-text">Career Journey</span>
          </h1>
          <p className="text-body-lg text-muted-foreground max-w-md">
            Create your account to access AI-powered assessments, personalized learning paths, and
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
                "CareerNav helped me land my dream job at a top tech company. The
                AI mock interviews were incredibly helpful!"
              </p>
              <p className="text-body-sm text-muted-foreground mt-2">
                — Priya S., Software Engineer
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - Sign up form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center">
            <Link to="/" className="inline-flex items-center gap-2">
              <Brain className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">CareerNav</span>
            </Link>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-display-sm">Create your account</h2>
            <p className="text-body text-muted-foreground mt-2">
              Sign up to start your career journey with CareerNav
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

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
                  minLength={6}
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="gradient"
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                "Creating account..."
              ) : (
                <>
                  Create Account
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-body-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/student/login"
              className="text-primary hover:underline font-medium"
            >
              Sign in
            </Link>
          </p>

          <p className="text-center text-body-sm text-muted-foreground">
            Are you a mentor?{" "}
            <Link
              to="/mentor/signup"
              className="text-primary hover:underline font-medium"
            >
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

