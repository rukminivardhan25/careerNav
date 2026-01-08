import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  User,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  Save,
  Camera,
  Loader2,
  XCircle,
  Linkedin,
  Github,
  Globe,
  Twitter,
  ExternalLink,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getCurrentUser, getAuthToken } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api";

export default function Profile() {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false); // Start in view mode
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [userInfo, setUserInfo] = useState({ name: "", email: "" });
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [profileBadges, setProfileBadges] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const API_URL = API_BASE_URL;
  const [formData, setFormData] = useState({
    school_or_college: "",
    education_type: "",
    branch: "",
    grade_or_year: "",
    gpa: "",
    full_name: "",
    phone: "",
    date_of_birth: "",
    linkedin_url: "",
    github_url: "",
    portfolio_url: "",
    twitter_url: "",
    website_url: "",
  });

  // Fetch profile data on mount
  useEffect(() => {
    // Get user info from auth
    const user = getCurrentUser();
    if (user) {
      setUserInfo({
        name: user.name || "",
        email: user.email || "",
      });
      // Auto-update full_name in formData
      setFormData((prev) => ({ ...prev, full_name: user.name || "" }));
    }
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("authToken") || localStorage.getItem("accessToken");
      if (!token) {
        navigate("/student/login");
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/profile`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const profile = await response.json();
        setFormData({
          school_or_college: profile.school_or_college || "",
          education_type: profile.education_type || "",
          branch: profile.branch || "",
          grade_or_year: profile.grade_or_year || "",
          gpa: profile.gpa || "",
          full_name: profile.full_name || userInfo.name || "",
          phone: profile.phone || "",
          date_of_birth: profile.date_of_birth 
            ? new Date(profile.date_of_birth).toISOString().split("T")[0]
            : "",
          linkedin_url: profile.linkedin_url || "",
          github_url: profile.github_url || "",
          portfolio_url: profile.portfolio_url || "",
          twitter_url: profile.twitter_url || "",
          website_url: profile.website_url || "",
        });
        
        // Set profile badges (max 3)
        if (profile.profile_badges && Array.isArray(profile.profile_badges)) {
          setProfileBadges(profile.profile_badges.slice(0, 3));
        } else {
          setProfileBadges([]);
        }
        
        // Set profile photo
        if (profile.profile_photo_url) {
          const photoUrl = profile.profile_photo_url;
          const fullUrl = photoUrl.startsWith("http")
            ? photoUrl
            : `${API_URL.replace("/api", "")}${photoUrl}`;
          setProfilePhoto(fullUrl);
        } else {
          setProfilePhoto(null);
        }
        
        // If profile exists and is completed, start in view mode
        if (profile.profile_completed) {
          setIsEditing(false);
        }
      } else if (response.status === 404) {
        // Profile doesn't exist yet - redirect to education form
        navigate("/profile/education");
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      // If error, redirect to education form
      navigate("/profile/education");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, or WEBP image",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Image size must be less than 2MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const token = getAuthToken();
      if (!token) {
        toast({
          title: "Error",
          description: "Please login to upload photo",
          variant: "destructive",
        });
        return;
      }

      const formData = new FormData();
      formData.append("photo", file);

      const response = await fetch(`${API_URL}/profile/photo`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const photoUrl = data.photoUrl || data.profile?.profile_photo_url;

        if (photoUrl) {
          const baseUrl = photoUrl.startsWith("http")
            ? photoUrl
            : `${API_URL.replace("/api", "")}${photoUrl}`;
          const fullUrl = `${baseUrl}?t=${Date.now()}`; // Cache-busting

          setProfilePhoto(fullUrl);
          toast({
            title: "Success",
            description: "Profile photo updated successfully",
          });

          // Trigger sidebar update
          window.dispatchEvent(new CustomEvent("profilePhotoUpdated", { detail: { photoUrl: fullUrl } }));
          
          // Reload profile
          fetchProfile();
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload photo");
      }
    } catch (error: any) {
      console.error("Failed to upload photo:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload photo",
        variant: "destructive",
      });
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeletePhoto = async () => {
    if (!window.confirm("Are you sure you want to delete your profile photo?")) {
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const token = getAuthToken();
      if (!token) {
        toast({
          title: "Error",
          description: "Please login to delete photo",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`${API_URL}/profile/photo`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setProfilePhoto(null);
        toast({
          title: "Success",
          description: "Profile photo deleted successfully",
        });

        // Trigger sidebar update
        window.dispatchEvent(new CustomEvent("profilePhotoUpdated", { detail: { photoUrl: null } }));
        
        // Reload profile
        fetchProfile();
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete photo");
      }
    } catch (error: any) {
      console.error("Failed to delete photo:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete photo",
        variant: "destructive",
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
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
      const token = localStorage.getItem("authToken") || localStorage.getItem("accessToken");
      if (!token) {
        navigate("/student/login");
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/profile`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...formData,
            full_name: userInfo.name || formData.full_name, // Auto-update name from auth
            profile_badges: profileBadges, // Include profile badges
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save profile");
      }

      toast({
        title: "Profile Saved",
        description: "Your educational details have been saved successfully.",
      });

      setIsEditing(false);
      
      // Stay on profile page after saving (don't redirect)
    } catch (error: any) {
      console.error("Failed to save profile:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout role="student" title="Profile">
        <div className="max-w-4xl mx-auto space-y-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="student" title="Profile">
      <div className="max-w-4xl mx-auto space-y-6">
        {isEditing && (
          <div className="glass-card rounded-xl p-4 bg-primary/10 border border-primary/20">
            <p className="text-body text-foreground">
              <strong>Complete your profile:</strong> Please fill in all required educational details to continue.
            </p>
          </div>
        )}
        {/* Header */}
        <div className="glass-card rounded-xl p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="w-24 h-24 rounded-2xl" key={profilePhoto || "no-photo"}>
                {profilePhoto ? (
                  <AvatarImage
                    src={profilePhoto}
                    alt={userInfo.name || formData.full_name || "User"}
                    onError={() => setProfilePhoto(null)}
                  />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-3xl font-bold rounded-2xl">
                  {(() => {
                    const name = userInfo.name || formData.full_name || "User";
                    const firstName = name.trim().split(" ")[0];
                    return firstName.charAt(0).toUpperCase();
                  })()}
                </AvatarFallback>
              </Avatar>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                className="hidden"
                accept="image/jpeg,image/jpg,image/png,image/webp"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="absolute -bottom-2 -right-2 p-2 rounded-lg bg-card border border-border shadow-sm hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Upload profile photo"
              >
                {isUploadingPhoto ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <Camera className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {profilePhoto && (
                <button
                  type="button"
                  onClick={handleDeletePhoto}
                  disabled={isUploadingPhoto}
                  className="absolute -top-2 -right-2 p-1 rounded-full bg-destructive text-white shadow-sm hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete profile photo"
                >
                  <XCircle className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <h1 className="text-headline text-foreground">{userInfo.name || formData.full_name || "User"}</h1>
              <p className="text-body text-muted-foreground">
                {formData.education_type && formData.branch && formData.grade_or_year
                  ? `${formData.education_type} ${formData.branch} • ${formData.grade_or_year}`
                  : "Complete your profile to see details"}
              </p>
              {profileBadges.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {profileBadges.map((badge, index) => (
                    <span
                      key={index}
                      className={`px-3 py-1 rounded-pill text-caption font-medium ${
                        index % 3 === 0
                          ? "bg-primary/10 text-primary"
                          : index % 3 === 1
                          ? "bg-accent/10 text-accent"
                          : "bg-success/10 text-success"
                      }`}
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <Button
              variant={isEditing ? "gradient" : "outline"}
              onClick={() => {
                if (isEditing) {
                  handleSave();
                } else {
                  setIsEditing(true);
                }
              }}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                <>
                  <Save className="h-4 w-4" />
                  Save Profile
                </>
              ) : (
                "Edit Profile"
              )}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="glass-card rounded-xl p-6 space-y-6">
            <h2 className="text-title text-foreground flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Personal Information
            </h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  name="full_name"
                  value={formData.full_name || userInfo.name}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={userInfo.email}
                    className="pl-10 bg-muted/50"
                    disabled
                    readOnly
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="pl-10"
                    disabled={!isEditing}
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  name="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
            </div>
          </div>

          {/* Education */}
          <div className="glass-card rounded-xl p-6 space-y-6">
            <h2 className="text-title text-foreground flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Education
            </h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="school_or_college">
                  Institution <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="school_or_college"
                  name="school_or_college"
                  value={formData.school_or_college}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  required
                  placeholder="Enter your school or college name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="education_type">
                    Education Type <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="education_type"
                    name="education_type"
                    value={formData.education_type}
                    onChange={handleInputChange}
                    disabled={!isEditing}
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
                    disabled={!isEditing}
                    required
                    placeholder="e.g., Computer Science, Electronics"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="grade_or_year">
                    Grade/Year <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="grade_or_year"
                    name="grade_or_year"
                    value={formData.grade_or_year}
                    onChange={handleInputChange}
                    disabled={!isEditing}
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
                    disabled={!isEditing}
                    placeholder="e.g., 8.5/10 or 3.8/4.0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Career Goals */}
          <div className="glass-card rounded-xl p-6 space-y-6">
            <h2 className="text-title text-foreground flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              Career Goals
            </h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="targetRole">Target Role</Label>
                <Input
                  id="targetRole"
                  defaultValue="Software Engineer"
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetCompanies">Target Companies</Label>
                <Input
                  id="targetCompanies"
                  defaultValue="Google, Microsoft, Amazon"
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  defaultValue="Passionate computer science student with a keen interest in building scalable web applications. Looking for opportunities in full-stack development."
                  className="min-h-[100px] resize-none"
                  disabled={!isEditing}
                />
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className="glass-card rounded-xl p-6 space-y-6">
            <h2 className="text-title text-foreground">Skills</h2>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {[
                  "JavaScript",
                  "TypeScript",
                  "React",
                  "Node.js",
                  "Python",
                  "Java",
                  "SQL",
                  "Git",
                  "AWS",
                  "Docker",
                ].map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1.5 rounded-lg bg-muted text-foreground text-body-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>

              {isEditing && (
                <Button variant="outline" size="sm" className="w-full">
                  + Add Skill
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Social & Professional Links - Full Width */}
        <div className="glass-card rounded-xl p-6 space-y-6">
          <h2 className="text-title text-foreground flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Social & Professional Links
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="linkedin_url" className="flex items-center gap-2">
                  <Linkedin className="h-4 w-4 text-primary" />
                  LinkedIn Profile
                </Label>
                <div className="relative">
                  <Input
                    id="linkedin_url"
                    name="linkedin_url"
                    type="url"
                    value={formData.linkedin_url}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="https://linkedin.com/in/yourprofile"
                    className="pr-10"
                  />
                  {formData.linkedin_url && !isEditing && (
                    <a
                      href={formData.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-primary hover:text-primary/80"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="github_url" className="flex items-center gap-2">
                  <Github className="h-4 w-4 text-primary" />
                  GitHub Profile
                </Label>
                <div className="relative">
                  <Input
                    id="github_url"
                    name="github_url"
                    type="url"
                    value={formData.github_url}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="https://github.com/yourusername"
                    className="pr-10"
                  />
                  {formData.github_url && !isEditing && (
                    <a
                      href={formData.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-primary hover:text-primary/80"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="portfolio_url" className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  Portfolio Website
                </Label>
                <div className="relative">
                  <Input
                    id="portfolio_url"
                    name="portfolio_url"
                    type="url"
                    value={formData.portfolio_url}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="https://yourportfolio.com"
                    className="pr-10"
                  />
                  {formData.portfolio_url && !isEditing && (
                    <a
                      href={formData.portfolio_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-primary hover:text-primary/80"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="twitter_url" className="flex items-center gap-2">
                  <Twitter className="h-4 w-4 text-primary" />
                  Twitter/X Profile
                </Label>
                <div className="relative">
                  <Input
                    id="twitter_url"
                    name="twitter_url"
                    type="url"
                    value={formData.twitter_url}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="https://twitter.com/yourusername"
                    className="pr-10"
                  />
                  {formData.twitter_url && !isEditing && (
                    <a
                      href={formData.twitter_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-primary hover:text-primary/80"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website_url" className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  Personal Website
                </Label>
                <div className="relative">
                  <Input
                    id="website_url"
                    name="website_url"
                    type="url"
                    value={formData.website_url}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="https://yourwebsite.com"
                    className="pr-10"
                  />
                  {formData.website_url && !isEditing && (
                    <a
                      href={formData.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-primary hover:text-primary/80"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
