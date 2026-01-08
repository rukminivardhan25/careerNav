import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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

interface TopMentorsSidebarProps {
  collapsed: boolean;
}

export function TopMentorsSidebar({ collapsed }: TopMentorsSidebarProps) {
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
        setMentorsByCourse(data);
      } catch (err) {
        console.error("Error fetching top mentors:", err);
        setError("Failed to load mentors. Please try again later.");
        // Set empty data on error
        setMentorsByCourse({});
      } finally {
        setLoading(false);
      }
    };

    if (!collapsed) {
      fetchTopMentors();
    }
  }, [collapsed]);

  // Convert mentorsByCourse to array format and filter based on search query
  const filteredData = useMemo(() => {
    // Convert Record to array
    const courseDataArray: CourseMentors[] = Object.entries(mentorsByCourse).map(
      ([course, mentors]) => ({
        course,
        mentors,
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

  if (collapsed) {
    return null;
  }

  const INITIAL_MENTORS_COUNT = 3;

  return (
    <div className="border-t border-sidebar-border py-4 px-2">
      {/* Search Bar */}
      <div className="mb-4 px-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sidebar-foreground/50" />
          <Input
            type="text"
            placeholder="Search mentors or skills"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-8 pr-3 text-body-sm bg-sidebar-accent/50 border-sidebar-border focus-visible:ring-sidebar-ring"
          />
        </div>
      </div>

      {/* Top Mentors Title */}
      <div className="px-2 mb-3">
        <h3 className="text-body-sm font-semibold text-sidebar-foreground">Top Mentors</h3>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="px-2 py-8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-sidebar-foreground/50" />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="px-2 py-4 text-center">
          <p className="text-caption text-sidebar-foreground/50">{error}</p>
        </div>
      )}

      {/* Course Sections */}
      {!loading && !error && (
        <div className="space-y-4">
          {filteredData.length > 0 ? (
            filteredData.map((courseData) => {
          const isExpanded = expandedCourses.has(courseData.course);
          const visibleMentors = isExpanded
            ? courseData.mentors
            : courseData.mentors.slice(0, INITIAL_MENTORS_COUNT);
          const hasMore = courseData.mentors.length > INITIAL_MENTORS_COUNT;

          return (
            <div key={courseData.course} className="px-2">
              {/* Course Title */}
              <div className="mb-2">
                <p className="text-caption font-medium text-sidebar-foreground/80">
                  Course: {courseData.course}
                </p>
              </div>

              {/* Mentor Cards - Horizontal Scrollable */}
              <div
                className={cn(
                  "flex gap-2 overflow-x-auto pb-2",
                  isExpanded ? "flex-wrap overflow-y-auto max-h-[300px]" : ""
                )}
                style={{
                  scrollbarWidth: "thin",
                  scrollbarColor: "hsl(var(--sidebar-border)) transparent",
                }}
              >
                {visibleMentors.map((mentor) => {
                  const isHighlighted =
                    searchQuery &&
                    (mentor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      mentor.skill.toLowerCase().includes(searchQuery.toLowerCase()));

                  return (
                    <div
                      key={mentor.id}
                      className={cn(
                        "flex-shrink-0 w-[140px] p-2.5 rounded-lg border border-sidebar-border bg-sidebar-accent/30 transition-all",
                        isHighlighted && "ring-2 ring-sidebar-primary bg-sidebar-primary/10"
                      )}
                    >
                      {/* Avatar */}
                      <div className="flex justify-center mb-2">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-gradient-to-br from-sidebar-primary to-accent text-white text-xs font-semibold">
                            {mentor.initials}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      {/* Name */}
                      <p className="text-caption font-medium text-sidebar-foreground text-center mb-1 truncate">
                        {mentor.name}
                      </p>

                      {/* Skill Tag */}
                      <div className="flex justify-center mb-2">
                        <Badge
                          variant="outline"
                          className="text-caption px-1.5 py-0.5 border-sidebar-border text-sidebar-foreground/70"
                        >
                          {mentor.skill || mentor.expertise || "Mentor"}
                        </Badge>
                      </div>

                      {/* Rating */}
                      <div className="flex items-center justify-center gap-1 mb-2">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-caption font-medium text-sidebar-foreground">
                          {mentor.rating}
                        </span>
                      </div>

                      {/* Connect Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-7 text-caption text-sidebar-primary hover:bg-sidebar-primary/10"
                        onClick={() => {
                          navigate(`/student/mentor/${mentor.id || mentor.mentorId}`);
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
                <button
                  onClick={() => toggleCourse(courseData.course)}
                  className="mt-2 flex items-center gap-1 text-caption text-sidebar-primary hover:text-sidebar-primary/80 transition-colors"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-3 w-3" />
                      <span>View Less</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" />
                      <span>View More</span>
                    </>
                  )}
                </button>
              )}
            </div>
          );
            })
          ) : (
            <div className="px-2 py-4 text-center">
              <p className="text-caption text-sidebar-foreground/50">
                No top mentors available yet for this course
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

