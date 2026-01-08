import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  Mic,
  FileText,
  Route,
  User,
  Users,
  MessageSquare,
  BarChart3,
  Star,
  Brain,
  ChevronLeft,
  ChevronRight,
  LogOut,
  TrendingUp,
  Mail,
  FileCheck,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { clearAuthData, getCurrentUser } from "@/lib/auth";
import { API_BASE_URL, BASE_URL } from "@/lib/api";

interface SidebarProps {
  role: "student" | "mentor";
  onLinkClick?: () => void; // Callback to close sidebar on mobile when link is clicked
}

const studentLinks = [
  { label: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
  { label: "Industry Insights", href: "/industry/salary-trends", icon: TrendingUp },
  { label: "Assessment", href: "/assessment", icon: ClipboardList },
  { label: "Learning Path", href: "/learning-path", icon: Route },
  { label: "Resume", href: "/resume", icon: FileText },
  { label: "Cover Letter", href: "/cover-letter", icon: Mail },
  { label: "Mock Interviews", href: "/interview/mock", icon: Mic },
  { label: "Top Mentors", href: "/student/top-mentors", icon: Users },
  { label: "Sessions", href: "/student/sessions", icon: Calendar },
  { label: "Profile", href: "/profile", icon: User },
];

const mentorLinks = [
  { label: "Dashboard", href: "/mentor/dashboard", icon: LayoutDashboard },
  { label: "Students", href: "/mentor/students", icon: Users },
  { label: "Reviews", href: "/mentor/reviews", icon: Star },
  { label: "Insights", href: "/mentor/insights", icon: BarChart3 },
  { label: "Skill Test", href: "/mentor/skill-test", icon: FileCheck },
  { label: "Profile", href: "/mentor/profile", icon: User },
];

export function DashboardSidebar({ role, onLinkClick }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const links = role === "student" ? studentLinks : mentorLinks;
  const [userName, setUserName] = useState<string>("");
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  // Get user data
  useEffect(() => {
    const user = getCurrentUser();
    if (user?.name) {
      // Get first name only
      const firstName = user.name.trim().split(" ")[0];
      setUserName(firstName);
    }

    // Fetch profile photo for mentor or student
    if (role === "mentor") {
      fetchMentorProfilePhoto();
    } else if (role === "student") {
      fetchStudentProfilePhoto();
    }

    // Listen for profile photo updates
    const handlePhotoUpdate = (event: CustomEvent) => {
      // Handle both upload (with URL) and delete (null)
      if (event.detail?.photoUrl === null || event.detail?.photoUrl === undefined) {
        setProfilePhoto(null);
      } else if (event.detail?.photoUrl) {
        const photoUrl = event.detail.photoUrl;
        const fullUrl = photoUrl.startsWith("http")
          ? photoUrl
          : `${BASE_URL}${photoUrl}`;
        setProfilePhoto(fullUrl);
      }
    };

    window.addEventListener("profilePhotoUpdated", handlePhotoUpdate as EventListener);
    return () => {
      window.removeEventListener("profilePhotoUpdated", handlePhotoUpdate as EventListener);
    };
  }, [role]);

  const fetchMentorProfilePhoto = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/mentors/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.profile?.basicInfo?.photoUrl) {
          const photoUrl = data.profile.basicInfo.photoUrl;
          // Construct full URL if it's a relative path
          const baseUrl = photoUrl.startsWith("http") 
            ? photoUrl 
            : `${BASE_URL}${photoUrl}`;
          // Add cache-busting to ensure fresh image
          const fullUrl = `${baseUrl}?t=${Date.now()}`;
          setProfilePhoto(fullUrl);
        } else {
          setProfilePhoto(null);
        }
      }
    } catch (error) {
      console.error("Failed to fetch profile photo:", error);
    }
  };

  const fetchStudentProfilePhoto = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const profile = await response.json();

        if (profile?.profile_photo_url) {
          const photoUrl = profile.profile_photo_url;
          const baseUrl = photoUrl.startsWith("http")
            ? photoUrl
            : `${BASE_URL}${photoUrl}`;
          const fullUrl = `${baseUrl}?t=${Date.now()}`;
          setProfilePhoto(fullUrl);
        } else {
          setProfilePhoto(null);
        }
      }
    } catch (error) {
      console.error("Failed to fetch student profile photo for sidebar:", error);
    }
  };

  // Get initials for fallback
  const getInitials = (name: string): string => {
    if (!name) return role === "student" ? "S" : "M";
    const firstName = name.trim().split(" ")[0];
    return firstName.charAt(0).toUpperCase();
  };

  // Handle logout
  const handleLogout = () => {
    // Clear authentication data
    clearAuthData();
    // Clear role from localStorage
    localStorage.removeItem("role");
    // Navigate to landing page
    navigate("/");
  };

  return (
    <aside
      className={cn(
        "h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        "w-64",
        collapsed && "lg:w-16"
      )}
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-3 sm:px-4 border-b border-sidebar-border">
          <Link to="/" onClick={onLinkClick} className="flex items-center gap-2 min-w-0">
            <div className="relative flex-shrink-0">
              <Brain className="h-6 w-6 sm:h-8 sm:w-8 text-sidebar-primary" />
              <div className="absolute inset-0 h-6 w-6 sm:h-8 sm:w-8 bg-sidebar-primary/20 blur-lg rounded-full" />
            </div>
            {!collapsed && (
              <span className="text-lg sm:text-xl font-bold text-sidebar-foreground truncate">
                CareerNav
              </span>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-sidebar-foreground/70 hover:text-sidebar-foreground flex-shrink-0 lg:flex hidden"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <ul className="space-y-1">
            {links.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    onClick={onLinkClick}
                    className={cn(
                      "flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-all duration-200",
                      isActive
                        ? "bg-sidebar-primary/10 text-sidebar-primary border-l-2 border-sidebar-primary"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    <link.icon
                      className={cn(
                        "h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0",
                        isActive && "text-sidebar-primary"
                      )}
                    />
                    {!collapsed && (
                      <span className="text-body-sm font-medium truncate">
                        {link.label}
                      </span>
                    )}
                    {isActive && !collapsed && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary flex-shrink-0" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="p-3 sm:p-4 border-t border-sidebar-border">
          <div
            className={cn(
              "flex items-center gap-2 sm:gap-3",
              collapsed && "lg:justify-center"
            )}
          >
            <Avatar className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0" key={profilePhoto || "no-photo"}>
              {profilePhoto ? (
                <AvatarImage 
                  src={profilePhoto} 
                  alt={userName || "User"}
                  onError={() => {
                    // If image fails to load, fall back to initials
                    setProfilePhoto(null);
                  }}
                />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-semibold text-sm">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-body-sm font-medium text-sidebar-foreground truncate">
                  {userName || (role === "student" ? "Student" : "Mentor")}
                </p>
                <p className="text-caption text-muted-foreground capitalize truncate">
                  {role}
                </p>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-sidebar-foreground/70 hover:text-destructive flex-shrink-0"
              aria-label="Logout"
              onClick={handleLogout}
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
