import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Play,
  ExternalLink,
  MessageCircle,
  Video,
  FileText,
  Calendar,
  CheckCircle,
  Clock,
  BookOpen,
  User,
  Star,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

interface SkillDetail {
  id: string;
  name: string;
  description: string;
  career_title?: string;
  videos: Array<{ id: string; title: string; url: string; duration?: string }>;
  resources: Array<{ id: string; title: string; url: string; type: "documentation" | "tutorial" | "course" }>;
  mentors: Array<{ id: string; name: string; title: string; rating: number; learners: number }>;
  assignment: {
    id: string;
    title: string;
    mcqs: number;
    tasks: number;
  } | null;
  test: {
    id: string;
    title: string;
    duration: number;
  } | null;
}

export default function SkillDetail() {
  const { skillId } = useParams<{ skillId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pathId = searchParams.get("path");
  const [loading, setLoading] = useState(true);
  const [skillDetail, setSkillDetail] = useState<SkillDetail | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    fetchSkillDetail();
  }, [skillId]);

  const fetchSkillDetail = async () => {
    try {
      const token = localStorage.getItem("authToken") || localStorage.getItem("accessToken");
      if (!token) {
        navigate("/student/login");
        return;
      }

      // Fetch skill detail from backend
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/learning-paths/skill/${skillId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch skill detail");
      }

      const data = await response.json();

      // Format the response to match our interface
      const formattedData: SkillDetail = {
        id: data.id || skillId || "",
        name: data.name || "Skill",
        description: data.description || data.long_description || "",
        videos: (data.videos || []).map((video: any, index: number) => {
          let embedUrl = video.url || "";
          
          // Convert YouTube URLs to embed format
          if (embedUrl.includes("youtube.com/watch?v=")) {
            const videoId = embedUrl.split("watch?v=")[1]?.split("&")[0];
            embedUrl = `https://www.youtube.com/embed/${videoId}`;
          } else if (embedUrl.includes("youtu.be/")) {
            const videoId = embedUrl.split("youtu.be/")[1]?.split("?")[0];
            embedUrl = `https://www.youtube.com/embed/${videoId}`;
          } else if (!embedUrl.includes("embed")) {
            // If it's just a video ID
            embedUrl = `https://www.youtube.com/embed/${embedUrl}`;
          }
          
          return {
            id: video.id || `video-${index + 1}`,
            title: video.title || `Video ${index + 1}`,
            url: embedUrl,
            duration: video.duration || "",
          };
        }),
        resources: (data.resources || []).map((resource: any) => ({
          id: resource.id,
          title: resource.title,
          url: resource.url,
          type: resource.type || "documentation",
        })),
        mentors: [], // Mentors can be added later if needed
        assignment: data.assignment || null,
        test: data.test || null,
      };

      setSkillDetail(formattedData);
      setSelectedVideo(formattedData.videos[0]?.url || null);
    } catch (error: any) {
      console.error("Failed to fetch skill detail:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load skill details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVideoSelect = (videoUrl: string) => {
    setSelectedVideo(videoUrl);
  };

  const handleStartTest = () => {
    if (skillDetail?.test) {
      navigate(`/assessment/skill-test/${skillDetail.test.id}?skill=${skillId}`);
    }
  };

  const handleCompleteSkill = async () => {
    try {
      const token = localStorage.getItem("authToken") || localStorage.getItem("accessToken");
      if (!token) return;

      // Mark skill as completed
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/learning-paths/skill/${skillId}/complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ pathId }),
        }
      );

      if (response.ok) {
        setCompleted(true);
        toast({
          title: "Skill Completed! 🎉",
          description: "Great job! You've completed this skill.",
        });
        setTimeout(() => {
          navigate(`/learning-path?career=${pathId}`);
        }, 2000);
      }
    } catch (error) {
      console.error("Failed to complete skill:", error);
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case "documentation":
        return <FileText className="h-5 w-5" />;
      case "tutorial":
        return <BookOpen className="h-5 w-5" />;
      case "course":
        return <Play className="h-5 w-5" />;
      default:
        return <ExternalLink className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="student" title="Skill Detail">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-body text-muted-foreground">Loading skill details...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!skillDetail) {
    return (
      <DashboardLayout role="student" title="Skill Detail">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-body text-muted-foreground">Skill not found</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="student" title="Skill Detail">
      <div className="space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(`/learning-path?career=${pathId}`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Learning Path
        </Button>

        {/* Header */}
        <div className="glass-card rounded-xl p-6 lg:p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5" />
          <div className="relative space-y-2">
            <h1 className="text-headline text-foreground">{skillDetail.name}</h1>
            <p className="text-body text-muted-foreground">
              Part of {skillDetail.career_title ? `${skillDetail.career_title} Learning Path` : "your learning path"}
            </p>
            {skillDetail.description && (
              <p className="text-body-sm text-muted-foreground mt-2">
                {skillDetail.description}
              </p>
            )}
          </div>
        </div>

        {/* Section 1: Video Learning */}
        <div className="glass-card rounded-xl p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent" />
          <div className="relative space-y-4">
            <h2 className="text-title text-foreground">Video Learning</h2>
            
            {/* Main Video Player */}
            {selectedVideo && (
              <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted">
                <iframe
                  src={selectedVideo}
                  title="Video player"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}

            {/* Other Videos */}
            <div className="space-y-2">
              <h3 className="text-body font-semibold text-foreground">Other Videos</h3>
              <div className="space-y-2">
                {skillDetail.videos.map((video) => (
                  <button
                    key={video.id}
                    onClick={() => handleVideoSelect(video.url)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedVideo === video.url
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Play className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-body-sm text-foreground flex-1">{video.title}</span>
                      {video.duration && (
                        <span className="text-caption text-muted-foreground">{video.duration}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: External Resources */}
        <div className="glass-card rounded-xl p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-accent/5 to-transparent" />
          <div className="relative space-y-4">
            <h2 className="text-title text-foreground">External Resources</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {skillDetail.resources.map((resource) => (
                <a
                  key={resource.id}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-card p-4 rounded-lg hover:shadow-card-hover transition-all duration-300 border border-border hover:border-primary/50"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                      {getResourceIcon(resource.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-body-sm font-semibold text-foreground mb-1 truncate">
                        {resource.title}
                      </h3>
                      <p className="text-caption text-muted-foreground capitalize">
                        {resource.type}
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Section 3: Mentor Support */}
        {skillDetail.mentors && skillDetail.mentors.length > 0 && (
          <div className="glass-card rounded-xl p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-success/5 to-transparent" />
            <div className="relative space-y-4">
              <h2 className="text-title text-foreground">Mentor Support</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {skillDetail.mentors.map((mentor) => (
                  <div
                    key={mentor.id}
                    className="glass-card p-4 rounded-lg border border-border hover:shadow-card-hover transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-full bg-primary/10 text-primary">
                        <User className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-body font-semibold text-foreground mb-1">
                          {mentor.name}
                        </h3>
                        <p className="text-body-sm text-muted-foreground mb-2">
                          {mentor.title}
                        </p>
                        <div className="flex items-center gap-2 mb-3">
                          <Star className="h-4 w-4 fill-warning text-warning" />
                          <span className="text-body-sm font-medium text-foreground">
                            {mentor.rating}
                          </span>
                          <span className="text-body-sm text-muted-foreground">
                            | {mentor.learners} learners
                          </span>
                        </div>
                        <Button variant="outline" size="sm" className="w-full">
                          Connect with Mentor
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Practice & Assignment */}
        {skillDetail.assignment && (
          <div className="glass-card rounded-xl p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-warning/5 to-transparent" />
            <div className="relative space-y-4">
              <h2 className="text-title text-foreground">Practice & Assignment</h2>
              <div className="space-y-3">
                <div>
                  <h3 className="text-body font-semibold text-foreground mb-2">
                    Assignment: {skillDetail.assignment.title}
                  </h3>
                  <ul className="space-y-1 text-body-sm text-muted-foreground ml-4">
                    <li>• {skillDetail.assignment.mcqs} MCQs</li>
                    <li>• {skillDetail.assignment.tasks} short task</li>
                  </ul>
                </div>
                <Button variant="gradient" className="w-full sm:w-auto">
                  Start Assignment
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Section 5: Skill Test */}
        {skillDetail.test && (
          <div className="glass-card rounded-xl p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5" />
            <div className="relative space-y-4">
              <h2 className="text-title text-foreground">Skill Test (Mandatory to Complete)</h2>
              <div className="space-y-3">
                <div>
                  <h3 className="text-body font-semibold text-foreground mb-2">
                    Skill Test – {skillDetail.test.title}
                  </h3>
                  <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Duration: {skillDetail.test.duration} minutes</span>
                  </div>
                </div>
                <Button
                  variant="gradient"
                  size="lg"
                  onClick={handleStartTest}
                  className="w-full sm:w-auto"
                >
                  Take Skill Test
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Completion Feedback */}
        {completed && (
          <div className="glass-card rounded-xl p-6 bg-success/10 border-2 border-success/30">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="h-6 w-6 text-success" />
              <h3 className="text-title text-foreground">
                Great job! You've completed {skillDetail.name} 🎉
              </h3>
            </div>
            <p className="text-body text-muted-foreground">
              Next skill unlocked. Continue your learning journey!
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

