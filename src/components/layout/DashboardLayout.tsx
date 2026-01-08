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
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
      {/* Sidebar */}
      <div className="hidden lg:block">
        <DashboardSidebar role={role} />
      </div>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-40 transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <DashboardSidebar role={role} />
      </div>

      {/* Main content */}
      <div className="lg:pl-64 w-full max-w-full overflow-x-hidden">
        {/* Top bar */}
        <header className="sticky top-0 z-20 h-16 bg-background/80 backdrop-blur-lg border-b border-border w-full max-w-full">
          <div className="flex items-center justify-between h-full px-3 sm:px-4 md:px-6 lg:px-8 max-w-full">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden flex-shrink-0"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label="Toggle sidebar"
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
        <main id="main-content" className="p-3 sm:p-4 md:p-6 lg:p-8 w-full max-w-full box-border overflow-x-hidden">
          <div className="w-full max-w-full box-border">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
