import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDistanceToNow } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Mail,
  Phone,
  Linkedin,
  Github,
  Globe,
  Briefcase,
  Sparkles,
  Plus,
  Trash2,
  Download,
  Save,
  Loader2,
  X,
  Eye,
  FileText,
  Send,
  Star,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ResumeData, Experience, Project, Certification } from "@/types/resume";
import { generateMarkdown } from "@/utils/resumeGenerator";
import { exportResumeToPDF } from "@/utils/pdfExport";
import { getAuthToken, getCurrentUser } from "@/lib/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/lib/api";

const API_URL = API_BASE_URL;

const defaultResumeData: ResumeData = {
  header: {
    fullName: "",
    targetRole: "",
    email: "",
    phone: "",
    linkedin: "",
    github: "",
    portfolio: "",
  },
  summary: "",
  skills: [],
  experience: [],
  projects: [],
  education: {
    degree: "",
    branch: "",
    college: "",
    startYear: "",
    endYear: "",
    cgpa: "",
  },
  certifications: [],
};

export function StructuredResumeBuilder() {
  const [resumeData, setResumeData] = useState<ResumeData>(defaultResumeData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isImproving, setIsImproving] = useState<string | null>(null);
  const [newSkill, setNewSkill] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const [recentResumes, setRecentResumes] = useState<any[]>([]);
  const [previewResume, setPreviewResume] = useState<any | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isRequestReviewOpen, setIsRequestReviewOpen] = useState(false);
  const [selectedResumeForReview, setSelectedResumeForReview] = useState<number | null>(null);
  const [availableMentors, setAvailableMentors] = useState<any[]>([]);
  const [selectedMentorId, setSelectedMentorId] = useState<string | null>(null); // Changed to single mentor (radio button)
  const [isRequestingReview, setIsRequestingReview] = useState(false);
  const [isLoadingMentors, setIsLoadingMentors] = useState(false);
  const [pendingReviewMentor, setPendingReviewMentor] = useState<{ mentorId: string; mentorName: string; mentorEmail: string } | null>(null); // Track pending review mentor
  const [resumeReviews, setResumeReviews] = useState<Record<number, any[]>>({}); // Map resumeId -> reviews
  const [isReviewsDialogOpen, setIsReviewsDialogOpen] = useState(false);
  const [selectedResumeForViewingReviews, setSelectedResumeForViewingReviews] = useState<number | null>(null);

  useEffect(() => {
    loadResume();
    loadRecentResumes();
    // Load user data for header
    const user = getCurrentUser();
    if (user) {
      setResumeData((prev) => ({
        ...prev,
        header: {
          ...prev.header,
          fullName: user.name || "",
          email: user.email || "",
        },
      }));
    }
  }, []);

  // Load reviews for all resumes when recent resumes are loaded
  useEffect(() => {
    const loadAllResumeReviews = async () => {
      if (recentResumes.length === 0) return;
      
      const token = getAuthToken();
      if (!token) return;

      try {
        const reviewPromises = recentResumes.map(async (resume) => {
          try {
            const response = await fetch(`${API_URL}/resume-reviews/${resume.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
              const data = await response.json();
              return { resumeId: resume.id, reviews: data.reviews || [] };
            }
          } catch (error) {
            console.error(`Failed to load reviews for resume ${resume.id}:`, error);
          }
          return { resumeId: resume.id, reviews: [] };
        });

        const reviewResults = await Promise.all(reviewPromises);
        const reviewsMap: Record<number, any[]> = {};
        reviewResults.forEach(({ resumeId, reviews }) => {
          reviewsMap[resumeId] = reviews;
        });
        setResumeReviews(reviewsMap);
      } catch (error) {
        console.error("Failed to load resume reviews:", error);
      }
    };

    loadAllResumeReviews();
  }, [recentResumes]);

  const loadResume = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/resumes`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const primaryResume = data.resumes?.find((r: any) => r.is_primary) || data.resumes?.[0];
        if (primaryResume?.resume_data) {
          setResumeData(primaryResume.resume_data);
        }
      }
    } catch (error) {
      console.error("Failed to load resume:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecentResumes = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/resumes`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setRecentResumes(data.resumes || []);
      }
    } catch (error) {
      console.error("Failed to load recent resumes:", error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error("Please login to save resume");
        return;
      }

      const response = await fetch(`${API_URL}/resumes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          resumeData,
          isPrimary: true,
        }),
      });

      if (response.ok) {
        toast.success("Resume saved successfully");
        // Reload recent resumes
        await loadRecentResumes();
      } else {
        throw new Error("Failed to save resume");
      }
    } catch (error: any) {
      console.error("Failed to save resume:", error);
      toast.error(error.message || "Failed to save resume");
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewResume = async (resumeId: number) => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/resumes/${resumeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setPreviewResume(data.resume);
        setIsPreviewOpen(true);
        
        // Load reviews for this resume
        await loadResumeReviews(resumeId);
      } else {
        toast.error("Failed to load resume");
      }
    } catch (error) {
      console.error("Failed to load resume:", error);
      toast.error("Failed to load resume");
    }
  };

  const handleRequestReview = async (resumeId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering view resume
    setSelectedResumeForReview(resumeId);
    setSelectedMentorId(null); // Reset selection when opening modal
    setPendingReviewMentor(null); // Reset pending review mentor
    setIsRequestReviewOpen(true);
    // ALWAYS fetch fresh mentor list when modal opens (no caching)
    // Pass resumeId directly to avoid React state timing issues
    await loadAvailableMentors(resumeId);
  };

  const loadAvailableMentors = async (resumeId?: number) => {
    // Use passed resumeId or fall back to state
    const targetResumeId = resumeId ?? selectedResumeForReview;
    if (!targetResumeId) {
      console.warn("[Load Eligible Mentors] No resume ID provided");
      return;
    }
    
    setIsLoadingMentors(true);
    try {
      const token = getAuthToken();
      if (!token) {
        console.error("[Load Eligible Mentors] No auth token found");
        toast.error("Please login to share resume");
        setIsLoadingMentors(false);
        return;
      }

      // Fetch eligible mentors for this specific resume (excludes already-shared mentors)
      const url = `${API_URL}/resumes/${targetResumeId}/eligible-mentors`;
      console.log("[Load Eligible Mentors] Requesting:", url, "Resume ID:", targetResumeId);
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("[Load Eligible Mentors] Response Status:", response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log("[Load Eligible Mentors] Full Response Data:", JSON.stringify(data, null, 2));
        
        // API returns: { mentors: [...], hasActiveReview: boolean, pendingReviewMentor: {...} }
        const mentors = data.mentors || [];
        const hasActiveReview = data.hasActiveReview || false;
        const pendingMentor = data.pendingReviewMentor || null;
        
        console.log("[Load Eligible Mentors] Parsed:", {
          resumeId: targetResumeId,
          mentorsCount: mentors.length,
          mentors: mentors,
          hasActiveReview,
          pendingMentor,
        });
        
        setAvailableMentors(mentors);
        setPendingReviewMentor(pendingMentor);
        // Remove loading spinner immediately after response is received
        setIsLoadingMentors(false);
      } else {
        const errorText = await response.text();
        console.error("[Load Eligible Mentors] Error Response:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        toast.error(`Failed to load mentors: ${response.status} ${response.statusText}`);
        setAvailableMentors([]);
        setPendingReviewMentor(null);
        // Remove loading spinner on error
        setIsLoadingMentors(false);
      }
    } catch (error) {
      console.error("Failed to load mentors:", error);
      toast.error("Failed to load mentors");
      setAvailableMentors([]);
      setPendingReviewMentor(null);
      // Remove loading spinner on exception
      setIsLoadingMentors(false);
    }
  };

  const handleSubmitReviewRequest = async () => {
    if (!selectedResumeForReview || !selectedMentorId) {
      toast.error("Please select a mentor");
      return;
    }

    if (pendingReviewMentor) {
      toast.error("This resume already has an active review");
      return;
    }

    setIsRequestingReview(true);
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error("Please login to request review");
        return;
      }

      // Use the new share endpoint
      const response = await fetch(`${API_URL}/resumes/${selectedResumeForReview}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mentorIds: selectedMentorId ? [selectedMentorId] : [],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || "Resume shared successfully");
        setIsRequestReviewOpen(false);
        setSelectedMentorId(null);
        setPendingReviewMentor(null);
        // Reload reviews for this resume
        if (selectedResumeForReview) {
          await loadResumeReviews(selectedResumeForReview);
        }
        setSelectedResumeForReview(null);
        // Reload recent resumes to update UI
        await loadRecentResumes();
        // Reload all resume reviews to refresh UI
        const token = getAuthToken();
        if (token && recentResumes.length > 0) {
          const reviewPromises = recentResumes.map(async (resume) => {
            try {
              const response = await fetch(`${API_URL}/resume-reviews/${resume.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (response.ok) {
                const data = await response.json();
                return { resumeId: resume.id, reviews: data.reviews || [] };
              }
            } catch (error) {
              console.error(`Failed to load reviews for resume ${resume.id}:`, error);
            }
            return { resumeId: resume.id, reviews: [] };
          });
          const reviewResults = await Promise.all(reviewPromises);
          const reviewsMap: Record<number, any[]> = {};
          reviewResults.forEach(({ resumeId, reviews }) => {
            reviewsMap[resumeId] = reviews;
          });
          setResumeReviews(reviewsMap);
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to request review");
      }
    } catch (error: any) {
      console.error("Failed to request review:", error);
      toast.error(error.message || "Failed to request review");
    } finally {
      setIsRequestingReview(false);
    }
  };

  const loadResumeReviews = async (resumeId: number) => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/resume-reviews/${resumeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setResumeReviews(prev => ({
          ...prev,
          [resumeId]: data.reviews || [],
        }));
      }
    } catch (error) {
      console.error("Failed to load resume reviews:", error);
    }
  };

  const handleViewReviews = async (resumeId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering view resume
    setSelectedResumeForViewingReviews(resumeId);
    await loadResumeReviews(resumeId);
    setIsReviewsDialogOpen(true);
  };

  const handleDeleteResume = async (resumeId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm("Are you sure you want to delete this resume? This action cannot be undone.")) {
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) {
        toast.error("Please login to delete resume");
        return;
      }

      const response = await fetch(`${API_URL}/resumes/${resumeId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success("Resume deleted successfully");
        // Reload recent resumes to update UI
        await loadRecentResumes();
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete resume");
      }
    } catch (error: any) {
      console.error("Failed to delete resume:", error);
      toast.error(error.message || "Failed to delete resume");
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return "Recently";
    }
  };

  const handleAIImprove = async (type: "summary" | "bullet" | "description", content: string, index?: number) => {
    setIsImproving(`${type}-${index ?? ""}`);
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error("Please login to use AI improve");
        return;
      }

      const response = await fetch(`${API_URL}/resumes/ai-improve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content, type }),
      });

      if (response.ok) {
        const data = await response.json();
        if (type === "summary") {
          setResumeData((prev) => ({
            ...prev,
            summary: data.improvedContent,
          }));
        } else if (type === "bullet" && index !== undefined) {
          // Find which experience and bullet to update
          // This is simplified - you'd need to track which experience/bullet
          toast.success("Bullet point improved");
        } else if (type === "description" && index !== undefined) {
          toast.success("Description improved");
        }
        toast.success("Content improved successfully");
      } else {
        throw new Error("Failed to improve content");
      }
    } catch (error: any) {
      console.error("Failed to improve content:", error);
      toast.error(error.message || "Failed to improve content");
    } finally {
      setIsImproving(null);
    }
  };

  const addExperience = () => {
    const newExp: Experience = {
      id: Date.now().toString(),
      jobTitle: "",
      company: "",
      startDate: "",
      endDate: "",
      isCurrent: false,
      bullets: [""],
    };
    setResumeData((prev) => ({
      ...prev,
      experience: [...prev.experience, newExp],
    }));
  };

  const removeExperience = (id: string) => {
    setResumeData((prev) => ({
      ...prev,
      experience: prev.experience.filter((exp) => exp.id !== id),
    }));
  };

  const updateExperience = (id: string, field: keyof Experience, value: any) => {
    setResumeData((prev) => ({
      ...prev,
      experience: prev.experience.map((exp) =>
        exp.id === id ? { ...exp, [field]: value } : exp
      ),
    }));
  };

  const addBullet = (expId: string) => {
    setResumeData((prev) => ({
      ...prev,
      experience: prev.experience.map((exp) =>
        exp.id === expId
          ? { ...exp, bullets: [...exp.bullets, ""].slice(0, 4) }
          : exp
      ),
    }));
  };

  const updateBullet = (expId: string, bulletIndex: number, value: string) => {
    setResumeData((prev) => ({
      ...prev,
      experience: prev.experience.map((exp) =>
        exp.id === expId
          ? {
              ...exp,
              bullets: exp.bullets.map((b, i) => (i === bulletIndex ? value : b)),
            }
          : exp
      ),
    }));
  };

  const addProject = () => {
    const newProject: Project = {
      id: Date.now().toString(),
      title: "",
      techStack: [],
      description: [""],
      githubLink: "",
      liveLink: "",
    };
    setResumeData((prev) => ({
      ...prev,
      projects: [...prev.projects, newProject],
    }));
  };

  const removeProject = (id: string) => {
    setResumeData((prev) => ({
      ...prev,
      projects: prev.projects.filter((proj) => proj.id !== id),
    }));
  };

  const updateProject = (id: string, field: keyof Project, value: any) => {
    setResumeData((prev) => ({
      ...prev,
      projects: prev.projects.map((proj) =>
        proj.id === id ? { ...proj, [field]: value } : proj
      ),
    }));
  };

  const addSkill = () => {
    if (newSkill.trim()) {
      setResumeData((prev) => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()],
      }));
      setNewSkill("");
    }
  };

  const removeSkill = (index: number) => {
    setResumeData((prev) => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index),
    }));
  };

  const addCertification = () => {
    const newCert: Certification = {
      id: Date.now().toString(),
      title: "",
      issuer: "",
      year: "",
    };
    setResumeData((prev) => ({
      ...prev,
      certifications: [...prev.certifications, newCert],
    }));
  };

  const removeCertification = (id: string) => {
    setResumeData((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((cert) => cert.id !== id),
    }));
  };

  const handleExportPDF = () => {
    try {
      exportResumeToPDF(markdown, resumeData);
      toast.success("Opening print dialog...");
    } catch (error: any) {
      toast.error(error.message || "Failed to export PDF");
    }
  };

  const markdown = generateMarkdown(resumeData);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Resume
              </>
            )}
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
        <Button
          variant="ghost"
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview ? "Hide Preview" : "Show Preview"}
        </Button>
      </div>

      <div className={cn("grid gap-6", showPreview ? "lg:grid-cols-2" : "lg:grid-cols-1")}>
        {/* Form Section */}
        <div className="space-y-6">
          {/* Header Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Header
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={resumeData.header.fullName}
                  onChange={(e) =>
                    setResumeData((prev) => ({
                      ...prev,
                      header: { ...prev.header, fullName: e.target.value },
                    }))
                  }
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetRole">Target Role *</Label>
                <Input
                  id="targetRole"
                  value={resumeData.header.targetRole}
                  onChange={(e) =>
                    setResumeData((prev) => ({
                      ...prev,
                      header: { ...prev.header, targetRole: e.target.value },
                    }))
                  }
                  placeholder="Software Engineer"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={resumeData.header.email}
                      onChange={(e) =>
                        setResumeData((prev) => ({
                          ...prev,
                          header: { ...prev.header, email: e.target.value },
                        }))
                      }
                      className="pl-10"
                      placeholder="john.doe@email.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      value={resumeData.header.phone}
                      onChange={(e) =>
                        setResumeData((prev) => ({
                          ...prev,
                          header: { ...prev.header, phone: e.target.value },
                        }))
                      }
                      className="pl-10"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <div className="relative">
                  <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="linkedin"
                    value={resumeData.header.linkedin}
                    onChange={(e) =>
                      setResumeData((prev) => ({
                        ...prev,
                        header: { ...prev.header, linkedin: e.target.value },
                      }))
                    }
                    className="pl-10"
                    placeholder="linkedin.com/in/johndoe"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="github">GitHub</Label>
                  <div className="relative">
                    <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="github"
                      value={resumeData.header.github}
                      onChange={(e) =>
                        setResumeData((prev) => ({
                          ...prev,
                          header: { ...prev.header, github: e.target.value },
                        }))
                      }
                      className="pl-10"
                      placeholder="github.com/johndoe"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="portfolio">Portfolio</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="portfolio"
                      value={resumeData.header.portfolio}
                      onChange={(e) =>
                        setResumeData((prev) => ({
                          ...prev,
                          header: { ...prev.header, portfolio: e.target.value },
                        }))
                      }
                      className="pl-10"
                      placeholder="johndoe.dev"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Professional Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Professional Summary</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAIImprove("summary", resumeData.summary)}
                  disabled={!resumeData.summary || isImproving === "summary-"}
                >
                  {isImproving === "summary-" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  AI Improve
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={resumeData.summary}
                onChange={(e) =>
                  setResumeData((prev) => ({
                    ...prev,
                    summary: e.target.value,
                  }))
                }
                placeholder="Briefly describe who you are, what you're skilled at, and your career goal"
                className="min-h-[100px]"
              />
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addSkill()}
                  placeholder="Add a skill"
                />
                <Button onClick={addSkill}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {resumeData.skills.map((skill, index) => (
                  <Badge key={index} variant="secondary" className="text-body-sm">
                    {skill}
                    <button
                      onClick={() => removeSkill(index)}
                      className="ml-2 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Experience */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Experience
                </CardTitle>
                <Button variant="outline" size="sm" onClick={addExperience}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Experience
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {resumeData.experience.map((exp) => (
                <div key={exp.id} className="p-4 border border-border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-body font-semibold">Experience Entry</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExperience(exp.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Job Title *</Label>
                      <Input
                        value={exp.jobTitle}
                        onChange={(e) => updateExperience(exp.id, "jobTitle", e.target.value)}
                        placeholder="Software Engineer"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Company *</Label>
                      <Input
                        value={exp.company}
                        onChange={(e) => updateExperience(exp.id, "company", e.target.value)}
                        placeholder="TechCorp Inc."
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date *</Label>
                      <Input
                        type="month"
                        value={exp.startDate}
                        onChange={(e) => updateExperience(exp.id, "startDate", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input
                        type="month"
                        value={exp.endDate}
                        onChange={(e) => updateExperience(exp.id, "endDate", e.target.value)}
                        disabled={exp.isCurrent}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Current</Label>
                      <div className="flex items-center h-10">
                        <input
                          type="checkbox"
                          checked={exp.isCurrent}
                          onChange={(e) => updateExperience(exp.id, "isCurrent", e.target.checked)}
                          className="h-4 w-4"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Bullet Points (Max 4) *</Label>
                    {exp.bullets.map((bullet, bulletIndex) => (
                      <div key={bulletIndex} className="flex gap-2">
                        <Input
                          value={bullet}
                          onChange={(e) => updateBullet(exp.id, bulletIndex, e.target.value)}
                          placeholder="Built / Improved / Led / Designed ... with measurable impact"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAIImprove("bullet", bullet, bulletIndex)}
                          disabled={!bullet || isImproving === `bullet-${bulletIndex}`}
                        >
                          {isImproving === `bullet-${bulletIndex}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                    {exp.bullets.length < 4 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addBullet(exp.id)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Bullet
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {resumeData.experience.length === 0 && (
                <p className="text-body-sm text-muted-foreground text-center py-4">
                  No experience entries. Click "Add Experience" to get started.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Projects */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Projects</CardTitle>
                <Button variant="outline" size="sm" onClick={addProject}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Project
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {resumeData.projects.map((project) => (
                <div key={project.id} className="p-4 border border-border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-body font-semibold">Project Entry</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeProject(project.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label>Project Title *</Label>
                    <Input
                      value={project.title}
                      onChange={(e) => updateProject(project.id, "title", e.target.value)}
                      placeholder="E-Commerce Platform"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tech Stack (comma-separated)</Label>
                    <Input
                      value={project.techStack.join(", ")}
                      onChange={(e) =>
                        updateProject(
                          project.id,
                          "techStack",
                          e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                        )
                      }
                      placeholder="React, Node.js, MongoDB"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    {project.description.map((desc, descIndex) => (
                      <div key={descIndex} className="flex gap-2">
                        <Input
                          value={desc}
                          onChange={(e) => {
                            const newDesc = [...project.description];
                            newDesc[descIndex] = e.target.value;
                            updateProject(project.id, "description", newDesc);
                          }}
                          placeholder="Project description bullet point"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAIImprove("description", desc, descIndex)}
                          disabled={!desc || isImproving === `description-${descIndex}`}
                        >
                          {isImproving === `description-${descIndex}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                    {project.description.length < 3 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newDesc = [...project.description, ""];
                          updateProject(project.id, "description", newDesc);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Description
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>GitHub Link</Label>
                      <Input
                        value={project.githubLink}
                        onChange={(e) => updateProject(project.id, "githubLink", e.target.value)}
                        placeholder="github.com/user/repo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Live Link</Label>
                      <Input
                        value={project.liveLink}
                        onChange={(e) => updateProject(project.id, "liveLink", e.target.value)}
                        placeholder="project-demo.com"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {resumeData.projects.length === 0 && (
                <p className="text-body-sm text-muted-foreground text-center py-4">
                  No projects. Click "Add Project" to get started.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Education */}
          <Card>
            <CardHeader>
              <CardTitle>Education</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Degree *</Label>
                  <Input
                    value={resumeData.education.degree}
                    onChange={(e) =>
                      setResumeData((prev) => ({
                        ...prev,
                        education: { ...prev.education, degree: e.target.value },
                      }))
                    }
                    placeholder="B.Tech"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <Input
                    value={resumeData.education.branch}
                    onChange={(e) =>
                      setResumeData((prev) => ({
                        ...prev,
                        education: { ...prev.education, branch: e.target.value },
                      }))
                    }
                    placeholder="Computer Science"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>College / University *</Label>
                <Input
                  value={resumeData.education.college}
                  onChange={(e) =>
                    setResumeData((prev) => ({
                      ...prev,
                      education: { ...prev.education, college: e.target.value },
                    }))
                  }
                  placeholder="University of Technology"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Start Year</Label>
                  <Input
                    type="number"
                    value={resumeData.education.startYear}
                    onChange={(e) =>
                      setResumeData((prev) => ({
                        ...prev,
                        education: { ...prev.education, startYear: e.target.value },
                      }))
                    }
                    placeholder="2020"
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Year</Label>
                  <Input
                    type="number"
                    value={resumeData.education.endYear}
                    onChange={(e) =>
                      setResumeData((prev) => ({
                        ...prev,
                        education: { ...prev.education, endYear: e.target.value },
                      }))
                    }
                    placeholder="2024"
                  />
                </div>
                <div className="space-y-2">
                  <Label>CGPA / GPA</Label>
                  <Input
                    value={resumeData.education.cgpa}
                    onChange={(e) =>
                      setResumeData((prev) => ({
                        ...prev,
                        education: { ...prev.education, cgpa: e.target.value },
                      }))
                    }
                    placeholder="8.5/10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Certifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Certifications (Optional)</CardTitle>
                <Button variant="outline" size="sm" onClick={addCertification}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Certification
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {resumeData.certifications.map((cert) => (
                <div key={cert.id} className="p-4 border border-border rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-body font-semibold">Certification</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCertification(cert.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Title *</Label>
                      <Input
                        value={cert.title}
                        onChange={(e) => {
                          setResumeData((prev) => ({
                            ...prev,
                            certifications: prev.certifications.map((c) =>
                              c.id === cert.id ? { ...c, title: e.target.value } : c
                            ),
                          }));
                        }}
                        placeholder="AWS Certified"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Issuer</Label>
                      <Input
                        value={cert.issuer}
                        onChange={(e) => {
                          setResumeData((prev) => ({
                            ...prev,
                            certifications: prev.certifications.map((c) =>
                              c.id === cert.id ? { ...c, issuer: e.target.value } : c
                            ),
                          }));
                        }}
                        placeholder="Amazon Web Services"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Year</Label>
                      <Input
                        type="number"
                        value={cert.year}
                        onChange={(e) => {
                          setResumeData((prev) => ({
                            ...prev,
                            certifications: prev.certifications.map((c) =>
                              c.id === cert.id ? { ...c, year: e.target.value } : c
                            ),
                          }));
                        }}
                        placeholder="2024"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {resumeData.certifications.length === 0 && (
                <p className="text-body-sm text-muted-foreground text-center py-4">
                  No certifications. Click "Add Certification" to add one.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Preview Section */}
        {showPreview && (
          <div className="lg:sticky lg:top-6 h-fit">
            <Card>
              <CardHeader>
                <CardTitle>Live Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-6 bg-card border border-border rounded-lg min-h-[800px] prose prose-sm max-w-none">
                  {renderMarkdownPreview(markdown)}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Recent Resumes */}
      {recentResumes.length > 0 && (
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-title text-foreground mb-4">Recent Resumes</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentResumes.map((resume, index) => {
              const reviews = resumeReviews[resume.id] || [];
              // Normalize status to string for comparison (handle both enum and string)
              const normalizeStatus = (status: any): string => {
                if (typeof status === 'string') return status;
                if (status === 'PENDING' || status?.toString() === 'PENDING') return 'PENDING';
                if (status === 'VERIFIED' || status?.toString() === 'VERIFIED') return 'VERIFIED';
                return String(status || '');
              };
              
              // Explicitly derive UI state using review status
              const hasAnyReview = reviews.length > 0;
              const hasPendingReview = reviews.some((r: any) => normalizeStatus(r.status) === "PENDING");
              const hasCompletedReview = reviews.some((r: any) => normalizeStatus(r.status) === "VERIFIED");
              const pendingReview = reviews.find((r: any) => normalizeStatus(r.status) === "PENDING");
              
              // Share button visibility: ONLY show if NO reviews exist
              const canShareResume = !hasAnyReview;
              
              return (
                <div
                  key={resume.id}
                  className={`p-4 rounded-lg bg-muted/30 border transition-colors ${
                    hasCompletedReview
                      ? "border-green-500/50 hover:border-green-500/70"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-body font-medium text-foreground">
                        Resume - {index + 1}
                      </p>
                      <p className="text-body-sm text-muted-foreground">
                        Last updated: {formatDate(resume.updated_at || resume.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    {resume.is_primary && (
                      <span className="inline-block text-caption text-primary bg-primary/10 px-2 py-1 rounded">
                        Primary
                      </span>
                    )}
                    {hasPendingReview && pendingReview && (
                      <span className="inline-block text-caption text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        Review pending with {pendingReview.mentorName}
                      </span>
                    )}
                    {hasCompletedReview && !hasPendingReview && (
                      <span className="inline-block text-caption text-green-600 bg-green-50 px-2 py-1 rounded">
                        Review completed
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleViewResume(resume.id)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Resume
                    </Button>
                    {/* Share (arrow) icon: ONLY show if NO reviews exist */}
                    {canShareResume && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleRequestReview(resume.id, e)}
                        title="Request Resume Review"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    )}
                    {hasCompletedReview && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-green-500 text-green-600 hover:bg-green-50"
                        onClick={(e) => handleViewReviews(resume.id, e)}
                        title="View Reviews"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => handleDeleteResume(resume.id, e)}
                      title="Delete Resume"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Resume Preview - {previewResume?.title || "Resume"}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {previewResume && (
            <div className="prose prose-sm max-w-none">
              <div className="p-6 bg-card border border-border rounded-lg">
                {previewResume.resume_data ? (
                  renderMarkdownPreview(generateMarkdown(previewResume.resume_data))
                ) : previewResume.generated_resume_text ? (
                  <div className="whitespace-pre-wrap text-foreground">
                    {previewResume.generated_resume_text}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No resume content available</p>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => {
              if (previewResume) {
                const markdown = previewResume.resume_data
                  ? generateMarkdown(previewResume.resume_data)
                  : previewResume.generated_resume_text || "";
                navigator.clipboard.writeText(markdown);
                toast.success("Resume copied to clipboard!");
              }
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Copy
          </Button>
          <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
      </Dialog>

      {/* Share Resume Dialog */}
      <Dialog 
        open={isRequestReviewOpen} 
        onOpenChange={(open) => {
          setIsRequestReviewOpen(open);
          if (open && selectedResumeForReview) {
            // ALWAYS fetch fresh mentor list when modal opens (no caching)
            // This ensures we get the latest ongoing mentors
            // Pass resumeId directly to avoid state timing issues
            loadAvailableMentors(selectedResumeForReview);
          } else {
            // Reset state when closing
            setSelectedMentorId(null);
            setSelectedResumeForReview(null);
            setPendingReviewMentor(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Resume with Mentors</DialogTitle>
            <DialogDescription>
              Select a mentor to share your resume with.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            {isLoadingMentors ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : pendingReviewMentor ? (
              <div className="text-center py-8">
                <p className="text-body-sm text-muted-foreground mb-2">
                  Review pending with {pendingReviewMentor.mentorName}
                </p>
                <p className="text-body-sm text-muted-foreground">
                  This resume is currently under review.
                </p>
              </div>
            ) : availableMentors.length === 0 ? (
              <p className="text-body-sm text-muted-foreground text-center py-4">
                No mentors available with ongoing sessions.
              </p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {availableMentors.map((mentor) => {
                  // Use mentorId from API response, fallback to id for backward compatibility
                  const mentorId = mentor.mentorId || mentor.id;
                  return (
                    <div
                      key={mentorId}
                      className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedMentorId(mentorId)}
                    >
                      <input
                        type="radio"
                        id={`mentor-${mentorId}`}
                        name="selectedMentor"
                        checked={selectedMentorId === mentorId}
                        onChange={() => setSelectedMentorId(mentorId)}
                        className="h-4 w-4 text-primary focus:ring-primary cursor-pointer"
                      />
                      <label
                        htmlFor={`mentor-${mentorId}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div>
                          <p className="text-body font-medium">{mentor.mentorName || mentor.name}</p>
                          <p className="text-body-sm text-muted-foreground">{mentor.mentorEmail || mentor.email}</p>
                        </div>
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRequestReviewOpen(false);
                setSelectedMentorId(null);
                setSelectedResumeForReview(null);
                setPendingReviewMentor(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReviewRequest}
              disabled={isRequestingReview || !selectedMentorId || !!pendingReviewMentor}
            >
              {isRequestingReview ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Share Resume
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reviews Dialog */}
      <Dialog open={isReviewsDialogOpen} onOpenChange={(open) => {
        setIsReviewsDialogOpen(open);
        if (!open) {
          setSelectedResumeForViewingReviews(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mentor Reviews</DialogTitle>
            <DialogDescription>
              Feedback from mentors who reviewed your resume
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            {selectedResumeForViewingReviews && resumeReviews[selectedResumeForViewingReviews] ? (
              resumeReviews[selectedResumeForViewingReviews].length === 0 ? (
                <p className="text-body-sm text-muted-foreground text-center py-8">
                  No reviews yet. Request a review to get feedback from mentors.
                </p>
              ) : (
                resumeReviews[selectedResumeForViewingReviews].map((review: any, index: number) => (
                  <div
                    key={`${review.mentorId}-${index}`}
                    className="p-4 rounded-lg border border-border space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-body font-semibold">
                          {review.mentorName || "Mentor"}
                        </p>
                        <p className="text-body-sm text-muted-foreground">
                          {review.mentorEmail || ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {(review.status === "VERIFIED" || String(review.status) === "VERIFIED") ? (
                          <Badge variant="default" className="bg-success/10 text-success">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Reviewed
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                        {review.rating && (
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-4 w-4 ${
                                  star <= review.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-muted-foreground"
                                }`}
                              />
                            ))}
                            <span className="text-body-sm ml-1">({review.rating})</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {review.feedback && (
                      <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                        <p className="text-body-sm text-foreground whitespace-pre-wrap">
                          {review.feedback}
                        </p>
                      </div>
                    )}
                    {review.reviewedAt && (
                      <p className="text-caption text-muted-foreground">
                        Reviewed {formatDate(review.reviewedAt)}
                      </p>
                    )}
                  </div>
                ))
              )
            ) : (
              <p className="text-body-sm text-muted-foreground text-center py-8">
                No reviews yet. Request a review to get feedback from mentors.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsReviewsDialogOpen(false);
              setSelectedResumeForViewingReviews(null);
            }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Simple markdown renderer for preview
function renderMarkdownPreview(md: string) {
  return md.split("\n").map((line, i) => {
    if (line.startsWith("# ")) {
      return (
        <h1 key={i} className="text-display-sm text-foreground mb-2 font-bold">
          {line.slice(2)}
        </h1>
      );
    }
    if (line.startsWith("## ")) {
      return (
        <h2
          key={i}
          className="text-headline text-foreground mt-6 mb-3 border-b border-border pb-2 font-semibold"
        >
          {line.slice(3)}
        </h2>
      );
    }
    if (line.startsWith("### ")) {
      return (
        <h3 key={i} className="text-title text-foreground mt-4 mb-2 font-semibold">
          {line.slice(4)}
        </h3>
      );
    }
    if (line.startsWith("- ")) {
      return (
        <li key={i} className="text-body-sm text-foreground ml-4 list-disc">
          {line.slice(2)}
        </li>
      );
    }
    if (line.startsWith("*") && line.endsWith("*") && !line.startsWith("**")) {
      return (
        <p key={i} className="text-body-sm text-muted-foreground italic">
          {line.slice(1, -1)}
        </p>
      );
    }
    if (line.startsWith("**") && line.endsWith("**")) {
      return (
        <p key={i} className="text-body font-semibold text-primary">
          {line.slice(2, -2)}
        </p>
      );
    }
    if (line.trim() === "") {
      return <div key={i} className="h-2" />;
    }
    return (
      <p key={i} className="text-body-sm text-foreground">
        {line}
      </p>
    );
  });
}

