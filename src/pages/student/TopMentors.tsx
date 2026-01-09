import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Search, Star, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL } from "@/lib/api";

interface Mentor {
  id: string;
  mentorId: string;
  name: string;
  skill: string;
  expertise: string;
  rating: number;
  score: number;
  initials: string;
}

interface CourseMentors {
  course: string;
  mentors: Mentor[];
}

export default function TopMentors() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [mentorsByCourse, setMentorsByCourse] = useState<Record<string, Mentor[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch mentors from API
  useEffect(() => {
    const fetchTopMentors = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`${API_BASE_URL}/mentors/top`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch top mentors");
        }
        
        const data = await response.json();
        
        // Transform API response: API returns Array<{mentorId, name, rating, skills: Array<{skillId, skillName}>}>
        // Frontend expects Record<string, Mentor[]> grouped by skill/course
        const grouped: Record<string, Mentor[]> = {};
        
        if (Array.isArray(data)) {
          data.forEach((mentor: any) => {
            if (mentor.skills && Array.isArray(mentor.skills)) {
              mentor.skills.forEach((skill: any) => {
                const skillName = skill.skillName || skill.skillId;
                if (!grouped[skillName]) {
                  grouped[skillName] = [];
                }
                
                // Create mentor object matching the frontend interface
                const mentorObj: Mentor = {
                  id: mentor.mentorId,
                  mentorId: mentor.mentorId,
                  name: mentor.name,
                  skill: skillName,
                  expertise: skillName,
                  rating: mentor.rating || 4.5,
                  score: 0,
                  initials: mentor.name
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2),
                };
                
                // Only add if not already in the array for this skill (prevent duplicates)
                const exists = grouped[skillName].some((m) => m.mentorId === mentor.mentorId);
                if (!exists) {
                  grouped[skillName].push(mentorObj);
                }
              });
            }
          });
        }
        
        setMentorsByCourse(grouped);
      } catch (err) {
        console.error("Error fetching top mentors:", err);
        setError("Failed to load mentors. Please try again later.");
        setMentorsByCourse({});
      } finally {
        setLoading(false);
      }
    };

    fetchTopMentors();
  }, []);

  // Convert mentorsByCourse to array format and filter based on search query
  const filteredData = useMemo(() => {
    // Convert Record to array, ensuring mentors is always an array
    const courseDataArray: CourseMentors[] = Object.entries(mentorsByCourse).map(
      ([course, mentors]) => ({
        course,
        mentors: Array.isArray(mentors) ? mentors : [],
      })
    );

    if (!searchQuery.trim()) {
      return courseDataArray;
    }

    const query = searchQuery.toLowerCase();
    const filtered = courseDataArray
      .map((courseData) => {
        const matchingMentors = courseData.mentors.filter(
          (mentor) =>
            mentor.name.toLowerCase().includes(query) ||
            mentor.skill?.toLowerCase().includes(query) ||
            mentor.expertise?.toLowerCase().includes(query) ||
            courseData.course.toLowerCase().includes(query)
        );

        if (matchingMentors.length > 0) {
          return { ...courseData, mentors: matchingMentors };
        }
        return null;
      })
      .filter((item): item is CourseMentors => item !== null);

    // Sort: courses with matches come first
    return filtered.sort((a, b) => {
      const aMatches = a.mentors.length;
      const bMatches = b.mentors.length;
      return bMatches - aMatches;
    });
  }, [searchQuery, mentorsByCourse]);

  const toggleCourse = (course: string) => {
    setExpandedCourses((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(course)) {
        newSet.delete(course);
      } else {
        newSet.add(course);
      }
      return newSet;
    });
  };

  const INITIAL_MENTORS_COUNT = 3;

  return (
    <DashboardLayout role="student" title="Top Mentors">
      <div className="space-y-6">
        {/* Search Bar */}
        <div className="glass-card rounded-xl p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5" />
          <div className="relative">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search mentors or skills"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 pl-10 pr-4 text-body"
              />
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="glass-card rounded-xl p-12 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="glass-card rounded-xl p-12 text-center">
            <p className="text-body text-muted-foreground">{error}</p>
          </div>
        )}

        {/* Course Sections */}
        {!loading && !error && (
          <div className="space-y-6">
            {filteredData.length > 0 ? (
              filteredData.map((courseData) => {
                // Ensure mentors is always an array
                const mentors = Array.isArray(courseData.mentors) ? courseData.mentors : [];
                const isExpanded = expandedCourses.has(courseData.course);
                const visibleMentors = isExpanded
                  ? mentors
                  : mentors.slice(0, INITIAL_MENTORS_COUNT);
                const hasMore = mentors.length > INITIAL_MENTORS_COUNT;

                return (
                  <div key={courseData.course} className="glass-card rounded-xl p-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5" />
                    <div className="relative">
                      {/* Course Title */}
                      <div className="mb-4">
                        <h2 className="text-title text-foreground font-semibold">
                          Course: {courseData.course}
                        </h2>
                      </div>

                      {/* Mentor Cards Grid */}
                      <div
                        className={cn(
                          "grid gap-4",
                          isExpanded
                            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                        )}
                      >
                        {visibleMentors.map((mentor) => {
                          const isHighlighted =
                            searchQuery &&
                            (mentor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              mentor.skill?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              mentor.expertise?.toLowerCase().includes(searchQuery.toLowerCase()));

                          return (
                            <div
                              key={mentor.id}
                              className={cn(
                                "p-4 rounded-lg border border-border bg-card hover:shadow-md transition-all",
                                isHighlighted && "ring-2 ring-primary bg-primary/5"
                              )}
                            >
                              {/* Avatar */}
                              <div className="flex justify-center mb-3">
                                <Avatar className="h-16 w-16">
                                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-lg font-semibold">
                                    {mentor.initials}
                                  </AvatarFallback>
                                </Avatar>
                              </div>

                              {/* Name */}
                              <p className="text-body font-semibold text-foreground text-center mb-2">
                                {mentor.name}
                              </p>

                              {/* Skill Tag */}
                              <div className="flex justify-center mb-3">
                                <Badge variant="outline" className="text-body-sm">
                                  {mentor.skill || mentor.expertise || "Mentor"}
                                </Badge>
                              </div>

                              {/* Rating */}
                              <div className="flex items-center justify-center gap-1 mb-4">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-body-sm font-medium text-foreground">
                                  {mentor.rating}
                                </span>
                              </div>

                              {/* Connect Button */}
                              <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                  // Pass the mentor skill (skillId and skillName) - NOT student course
                                  const skillName = mentor.skill || mentor.expertise || courseData.course;
                                  const skillId = skillName.toLowerCase().replace(/\s+/g, "-");
                                  navigate(`/student/mentor/${mentor.id || mentor.mentorId}`, {
                                    state: {
                                      mentorSkill: {
                                        skillId: skillId,
                                        skillName: skillName,
                                      }
                                    }
                                  });
                                }}
                              >
                                Connect
                              </Button>
                            </div>
                          );
                        })}
                      </div>

                      {/* View More Button */}
                      {hasMore && (
                        <div className="mt-4 flex justify-center">
                          <Button
                            variant="ghost"
                            onClick={() => toggleCourse(courseData.course)}
                            className="text-primary hover:text-primary/80"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-4 w-4 mr-2" />
                                View Less
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-4 w-4 mr-2" />
                                View More
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="glass-card rounded-xl p-12 text-center">
                <p className="text-body text-muted-foreground">
                  No top mentors available yet for this course
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

