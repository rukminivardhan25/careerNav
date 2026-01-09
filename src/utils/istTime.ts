/**
 * IST (Asia/Kolkata) Time Utility for Frontend
 * Provides time formatting functions that display times in IST timezone
 * All timestamps from backend are UTC, but we display them in IST
 */

const IST_TIMEZONE = "Asia/Kolkata";

/**
 * Format a UTC timestamp string to IST time string
 * @param timestamp - ISO string or Date object from backend (UTC)
 * @param options - Intl.DateTimeFormatOptions
 */
export function formatISTTime(
  timestamp: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }
): string {
  if (!timestamp) return "N/A";
  
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  if (isNaN(date.getTime())) return "Invalid Date";
  
  return date.toLocaleTimeString("en-US", {
    ...options,
    timeZone: IST_TIMEZONE,
  });
}

/**
 * Format a UTC timestamp string to IST date string
 * @param timestamp - ISO string or Date object from backend (UTC)
 * @param options - Intl.DateTimeFormatOptions
 */
export function formatISTDate(
  timestamp: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }
): string {
  if (!timestamp) return "N/A";
  
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  if (isNaN(date.getTime())) return "Invalid Date";
  
  return date.toLocaleDateString("en-US", {
    ...options,
    timeZone: IST_TIMEZONE,
  });
}

/**
 * Format a UTC timestamp string to IST date and time string
 * @param timestamp - ISO string or Date object from backend (UTC)
 * @param options - Intl.DateTimeFormatOptions
 */
export function formatISTDateTime(
  timestamp: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }
): string {
  if (!timestamp) return "N/A";
  
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  if (isNaN(date.getTime())) return "Invalid Date";
  
  return date.toLocaleString("en-US", {
    ...options,
    timeZone: IST_TIMEZONE,
  });
}

/**
 * Format a time string (HH:MM) from backend to IST time
 * Note: Time strings are already in the correct format, but we ensure IST context
 * @param timeString - Time string like "14:00"
 */
export function formatISTTimeFromString(timeString: string | null | undefined): string {
  if (!timeString) return "N/A";
  
  // Time strings are typically already in 24-hour format
  // We just need to format them for display in IST context
  try {
    const [hours, minutes] = timeString.split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes)) return timeString;
    
    // Create a date for today in IST, then format it
    const now = new Date();
    const istFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: IST_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    
    const parts = istFormatter.formatToParts(now);
    const year = parseInt(parts.find(p => p.type === "year")?.value || "0");
    const month = parseInt(parts.find(p => p.type === "month")?.value || "0") - 1;
    const day = parseInt(parts.find(p => p.type === "day")?.value || "0");
    
    // Create a date with the time in IST
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00+05:30`;
    const date = new Date(dateStr);
    
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: IST_TIMEZONE,
    });
  } catch (e) {
    return timeString;
  }
}

/**
 * Get relative time string in IST (e.g., "2 hours ago", "Yesterday")
 * @param timestamp - ISO string or Date object from backend (UTC)
 */
export function getISTRelativeTime(timestamp: string | Date | null | undefined): string {
  if (!timestamp) return "N/A";
  
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  if (isNaN(date.getTime())) return "Invalid Date";
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  // Format the date in IST for comparison
  const istDateStr = formatISTDate(date);
  const istTodayStr = formatISTDate(now);
  const istYesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const istYesterdayStr = formatISTDate(istYesterday);
  
  if (istDateStr === istTodayStr) {
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  }
  
  if (istDateStr === istYesterdayStr) {
    return `Yesterday, ${formatISTTime(date)}`;
  }
  
  if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  }
  
  return formatISTDateTime(date);
}

/**
 * Format date with relative time (e.g., "Today, 2:00 PM" or "Tomorrow, 10:00 AM")
 * @param timestamp - ISO string or Date object from backend (UTC)
 */
export function formatISTDateWithRelative(timestamp: string | Date | null | undefined): string {
  if (!timestamp) return "N/A";
  
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  if (isNaN(date.getTime())) return "Invalid Date";
  
  const now = new Date();
  const istDateStr = formatISTDate(date);
  const istTodayStr = formatISTDate(now);
  const istTomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const istTomorrowStr = formatISTDate(istTomorrow);
  
  if (istDateStr === istTodayStr) {
    return `Today, ${formatISTTime(date)}`;
  }
  
  if (istDateStr === istTomorrowStr) {
    return `Tomorrow, ${formatISTTime(date)}`;
  }
  
  return formatISTDateTime(date);
}



