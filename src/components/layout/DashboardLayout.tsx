import { ReactNode, useState, useEffect } from "react";
import { DashboardSidebar } from "./DashboardSidebar";
import { Menu, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
  role: "student" | "mentor";
  title?: string;
}

export function DashboardLayout({ children, role, title }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    setIsDark(savedTheme !== "light");
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

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay - does NOT affect layout */}
      <div className="lg:hidden">
        {/* Mobile sidebar backdrop - semi-transparent overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 transition-opacity duration-300"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Mobile sidebar - fixed overlay, slides in from left */}
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-64 transition-transform duration-300 ease-in-out",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <DashboardSidebar 
            role={role} 
            onLinkClick={() => setIsSidebarOpen(false)}
          />
        </div>
      </div>

      {/* Desktop sidebar - fixed position, does not affect layout flow */}
      <div className="hidden lg:block fixed inset-y-0 left-0 w-64 z-40">
        <DashboardSidebar role={role} />
      </div>

      {/* Main content - full width on mobile, padded on desktop ONLY */}
      <div className="w-full lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 h-16 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="flex items-center justify-between h-full px-3 sm:px-4 md:px-6 lg:px-8">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden flex-shrink-0"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                aria-label="Toggle sidebar"
                aria-expanded={isSidebarOpen}
              >
                <Menu className="h-5 w-5" />
              </Button>
              {title && (
                <h1 className="text-title text-foreground truncate">{title}</h1>
              )}
            </div>

            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <NotificationBell />
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
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" className="p-3 sm:p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
