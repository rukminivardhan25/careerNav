import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  Play,
  Clock,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/api";

interface Skill {
  id: string;
  skill_id: string;
  name: string;
  description: string;
  skill_order: number;
  status: "not_started" | "in_progress" | "completed";
  estimated_duration?: string;
}

interface LearningPathData {
  id: number;
  career_id: string;
  title: string;
  description: string;
  total_skills: number;
  estimated_duration: string;
  skill_level: string;
  skills: Skill[];
}

export default function LearningPath() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pathData, setPathData] = useState<LearningPathData | null>(null);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    // Always fetch from backend - no hardcoded data
    // Backend will return the learning path based on user's selected career
    fetchMyLearningPath();
  }, []);

  // Removed fetchLearningPath - all data now comes from backend via fetchMyLearningPath
  // This ensures skill IDs are always from backend, never hardcoded

  const fetchMyLearningPath = async () => {
    try {
      const token = localStorage.getItem("authToken") || localStorage.getItem("accessToken");
      if (!token) {
        navigate("/student/login");
        return;
      }

      // Fetch learning path from backend (it will use selected career)
      const response = await fetch(
        `${API_BASE_URL}/learning-paths/my`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        if (data.error) {
          toast({
            title: "No Career Selected",
            description: data.message || "Please select a career from your career report first.",
            variant: "destructive",
          });
          navigate("/assessment");
          return;
        }

        // Format the response to match our component structure
        const formattedData: LearningPathData = {
          id: data.id || 1,
          career_id: data.career_id || "",
          title: data.title || "Learning Path",
          description: data.description || "",
          total_skills: data.total_skills || data.skills?.length || 0,
          estimated_duration: data.estimated_duration || "12 weeks",
          skill_level: data.skill_level || "Beginner → Intermediate",
          skills: (data.skills || []).map((skill: any) => ({
            id: skill.id || skill.skill_id,
            skill_id: skill.skill_id,
            name: skill.name,
            description: skill.description,
            skill_order: skill.skill_order,
            status: skill.status || "not_started",
            estimated_duration: skill.estimated_duration,
          })),
        };

        setPathData(formattedData);
        const completed = formattedData.skills?.filter((s: Skill) => s.status === "completed").length || 0;
        setCompletedCount(completed);
        setLoading(false);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch learning path");
      }
    } catch (error: any) {
      console.error("Failed to fetch learning path:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load learning path. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleSkillClick = (skill: Skill) => {
    navigate(`/learning-path/skill/${skill.skill_id}?path=${pathData?.id}&order=${skill.skill_order}`);
  };

  const handleStartSkill = (skill: Skill, e: React.MouseEvent) => {
    e.stopPropagation();
    handleSkillClick(skill);
  };

  const handleContinueSkill = (skill: Skill, e: React.MouseEvent) => {
    e.stopPropagation();
    handleSkillClick(skill);
  };

  if (loading) {
    return (
      <DashboardLayout role="student" title="Learning Path">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-body text-muted-foreground">Loading your learning path...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!pathData) {
    return (
      <DashboardLayout role="student" title="Learning Path">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <p className="text-body text-muted-foreground">
              No learning path found. Please select a career to get started.
            </p>
            <Button variant="gradient" onClick={() => navigate("/assessment")}>
              Go to Assessment
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const progressPercentage = pathData.total_skills > 0 
    ? Math.round((completedCount / pathData.total_skills) * 100) 
    : 0;

  return (
    <DashboardLayout role="student" title="Learning Path">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="glass-card rounded-xl p-6 lg:p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5" />
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-headline text-foreground">Your Learning Path</h1>
              <p className="text-body text-muted-foreground">
                Step-by-step skills tailored to your chosen career
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-body-sm text-muted-foreground mb-1">Progress</div>
                <div className="text-title text-foreground font-semibold">
                  {completedCount} / {pathData.total_skills} skills completed
                </div>
              </div>
              <div className="w-24">
                <Progress value={progressPercentage} className="h-2" />
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Career Context Card */}
        <div className="glass-card rounded-xl p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-muted/10 to-transparent" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-6 text-body-sm">
              <div>
                <span className="text-muted-foreground">Career: </span>
                <span className="font-semibold text-foreground">{pathData.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Estimated Duration: </span>
                <span className="font-semibold text-foreground">{pathData.estimated_duration || "12 weeks"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Skill Level: </span>
                <span className="font-semibold text-foreground">
                  {pathData.skill_level || "Beginner"} → Intermediate
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Skills Roadmap */}
        <div className="space-y-4">
          <h2 className="text-title text-foreground">Skills Roadmap</h2>
          <div className="space-y-3">
            {pathData.skills?.map((skill, index) => (
              <div
                key={skill.id}
                className={`glass-card rounded-xl p-6 hover:shadow-card-hover transition-all duration-300 relative overflow-hidden cursor-pointer ${
                  skill.status === "completed"
                    ? "border-2 border-success/30 bg-success/5"
                    : skill.status === "in_progress"
                    ? "border-2 border-primary/30 bg-primary/5"
                    : "border border-border"
                }`}
                onClick={() => handleSkillClick(skill)}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center gap-6">
                  {/* Left: Step Number Badge */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-title font-bold">
                      {String(skill.skill_order).padStart(2, "0")}
                    </div>
                  </div>

                  {/* Center: Skill Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-title text-foreground mb-1">{skill.name}</h3>
                    <p className="text-body-sm text-muted-foreground line-clamp-2">
                      {skill.description || "Learn the fundamentals and build practical skills"}
                    </p>
                  </div>

                  {/* Right: Status & Action */}
                  <div className="flex-shrink-0 flex items-center gap-4">
                    {skill.status === "completed" ? (
                      <>
                        <div className="flex items-center gap-2 text-success">
                          <CheckCircle className="h-5 w-5" />
                          <span className="text-body-sm font-medium">Completed</span>
                        </div>
                        <Button variant="outline" disabled className="min-w-[120px]">
                          Completed
                        </Button>
                      </>
                    ) : skill.status === "in_progress" ? (
                      <>
                        <div className="flex items-center gap-2 text-primary">
                          <Play className="h-5 w-5" />
                          <span className="text-body-sm font-medium">In Progress</span>
                        </div>
                        <Button
                          variant="gradient"
                          className="min-w-[120px]"
                          onClick={(e) => handleContinueSkill(skill, e)}
                        >
                          Continue Learning
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-5 w-5" />
                          <span className="text-body-sm font-medium">Not Started</span>
                        </div>
                        <Button
                          variant="gradient"
                          className="min-w-[120px]"
                          onClick={(e) => handleStartSkill(skill, e)}
                        >
                          Start Skill
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Empty State */}
        {(!pathData.skills || pathData.skills.length === 0) && (
          <div className="glass-card rounded-xl p-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-body text-muted-foreground mb-4">
              No skills available yet. Your learning path is being generated.
            </p>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Go to Dashboard
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
