import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sparkles,
  Copy,
  Download,
  RefreshCw,
  Building,
  Briefcase,
  FileText,
  Eye,
  Send,
  Star,
  CheckCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { getAuthToken, getCurrentUser } from "@/lib/auth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { API_BASE_URL } from "@/lib/api";

const API_URL = API_BASE_URL;

interface CoverLetter {
  id: number;
  company_name: string;
  job_title: string;
  cover_letter_text: string;
  has_job_description: boolean;
  created_at: string;
}

interface Review {
  mentorId: string;
  mentorName: string;
  rating: number | null;
  feedback: string | null;
  status: string;
  reviewedAt: string | null;
  createdAt: string;
}

export default function CoverLetter() {
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [generatedLetter, setGeneratedLetter] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [recentLetters, setRecentLetters] = useState<CoverLetter[]>([]);
  const [previewLetter, setPreviewLetter] = useState<CoverLetter | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Review functionality state
  const [coverLetterReviews, setCoverLetterReviews] = useState<Record<number, Review[]>>({});
  const [selectedCoverLetterForReview, setSelectedCoverLetterForReview] = useState<number | null>(null);
  const [isRequestReviewOpen, setIsRequestReviewOpen] = useState(false);
  const [availableMentors, setAvailableMentors] = useState<any[]>([]);
  const [selectedMentorId, setSelectedMentorId] = useState<string | null>(null);
  const [isRequestingReview, setIsRequestingReview] = useState(false);
  const [isLoadingMentors, setIsLoadingMentors] = useState(false);
  const [pendingReviewMentor, setPendingReviewMentor] = useState<{ mentorId: string; mentorName: string; mentorEmail: string } | null>(null);

  useEffect(() => {
    loadRecentLetters();
  }, []);

  // Load reviews for all cover letters when recent letters are loaded
  useEffect(() => {
    if (recentLetters.length > 0) {
      recentLetters.forEach((letter) => {
        loadCoverLetterReviews(letter.id);
      });
    }
  }, [recentLetters]);

  const loadRecentLetters = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/cover-letters`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setRecentLetters(data.coverLetters || []);
      }
    } catch (error) {
      console.error("Failed to load recent letters:", error);
    }
  };

  const handleGenerate = async () => {
    if (!company.trim() || !position.trim()) {
      toast.error("Please fill in company name and position");
      return;
    }

    setIsGenerating(true);
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error("Please login to generate cover letter");
        return;
      }

      const response = await fetch(`${API_URL}/cover-letters/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          companyName: company.trim(),
          position: position.trim(),
          jobDescription: jobDescription.trim() || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedLetter(data.letterText || data.coverLetter?.cover_letter_text || "");
        toast.success("Cover letter generated successfully!");
        
        // Reload recent letters
        await loadRecentLetters();
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate cover letter");
      }
    } catch (error: any) {
      console.error("Failed to generate cover letter:", error);
      toast.error(error.message || "Failed to generate cover letter");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLetter);
    toast.success("Cover letter copied to clipboard!");
  };

  const handleExport = () => {
    // Create a blob with the cover letter text
    const blob = new Blob([generatedLetter], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Cover_Letter_${company}_${position}_${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Cover letter exported!");
  };

  const handleViewLetter = async (letterId: number) => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/cover-letters/${letterId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setPreviewLetter(data.coverLetter);
        setIsPreviewOpen(true);
      } else {
        toast.error("Failed to load cover letter");
      }
    } catch (error) {
      console.error("Failed to load cover letter:", error);
      toast.error("Failed to load cover letter");
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

  // Review functionality
  const loadCoverLetterReviews = async (coverLetterId: number) => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/cover-letters/${coverLetterId}/reviews`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setCoverLetterReviews((prev) => ({
          ...prev,
          [coverLetterId]: data.reviews || [],
        }));
      }
    } catch (error) {
      console.error("Failed to load cover letter reviews:", error);
    }
  };

  const handleRequestReview = async (coverLetterId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCoverLetterForReview(coverLetterId);
    setSelectedMentorId(null);
    setPendingReviewMentor(null);
    setIsRequestReviewOpen(true);
    await loadAvailableMentors(coverLetterId);
  };

  const loadAvailableMentors = async (coverLetterId?: number) => {
    const targetCoverLetterId = coverLetterId ?? selectedCoverLetterForReview;
    if (!targetCoverLetterId) {
      console.warn("[Load Eligible Mentors] No cover letter ID provided");
      return;
    }
    
    setIsLoadingMentors(true);
    try {
      const token = getAuthToken();
      if (!token) {
        console.error("[Load Eligible Mentors] No auth token found");
        toast.error("Please login to share cover letter");
        setIsLoadingMentors(false);
        return;
      }

      const url = `${API_URL}/cover-letters/${targetCoverLetterId}/eligible-mentors`;
      console.log("[Load Eligible Mentors] Requesting:", url, "Cover Letter ID:", targetCoverLetterId);
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("[Load Eligible Mentors] Response Status:", response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log("[Load Eligible Mentors] Full Response Data:", JSON.stringify(data, null, 2));
        
        const mentors = data.mentors || [];
        const hasActiveReview = data.hasActiveReview || false;
        const pendingMentor = data.pendingReviewMentor || null;
        
        console.log("[Load Eligible Mentors] Parsed:", {
          coverLetterId: targetCoverLetterId,
          mentorsCount: mentors.length,
          mentors: mentors,
          hasActiveReview,
          pendingMentor,
        });
        
        setAvailableMentors(mentors);
        setPendingReviewMentor(pendingMentor);
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
        setIsLoadingMentors(false);
      }
    } catch (error) {
      console.error("Failed to load mentors:", error);
      toast.error("Failed to load mentors");
      setAvailableMentors([]);
      setPendingReviewMentor(null);
      setIsLoadingMentors(false);
    }
  };

  const handleSubmitReviewRequest = async () => {
    if (!selectedCoverLetterForReview || !selectedMentorId) {
      toast.error("Please select a mentor");
      return;
    }

    setIsRequestingReview(true);
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error("Please login to request review");
        return;
      }

      const response = await fetch(`${API_URL}/cover-letters/${selectedCoverLetterForReview}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mentorIds: [selectedMentorId],
        }),
      });

      if (response.ok) {
        toast.success("Cover letter shared with mentor successfully!");
        setIsRequestReviewOpen(false);
        setSelectedMentorId(null);
        setSelectedCoverLetterForReview(null);
        setPendingReviewMentor(null);
        // Reload reviews
        if (selectedCoverLetterForReview) {
          await loadCoverLetterReviews(selectedCoverLetterForReview);
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to share cover letter");
      }
    } catch (error: any) {
      console.error("Failed to share cover letter:", error);
      toast.error(error.message || "Failed to share cover letter");
    } finally {
      setIsRequestingReview(false);
    }
  };

  const normalizeStatus = (status: any): string => {
    if (typeof status === 'string') return status;
    if (status === 'PENDING' || status?.toString() === 'PENDING') return 'PENDING';
    if (status === 'VERIFIED' || status?.toString() === 'VERIFIED') return 'VERIFIED';
    return String(status || '');
  };

  return (
    <DashboardLayout role="student" title="Cover Letter Generator">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="glass-card rounded-xl p-6">
          <h1 className="text-headline text-foreground mb-2">
            AI Cover Letter Generator
          </h1>
          <p className="text-body text-muted-foreground">
            Generate personalized, compelling cover letters in seconds. Just
            provide the job details and let AI do the rest.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input Form */}
          <div className="glass-card rounded-xl p-6 space-y-6">
            <h2 className="text-title text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Job Details
            </h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company Name *</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="company"
                    placeholder="e.g., Google, Microsoft"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Position *</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="position"
                    placeholder="e.g., Software Engineer, Product Manager"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobDescription">
                  Job Description (Optional)
                </Label>
                <Textarea
                  id="jobDescription"
                  placeholder="Paste the job description here for a more tailored cover letter..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="min-h-[200px] resize-none"
                />
                <p className="text-body-sm text-muted-foreground">
                  {jobDescription
                    ? "AI will match keywords and mirror language from the job description"
                    : "AI will infer role responsibilities from the position and use your profile data"}
                </p>
              </div>

              <Button
                variant="gradient"
                className="w-full"
                onClick={handleGenerate}
                disabled={isGenerating || !company.trim() || !position.trim()}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Cover Letter
                  </>
                )}
              </Button>
            </div>

            {/* Tips */}
            <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
              <h3 className="text-body font-semibold text-foreground mb-2">
                Tips for Better Results
              </h3>
              <ul className="text-body-sm text-muted-foreground space-y-1">
                <li>• Include the full job description for personalization</li>
                <li>• Double-check company name spelling</li>
                <li>• Review and customize the generated letter</li>
                <li>• Add specific achievements relevant to the role</li>
              </ul>
            </div>
          </div>

          {/* Generated Letter */}
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-title text-foreground">Generated Letter</h2>
              {generatedLetter && (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleCopy}>
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExport}>
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </div>
              )}
            </div>

            <div className="p-6 min-h-[500px]">
              {generatedLetter ? (
                <div className="prose prose-sm max-w-none">
                  <Textarea
                    value={generatedLetter}
                    onChange={(e) => setGeneratedLetter(e.target.value)}
                    className="min-h-[450px] resize-none text-foreground bg-transparent border-0 focus-visible:ring-0 p-0"
                  />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8" />
                  </div>
                  <p className="text-body font-medium">
                    Your cover letter will appear here
                  </p>
                  <p className="text-body-sm mt-1">
                    Fill in the job details and click generate
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Letters */}
        {recentLetters.length > 0 && (
          <div className="glass-card rounded-xl p-6">
            <h2 className="text-title text-foreground mb-4">Recent Letters</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentLetters.map((letter) => {
                const reviews = coverLetterReviews[letter.id] || [];
                const hasAnyReview = reviews.length > 0;
                const hasPendingReview = reviews.some((r: Review) => normalizeStatus(r.status) === "PENDING");
                const hasCompletedReview = reviews.some((r: Review) => normalizeStatus(r.status) === "VERIFIED");
                const canShareCoverLetter = !hasAnyReview;
                const pendingReview = reviews.find((r: Review) => normalizeStatus(r.status) === "PENDING");

                return (
                  <div
                    key={letter.id}
                    className={`p-4 rounded-lg bg-muted/30 border transition-colors ${
                      hasCompletedReview
                        ? "border-green-500/50 hover:border-green-500/70"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-body font-medium text-foreground">
                          {letter.company_name || "Unknown Company"}
                        </p>
                        <p className="text-body-sm text-muted-foreground">
                          {letter.job_title || "Position"}
                        </p>
                      </div>
                      <span className="text-caption text-muted-foreground">
                        {formatDate(letter.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      {letter.has_job_description && (
                        <span className="inline-block text-caption text-primary bg-primary/10 px-2 py-1 rounded">
                          With JD
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
                        onClick={() => handleViewLetter(letter.id)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Letter
                      </Button>
                      {/* Share (arrow) icon: ONLY show if NO reviews exist */}
                      {canShareCoverLetter && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleRequestReview(letter.id, e)}
                          title="Request Cover Letter Review"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      {hasCompletedReview && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-green-500 text-green-600 hover:bg-green-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Show reviews dialog
                            const letterReviews = coverLetterReviews[letter.id] || [];
                            if (letterReviews.length > 0) {
                              const completedReviews = letterReviews.filter((r: Review) => normalizeStatus(r.status) === "VERIFIED");
                              if (completedReviews.length > 0) {
                                const review = completedReviews[0];
                                toast.info(
                                  `Review by ${review.mentorName}: ${review.rating ? `${review.rating}/5 stars` : "No rating"} - ${review.feedback || "No feedback"}`
                                );
                              }
                            }
                          }}
                          title="View Reviews"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Share Cover Letter Dialog */}
      <Dialog 
        open={isRequestReviewOpen} 
        onOpenChange={(open) => {
          setIsRequestReviewOpen(open);
          if (open && selectedCoverLetterForReview) {
            loadAvailableMentors(selectedCoverLetterForReview);
          } else {
            setSelectedMentorId(null);
            setSelectedCoverLetterForReview(null);
            setPendingReviewMentor(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Cover Letter with Mentors</DialogTitle>
            <DialogDescription>
              Select a mentor to share your cover letter with.
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
                  This cover letter is currently under review.
                </p>
              </div>
            ) : availableMentors.length === 0 ? (
              <p className="text-body-sm text-muted-foreground text-center py-4">
                No mentors available with ongoing sessions.
              </p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                <RadioGroup value={selectedMentorId || ""} onValueChange={setSelectedMentorId}>
                  {availableMentors.map((mentor) => {
                    const mentorId = mentor.mentorId || mentor.id;
                    return (
                      <div
                        key={mentorId}
                        className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer"
                        onClick={() => setSelectedMentorId(mentorId)}
                      >
                        <RadioGroupItem value={mentorId} id={`mentor-${mentorId}`} />
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
                </RadioGroup>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRequestReviewOpen(false);
                setSelectedMentorId(null);
                setSelectedCoverLetterForReview(null);
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
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sharing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Share Cover Letter
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Cover Letter - {previewLetter?.company_name} - {previewLetter?.job_title}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {previewLetter && (
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-foreground">
                  {previewLetter.cover_letter_text}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                if (previewLetter) {
                  navigator.clipboard.writeText(previewLetter.cover_letter_text);
                  toast.success("Cover letter copied to clipboard!");
                }
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

      console.warn("[Load Eligible Mentors] No cover letter ID provided");
      return;
    }
    
    setIsLoadingMentors(true);
    try {
      const token = getAuthToken();
      if (!token) {
        console.error("[Load Eligible Mentors] No auth token found");
        toast.error("Please login to share cover letter");
        setIsLoadingMentors(false);
        return;
      }

      const url = `${API_URL}/cover-letters/${targetCoverLetterId}/eligible-mentors`;
      console.log("[Load Eligible Mentors] Requesting:", url, "Cover Letter ID:", targetCoverLetterId);
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("[Load Eligible Mentors] Response Status:", response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log("[Load Eligible Mentors] Full Response Data:", JSON.stringify(data, null, 2));
        
        const mentors = data.mentors || [];
        const hasActiveReview = data.hasActiveReview || false;
        const pendingMentor = data.pendingReviewMentor || null;
        
        console.log("[Load Eligible Mentors] Parsed:", {
          coverLetterId: targetCoverLetterId,
          mentorsCount: mentors.length,
          mentors: mentors,
          hasActiveReview,
          pendingMentor,
        });
        
        setAvailableMentors(mentors);
        setPendingReviewMentor(pendingMentor);
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
        setIsLoadingMentors(false);
      }
    } catch (error) {
      console.error("Failed to load mentors:", error);
      toast.error("Failed to load mentors");
      setAvailableMentors([]);
      setPendingReviewMentor(null);
      setIsLoadingMentors(false);
    }
  };

  const handleSubmitReviewRequest = async () => {
    if (!selectedCoverLetterForReview || !selectedMentorId) {
      toast.error("Please select a mentor");
      return;
    }

    setIsRequestingReview(true);
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error("Please login to request review");
        return;
      }

      const response = await fetch(`${API_URL}/cover-letters/${selectedCoverLetterForReview}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mentorIds: [selectedMentorId],
        }),
      });

      if (response.ok) {
        toast.success("Cover letter shared with mentor successfully!");
        setIsRequestReviewOpen(false);
        setSelectedMentorId(null);
        setSelectedCoverLetterForReview(null);
        setPendingReviewMentor(null);
        // Reload reviews
        if (selectedCoverLetterForReview) {
          await loadCoverLetterReviews(selectedCoverLetterForReview);
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to share cover letter");
      }
    } catch (error: any) {
      console.error("Failed to share cover letter:", error);
      toast.error(error.message || "Failed to share cover letter");
    } finally {
      setIsRequestingReview(false);
    }
  };

  const normalizeStatus = (status: any): string => {
    if (typeof status === 'string') return status;
    if (status === 'PENDING' || status?.toString() === 'PENDING') return 'PENDING';
    if (status === 'VERIFIED' || status?.toString() === 'VERIFIED') return 'VERIFIED';
    return String(status || '');
  };

  return (
    <DashboardLayout role="student" title="Cover Letter Generator">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="glass-card rounded-xl p-6">
          <h1 className="text-headline text-foreground mb-2">
            AI Cover Letter Generator
          </h1>
          <p className="text-body text-muted-foreground">
            Generate personalized, compelling cover letters in seconds. Just
            provide the job details and let AI do the rest.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input Form */}
          <div className="glass-card rounded-xl p-6 space-y-6">
            <h2 className="text-title text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Job Details
            </h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company Name *</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="company"
                    placeholder="e.g., Google, Microsoft"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Position *</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="position"
                    placeholder="e.g., Software Engineer, Product Manager"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobDescription">
                  Job Description (Optional)
                </Label>
                <Textarea
                  id="jobDescription"
                  placeholder="Paste the job description here for a more tailored cover letter..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="min-h-[200px] resize-none"
                />
                <p className="text-body-sm text-muted-foreground">
                  {jobDescription
                    ? "AI will match keywords and mirror language from the job description"
                    : "AI will infer role responsibilities from the position and use your profile data"}
                </p>
              </div>

              <Button
                variant="gradient"
                className="w-full"
                onClick={handleGenerate}
                disabled={isGenerating || !company.trim() || !position.trim()}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Cover Letter
                  </>
                )}
              </Button>
            </div>

            {/* Tips */}
            <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
              <h3 className="text-body font-semibold text-foreground mb-2">
                Tips for Better Results
              </h3>
              <ul className="text-body-sm text-muted-foreground space-y-1">
                <li>• Include the full job description for personalization</li>
                <li>• Double-check company name spelling</li>
                <li>• Review and customize the generated letter</li>
                <li>• Add specific achievements relevant to the role</li>
              </ul>
            </div>
          </div>

          {/* Generated Letter */}
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-title text-foreground">Generated Letter</h2>
              {generatedLetter && (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleCopy}>
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExport}>
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </div>
              )}
            </div>

            <div className="p-6 min-h-[500px]">
              {generatedLetter ? (
                <div className="prose prose-sm max-w-none">
                  <Textarea
                    value={generatedLetter}
                    onChange={(e) => setGeneratedLetter(e.target.value)}
                    className="min-h-[450px] resize-none text-foreground bg-transparent border-0 focus-visible:ring-0 p-0"
                  />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8" />
                  </div>
                  <p className="text-body font-medium">
                    Your cover letter will appear here
                  </p>
                  <p className="text-body-sm mt-1">
                    Fill in the job details and click generate
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Letters */}
        {recentLetters.length > 0 && (
          <div className="glass-card rounded-xl p-6">
            <h2 className="text-title text-foreground mb-4">Recent Letters</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentLetters.map((letter) => {
                const reviews = coverLetterReviews[letter.id] || [];
                const hasAnyReview = reviews.length > 0;
                const hasPendingReview = reviews.some((r: Review) => normalizeStatus(r.status) === "PENDING");
                const hasCompletedReview = reviews.some((r: Review) => normalizeStatus(r.status) === "VERIFIED");
                const canShareCoverLetter = !hasAnyReview;
                const pendingReview = reviews.find((r: Review) => normalizeStatus(r.status) === "PENDING");

                return (
                  <div
                    key={letter.id}
                    className={`p-4 rounded-lg bg-muted/30 border transition-colors ${
                      hasCompletedReview
                        ? "border-green-500/50 hover:border-green-500/70"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-body font-medium text-foreground">
                          {letter.company_name || "Unknown Company"}
                        </p>
                        <p className="text-body-sm text-muted-foreground">
                          {letter.job_title || "Position"}
                        </p>
                      </div>
                      <span className="text-caption text-muted-foreground">
                        {formatDate(letter.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      {letter.has_job_description && (
                        <span className="inline-block text-caption text-primary bg-primary/10 px-2 py-1 rounded">
                          With JD
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
                        onClick={() => handleViewLetter(letter.id)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Letter
                      </Button>
                      {/* Share (arrow) icon: ONLY show if NO reviews exist */}
                      {canShareCoverLetter && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleRequestReview(letter.id, e)}
                          title="Request Cover Letter Review"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      {hasCompletedReview && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-green-500 text-green-600 hover:bg-green-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Show reviews dialog
                            const letterReviews = coverLetterReviews[letter.id] || [];
                            if (letterReviews.length > 0) {
                              const completedReviews = letterReviews.filter((r: Review) => normalizeStatus(r.status) === "VERIFIED");
                              if (completedReviews.length > 0) {
                                const review = completedReviews[0];
                                toast.info(
                                  `Review by ${review.mentorName}: ${review.rating ? `${review.rating}/5 stars` : "No rating"} - ${review.feedback || "No feedback"}`
                                );
                              }
                            }
                          }}
                          title="View Reviews"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Share Cover Letter Dialog */}
      <Dialog 
        open={isRequestReviewOpen} 
        onOpenChange={(open) => {
          setIsRequestReviewOpen(open);
          if (open && selectedCoverLetterForReview) {
            loadAvailableMentors(selectedCoverLetterForReview);
          } else {
            setSelectedMentorId(null);
            setSelectedCoverLetterForReview(null);
            setPendingReviewMentor(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Cover Letter with Mentors</DialogTitle>
            <DialogDescription>
              Select a mentor to share your cover letter with.
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
                  This cover letter is currently under review.
                </p>
              </div>
            ) : availableMentors.length === 0 ? (
              <p className="text-body-sm text-muted-foreground text-center py-4">
                No mentors available with ongoing sessions.
              </p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                <RadioGroup value={selectedMentorId || ""} onValueChange={setSelectedMentorId}>
                  {availableMentors.map((mentor) => {
                    const mentorId = mentor.mentorId || mentor.id;
                    return (
                      <div
                        key={mentorId}
                        className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer"
                        onClick={() => setSelectedMentorId(mentorId)}
                      >
                        <RadioGroupItem value={mentorId} id={`mentor-${mentorId}`} />
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
                </RadioGroup>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRequestReviewOpen(false);
                setSelectedMentorId(null);
                setSelectedCoverLetterForReview(null);
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
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sharing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Share Cover Letter
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Cover Letter - {previewLetter?.company_name} - {previewLetter?.job_title}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {previewLetter && (
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-foreground">
                  {previewLetter.cover_letter_text}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                if (previewLetter) {
                  navigator.clipboard.writeText(previewLetter.cover_letter_text);
                  toast.success("Cover letter copied to clipboard!");
                }
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
