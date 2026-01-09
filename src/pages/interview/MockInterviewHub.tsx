import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Code,
  Briefcase,
  TrendingUp,
  Clock,
  Play,
  FileText,
  Mic,
  Layers,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthToken } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api";

interface InterviewOption {
  id: string;
  title: string;
  skill: string;
  role: string;
  interviewType: string;
  difficulty: "Easy" | "Intermediate" | "Hard";
  questionCount: number;
  estimatedDuration: number; // in minutes
  description: string;
}

interface FilterOptions {
  skills: string[];
  roles: string[];
  difficulties: string[];
  interviewTypes: string[];
}

export default function MockInterviewHub() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const [interviews, setInterviews] = useState<InterviewOption[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    skills: [],
    roles: [],
    difficulties: ["Easy", "Intermediate", "Hard"],
    interviewTypes: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch student data and generate interviews on mount
  useEffect(() => {
    loadInterviews();
  }, []);

  // Regenerate interviews when filters change (but not on initial load)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  useEffect(() => {
    if (initialLoadComplete && interviews.length > 0) {
      // Only regenerate if filters are actually applied (not "all")
      const hasActiveFilters =
        skillFilter !== "all" ||
        roleFilter !== "all" ||
        difficultyFilter !== "all" ||
        typeFilter !== "all";

      if (hasActiveFilters) {
        regenerateInterviews();
      }
    }
  }, [skillFilter, roleFilter, difficultyFilter, typeFilter]);

  useEffect(() => {
    if (!isLoading && interviews.length > 0) {
      setInitialLoadComplete(true);
    }
  }, [isLoading, interviews.length]);

  const loadInterviews = async () => {
    try {
      setIsLoading(true);
      const token = getAuthToken();
      if (!token) {
        console.error("No auth token found");
        setIsLoading(false);
        return;
      }

      const apiUrl = API_BASE_URL;

      // Generate initial interviews
      const response = await fetch(`${apiUrl}/interviews/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ filters: {} }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate interviews");
      }

      const data = await response.json();
      setInterviews(data.interviews || []);
      setFilterOptions(data.filterOptions || filterOptions);
    } catch (error) {
      console.error("[Load Interviews] Error:", error);
      // Fallback to empty array on error
      setInterviews([]);
    } finally {
      setIsLoading(false);
    }
  };

  const regenerateInterviews = async () => {
    try {
      setIsGenerating(true);
      const token = getAuthToken();
      if (!token) {
        return;
      }

      const apiUrl = API_BASE_URL;

      const filters: any = {};
      if (skillFilter !== "all") filters.skill = skillFilter;
      if (roleFilter !== "all") filters.role = roleFilter;
      if (difficultyFilter !== "all") filters.difficulty = difficultyFilter;
      if (typeFilter !== "all") filters.type = typeFilter;

      const response = await fetch(`${apiUrl}/interviews/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ filters }),
      });

      if (!response.ok) {
        throw new Error("Failed to regenerate interviews");
      }

      const data = await response.json();
      setInterviews(data.interviews || []);
      // Update filter options if they changed
      if (data.filterOptions) {
        setFilterOptions(data.filterOptions);
      }
    } catch (error) {
      console.error("[Regenerate Interviews] Error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Filter interviews (client-side filtering for search)
  const filteredInterviews = useMemo(() => {
    return interviews.filter((interview) => {
      const matchesSearch =
        searchQuery === "" ||
        interview.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        interview.skill.toLowerCase().includes(searchQuery.toLowerCase()) ||
        interview.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        interview.description.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });
  }, [interviews, searchQuery]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-success/10 text-success border-success/20";
      case "Intermediate":
        return "bg-warning/10 text-warning border-warning/20";
      case "Hard":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Technical":
        return <Code className="h-4 w-4" />;
      case "Behavioral":
        return <Briefcase className="h-4 w-4" />;
      case "System Design":
        return <Layers className="h-4 w-4" />;
      case "HR":
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const handleStartInterview = (interview: InterviewOption) => {
    // Navigate to setup page with interview data
    navigate("/interview/setup", {
      state: { interview },
    });
  };

  const handleFilterChange = (filterType: string, value: string) => {
    switch (filterType) {
      case "skill":
        setSkillFilter(value);
        break;
      case "role":
        setRoleFilter(value);
        break;
      case "difficulty":
        setDifficultyFilter(value);
        break;
      case "type":
        setTypeFilter(value);
        break;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout role="student" title="Mock Interviews">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="glass-card rounded-xl p-12 text-center">
            <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
            <p className="text-body text-foreground">Loading personalized interviews...</p>
            <p className="text-body-sm text-muted-foreground mt-2">
              Generating interviews based on your profile and career goals
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="student" title="Mock Interviews">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="glass-card rounded-xl p-6">
          <h1 className="text-headline text-foreground mb-2">Mock Interview Hub</h1>
          <p className="text-body text-muted-foreground">
            Practice interviews tailored to your skills and career goals. Select an interview type to get started.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="glass-card rounded-xl p-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search skills, roles, or interview topics"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select
              value={skillFilter}
              onValueChange={(value) => handleFilterChange("skill", value)}
              disabled={isGenerating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Skill" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Skills</SelectItem>
                {filterOptions.skills.map((skill) => (
                  <SelectItem key={skill} value={skill}>
                    {skill}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={roleFilter}
              onValueChange={(value) => handleFilterChange("role", value)}
              disabled={isGenerating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {filterOptions.roles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={difficultyFilter}
              onValueChange={(value) => handleFilterChange("difficulty", value)}
              disabled={isGenerating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                {filterOptions.difficulties.map((difficulty) => (
                  <SelectItem key={difficulty} value={difficulty}>
                    {difficulty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={typeFilter}
              onValueChange={(value) => handleFilterChange("type", value)}
              disabled={isGenerating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Interview Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {filterOptions.interviewTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isGenerating && (
            <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Generating personalized interviews...</span>
            </div>
          )}
        </div>

        {/* Interview Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-title text-foreground">
              Available Interviews ({filteredInterviews.length})
            </h2>
          </div>

          {filteredInterviews.length === 0 ? (
            <div className="glass-card rounded-xl p-12 text-center">
              <Search className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-body text-foreground">No interviews found</p>
              <p className="text-body-sm text-muted-foreground mt-2">
                {isGenerating
                  ? "Generating interviews based on your filters..."
                  : "Try adjusting your search or filters"}
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInterviews.map((interview) => (
                <Card
                  key={interview.id}
                  className="glass-card rounded-xl hover:shadow-lg transition-all cursor-pointer border-border hover:border-primary/30"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 text-primary">
                        {getTypeIcon(interview.interviewType)}
                        <span className="text-body-sm font-medium">
                          {interview.interviewType}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={getDifficultyColor(interview.difficulty)}
                      >
                        {interview.difficulty}
                      </Badge>
                    </div>
                    <CardTitle className="text-body-lg font-semibold text-foreground">
                      {interview.title}
                    </CardTitle>
                    <CardDescription className="text-body-sm text-muted-foreground mt-2">
                      {interview.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 text-body-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        <span>{interview.questionCount} questions</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>~{interview.estimatedDuration} min</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-body-sm text-muted-foreground">Skill:</span>
                        <span className="text-body-sm font-medium text-foreground">
                          {interview.skill}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-body-sm text-muted-foreground">Role:</span>
                        <span className="text-body-sm font-medium text-foreground">
                          {interview.role}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="gradient"
                      className="w-full"
                      onClick={() => handleStartInterview(interview)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Interview
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Code,
  Briefcase,
  TrendingUp,
  Clock,
  Play,
  FileText,
  Mic,
  Layers,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthToken } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api";

interface InterviewOption {
  id: string;
  title: string;
  skill: string;
  role: string;
  interviewType: string;
  difficulty: "Easy" | "Intermediate" | "Hard";
  questionCount: number;
  estimatedDuration: number; // in minutes
  description: string;
}

interface FilterOptions {
  skills: string[];
  roles: string[];
  difficulties: string[];
  interviewTypes: string[];
}

export default function MockInterviewHub() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const [interviews, setInterviews] = useState<InterviewOption[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    skills: [],
    roles: [],
    difficulties: ["Easy", "Intermediate", "Hard"],
    interviewTypes: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch student data and generate interviews on mount
  useEffect(() => {
    loadInterviews();
  }, []);

  // Regenerate interviews when filters change (but not on initial load)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  useEffect(() => {
    if (initialLoadComplete && interviews.length > 0) {
      // Only regenerate if filters are actually applied (not "all")
      const hasActiveFilters =
        skillFilter !== "all" ||
        roleFilter !== "all" ||
        difficultyFilter !== "all" ||
        typeFilter !== "all";

      if (hasActiveFilters) {
        regenerateInterviews();
      }
    }
  }, [skillFilter, roleFilter, difficultyFilter, typeFilter]);

  useEffect(() => {
    if (!isLoading && interviews.length > 0) {
      setInitialLoadComplete(true);
    }
  }, [isLoading, interviews.length]);

  const loadInterviews = async () => {
    try {
      setIsLoading(true);
      const token = getAuthToken();
      if (!token) {
        console.error("No auth token found");
        setIsLoading(false);
        return;
      }

      const apiUrl = API_BASE_URL;

      // Generate initial interviews
      const response = await fetch(`${apiUrl}/interviews/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ filters: {} }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate interviews");
      }

      const data = await response.json();
      setInterviews(data.interviews || []);
      setFilterOptions(data.filterOptions || filterOptions);
    } catch (error) {
      console.error("[Load Interviews] Error:", error);
      // Fallback to empty array on error
      setInterviews([]);
    } finally {
      setIsLoading(false);
    }
  };

  const regenerateInterviews = async () => {
    try {
      setIsGenerating(true);
      const token = getAuthToken();
      if (!token) {
        return;
      }

      const apiUrl = API_BASE_URL;

      const filters: any = {};
      if (skillFilter !== "all") filters.skill = skillFilter;
      if (roleFilter !== "all") filters.role = roleFilter;
      if (difficultyFilter !== "all") filters.difficulty = difficultyFilter;
      if (typeFilter !== "all") filters.type = typeFilter;

      const response = await fetch(`${apiUrl}/interviews/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ filters }),
      });

      if (!response.ok) {
        throw new Error("Failed to regenerate interviews");
      }

      const data = await response.json();
      setInterviews(data.interviews || []);
      // Update filter options if they changed
      if (data.filterOptions) {
        setFilterOptions(data.filterOptions);
      }
    } catch (error) {
      console.error("[Regenerate Interviews] Error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Filter interviews (client-side filtering for search)
  const filteredInterviews = useMemo(() => {
    return interviews.filter((interview) => {
      const matchesSearch =
        searchQuery === "" ||
        interview.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        interview.skill.toLowerCase().includes(searchQuery.toLowerCase()) ||
        interview.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        interview.description.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });
  }, [interviews, searchQuery]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-success/10 text-success border-success/20";
      case "Intermediate":
        return "bg-warning/10 text-warning border-warning/20";
      case "Hard":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Technical":
        return <Code className="h-4 w-4" />;
      case "Behavioral":
        return <Briefcase className="h-4 w-4" />;
      case "System Design":
        return <Layers className="h-4 w-4" />;
      case "HR":
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const handleStartInterview = (interview: InterviewOption) => {
    // Navigate to setup page with interview data
    navigate("/interview/setup", {
      state: { interview },
    });
  };

  const handleFilterChange = (filterType: string, value: string) => {
    switch (filterType) {
      case "skill":
        setSkillFilter(value);
        break;
      case "role":
        setRoleFilter(value);
        break;
      case "difficulty":
        setDifficultyFilter(value);
        break;
      case "type":
        setTypeFilter(value);
        break;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout role="student" title="Mock Interviews">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="glass-card rounded-xl p-12 text-center">
            <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
            <p className="text-body text-foreground">Loading personalized interviews...</p>
            <p className="text-body-sm text-muted-foreground mt-2">
              Generating interviews based on your profile and career goals
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="student" title="Mock Interviews">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="glass-card rounded-xl p-6">
          <h1 className="text-headline text-foreground mb-2">Mock Interview Hub</h1>
          <p className="text-body text-muted-foreground">
            Practice interviews tailored to your skills and career goals. Select an interview type to get started.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="glass-card rounded-xl p-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search skills, roles, or interview topics"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select
              value={skillFilter}
              onValueChange={(value) => handleFilterChange("skill", value)}
              disabled={isGenerating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Skill" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Skills</SelectItem>
                {filterOptions.skills.map((skill) => (
                  <SelectItem key={skill} value={skill}>
                    {skill}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={roleFilter}
              onValueChange={(value) => handleFilterChange("role", value)}
              disabled={isGenerating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {filterOptions.roles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={difficultyFilter}
              onValueChange={(value) => handleFilterChange("difficulty", value)}
              disabled={isGenerating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                {filterOptions.difficulties.map((difficulty) => (
                  <SelectItem key={difficulty} value={difficulty}>
                    {difficulty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={typeFilter}
              onValueChange={(value) => handleFilterChange("type", value)}
              disabled={isGenerating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Interview Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {filterOptions.interviewTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isGenerating && (
            <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Generating personalized interviews...</span>
            </div>
          )}
        </div>

        {/* Interview Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-title text-foreground">
              Available Interviews ({filteredInterviews.length})
            </h2>
          </div>

          {filteredInterviews.length === 0 ? (
            <div className="glass-card rounded-xl p-12 text-center">
              <Search className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-body text-foreground">No interviews found</p>
              <p className="text-body-sm text-muted-foreground mt-2">
                {isGenerating
                  ? "Generating interviews based on your filters..."
                  : "Try adjusting your search or filters"}
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInterviews.map((interview) => (
                <Card
                  key={interview.id}
                  className="glass-card rounded-xl hover:shadow-lg transition-all cursor-pointer border-border hover:border-primary/30"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 text-primary">
                        {getTypeIcon(interview.interviewType)}
                        <span className="text-body-sm font-medium">
                          {interview.interviewType}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={getDifficultyColor(interview.difficulty)}
                      >
                        {interview.difficulty}
                      </Badge>
                    </div>
                    <CardTitle className="text-body-lg font-semibold text-foreground">
                      {interview.title}
                    </CardTitle>
                    <CardDescription className="text-body-sm text-muted-foreground mt-2">
                      {interview.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 text-body-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        <span>{interview.questionCount} questions</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>~{interview.estimatedDuration} min</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-body-sm text-muted-foreground">Skill:</span>
                        <span className="text-body-sm font-medium text-foreground">
                          {interview.skill}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-body-sm text-muted-foreground">Role:</span>
                        <span className="text-body-sm font-medium text-foreground">
                          {interview.role}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="gradient"
                      className="w-full"
                      onClick={() => handleStartInterview(interview)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Interview
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
