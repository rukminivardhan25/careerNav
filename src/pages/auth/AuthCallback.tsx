import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { Brain } from "lucide-react";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const accessToken = searchParams.get("accessToken");
        const refreshToken = searchParams.get("refreshToken");
        const role = searchParams.get("role");
        const error = searchParams.get("error");

        if (error) {
          setStatus("error");
          toast.error("Authentication failed", {
            description: "Please try again",
          });
          setTimeout(() => {
            navigate("/student/login");
          }, 2000);
          return;
        }

        if (!accessToken || !refreshToken) {
          setStatus("error");
          toast.error("Invalid authentication response");
          setTimeout(() => {
            navigate("/student/login");
          }, 2000);
          return;
        }

        // Store tokens
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);

        // Get user data
        const { user } = await apiClient.getCurrentUser();
        localStorage.setItem("user", JSON.stringify(user));

        setStatus("success");
        toast.success("Welcome to CareerNav!", {
          description: `Signed in as ${user.displayName}`,
        });

        // Redirect based on role and whether profile is complete
        if (role === "student") {
          // Check if profile is complete (you can add this check)
          if (!user.profile?.firstName) {
            navigate("/profile");
          } else {
            navigate("/student/dashboard");
          }
        } else if (role === "mentor") {
          navigate("/mentor/dashboard");
        } else {
          navigate("/");
        }
      } catch (error: any) {
        console.error("Auth callback error:", error);
        setStatus("error");
        toast.error("Authentication failed", {
          description: error.message || "Please try again",
        });
        setTimeout(() => {
          navigate("/student/login");
        }, 2000);
      }
    };

    handleAuthCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Brain className="h-16 w-16 text-primary mx-auto animate-pulse" />
        {status === "loading" && (
          <>
            <h2 className="text-2xl font-bold">Completing authentication...</h2>
            <p className="text-muted-foreground">Please wait</p>
          </>
        )}
        {status === "success" && (
          <>
            <h2 className="text-2xl font-bold text-success">Authentication successful!</h2>
            <p className="text-muted-foreground">Redirecting...</p>
          </>
        )}
        {status === "error" && (
          <>
            <h2 className="text-2xl font-bold text-destructive">Authentication failed</h2>
            <p className="text-muted-foreground">Redirecting to login...</p>
          </>
        )}
      </div>
    </div>
  );
}

