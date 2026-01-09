import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brain, Mail, Lock, User, ArrowRight, Eye, EyeOff, Users } from "lucide-react";
import { toast } from "sonner";
import { setAuthData } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api";

export default function MentorSignUp() {
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
      // Normalize email to lowercase before sending
      const normalizedEmail = email.toLowerCase().trim();

      const response = await fetch(
        `${API_BASE_URL}/auth/signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: normalizedEmail,
            password,
            name,
            role: "mentor",
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
          navigate("/mentor/login");
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

      // Normalize role to lowercase for frontend
      const normalizedUser = {
        ...data.user,
        role: data.user.role?.toLowerCase() || "mentor",
      };

      // Store tokens and user data using the same method as sign in
      // Backend returns accessToken and refreshToken
      const accessToken = data.accessToken || data.token;
      const refreshToken = data.refreshToken || data.accessToken;
      const user = data.user;

      if (accessToken && user) {
        // Store using auth utility (stores as authToken) - same as sign in
        setAuthData(accessToken, normalizedUser);
        
        // Also store as accessToken for api.ts compatibility - same as sign in
        localStorage.setItem("accessToken", accessToken);
        if (refreshToken) {
          localStorage.setItem("refreshToken", refreshToken);
        }
        localStorage.setItem("role", normalizedUser.role);

        toast.success("Account created successfully!", {
          description: `Welcome to CareerNav, ${data.user.name}! Redirecting to mentor dashboard...`,
        });

        // Redirect to mentor dashboard (not student profile)
        navigate("/mentor/dashboard");
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
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-secondary/20 via-background to-primary/20 p-12 flex-col justify-between">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-secondary/30 rounded-full blur-3xl animate-pulse-glow" />
          <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-primary/30 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
        </div>

        <div className="relative">
          <Link to="/" className="flex items-center gap-2">
            <Brain className="h-10 w-10 text-primary" />
            <span className="text-2xl font-bold">CareerNav</span>
          </Link>
        </div>

        <div className="relative space-y-6">
          <h1 className="text-display">
            <span className="gradient-text">Join as Mentor</span> and Make a Difference
          </h1>
          <p className="text-body-lg text-muted-foreground max-w-md">
            Create your mentor account and help students navigate their career
            paths with expert guidance and industry insights.
          </p>
        </div>

        <div className="relative glass-card p-6 rounded-xl max-w-md">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-body text-foreground italic">
                "Being a CareerNav mentor has been incredibly rewarding. I've
                helped over 50 students land their first tech jobs."
              </p>
              <p className="text-body-sm text-muted-foreground mt-2">
                — Dr. Rajesh K., Senior Tech Lead
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-secondary/10 text-secondary text-body-sm mb-4">
              <Users className="h-4 w-4" />
              Mentor Portal
            </div>
            <h2 className="text-display-sm">Create Mentor Account</h2>
            <p className="text-body text-muted-foreground mt-2">
              Sign up to guide the next generation of professionals
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
                  placeholder="Dr. Jane Smith"
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
                  placeholder="mentor@example.com"
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
                  Create Mentor Account
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-body-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/mentor/login"
              className="text-primary hover:underline font-medium"
            >
              Sign in
            </Link>
          </p>

          <p className="text-center text-body-sm text-muted-foreground">
            Are you a student?{" "}
            <Link
              to="/student/signup"
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


          <p className="text-center text-body-sm text-muted-foreground">
            Are you a student?{" "}
            <Link
              to="/student/signup"
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

