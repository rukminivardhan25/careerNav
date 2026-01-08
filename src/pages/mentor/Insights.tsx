import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Star,
  Calendar,
  Award,
  Target,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  History,
  Info,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthToken } from "@/lib/auth";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Helper to get initials
const getInitials = (name: string): string => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
};

export default function Insights() {
  const [timeRange, setTimeRange] = useState("6months");
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    avgRating: 0,
    totalSessions: 0,
    completedReviews: 0,
    avgResponseTime: "0 hours",
    studentGrowth: 0,
    sessionGrowth: 0,
    ratingChange: 0,
  });
  // Student Join Timeline state
  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth()); // 0-11
  const [joinData, setJoinData] = useState<{
    year: number;
    month: string;
    count: number;
    students: Array<{
      student_id: string;
      name: string;
      joined_at: string;
      skill: string;
    }>;
  } | null>(null);
  const [joinDataLoading, setJoinDataLoading] = useState(true);
  const [weeklySchedule, setWeeklySchedule] = useState<{
    weekStart: string;
    weekEnd: string;
    days: Array<{
      date: string;
      dayName: string;
      sessions: Array<{
        start_time: string;
        end_time: string;
        skill: string;
        student: string;
      }>;
    }>;
  } | null>(null);
  const [weeklyScheduleLoading, setWeeklyScheduleLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });
  const [currentDayIndex, setCurrentDayIndex] = useState(0); // 0 = Monday, 4 = Friday
  
  // Flip states for metric cards
  const [isTotalStudentsFlipped, setIsTotalStudentsFlipped] = useState(false);
  const [isTotalSessionsFlipped, setIsTotalSessionsFlipped] = useState(false);
  const [isAvgRatingFlipped, setIsAvgRatingFlipped] = useState(false);
  const [isAvgResponseTimeFlipped, setIsAvgResponseTimeFlipped] = useState(false);
  
  // Flip states for bottom row cards
  const [isCourseDistributionFlipped, setIsCourseDistributionFlipped] = useState(false);
  const [isTopPerformersFlipped, setIsTopPerformersFlipped] = useState(false);
  const [isQuickStatsFlipped, setIsQuickStatsFlipped] = useState(false);
  const [topStudents, setTopStudents] = useState<Array<{
    id: string;
    name: string;
    progress: number;
    rating: number;
  }>>([]);
  const [courseDistribution, setCourseDistribution] = useState<Array<{
    course: string;
    count: number;
    percentage: number;
  }>>([]);
  const [quickStats, setQuickStats] = useState({
    activeStudents: 0,
    completedReviews: 0,
    avgSessionDuration: "0 min",
    studentSatisfaction: 0,
  });

  // Month navigation functions
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Generate year options (current year ± 2 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  // Fetch all insights data
  useEffect(() => {
    const fetchInsights = async () => {
      setIsLoading(true);
      try {
        const token = getAuthToken();
        if (!token) {
          toast.error("Authentication required");
          setIsLoading(false);
          return;
        }

        // Fetch all data in parallel (excluding performance data)
        const [metricsRes, topStudentsRes, courseDistRes, quickStatsRes] = await Promise.all([
          fetch(`${API_URL}/mentors/insights/metrics?timeRange=${timeRange}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/mentors/insights/students?limit=3`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/mentors/insights/course-distribution`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/mentors/insights/quick-stats`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        // Process metrics
        if (metricsRes.ok) {
          const metricsData = await metricsRes.json();
          if (metricsData.metrics) {
            setStats({
              totalStudents: metricsData.metrics.totalStudents || 0,
              activeStudents: 0, // Will be updated from quickStats
              avgRating: metricsData.metrics.avgRating || 0,
              totalSessions: metricsData.metrics.totalSessions || 0,
              completedReviews: 0, // Will be updated from quickStats
              avgResponseTime: metricsData.metrics.avgResponseTime || "0 hours",
              studentGrowth: metricsData.metrics.studentGrowth || 0,
              sessionGrowth: metricsData.metrics.sessionGrowth || 0,
              ratingChange: metricsData.metrics.ratingChange || 0,
            });
          }
        }


        // Process top students
        if (topStudentsRes.ok) {
          const studentsData = await topStudentsRes.json();
          if (studentsData.students) {
            setTopStudents(studentsData.students);
          }
        }

        // Process course distribution
        if (courseDistRes.ok) {
          const distData = await courseDistRes.json();
          if (distData.distribution) {
            setCourseDistribution(distData.distribution);
          }
        }

        // Process quick stats
        if (quickStatsRes.ok) {
          const quickData = await quickStatsRes.json();
          if (quickData.stats) {
            setQuickStats(quickData.stats);
            // Update stats with quick stats values
            setStats((prev) => ({
              ...prev,
              activeStudents: quickData.stats.activeStudents || 0,
              completedReviews: quickData.stats.completedReviews || 0,
            }));
          }
        }
      } catch (error) {
        console.error("[Insights] Error fetching data:", error);
        toast.error("Failed to load insights data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInsights();
  }, [timeRange]);

  // Fetch student joins data
  useEffect(() => {
    const fetchStudentJoins = async () => {
      setJoinDataLoading(true);
      try {
        const token = getAuthToken();
        if (!token) {
          setJoinDataLoading(false);
          return;
        }

        const response = await fetch(
          `${API_URL}/mentors/insights/student-joins?year=${year}&month=${month + 1}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setJoinData(data);
        } else {
          setJoinData(null);
        }
      } catch (error) {
        console.error("[Insights] Error fetching student joins:", error);
        setJoinData(null);
      } finally {
        setJoinDataLoading(false);
      }
    };

    fetchStudentJoins();
  }, [year, month]);

  // Fetch weekly schedule for timetable
  useEffect(() => {
    const fetchWeeklySchedule = async () => {
      setWeeklyScheduleLoading(true);
      try {
        const token = getAuthToken();
        if (!token) {
          setWeeklyScheduleLoading(false);
          return;
        }

        // Calculate week range (Monday to Friday)
        const weekStart = new Date(currentWeekStart);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 4); // Friday (4 days after Monday)
        weekEnd.setHours(23, 59, 59, 999);

        const weekStartStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
        const weekEndStr = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`;

        const response = await fetch(
          `${API_URL}/mentors/insights/weekly-schedule?weekStart=${weekStartStr}&weekEnd=${weekEndStr}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setWeeklySchedule(data);
        } else {
          setWeeklySchedule(null);
        }
      } catch (error) {
        console.error("[Insights] Error fetching weekly schedule:", error);
        setWeeklySchedule(null);
      } finally {
        setWeeklyScheduleLoading(false);
      }
    };

    fetchWeeklySchedule();

    // Poll every 5 minutes
    const interval = setInterval(fetchWeeklySchedule, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentWeekStart]);

  // Day navigation functions
  const nextDay = () => {
    if (currentDayIndex < 4) {
      setCurrentDayIndex(currentDayIndex + 1);
    } else {
      // Move to next week's Monday
      const next = new Date(currentWeekStart);
      next.setDate(next.getDate() + 7);
      setCurrentWeekStart(next);
      setCurrentDayIndex(0);
    }
  };

  const prevDay = () => {
    if (currentDayIndex > 0) {
      setCurrentDayIndex(currentDayIndex - 1);
    } else {
      // Move to previous week's Friday
      const prev = new Date(currentWeekStart);
      prev.setDate(prev.getDate() - 7);
      setCurrentWeekStart(prev);
      setCurrentDayIndex(4);
    }
  };

  // Generate 30-minute slots from 9:00 AM to 9:00 PM
  const generateTimeSlots = () => {
    const slots: Array<{ start: string; end: string; display: string }> = [];
    for (let hour = 9; hour < 21; hour++) {
      // First half-hour slot
      slots.push({
        start: `${String(hour).padStart(2, '0')}:00`,
        end: `${String(hour).padStart(2, '0')}:30`,
        display: `${hour}:00 – ${hour}:30`,
      });
      // Second half-hour slot
      if (hour < 20) {
        slots.push({
          start: `${String(hour).padStart(2, '0')}:30`,
          end: `${String(hour + 1).padStart(2, '0')}:00`,
          display: `${hour}:30 – ${hour + 1}:00`,
        });
      }
    }
    return slots;
  };

  // Check if a slot overlaps with any session for a given day
  const getSessionForSlot = (daySessions: Array<{ start_time: string; end_time: string; skill: string; student: string }>, slotStart: string, slotEnd: string) => {
    if (!daySessions || daySessions.length === 0) return null;

    const [slotStartHour, slotStartMin] = slotStart.split(':').map(Number);
    const [slotEndHour, slotEndMin] = slotEnd.split(':').map(Number);
    const slotStartMinutes = slotStartHour * 60 + slotStartMin;
    const slotEndMinutes = slotEndHour * 60 + slotEndMin;

    for (const session of daySessions) {
      const [sessionStartHour, sessionStartMin] = session.start_time.split(':').map(Number);
      const [sessionEndHour, sessionEndMin] = session.end_time.split(':').map(Number);
      const sessionStartMinutes = sessionStartHour * 60 + sessionStartMin;
      const sessionEndMinutes = sessionEndHour * 60 + sessionEndMin;

      // Check if slot overlaps with session
      if (slotStartMinutes < sessionEndMinutes && slotEndMinutes > sessionStartMinutes) {
        return session;
      }
    }

    return null;
  };

  const timeSlots = generateTimeSlots();

  // Get current day for display
  const getCurrentDay = () => {
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const dayDate = new Date(currentWeekStart);
    dayDate.setDate(dayDate.getDate() + currentDayIndex);
    
    if (!weeklySchedule || !weeklySchedule.days || weeklySchedule.days.length === 0) {
      return {
        dayName: dayNames[currentDayIndex],
        date: dayDate,
        sessions: [],
      };
    }
    
    const dayData = weeklySchedule.days[currentDayIndex];
    if (dayData) {
      return {
        dayName: dayData.dayName,
        date: new Date(dayData.date),
        sessions: dayData.sessions || [],
      };
    }
    
    return {
      dayName: dayNames[currentDayIndex],
      date: dayDate,
      sessions: [],
    };
  };

  // Format current day for display
  const formatCurrentDay = () => {
    const day = getCurrentDay();
    const dateStr = day.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `${day.dayName}, ${dateStr}`;
  };

  return (
    <DashboardLayout role="mentor" title="Insights">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-headline text-foreground">Insights & Analytics</h1>
          <p className="text-body text-muted-foreground mt-1">
            Track your mentoring performance and student progress
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Students - Flip Card */}
          <div className="relative h-[160px]" style={{ perspective: "1000px" }}>
            <div
              className="relative w-full h-full transition-transform duration-300"
              style={{
                transformStyle: "preserve-3d",
                transform: isTotalStudentsFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* Front Side */}
              <Card
                className="absolute inset-0 w-full h-full"
                style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                  <CardTitle className="text-body-sm font-medium text-muted-foreground">
                    Total Students
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <button
                    onClick={() => setIsTotalStudentsFlipped(!isTotalStudentsFlipped)}
                    className="absolute top-2 right-2 cursor-pointer hover:opacity-70 transition-opacity z-10"
                    aria-label="Flip card"
                  >
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </button>
                </CardHeader>
                <CardContent>
                  <div className="text-title font-bold text-foreground">
                    {stats.totalStudents}
                  </div>
                  <div className={`flex items-center gap-1 text-body-sm mt-1 ${
                    stats.studentGrowth >= 0 ? "text-success" : "text-destructive"
                  }`}>
                    {stats.studentGrowth >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-success" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-destructive" />
                    )}
                    <span>
                      {stats.studentGrowth >= 0 ? "+" : ""}
                      {stats.studentGrowth.toFixed(1)}% from last month
                    </span>
                  </div>
                </CardContent>
              </Card>
              {/* Back Side */}
              <Card
                className="absolute inset-0 w-full h-full"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <CardHeader className="flex flex-row items-center justify-end space-y-0 pb-2 relative">
                  <button
                    onClick={() => setIsTotalStudentsFlipped(!isTotalStudentsFlipped)}
                    className="absolute top-2 right-2 cursor-pointer hover:opacity-70 transition-opacity z-10"
                    aria-label="Flip card"
                  >
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </button>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-full px-3 py-1">
                  <p className="text-[11px] text-foreground text-center leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
                    This shows the total number of unique students who have booked and paid for sessions with you during the selected time range.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Total Sessions - Flip Card */}
          <div className="relative h-[160px]" style={{ perspective: "1000px" }}>
            <div
              className="relative w-full h-full transition-transform duration-300"
              style={{
                transformStyle: "preserve-3d",
                transform: isTotalSessionsFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* Front Side */}
              <Card
                className="absolute inset-0 w-full h-full"
                style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                  <CardTitle className="text-body-sm font-medium text-muted-foreground">
                    Total Sessions
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-accent" />
                  </div>
                  <button
                    onClick={() => setIsTotalSessionsFlipped(!isTotalSessionsFlipped)}
                    className="absolute top-2 right-2 cursor-pointer hover:opacity-70 transition-opacity z-10"
                    aria-label="Flip card"
                  >
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </button>
                </CardHeader>
                <CardContent>
                  <div className="text-title font-bold text-foreground">
                    {stats.totalSessions}
                  </div>
                  <div className={`flex items-center gap-1 text-body-sm mt-1 ${
                    stats.sessionGrowth >= 0 ? "text-success" : "text-destructive"
                  }`}>
                    {stats.sessionGrowth >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-success" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-destructive" />
                    )}
                    <span>
                      {stats.sessionGrowth >= 0 ? "+" : ""}
                      {stats.sessionGrowth.toFixed(1)}% from last month
                    </span>
                  </div>
                </CardContent>
              </Card>
              {/* Back Side */}
              <Card
                className="absolute inset-0 w-full h-full"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <CardHeader className="flex flex-row items-center justify-end space-y-0 pb-2 relative">
                  <button
                    onClick={() => setIsTotalSessionsFlipped(!isTotalSessionsFlipped)}
                    className="absolute top-2 right-2 cursor-pointer hover:opacity-70 transition-opacity z-10"
                    aria-label="Flip card"
                  >
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </button>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-full px-3 py-1">
                  <p className="text-[11px] text-foreground text-center leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
                    This represents the total number of completed mentorship sessions delivered by you during the selected time range.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Average Rating - Flip Card */}
          <div className="relative h-[160px]" style={{ perspective: "1000px" }}>
            <div
              className="relative w-full h-full transition-transform duration-300"
              style={{
                transformStyle: "preserve-3d",
                transform: isAvgRatingFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* Front Side */}
              <Card
                className="absolute inset-0 w-full h-full"
                style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                  <CardTitle className="text-body-sm font-medium text-muted-foreground">
                    Average Rating
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 fill-warning text-warning" />
                  </div>
                  <button
                    onClick={() => setIsAvgRatingFlipped(!isAvgRatingFlipped)}
                    className="absolute top-2 right-2 cursor-pointer hover:opacity-70 transition-opacity z-10"
                    aria-label="Flip card"
                  >
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </button>
                </CardHeader>
                <CardContent>
                  <div className="text-title font-bold text-foreground">
                    {stats.avgRating.toFixed(1)}
                  </div>
                  <div className={`flex items-center gap-1 text-body-sm mt-1 ${
                    stats.ratingChange >= 0 ? "text-success" : "text-destructive"
                  }`}>
                    {stats.ratingChange >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-success" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-destructive" />
                    )}
                    <span>
                      {stats.ratingChange >= 0 ? "+" : ""}
                      {stats.ratingChange.toFixed(1)} from last month
                    </span>
                  </div>
                </CardContent>
              </Card>
              {/* Back Side */}
              <Card
                className="absolute inset-0 w-full h-full"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <CardHeader className="flex flex-row items-center justify-end space-y-0 pb-2 relative">
                  <button
                    onClick={() => setIsAvgRatingFlipped(!isAvgRatingFlipped)}
                    className="absolute top-2 right-2 cursor-pointer hover:opacity-70 transition-opacity z-10"
                    aria-label="Flip card"
                  >
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </button>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-full px-3 py-1">
                  <p className="text-[11px] text-foreground text-center leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
                    This is your overall mentor rating calculated from student feedback after completed sessions.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Avg Response Time - Flip Card */}
          <div className="relative h-[160px]" style={{ perspective: "1000px" }}>
            <div
              className="relative w-full h-full transition-transform duration-300"
              style={{
                transformStyle: "preserve-3d",
                transform: isAvgResponseTimeFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* Front Side */}
              <Card
                className="absolute inset-0 w-full h-full"
                style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                  <CardTitle className="text-body-sm font-medium text-muted-foreground">
                    Avg Response Time
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <button
                    onClick={() => setIsAvgResponseTimeFlipped(!isAvgResponseTimeFlipped)}
                    className="absolute top-2 right-2 cursor-pointer hover:opacity-70 transition-opacity z-10"
                    aria-label="Flip card"
                  >
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </button>
                </CardHeader>
                <CardContent>
                  <div className="text-title font-bold text-foreground">
                    {stats.avgResponseTime}
                  </div>
                  <div className="flex items-center gap-1 text-body-sm text-success mt-1">
                    <TrendingDown className="h-3 w-3 text-success" />
                    <span>Faster than average</span>
                  </div>
                </CardContent>
              </Card>
              {/* Back Side */}
              <Card
                className="absolute inset-0 w-full h-full"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <CardHeader className="flex flex-row items-center justify-end space-y-0 pb-2 relative">
                  <button
                    onClick={() => setIsAvgResponseTimeFlipped(!isAvgResponseTimeFlipped)}
                    className="absolute top-2 right-2 cursor-pointer hover:opacity-70 transition-opacity z-10"
                    aria-label="Flip card"
                  >
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </button>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-full px-3 py-1">
                  <p className="text-[11px] text-foreground text-center leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
                    This measures how quickly you reply to student messages, calculated from chat interactions inside sessions.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Top Row: Student Join Timeline | Weekly Schedule */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Student Join Timeline */}
          <Card>
              <CardHeader>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    Student Join Timeline
                  </CardTitle>
                  <p className="text-body-sm text-muted-foreground mt-1">
                    Track when students joined your mentorship over time
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Year Selector and Month Navigator in one line */}
                  <div className="flex items-end gap-4">
                    {/* Year Selector */}
                    <div className="flex-1">
                      <label className="text-body-sm text-muted-foreground mb-2 block">Year</label>
                      <Select
                        value={year.toString()}
                        onValueChange={(value) => setYear(parseInt(value))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {yearOptions.map((y) => (
                            <SelectItem key={y} value={y.toString()}>
                              {y}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Month Navigator */}
                    <div className="flex-1">
                      <label className="text-body-sm text-muted-foreground mb-2 block">Month</label>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={prevMonth}
                          className="h-9 w-9"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-body font-semibold text-foreground flex-1 text-center">
                          {monthNames[month]}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={nextMonth}
                          className="h-9 w-9"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  {/* Month Summary */}
                  <div className="pb-4 border-b border-border">
                    <h3 className="text-title font-semibold text-foreground">
                      {joinData?.month || monthNames[month]} {joinData?.year || year}
                    </h3>
                    <p className="text-body-sm text-muted-foreground mt-1">
                      Total Students Joined: {joinData?.count || 0}
                    </p>
                  </div>
                </div>
                {joinDataLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : joinData && joinData.count > 0 ? (
                  <div className="space-y-3 mt-4 max-h-[450px] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
                    {joinData.students.map((student) => (
                        <div
                          key={student.student_id}
                          className="p-3 rounded-lg bg-muted/50 border border-border"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-body-sm flex-shrink-0">
                              {getInitials(student.name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-body-sm font-medium text-foreground">
                                {student.name}
                              </p>
                              <div className="flex flex-col gap-1 mt-1">
                                <p className="text-caption text-muted-foreground">
                                  Joined on: {new Date(student.joined_at).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </p>
                                <p className="text-caption text-muted-foreground">
                                  Skill: {student.skill}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-12 mt-4">
                    <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-body-sm text-muted-foreground">
                      No students joined in this month
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

          {/* Weekly Schedule */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2 mb-1">
                  <Clock className="h-5 w-5 text-accent" />
                  Weekly Schedule
                </CardTitle>
                <p className="text-body-sm text-muted-foreground mb-4">
                  Your sessions scheduled for this week
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={prevDay}
                    className="h-9 w-9"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-body font-semibold text-foreground min-w-[200px] text-center">
                    {formatCurrentDay()}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={nextDay}
                    className="h-9 w-9"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {weeklyScheduleLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                  {(() => {
                    const currentDay = getCurrentDay();
                    const daySessions = currentDay.sessions || [];
                    return timeSlots.map((slot, slotIndex) => {
                      const session = getSessionForSlot(daySessions, slot.start, slot.end);
                      return (
                        <div
                          key={slotIndex}
                          className="flex items-start gap-4 p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                        >
                          <div className="w-24 flex-shrink-0">
                            <span className="text-body-sm font-medium text-foreground">
                              {slot.display}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            {session ? (
                              <div className="p-2 rounded bg-primary/10 border border-primary/20">
                                <p className="text-body-sm font-semibold text-foreground">
                                  {session.skill}
                                </p>
                                <p className="text-caption text-muted-foreground mt-1">
                                  Student: {session.student}
                                </p>
                              </div>
                            ) : (
                              <p className="text-caption text-muted-foreground italic">
                                No session
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row: Course Distribution | Top Performers | Quick Stats */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Course Distribution - Flip Card */}
          <div className="relative min-h-[280px]" style={{ perspective: "1000px" }}>
            <div
              className="relative w-full h-full transition-transform duration-300"
              style={{
                transformStyle: "preserve-3d",
                transform: isCourseDistributionFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* Front Side */}
              <Card
                className="absolute inset-0 w-full h-full"
                style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
              >
                <CardHeader className="relative">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Course Distribution
              </CardTitle>
                  <button
                    onClick={() => setIsCourseDistributionFlipped(!isCourseDistributionFlipped)}
                    className="absolute top-2 right-2 cursor-pointer hover:opacity-70 transition-opacity z-10"
                    aria-label="Flip card"
                  >
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {courseDistribution.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-8">
                        No course distribution data available
                      </p>
                    ) : (
                      courseDistribution.map((course, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-foreground font-medium">
                              {course.course}
                            </span>
                            <span className="text-muted-foreground">
                              {course.count} students ({course.percentage}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                              style={{ width: `${course.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
              {/* Back Side */}
              <Card
                className="absolute inset-0 w-full h-full"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <CardHeader className="relative">
                  <button
                    onClick={() => setIsCourseDistributionFlipped(!isCourseDistributionFlipped)}
                    className="absolute top-2 right-2 cursor-pointer hover:opacity-70 transition-opacity z-10"
                    aria-label="Flip card"
                  >
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </button>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-full px-3 py-1">
                  <p className="text-[11px] text-foreground text-center leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
                    This shows the distribution of your students across different courses or degree programs. Each course displays the number of enrolled students and their percentage of your total student base.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Top Performers - Flip Card */}
          <div className="relative min-h-[280px]" style={{ perspective: "1000px" }}>
            <div
              className="relative w-full h-full transition-transform duration-300"
              style={{
                transformStyle: "preserve-3d",
                transform: isTopPerformersFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* Front Side */}
              <Card
                className="absolute inset-0 w-full h-full"
                style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
              >
                <CardHeader className="relative">
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-warning" />
                Top Performers
              </CardTitle>
                  <button
                    onClick={() => setIsTopPerformersFlipped(!isTopPerformersFlipped)}
                    className="absolute top-2 right-2 cursor-pointer hover:opacity-70 transition-opacity z-10"
                    aria-label="Flip card"
                  >
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {topStudents.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        No top performers yet
                      </p>
                    ) : (
                      topStudents.map((student) => (
                        <div
                          key={student.id}
                          className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                        >
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-semibold text-body-sm">
                              {getInitials(student.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-xs font-medium text-foreground">
                              {student.name}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[10px] text-muted-foreground">
                                {student.progress}% progress
                              </span>
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Star className="h-3 w-3 fill-warning text-warning" />
                                {student.rating.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
              {/* Back Side */}
              <Card
                className="absolute inset-0 w-full h-full"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <CardHeader className="relative">
                  <button
                    onClick={() => setIsTopPerformersFlipped(!isTopPerformersFlipped)}
                    className="absolute top-2 right-2 cursor-pointer hover:opacity-70 transition-opacity z-10"
                    aria-label="Flip card"
                  >
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </button>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-full px-3 py-1">
                  <p className="text-[11px] text-foreground text-center leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
                    This displays your top-performing students ranked by their session completion progress and overall engagement. Progress is calculated based on completed sessions versus total scheduled sessions.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Quick Stats - Flip Card */}
          <div className="relative min-h-[280px]" style={{ perspective: "1000px" }}>
            <div
              className="relative w-full h-full transition-transform duration-300"
              style={{
                transformStyle: "preserve-3d",
                transform: isQuickStatsFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* Front Side */}
              <Card
                className="absolute inset-0 w-full h-full"
                style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
              >
                <CardHeader className="relative">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-accent" />
                Quick Stats
              </CardTitle>
                  <button
                    onClick={() => setIsQuickStatsFlipped(!isQuickStatsFlipped)}
                    className="absolute top-2 right-2 cursor-pointer hover:opacity-70 transition-opacity z-10"
                    aria-label="Flip card"
                  >
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <span className="text-xs text-muted-foreground">
                        Active Students
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {quickStats.activeStudents}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <span className="text-xs text-muted-foreground">
                        Completed Reviews
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {quickStats.completedReviews}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <span className="text-xs text-muted-foreground">
                        Average Session Duration
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {quickStats.avgSessionDuration}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <span className="text-xs text-muted-foreground">
                        Student Satisfaction
                      </span>
                      <span className="text-sm font-semibold text-success">
                        {quickStats.studentSatisfaction}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* Back Side */}
              <Card
                className="absolute inset-0 w-full h-full"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <CardHeader className="relative">
                  <button
                    onClick={() => setIsQuickStatsFlipped(!isQuickStatsFlipped)}
                    className="absolute top-2 right-2 cursor-pointer hover:opacity-70 transition-opacity z-10"
                    aria-label="Flip card"
                  >
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </button>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-full px-3 py-1">
                  <p className="text-[11px] text-foreground text-center leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
                    Quick Stats provides a snapshot of your mentorship activity: Active Students (with ongoing sessions), Completed Reviews (assignments, cover letters, resumes), Average Session Duration, and Student Satisfaction (based on your overall rating).
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}




