import { Link } from "react-router-dom";
import { Brain, GraduationCap, Users, Sparkles, ArrowRight, Zap, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export default function RoleSelection() {
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
    <div className="min-h-screen flex flex-col relative bg-background overflow-hidden">
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "3s" }} />
      </div>

      {/* Header with logo and theme toggle */}
      <header className="relative z-10 px-6 py-8 lg:px-12 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-3 group">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-xl blur-lg group-hover:bg-primary/30 transition-colors" />
            <div className="relative p-2 bg-gradient-to-br from-primary to-accent rounded-xl">
              <Brain className="h-8 w-8 text-white" />
            </div>
          </div>
          <span className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            CareerNav
          </span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="relative z-10"
        >
          {isDark ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
        <div className="w-full max-w-6xl mx-auto">
          {/* Hero text */}
          <div className="text-center mb-16 animate-slide-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              <span>AI-Powered Career Navigation</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold mb-6 leading-tight">
              Choose Your{" "}
              <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                Path
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Start your career journey by selecting your role. Whether you're seeking guidance or providing mentorship, we're here to help.
            </p>
          </div>

          {/* Role selection cards */}
          <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
            {/* Student Card */}
            <Link
              to="/student/login"
              className="group relative glass-card p-8 lg:p-10 rounded-2xl overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/20 cursor-pointer"
            >
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-accent/0 group-hover:from-primary/10 group-hover:via-primary/5 group-hover:to-accent/10 transition-all duration-500" />
              
              {/* Border glow effect */}
              <div className="absolute inset-0 rounded-2xl border-2 border-primary/0 group-hover:border-primary/30 transition-all duration-500" />
              
              <div className="relative z-10">
                {/* Icon */}
                <div className="mb-6 inline-flex p-4 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-300">
                  <GraduationCap className="h-8 w-8 text-primary" />
                </div>

                {/* Content */}
                <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                  I'm a Student
                </h2>
                <p className="text-base lg:text-lg text-muted-foreground mb-6 leading-relaxed">
                  Discover your career path, build skills, and land your dream job with AI-powered assessments and personalized guidance.
                </p>

                {/* Features list */}
                <ul className="space-y-3 mb-8">
                  {[
                    "AI Career Assessments",
                    "Personalized Learning Paths",
                    "Resume & Interview Prep",
                    "Mentor Connections"
                  ].map((feature, index) => (
                    <li key={feature} className="flex items-center gap-3 text-sm lg:text-base text-muted-foreground">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-primary/60 group-hover:bg-primary transition-colors" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className="flex items-center gap-2 text-primary font-semibold group-hover:gap-4 transition-all duration-300">
                  <span>Get Started</span>
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Zap className="h-16 w-16 text-primary" />
              </div>
            </Link>

            {/* Mentor Card */}
            <Link
              to="/mentor/login"
              className="group relative glass-card p-8 lg:p-10 rounded-2xl overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-accent/20 cursor-pointer"
            >
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-accent/0 via-accent/0 to-primary/0 group-hover:from-accent/10 group-hover:via-accent/5 group-hover:to-primary/10 transition-all duration-500" />
              
              {/* Border glow effect */}
              <div className="absolute inset-0 rounded-2xl border-2 border-accent/0 group-hover:border-accent/30 transition-all duration-500" />
              
              <div className="relative z-10">
                {/* Icon */}
                <div className="mb-6 inline-flex p-4 rounded-xl bg-gradient-to-br from-accent/20 to-accent/10 group-hover:from-accent/30 group-hover:to-accent/20 transition-all duration-300">
                  <Users className="h-8 w-8 text-accent" />
                </div>

                {/* Content */}
                <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-3 group-hover:text-accent transition-colors">
                  I'm a Mentor
                </h2>
                <p className="text-base lg:text-lg text-muted-foreground mb-6 leading-relaxed">
                  Share your expertise, guide the next generation, and make an impact by mentoring aspiring professionals.
                </p>

                {/* Features list */}
                <ul className="space-y-3 mb-8">
                  {[
                    "Session Management",
                    "Student Progress Tracking",
                    "Review Submissions",
                    "Earnings Dashboard"
                  ].map((feature, index) => (
                    <li key={feature} className="flex items-center gap-3 text-sm lg:text-base text-muted-foreground">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-accent/60 group-hover:bg-accent transition-colors" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className="flex items-center gap-2 text-accent font-semibold group-hover:gap-4 transition-all duration-300">
                  <span>Join as Mentor</span>
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Sparkles className="h-16 w-16 text-accent" />
              </div>
            </Link>
          </div>

          {/* Bottom text */}
          <div className="text-center mt-12 animate-slide-up" style={{ animationDelay: "200ms" } as React.CSSProperties}>
            <p className="text-sm text-muted-foreground">
              New to CareerNav?{" "}
              <a href="#" className="text-primary hover:underline font-medium">
                Learn more about our platform
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

