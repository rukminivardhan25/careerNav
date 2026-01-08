import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StreakCalendarProps {
  activities: string[]; // Array of dates in YYYY-MM-DD format
  currentStreak: number;
}

export function StreakCalendar({ activities, currentStreak }: StreakCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthActivities, setMonthActivities] = useState<Set<string>>(new Set());

  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Filter activities for current month
    const monthSet = new Set<string>();
    activities.forEach((date) => {
      const activityDate = new Date(date);
      if (
        activityDate.getFullYear() === year &&
        activityDate.getMonth() === month
      ) {
        monthSet.add(date);
      }
    });
    setMonthActivities(monthSet);
  }, [currentDate, activities]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" });
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const isActive = (day: number): boolean => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    // Check if this day is in the activities (don't assume today is active)
    return monthActivities.has(dateStr);
  };

  const isMissed = (day: number): boolean => {
    // A day is "missed" if:
    // 1. It's not today (future days are not "missed", they're just upcoming)
    // 2. It's in the past (before today)
    // 3. It's not active (not in activities)
    if (isToday(day)) {
      return false; // Today is never "missed" - it's either active or upcoming
    }
    
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayDate = new Date(year, month, day);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    
    // If it's a past day and not active, it's missed
    if (dayDate < todayDate && !monthActivities.has(dateStr)) {
      return true;
    }
    
    return false;
  };

  const isFuture = (day: number): boolean => {
    if (isToday(day)) {
      return false;
    }
    const dayDate = new Date(year, month, day);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    return dayDate > todayDate;
  };

  const isToday = (day: number): boolean => {
    return (
      isCurrentMonth &&
      day === today.getDate() &&
      year === today.getFullYear() &&
      month === today.getMonth()
    );
  };

  return (
    <div className="space-y-3">
      {/* Streak Text */}
      <div className="flex items-center gap-2.5">
        <div className="p-2.5 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20">
          <Flame className="h-5 w-5 text-orange-500" />
        </div>
        <div>
          <p className="text-body-sm text-muted-foreground mb-0.5">Current Streak</p>
          <p className="text-3xl font-bold text-foreground">
            {currentStreak} Days 🔥
          </p>
        </div>
      </div>

      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={goToPreviousMonth}
          className="h-7 w-7 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-body font-semibold text-foreground capitalize">
          {monthName}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={goToNextMonth}
          className="h-7 w-7 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
          <div
            key={idx}
            className="text-center text-caption text-muted-foreground py-1"
          >
            {day}
          </div>
        ))}

        {/* Empty cells for days before month starts */}
        {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
          <div key={`empty-${idx}`} className="aspect-square" />
        ))}

        {/* Days of the month */}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const day = idx + 1;
          const active = isActive(day);
          const missed = isMissed(day);
          const future = isFuture(day);
          const today = isToday(day);

          return (
            <div
              key={day}
              className={cn(
                "aspect-square rounded transition-all duration-200",
                active
                  ? "bg-[#22c55e] hover:bg-[#16a34a]" // Green for attended
                  : missed
                  ? "bg-[#ef4444] hover:bg-[#dc2626]" // Red for missed
                  : future
                  ? "bg-muted/20 hover:bg-muted/40" // Grey for future
                  : "bg-muted/20 hover:bg-muted/40", // Default grey
                today && "ring-2 ring-primary ring-offset-1" // Blue border for today
              )}
              title={
                active
                  ? `Attended on ${monthName} ${day}`
                  : missed
                  ? `Missed on ${monthName} ${day}`
                  : future
                  ? `Upcoming: ${monthName} ${day}`
                  : undefined
              }
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 pt-2 pb-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[#22c55e]" />
          <span className="text-caption text-muted-foreground">Attended</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[#ef4444]" />
          <span className="text-caption text-muted-foreground">Missed</span>
        </div>
      </div>

      {/* Static Helper Text */}
      <p className="text-body-sm text-muted-foreground text-center pt-1">
        Stay consistent to build your streak 🔥
      </p>
    </div>
  );
}

