/**
 * IST (Asia/Kolkata) Time Utility
 * Provides time handling functions that work in IST timezone
 * Database timestamps remain in UTC, but all business logic uses IST
 * 
 * Key principle: Date objects are always UTC internally.
 * We create UTC Dates that represent IST moments, then compare UTC timestamps.
 */

const IST_TIMEZONE = "Asia/Kolkata";
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30

/**
 * Get current IST time as a Date object
 * Returns a Date object representing the current moment in IST timezone
 * This creates a UTC Date object that represents the current IST time
 * Use this for all business logic comparisons
 */
export function getISTNow(): Date {
  const now = new Date();
  
  // Get IST time components
  const istFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  
  const parts = istFormatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === "year")?.value || "0");
  const month = parseInt(parts.find(p => p.type === "month")?.value || "0");
  const day = parseInt(parts.find(p => p.type === "day")?.value || "0");
  const hour = parseInt(parts.find(p => p.type === "hour")?.value || "0");
  const minute = parseInt(parts.find(p => p.type === "minute")?.value || "0");
  const second = parseInt(parts.find(p => p.type === "second")?.value || "0");
  
  // Create IST datetime string and parse as UTC Date
  const istDateString = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}+05:30`;
  return new Date(istDateString);
}

/**
 * Convert IST Date to UTC Date for database queries
 * When querying DB with UTC timestamps, convert IST boundaries to UTC
 */
export function istToUTC(istDate: Date): Date {
  // IST is UTC+5:30, so subtract 5.5 hours to get UTC
  return new Date(istDate.getTime() - 5.5 * 60 * 60 * 1000);
}

/**
 * Convert UTC Date to IST Date
 * When reading from DB, convert UTC to IST for comparisons
 */
export function utcToIST(utcDate: Date): Date {
  // IST is UTC+5:30, so add 5.5 hours to get IST
  return new Date(utcDate.getTime() + 5.5 * 60 * 60 * 1000);
}

/**
 * Get start of today (midnight 00:00:00) in IST as a UTC Date
 * Returns a Date object that, when interpreted in IST, represents today's start
 */
export function getISTTodayStart(): Date {
  const now = new Date();
  
  // Get IST date components (year, month, day) for "now"
  const istFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  
  const parts = istFormatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === "year")?.value || "0");
  const month = parseInt(parts.find(p => p.type === "month")?.value || "0") - 1; // 0-indexed
  const day = parseInt(parts.find(p => p.type === "day")?.value || "0");
  
  // Create a date string representing IST midnight and parse it
  // Format: "YYYY-MM-DDTHH:mm:ss+05:30" for IST
  const istMidnightString = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00+05:30`;
  const istMidnightUTC = new Date(istMidnightString);
  
  return istMidnightUTC;
}

/**
 * Get end of today (23:59:59.999) in IST as a UTC Date
 */
export function getISTTodayEnd(): Date {
  const todayStart = getISTTodayStart();
  return new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
}

/**
 * Get IST date components (year, month, day) from a UTC Date
 */
export function getISTDateComponents(date: Date): { year: number; month: number; day: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  
  const parts = formatter.formatToParts(date);
  return {
    year: parseInt(parts.find(p => p.type === "year")?.value || "0"),
    month: parseInt(parts.find(p => p.type === "month")?.value || "0"),
    day: parseInt(parts.find(p => p.type === "day")?.value || "0"),
  };
}

/**
 * Check if a UTC date from database is "today" in IST
 */
export function isISTToday(utcDate: Date): boolean {
  const istTodayStart = getISTTodayStart();
  const istTodayEnd = getISTTodayEnd();
  
  // Compare UTC timestamps directly
  return utcDate >= istTodayStart && utcDate <= istTodayEnd;
}

/**
 * Get IST time string for a Date (for display/logging)
 */
export function getISTTimeString(date: Date): string {
  return date.toLocaleString("en-US", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/**
 * Create a Date object representing a specific IST date/time
 * @param year - IST year
 * @param month - IST month (1-12)
 * @param day - IST day
 * @param hour - IST hour (0-23)
 * @param minute - IST minute (0-59)
 */
export function createISTDate(year: number, month: number, day: number, hour: number = 0, minute: number = 0): Date {
  // Create date string in IST format and parse it
  const dateString = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:30`;
  return new Date(dateString);
}

/**
 * Get IST hour, minute, second from a UTC Date
 */
export function getISTTimeComponents(date: Date): { hour: number; minute: number; second: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: IST_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  
  const parts = formatter.formatToParts(date);
  return {
    hour: parseInt(parts.find(p => p.type === "hour")?.value || "0"),
    minute: parseInt(parts.find(p => p.type === "minute")?.value || "0"),
    second: parseInt(parts.find(p => p.type === "second")?.value || "0"),
  };
}

/**
 * Create IST datetime from a scheduled_date (Date) and scheduled_time (string like "14:00")
 * This properly constructs an IST datetime without timezone conversion issues
 */
export function createISTDateTimeFromSchedule(scheduledDate: Date, scheduledTime: string): Date {
  // Get IST date components from scheduled_date
  const dateComponents = getISTDateComponents(scheduledDate);
  const [hours, minutes] = scheduledTime.split(':').map(Number);
  
  // Create IST datetime using the date components and time
  return createISTDate(
    dateComponents.year,
    dateComponents.month,
    dateComponents.day,
    hours || 0,
    minutes || 0
  );
}

