import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  FileText,
  MessageSquare,
  Video,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Send,
  Filter,
  Loader2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAuthToken } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { getSocket } from "@/lib/socket";

interface Review {
  id: string;
  student: {
    name: string;
    email: string;
    avatar: string;
  };
  type: string;
  submitted: string;
  priority: string;
  status: "pending" | "completed";
  document: string;
  message: string;
  completedAt?: string;
  feedback?: string;
  submissionId?: number;
  fileUrl?: string;
}

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState<number | null>(null); // Star rating (1-5, required for resume reviews)
  const [completingReview, setCompletingReview] = useState(false);

  // Fetch reviews from API
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        const token = getAuthToken();
        if (!token) {
          setReviews([]);
          return;
        }

        const apiUrl = API_BASE_URL;
        const params = new URLSearchParams();
        if (statusFilter !== "all") params.append("status", statusFilter);
        if (typeFilter !== "all") params.append("type", typeFilter);
        if (priorityFilter !== "all") params.append("priority", priorityFilter);

        const response = await fetch(`${apiUrl}/mentors/reviews?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          setReviews([]);
          return;
        }

        const data = await response.json();
        setReviews(data.reviews || []);
      } catch (err: any) {
        console.error("Error fetching reviews:", err);
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [statusFilter, typeFilter, priorityFilter]);

  // Handle complete review
  const handleCompleteReview = async () => {
    if (!selectedReview || completingReview) return;

    // For resume and cover letter reviews, rating is required
    const isResumeReview = selectedReview.type === "Resume Review";
    const isCoverLetterReview = selectedReview.type === "Cover Letter Review";
    const requiresRating = isResumeReview || isCoverLetterReview;
    
    if (requiresRating && (!rating || rating < 1 || rating > 5)) {
      alert("Please select a rating (1-5 stars) before submitting the review");
      return;
    }

    try {
      setCompletingReview(true);
      const token = getAuthToken();
      if (!token) {
        alert("Authentication required");
        return;
      }

      const apiUrl = API_BASE_URL;
      const response = await fetch(`${apiUrl}/mentors/reviews/${selectedReview.id}/complete`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rating: requiresRating ? rating : undefined, // Required for resume and cover letter reviews
          feedback: feedback.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || "Failed to complete review");
        return;
      }

      // Refresh reviews
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (typeFilter !== "all") params.append("type", typeFilter);
      if (priorityFilter !== "all") params.append("priority", priorityFilter);

      const refreshResponse = await fetch(`${apiUrl}/mentors/reviews?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setReviews(data.reviews || []);
      }

      setReviewDialogOpen(false);
      setFeedback("");
      setRating(null);
      setSelectedReview(null);
    } catch (err: any) {
      console.error("Error completing review:", err);
      alert("Failed to complete review");
    } finally {
      setCompletingReview(false);
    }
  };

  // Handle view review
  const handleViewReview = async (review: Review) => {
    if (review.fileUrl) {
      const apiUrl = API_BASE_URL;
      const fullURL = review.fileUrl.startsWith("http") ? review.fileUrl : `${apiUrl}${review.fileUrl}`;
      window.open(fullURL, "_blank");
    } else if (review.type === "Resume Review" && (review as any).resumeId) {
      // For resume reviews, fetch and show resume content
      try {
        const token = getAuthToken();
        if (!token) return;
        
        const apiUrl = API_BASE_URL;
        const response = await fetch(`${apiUrl}/resumes/${(review as any).resumeId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (response.ok) {
          const data = await response.json();
          const resume = data.resume;
          const resumeContent = resume.resume_data 
            ? JSON.stringify(resume.resume_data, null, 2)
            : resume.generated_resume_text || "No resume content available";
          
          // Open in new window with formatted content
          const newWindow = window.open("", "_blank");
          if (newWindow) {
            newWindow.document.write(`
              <html>
                <head><title>Resume - ${resume.title || "Resume"}</title></head>
                <body style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
                  <h1>${resume.title || "Resume"}</h1>
                  <pre style="white-space: pre-wrap; word-wrap: break-word;">${resumeContent}</pre>
                </body>
              </html>
            `);
          }
        }
      } catch (error) {
        console.error("Failed to load resume:", error);
      }
    } else if (review.type === "Cover Letter Review" && (review as any).coverLetterId) {
      // For cover letter reviews, fetch and show cover letter content
      try {
        const token = getAuthToken();
        if (!token) return;
        
        const apiUrl = API_BASE_URL;
        const response = await fetch(`${apiUrl}/cover-letters/${(review as any).coverLetterId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (response.ok) {
          const data = await response.json();
          const coverLetter = data.coverLetter;
          const coverLetterContent = coverLetter.cover_letter_text || "No cover letter content available";
          
          // Open in new window with formatted content
          const newWindow = window.open("", "_blank");
          if (newWindow) {
            newWindow.document.write(`
              <html>
                <head><title>Cover Letter - ${coverLetter.company_name || "Company"} - ${coverLetter.job_title || "Position"}</title></head>
                <body style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
                  <h1>Cover Letter - ${coverLetter.company_name || "Company"}</h1>
                  <h2>${coverLetter.job_title || "Position"}</h2>
                  <div style="white-space: pre-wrap; word-wrap: break-word; margin-top: 20px;">${coverLetterContent}</div>
                </body>
              </html>
            `);
          }
        }
      } catch (error) {
        console.error("Failed to load cover letter:", error);
      }
    }
  };

  const filteredReviews = reviews.filter((review) => {
    const matchesType = typeFilter === "all" || review.type === typeFilter;
    const matchesStatus = statusFilter === "all" || review.status === statusFilter;
    const matchesPriority =
      priorityFilter === "all" || review.priority === priorityFilter;
    return matchesType && matchesStatus && matchesPriority;
  });

  const pendingReviews = filteredReviews.filter((r) => r.status === "pending");
  const completedReviews = filteredReviews.filter((r) => r.status === "completed");

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Resume Review":
        return <FileText className="h-5 w-5" />;
      case "Cover Letter Review":
        return <FileText className="h-5 w-5" />;
      case "Assignment Review":
        return <FileText className="h-5 w-5" />;
      default:
        return <MessageSquare className="h-5 w-5" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "medium":
        return "bg-warning/10 text-warning border-warning/20";
      case "low":
        return "bg-success/10 text-success border-success/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <DashboardLayout role="mentor" title="Reviews">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-headline text-foreground">Reviews</h1>
            <p className="text-body text-muted-foreground mt-1">
              Review student submissions and provide feedback
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Resume Review">Resume Review</SelectItem>
                <SelectItem value="Cover Letter Review">Cover Letter Review</SelectItem>
                <SelectItem value="Assignment Review">
                  Assignment Review
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Reviews Tabs */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({pendingReviews.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedReviews.length})
            </TabsTrigger>
          </TabsList>

          {/* Pending Reviews */}
          <TabsContent value="pending" className="space-y-4">
            {loading ? (
              <div className="glass-card rounded-xl p-12 text-center">
                <Loader2 className="h-16 w-16 text-primary/50 mx-auto mb-4 animate-spin" />
                <p className="text-body text-foreground">Loading reviews...</p>
              </div>
            ) : pendingReviews.length === 0 ? (
              <div className="glass-card rounded-xl p-12 text-center">
                <CheckCircle className="h-16 w-16 text-success/50 mx-auto mb-4" />
                <p className="text-body text-foreground">No pending reviews</p>
                <p className="text-body-sm text-muted-foreground mt-2">
                  All reviews have been completed!
                </p>
              </div>
            ) : (
              pendingReviews.map((review) => (
                <div
                  key={review.id}
                  className="glass-card rounded-xl p-6 hover:shadow-card-hover transition-all duration-300"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    {/* Left: Student Info */}
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-body-sm">
                        {review.student.avatar}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-body font-semibold text-foreground">
                            {review.student.name}
                          </h3>
                          <Badge
                            variant="outline"
                            className={getPriorityColor(review.priority)}
                          >
                            {review.priority}
                          </Badge>
                        </div>
                        <p className="text-body-sm text-muted-foreground">
                          {review.student.email}
                        </p>
                        <div className="flex items-center gap-4 mt-3">
                          <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
                            {getTypeIcon(review.type)}
                            <span>{review.type}</span>
                          </div>
                          <div className="flex items-center gap-1 text-body-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {review.submitted}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewReview(review)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button
                        variant="gradient"
                        size="sm"
                        onClick={() => {
                          setSelectedReview(review);
                          setReviewDialogOpen(true);
                        }}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Review
                      </Button>
                    </div>
                  </div>

                  {/* Message Preview */}
                  {review.message && (
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                      <p className="text-body-sm text-foreground">
                        {review.message}
                      </p>
                      <p className="text-caption text-muted-foreground mt-2">
                        Document: {review.document}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </TabsContent>

          {/* Completed Reviews */}
          <TabsContent value="completed" className="space-y-4">
            {loading ? (
              <div className="glass-card rounded-xl p-12 text-center">
                <Loader2 className="h-16 w-16 text-primary/50 mx-auto mb-4 animate-spin" />
                <p className="text-body text-foreground">Loading reviews...</p>
              </div>
            ) : completedReviews.length === 0 ? (
              <div className="glass-card rounded-xl p-12 text-center">
                <FileText className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-body text-foreground">No completed reviews</p>
                <p className="text-body-sm text-muted-foreground mt-2">
                  Completed reviews will appear here
                </p>
              </div>
            ) : (
              completedReviews.map((review) => (
                <div
                  key={review.id}
                  className="glass-card rounded-xl p-6 border-l-4 border-success"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    {/* Left: Student Info */}
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-body-sm">
                        {review.student.avatar}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-body font-semibold text-foreground">
                            {review.student.name}
                          </h3>
                          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        </div>
                        <p className="text-body-sm text-muted-foreground">
                          {review.student.email}
                        </p>
                        <div className="flex items-center gap-4 mt-3">
                          <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
                            {getTypeIcon(review.type)}
                            <span>{review.type}</span>
                          </div>
                          <div className="flex items-center gap-1 text-body-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            Completed {review.completedAt}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewReview(review)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Feedback
                      </Button>
                    </div>
                  </div>

                  {/* Feedback */}
                  {review.feedback && (
                    <div className="mt-4 p-4 bg-success/5 rounded-lg border border-success/20">
                      <p className="text-body-sm font-medium text-foreground mb-2">
                        Your Feedback:
                      </p>
                      <p className="text-body-sm text-foreground">
                        {review.feedback}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Review</DialogTitle>
            <DialogDescription>
              Provide feedback for {selectedReview?.student.name}'s {selectedReview?.type}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Star Rating (Required for Resume and Cover Letter Reviews) */}
            {(selectedReview?.type === "Resume Review" || selectedReview?.type === "Cover Letter Review") && (
              <div>
                <label className="text-body-sm font-medium text-foreground mb-2 block">
                  Rating <span className="text-destructive">*</span>
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      disabled={completingReview}
                      className="focus:outline-none disabled:opacity-50"
                    >
                      <Star
                        className={`h-8 w-8 transition-colors ${
                          rating && star <= rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground hover:text-yellow-400"
                        }`}
                      />
                    </button>
                  ))}
                  {rating && (
                    <span className="text-body-sm text-muted-foreground ml-2">
                      {rating} {rating === 1 ? "star" : "stars"}
                    </span>
                  )}
                </div>
                {!rating && (
                  <p className="text-caption text-destructive mt-1">
                    Please select a rating (required)
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="text-body-sm font-medium text-foreground mb-2 block">
                Feedback (Optional)
              </label>
              <Textarea
                placeholder="Enter your feedback here..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                disabled={completingReview}
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReviewDialogOpen(false);
                setFeedback("");
                setRating(null);
                setSelectedReview(null);
              }}
              disabled={completingReview}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCompleteReview}
              disabled={completingReview || ((selectedReview?.type === "Resume Review" || selectedReview?.type === "Cover Letter Review") && !rating)}
            >
              {completingReview ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Complete Review
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}





                        <div className="flex items-center gap-4 mt-3">
                          <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
                            {getTypeIcon(review.type)}
                            <span>{review.type}</span>
                          </div>
                          <div className="flex items-center gap-1 text-body-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {review.submitted}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewReview(review)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button
                        variant="gradient"
                        size="sm"
                        onClick={() => {
                          setSelectedReview(review);
                          setReviewDialogOpen(true);
                        }}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Review
                      </Button>
                    </div>
                  </div>

                  {/* Message Preview */}
                  {review.message && (
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                      <p className="text-body-sm text-foreground">
                        {review.message}
                      </p>
                      <p className="text-caption text-muted-foreground mt-2">
                        Document: {review.document}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </TabsContent>

          {/* Completed Reviews */}
          <TabsContent value="completed" className="space-y-4">
            {loading ? (
              <div className="glass-card rounded-xl p-12 text-center">
                <Loader2 className="h-16 w-16 text-primary/50 mx-auto mb-4 animate-spin" />
                <p className="text-body text-foreground">Loading reviews...</p>
              </div>
            ) : completedReviews.length === 0 ? (
              <div className="glass-card rounded-xl p-12 text-center">
                <FileText className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-body text-foreground">No completed reviews</p>
                <p className="text-body-sm text-muted-foreground mt-2">
                  Completed reviews will appear here
                </p>
              </div>
            ) : (
              completedReviews.map((review) => (
                <div
                  key={review.id}
                  className="glass-card rounded-xl p-6 border-l-4 border-success"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    {/* Left: Student Info */}
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-body-sm">
                        {review.student.avatar}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-body font-semibold text-foreground">
                            {review.student.name}
                          </h3>
                          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        </div>
                        <p className="text-body-sm text-muted-foreground">
                          {review.student.email}
                        </p>
                        <div className="flex items-center gap-4 mt-3">
                          <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
                            {getTypeIcon(review.type)}
                            <span>{review.type}</span>
                          </div>
                          <div className="flex items-center gap-1 text-body-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            Completed {review.completedAt}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewReview(review)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Feedback
                      </Button>
                    </div>
                  </div>

                  {/* Feedback */}
                  {review.feedback && (
                    <div className="mt-4 p-4 bg-success/5 rounded-lg border border-success/20">
                      <p className="text-body-sm font-medium text-foreground mb-2">
                        Your Feedback:
                      </p>
                      <p className="text-body-sm text-foreground">
                        {review.feedback}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Review</DialogTitle>
            <DialogDescription>
              Provide feedback for {selectedReview?.student.name}'s {selectedReview?.type}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Star Rating (Required for Resume and Cover Letter Reviews) */}
            {(selectedReview?.type === "Resume Review" || selectedReview?.type === "Cover Letter Review") && (
              <div>
                <label className="text-body-sm font-medium text-foreground mb-2 block">
                  Rating <span className="text-destructive">*</span>
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      disabled={completingReview}
                      className="focus:outline-none disabled:opacity-50"
                    >
                      <Star
                        className={`h-8 w-8 transition-colors ${
                          rating && star <= rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground hover:text-yellow-400"
                        }`}
                      />
                    </button>
                  ))}
                  {rating && (
                    <span className="text-body-sm text-muted-foreground ml-2">
                      {rating} {rating === 1 ? "star" : "stars"}
                    </span>
                  )}
                </div>
                {!rating && (
                  <p className="text-caption text-destructive mt-1">
                    Please select a rating (required)
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="text-body-sm font-medium text-foreground mb-2 block">
                Feedback (Optional)
              </label>
              <Textarea
                placeholder="Enter your feedback here..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                disabled={completingReview}
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReviewDialogOpen(false);
                setFeedback("");
                setRating(null);
                setSelectedReview(null);
              }}
              disabled={completingReview}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCompleteReview}
              disabled={completingReview || ((selectedReview?.type === "Resume Review" || selectedReview?.type === "Cover Letter Review") && !rating)}
            >
              {completingReview ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Complete Review
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}




