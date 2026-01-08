import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
  GraduationCap,
  Briefcase,
  Award,
  Save,
  Edit,
  CheckCircle,
  Camera,
  Loader2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { getCurrentUser, getAuthToken } from "@/lib/auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Helper function to get first letter of first name
const getInitials = (name: string): string => {
  if (!name) return "?";
  const firstName = name.trim().split(" ")[0];
  return firstName.charAt(0).toUpperCase();
};

// Helper function to format date range for experience
const formatDateRange = (startDate: string | null, endDate: string | null, isCurrent: boolean): string => {
  if (!startDate) return "N/A";
  const start = new Date(startDate).getFullYear();
  if (isCurrent) {
    return `${start} - Present`;
  }
  if (!endDate) return `${start} - Present`;
  const end = new Date(endDate).getFullYear();
  return `${start} - ${end}`;
};

export default function MentorProfile() {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState({ name: "", email: "" });
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    // Basic Info
    name: "",
    bio: "",
    currentRole: "Working Professional",
    // Education
    highestQualification: "",
    degree: "",
    branch: "",
    college: "",
    graduationYear: "",
    currentYear: "",
    // Experience (will be array)
    experience: [] as any[],
  });
  const [verifiedCourses, setVerifiedCourses] = useState<any[]>([]);
  const [pendingTests, setPendingTests] = useState<any[]>([]);
  const [failedTests, setFailedTests] = useState<any[]>([]);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setUserInfo({
        name: user.name || "",
        email: user.email || "",
      });
    }
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error("Please login to view your profile");
        return;
      }

      // Fetch profile data
      const profileResponse = await fetch(`${API_URL}/mentors/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        const profile = profileData.profile;

        if (profile) {
          setFormData({
            name: profile.basicInfo?.name || userInfo.name || "",
            bio: profile.basicInfo?.bio || "",
            currentRole: profile.basicInfo?.currentRole || "Working Professional",
            highestQualification: profile.education?.highestQualification || "",
            degree: profile.education?.degree || "",
            branch: profile.education?.branch || "",
            college: profile.education?.college || "",
            graduationYear: profile.education?.graduationYear?.toString() || "",
            currentYear: profile.education?.currentYear || "",
            experience: profile.experience || [],
          });
          // Construct full URL if it's a relative path
          const photoUrl = profile.basicInfo?.photoUrl;
          if (photoUrl) {
            let fullUrl = photoUrl;
            if (!photoUrl.startsWith("http")) {
              // photoUrl from backend is like "/api/uploads/profiles/..."
              // API_URL is like "http://localhost:5000/api"
              const base = API_URL.replace("/api", ""); // "http://localhost:5000"
              fullUrl = `${base}${photoUrl}`; // "http://localhost:5000/api/uploads/..."
            }
            // Add cache-busting to ensure fresh image
            fullUrl = `${fullUrl}?t=${Date.now()}`;
            console.log("Loaded profile photo URL:", fullUrl);
            setProfilePhoto(fullUrl);
          } else {
            console.log("No profile photo URL in profile data");
            setProfilePhoto(null);
          }
        }
      }

      // Fetch verified courses (skills with PASSED status)
      const verifiedResponse = await fetch(`${API_URL}/mentors/profile/verified-courses`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (verifiedResponse.ok) {
        const verifiedData = await verifiedResponse.json();
        setVerifiedCourses(verifiedData.courses || []);
      }

      // Fetch test results (pending, failed)
      const testResultsResponse = await fetch(`${API_URL}/mentors/skill-test/results`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (testResultsResponse.ok) {
        const testData = await testResultsResponse.json();
        const results = testData.results || {};
        setPendingTests(results.pending || []);
        setFailedTests(results.failed || []);
      }
    } catch (error) {
      console.error("Failed to load profile:", error);
      toast.error("Failed to load profile data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDeletePhoto = async () => {
    if (!profilePhoto) return;

    if (!confirm("Are you sure you want to delete your profile photo?")) {
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) {
        toast.error("Please login to delete photo");
        return;
      }

      const response = await fetch(`${API_URL}/mentors/profile/photo`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Clear local state immediately
        setProfilePhoto(null);
        toast.success("Profile photo deleted successfully");
        
        // Reload profile to get updated data
        await loadProfile();
        
        // Trigger sidebar refresh
        window.dispatchEvent(new CustomEvent("profilePhotoUpdated", { detail: { photoUrl: null } }));
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete photo");
      }
    } catch (error: any) {
      console.error("Failed to delete photo:", error);
      toast.error(error.message || "Failed to delete photo");
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a JPG, PNG, or WEBP image");
      return;
    }

    // Validate file size (2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      toast.error("Image size must be less than 2MB");
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error("Please login to upload photo");
        return;
      }

      const formData = new FormData();
      formData.append("photo", file);

      const response = await fetch(`${API_URL}/mentors/profile/photo`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const photoUrl = data.photoUrl || data.profile?.basicInfo?.photoUrl;
        
        if (photoUrl) {
          // Construct full URL if it's a relative path
          let fullUrl = photoUrl;
          if (!photoUrl.startsWith("http")) {
            // photoUrl from backend is like "/api/uploads/profiles/..."
            // API_URL is like "http://localhost:5000/api"
            // We need: "http://localhost:5000/api/uploads/profiles/..."
            const base = API_URL.replace("/api", ""); // "http://localhost:5000"
            fullUrl = `${base}${photoUrl}`; // "http://localhost:5000/api/uploads/..."
          }
          
          // Add cache-busting query param to force image reload
          fullUrl = `${fullUrl}?t=${Date.now()}`;
          
          console.log("Setting profile photo URL:", fullUrl);
          console.log("Original photoUrl from server:", photoUrl);
          console.log("API_URL:", API_URL);
          
          // Update local state immediately - this will trigger re-render
          setProfilePhoto(fullUrl);
          
          toast.success("Profile photo updated successfully");
          
          // Trigger sidebar refresh immediately with new photo
          window.dispatchEvent(new CustomEvent("profilePhotoUpdated", { detail: { photoUrl: fullUrl } }));
          
          // Reload profile to get updated data from backend (async, won't block UI)
          loadProfile();
        } else {
          console.error("No photoUrl in response:", data);
          toast.error("Photo URL not returned from server");
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload photo");
      }
    } catch (error: any) {
      console.error("Failed to upload photo:", error);
      toast.error(error.message || "Failed to upload photo");
    } finally {
      setIsUploadingPhoto(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error("Please login to save your profile");
        return;
      }

      const response = await fetch(`${API_URL}/mentors/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          bio: formData.bio,
          currentRole: formData.currentRole,
          highestQualification: formData.highestQualification,
          degree: formData.degree,
          branch: formData.branch,
          college: formData.college,
          graduationYear: formData.graduationYear ? parseInt(formData.graduationYear) : null,
          currentYear: formData.currentYear || null,
        }),
      });

      if (response.ok) {
        toast.success("Profile updated successfully");
        setIsEditing(false);
        // Reload profile to get updated data
        await loadProfile();
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to update profile");
      }
    } catch (error: any) {
      console.error("Failed to save profile:", error);
      toast.error(error.message || "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout role="mentor" title="Profile">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const displayName = formData.name || userInfo.name || "User";
  const initials = getInitials(displayName);

  return (
    <DashboardLayout role="mentor" title="Profile">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-headline text-foreground">Mentor Profile</h1>
            <p className="text-body text-muted-foreground mt-1">
              Complete your profile to start mentoring students
            </p>
          </div>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>

        {/* Basic Information */}
        <div className="glass-card rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-4 pb-4 border-b border-border">
            <div className="relative">
              <Avatar className="w-20 h-20" key={profilePhoto ? `photo-${profilePhoto}` : "no-photo"}>
                {profilePhoto ? (
                  <AvatarImage 
                    src={profilePhoto} 
                    alt={displayName}
                    className="object-cover"
                    onError={(e) => {
                      // Log error for debugging
                      const img = e.target as HTMLImageElement;
                      console.error("Failed to load profile photo");
                      console.error("Attempted URL:", profilePhoto);
                      console.error("Image src attribute:", img?.src);
                      console.error("Image error details:", e);
                    }}
                    onLoad={() => {
                      console.log("Profile photo loaded successfully");
                      console.log("Photo URL:", profilePhoto);
                    }}
                  />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-2xl font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="p-1.5 bg-primary text-white rounded-full shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Upload profile photo"
                >
                  {isUploadingPhoto ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                </button>
                {profilePhoto && (
                  <button
                    type="button"
                    onClick={handleDeletePhoto}
                    className="absolute -top-1 -right-1 p-1 bg-destructive text-white rounded-full shadow-lg hover:bg-destructive/90 transition-colors"
                    title="Delete profile photo"
                  >
                    <XCircle className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              <h2 className="text-title text-foreground">Basic Information</h2>
              <p className="text-body-sm text-muted-foreground">
                Your public profile information
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              {isEditing ? (
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="mt-2"
                />
              ) : (
                <p className="text-body text-foreground mt-2">{displayName}</p>
              )}
            </div>

            <div>
              <Label>Email</Label>
              <p className="text-body text-muted-foreground mt-2">{userInfo.email}</p>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="currentRole">Current Role *</Label>
              {isEditing ? (
                <Select
                  value={formData.currentRole}
                  onValueChange={(value) => handleSelectChange("currentRole", value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Working Professional">Working Professional</SelectItem>
                    <SelectItem value="Student">Student</SelectItem>
                    <SelectItem value="Freelancer">Freelancer</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-body text-foreground mt-2">{formData.currentRole || "Not set"}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="bio">Bio / Headline</Label>
              {isEditing ? (
                <Textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  className="mt-2"
                  rows={3}
                  placeholder="Write a short bio about yourself..."
                />
              ) : (
                <p className="text-body text-foreground mt-2">
                  {formData.bio || "No bio added"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Educational Details */}
        <div className="glass-card rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <GraduationCap className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-title text-foreground">Educational Details *</h2>
              <p className="text-body-sm text-muted-foreground">
                Required information about your education
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="highestQualification">Highest Qualification *</Label>
              {isEditing ? (
                <Select
                  value={formData.highestQualification}
                  onValueChange={(value) =>
                    handleSelectChange("highestQualification", value)
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select qualification" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="B.Tech">B.Tech</SelectItem>
                    <SelectItem value="M.Tech">M.Tech</SelectItem>
                    <SelectItem value="BSc">BSc</SelectItem>
                    <SelectItem value="MSc">MSc</SelectItem>
                    <SelectItem value="BCA">BCA</SelectItem>
                    <SelectItem value="MCA">MCA</SelectItem>
                    <SelectItem value="PhD">PhD</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-body text-foreground mt-2">
                  {formData.highestQualification || "Not set"}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="degree">Degree *</Label>
              {isEditing ? (
                <Input
                  id="degree"
                  name="degree"
                  value={formData.degree}
                  onChange={handleInputChange}
                  className="mt-2"
                  placeholder="e.g., Master of Technology"
                />
              ) : (
                <p className="text-body text-foreground mt-2">{formData.degree || "Not set"}</p>
              )}
            </div>

            <div>
              <Label htmlFor="branch">Branch / Specialization *</Label>
              {isEditing ? (
                <Input
                  id="branch"
                  name="branch"
                  value={formData.branch}
                  onChange={handleInputChange}
                  className="mt-2"
                  placeholder="e.g., Computer Science"
                />
              ) : (
                <p className="text-body text-foreground mt-2">{formData.branch || "Not set"}</p>
              )}
            </div>

            <div>
              <Label htmlFor="college">College / University *</Label>
              {isEditing ? (
                <Input
                  id="college"
                  name="college"
                  value={formData.college}
                  onChange={handleInputChange}
                  className="mt-2"
                  placeholder="e.g., IIT Delhi"
                />
              ) : (
                <p className="text-body text-foreground mt-2">{formData.college || "Not set"}</p>
              )}
            </div>

            <div>
              <Label htmlFor="graduationYear">Graduation Year *</Label>
              {isEditing ? (
                <Input
                  id="graduationYear"
                  name="graduationYear"
                  value={formData.graduationYear}
                  onChange={handleInputChange}
                  className="mt-2"
                  type="number"
                  placeholder="e.g., 2015"
                />
              ) : (
                <p className="text-body text-foreground mt-2">
                  {formData.graduationYear || "Not set"}
                </p>
              )}
            </div>

            {formData.currentRole === "Student" && (
              <div>
                <Label htmlFor="currentYear">Current Year (if still studying)</Label>
                {isEditing ? (
                  <Input
                    id="currentYear"
                    name="currentYear"
                    value={formData.currentYear}
                    onChange={handleInputChange}
                    className="mt-2"
                    placeholder="e.g., 3rd Year"
                  />
                ) : (
                  <p className="text-body text-foreground mt-2">
                    {formData.currentYear || "N/A"}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Experience Details */}
        <div className="glass-card rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <Briefcase className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-title text-foreground">Experience Details</h2>
              <p className="text-body-sm text-muted-foreground">
                Optional: Add your work experience, internships, or projects
              </p>
            </div>
          </div>

          {formData.experience.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-body text-muted-foreground">
                No experience added yet
              </p>
              {isEditing && (
                <Button variant="outline" className="mt-4">
                  Add Experience
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {formData.experience.map((exp) => (
                <div
                  key={exp.id}
                  className="p-4 border border-border rounded-lg bg-muted/30"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-body font-semibold text-foreground">
                        {exp.role}
                      </h3>
                      <p className="text-body-sm text-primary mt-1">{exp.company}</p>
                      <p className="text-caption text-muted-foreground mt-1">
                        {formatDateRange(exp.startDate, exp.endDate, exp.isCurrent)} • {exp.domain || "N/A"}
                      </p>
                    </div>
                    {isEditing && (
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {isEditing && (
                <Button variant="outline" className="w-full">
                  + Add Another Experience
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Skills & Verified Courses */}
        <div className="glass-card rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <Award className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-title text-foreground">Skills & Verified Courses</h2>
              <p className="text-body-sm text-muted-foreground">
                Courses verified through AI skill tests
              </p>
            </div>
          </div>

          {/* Verified Courses */}
          {verifiedCourses.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-body font-semibold text-foreground">
                Verified Mentorship Areas
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {verifiedCourses.map((course, index) => (
                  <div
                    key={course.skill || index}
                    className="p-4 border border-success/20 bg-success/5 rounded-lg"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="text-body font-medium text-foreground">
                        {course.skill}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-caption text-muted-foreground">
                      <span>Score: {Number(course.score).toFixed(0)}%</span>
                      <span>
                        Verified: {course.verifiedAt ? new Date(course.verifiedAt).toLocaleDateString() : "N/A"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Tests */}
          {pendingTests.length > 0 && (
            <div className="space-y-4 mt-6">
              <h3 className="text-body font-semibold text-foreground">
                Tests in Progress
              </h3>
              <div className="space-y-2">
                {pendingTests.map((test) => (
                  <div
                    key={test.id}
                    className="p-4 border border-warning/20 bg-warning/5 rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <span className="text-body font-medium text-foreground">
                        {test.courseName}
                      </span>
                      <p className="text-caption text-muted-foreground mt-1">
                        {test.status === "IN_PROGRESS" ? "Test in progress..." : "Test is being prepared..."}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-warning/10 text-warning">
                      {test.status === "IN_PROGRESS" ? "In Progress" : "Preparing"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Failed Tests */}
          {failedTests.length > 0 && (
            <div className="space-y-4 mt-6">
              <h3 className="text-body font-semibold text-foreground">
                Tests Requiring Retry
              </h3>
              <div className="space-y-2">
                {failedTests.map((test) => (
                  <div
                    key={test.id}
                    className="p-4 border border-destructive/20 bg-destructive/5 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-body font-medium text-foreground">
                        {test.courseName}
                      </span>
                      <Badge variant="destructive">Score: {Number(test.score).toFixed(0)}%</Badge>
                    </div>
                    <p className="text-caption text-muted-foreground">
                      Retry available after: {test.retryAvailableAfter ? new Date(test.retryAvailableAfter).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-border">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.location.href = "/mentor/skill-test"}
            >
              <Award className="h-4 w-4 mr-2" />
              Take Skill Test for New Course
            </Button>
          </div>
        </div>

        {/* Save Button */}
        {isEditing && (
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
