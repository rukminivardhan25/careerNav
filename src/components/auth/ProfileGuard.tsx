import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface ProfileGuardProps {
  children: React.ReactNode;
}

/**
 * ProfileGuard component
 * Checks if user's profile is completed and redirects to profile page if not
 */
export function ProfileGuard({ children }: ProfileGuardProps) {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    checkProfile();
  }, []);

  const checkProfile = async () => {
    try {
      const token = localStorage.getItem("authToken") || localStorage.getItem("accessToken");
      if (!token) {
        navigate("/student/login");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "https://career-nav-backend.onrender.com/api"}/profile/check`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.completed) {
          setIsComplete(true);
        } else {
          // Profile incomplete - redirect to education form
          navigate("/profile/education");
        }
      } else {
        // If check fails, redirect to education form
        navigate("/profile/education");
      }
    } catch (error) {
      console.error("Failed to check profile:", error);
      // On error, redirect to education form
      navigate("/profile/education");
    } finally {
      setIsChecking(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isComplete) {
    return null; // Will redirect
  }

  return <>{children}</>;
}

