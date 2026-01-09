import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Save, Loader2, Mail, User, Linkedin, Github, Globe, Twitter } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getCurrentUser, clearAuthData } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api";

export default function EducationForm() {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [userInfo, setUserInfo] = useState({ name: "", email: "" });
  const [formData, setFormData] = useState({
    school_or_college: "",
    education_type: "",
    branch: "",
    grade_or_year: "",
    gpa: "",
    linkedin_url: "",
    github_url: "",
    portfolio_url: "",
    twitter_url: "",
    website_url: "",
  });

  useEffect(() => {
    // Check if this is signup flow (temporary auth in sessionStorage)
    const isSignupFlow = sessionStorage.getItem("isSignupFlow") === "true";
    const tempUser = sessionStorage.getItem("tempUser");
    
    if (isSignupFlow && tempUser) {
      // During signup flow - use temporary user data
      try {
        const user = JSON.parse(tempUser);
        setUserInfo({
          name: user.name || "",
          email: user.email || "",
        });
      } catch (error) {
        console.error("Failed to parse temp user:", error);
        navigate("/student/login");
      }
    } else {
      // Normal flow - get user info from auth
      const user = getCurrentUser();
      if (user) {
        setUserInfo({
          name: user.name || "",
          email: user.email || "",
        });
      } else {
        // If no user, redirect to login
        navigate("/student/login");
      }
    }
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields (except GPA)
    if (!formData.school_or_college || !formData.school_or_college.trim()) {
      toast({
        title: "Validation Error",
        description: "Institution is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.education_type || !formData.education_type.trim()) {
      toast({
        title: "Validation Error",
        description: "Education Type is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.branch || !formData.branch.trim()) {
      toast({
        title: "Validation Error",
        description: "Branch is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.grade_or_year || !formData.grade_or_year.trim()) {
      toast({
        title: "Validation Error",
        description: "Grade/Year is required",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Check if this is signup flow (temporary auth in sessionStorage)
      const isSignupFlow = sessionStorage.getItem("isSignupFlow") === "true";
      const token = isSignupFlow 
        ? sessionStorage.getItem("tempAuthToken") || sessionStorage.getItem("tempAccessToken")
        : localStorage.getItem("authToken") || localStorage.getItem("accessToken");
      
      if (!token) {
        navigate("/student/login");
        return;
      }

      // Save ONLY educational details to database
      console.log("[EducationForm] Saving education details:", {
        school_or_college: formData.school_or_college,
        education_type: formData.education_type,
        branch: formData.branch,
        grade_or_year: formData.grade_or_year,
        full_name: userInfo.name,
      });

      const response = await fetch(
        `${API_BASE_URL}/profile`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            // Educational details and social links
            school_or_college: formData.school_or_college,
            education_type: formData.education_type,
            branch: formData.branch,
            grade_or_year: formData.grade_or_year,
            full_name: userInfo.name, // Auto-update name from auth
            linkedin_url: formData.linkedin_url,
            github_url: formData.github_url,
            portfolio_url: formData.portfolio_url,
            twitter_url: formData.twitter_url,
            website_url: formData.website_url,
            // Note: GPA is optional and not stored in database schema
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Check if it's a "User not found" error (invalid token)
        if (response.status === 404 && (data.message?.includes("session is invalid") || data.message?.includes("User not found"))) {
          // Clear invalid tokens and auth data
          clearAuthData();
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          sessionStorage.clear();
          
          toast({
            title: "Session Expired",
            description: "Your session is invalid. Please sign up or log in again.",
            variant: "destructive",
          });
          
          // Redirect to login
          setTimeout(() => {
            navigate("/student/login");
          }, 2000);
          return;
        }
        
        throw new Error(data.message || "Failed to save education details");
      }

      toast({
        title: "Profile Updated",
        description: "Your education details have been saved successfully.",
      });

      // Check if this is signup flow (reuse variable already declared above)
      if (isSignupFlow) {
        // During signup flow - clear temporary auth data and redirect to login
        sessionStorage.removeItem("tempAuthToken");
        sessionStorage.removeItem("tempAccessToken");
        sessionStorage.removeItem("tempRefreshToken");
        sessionStorage.removeItem("tempUser");
        sessionStorage.removeItem("tempRole");
        sessionStorage.removeItem("isSignupFlow");
        
        toast({
          title: "Profile Complete",
          description: "Please log in to continue to your dashboard.",
        });

        // Redirect to login page after signup
        setTimeout(() => {
          navigate("/student/login");
        }, 1500);
      } else {
        // Normal flow - redirect to dashboard after saving based on user role
        setTimeout(() => {
          const user = getCurrentUser();
          const role = user?.role || localStorage.getItem("role");
          if (role === "mentor" || role === "MENTOR") {
            navigate("/mentor/dashboard");
          } else {
            navigate("/student/dashboard");
          }
        }, 1000);
      }
    } catch (error: any) {
      console.error("Failed to save education details:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save education details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="w-full max-w-2xl">
        {/* Header Card */}
        <div className="glass-card rounded-xl p-6 mb-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-display-sm text-foreground mb-2">Complete Your Education Details</h1>
          <p className="text-body text-muted-foreground">
            Please fill in your educational information to get started
          </p>
        </div>

        {/* Education Form Card */}
        <div className="glass-card rounded-xl p-6 lg:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Auto-filled User Info (Read-only) */}
            <div className="space-y-4 pb-4 border-b border-border">
              <h3 className="text-title text-foreground flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Your Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      value={userInfo.name}
                      disabled
                      className="pl-10 bg-muted/50"
                      readOnly
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={userInfo.email}
                      disabled
                      className="pl-10 bg-muted/50"
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Education Details Section */}
            <div className="space-y-4">
              <h3 className="text-title text-foreground flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                Education Details
              </h3>

              <div className="space-y-2">
                <Label htmlFor="school_or_college">
                  Institution <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="school_or_college"
                  name="school_or_college"
                  value={formData.school_or_college}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter your school or college name"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="education_type">
                    Education Type <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="education_type"
                    name="education_type"
                    value={formData.education_type}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., B.Tech, B.E., M.Tech"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch">
                    Branch <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="branch"
                    name="branch"
                    value={formData.branch}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Computer Science, Electronics"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="grade_or_year">
                    Grade/Year <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="grade_or_year"
                    name="grade_or_year"
                    value={formData.grade_or_year}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., 3rd Year, Final Year"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gpa">CGPA/GPA (Optional)</Label>
                  <Input
                    id="gpa"
                    name="gpa"
                    value={formData.gpa}
                    onChange={handleInputChange}
                    placeholder="e.g., 8.5/10 or 3.8/4.0"
                  />
                </div>
              </div>
            </div>

            {/* Social & Professional Links Section */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="text-title text-foreground flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Social & Professional Links (Optional)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="linkedin_url" className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4 text-primary" />
                    LinkedIn Profile
                  </Label>
                  <Input
                    id="linkedin_url"
                    name="linkedin_url"
                    type="url"
                    value={formData.linkedin_url}
                    onChange={handleInputChange}
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="github_url" className="flex items-center gap-2">
                    <Github className="h-4 w-4 text-primary" />
                    GitHub Profile
                  </Label>
                  <Input
                    id="github_url"
                    name="github_url"
                    type="url"
                    value={formData.github_url}
                    onChange={handleInputChange}
                    placeholder="https://github.com/yourusername"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="portfolio_url" className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    Portfolio Website
                  </Label>
                  <Input
                    id="portfolio_url"
                    name="portfolio_url"
                    type="url"
                    value={formData.portfolio_url}
                    onChange={handleInputChange}
                    placeholder="https://yourportfolio.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twitter_url" className="flex items-center gap-2">
                    <Twitter className="h-4 w-4 text-primary" />
                    Twitter/X Profile
                  </Label>
                  <Input
                    id="twitter_url"
                    name="twitter_url"
                    type="url"
                    value={formData.twitter_url}
                    onChange={handleInputChange}
                    placeholder="https://twitter.com/yourusername"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="website_url" className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    Personal Website
                  </Label>
                  <Input
                    id="website_url"
                    name="website_url"
                    type="url"
                    value={formData.website_url}
                    onChange={handleInputChange}
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                variant="gradient"
                className="w-full"
                size="lg"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save & Continue
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


                <div className="space-y-2">
                  <Label htmlFor="grade_or_year">
                    Grade/Year <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="grade_or_year"
                    name="grade_or_year"
                    value={formData.grade_or_year}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., 3rd Year, Final Year"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gpa">CGPA/GPA (Optional)</Label>
                  <Input
                    id="gpa"
                    name="gpa"
                    value={formData.gpa}
                    onChange={handleInputChange}
                    placeholder="e.g., 8.5/10 or 3.8/4.0"
                  />
                </div>
              </div>
            </div>

            {/* Social & Professional Links Section */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="text-title text-foreground flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Social & Professional Links (Optional)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="linkedin_url" className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4 text-primary" />
                    LinkedIn Profile
                  </Label>
                  <Input
                    id="linkedin_url"
                    name="linkedin_url"
                    type="url"
                    value={formData.linkedin_url}
                    onChange={handleInputChange}
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="github_url" className="flex items-center gap-2">
                    <Github className="h-4 w-4 text-primary" />
                    GitHub Profile
                  </Label>
                  <Input
                    id="github_url"
                    name="github_url"
                    type="url"
                    value={formData.github_url}
                    onChange={handleInputChange}
                    placeholder="https://github.com/yourusername"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="portfolio_url" className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    Portfolio Website
                  </Label>
                  <Input
                    id="portfolio_url"
                    name="portfolio_url"
                    type="url"
                    value={formData.portfolio_url}
                    onChange={handleInputChange}
                    placeholder="https://yourportfolio.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twitter_url" className="flex items-center gap-2">
                    <Twitter className="h-4 w-4 text-primary" />
                    Twitter/X Profile
                  </Label>
                  <Input
                    id="twitter_url"
                    name="twitter_url"
                    type="url"
                    value={formData.twitter_url}
                    onChange={handleInputChange}
                    placeholder="https://twitter.com/yourusername"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="website_url" className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    Personal Website
                  </Label>
                  <Input
                    id="website_url"
                    name="website_url"
                    type="url"
                    value={formData.website_url}
                    onChange={handleInputChange}
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                variant="gradient"
                className="w-full"
                size="lg"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save & Continue
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

