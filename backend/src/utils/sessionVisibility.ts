/**
 * Session Visibility Utility
 * Handles time-based visibility rules for sessions
 */

import { SessionStatus } from "@prisma/client";

/**
 * Check if a session should be visible on dashboard based on time rules
 * 
 * Rules:
 * - sessionDate === today
 * - currentTime >= (startTime - 1 hour)
 * - currentTime < startTime
 * - status === "APPROVED" or "SCHEDULED" (UPCOMING)
 * 
 * @param sessionDate - The scheduled date of the session
 * @param startTime - The start time (DateTime combining date + time)
 * @param status - Current session status
 * @returns true if session should be visible
 */
export function shouldShowSessionOnDashboard(
  sessionDate: Date,
  startTime: Date,
  status: SessionStatus
): boolean {
  const now = new Date();
  
  // Check if session date is today
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sessionDay = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());
  
  if (sessionDay.getTime() !== today.getTime()) {
    return false; // Not today
  }

  // Check status - only show APPROVED or SCHEDULED
  if (status !== SessionStatus.APPROVED && status !== SessionStatus.SCHEDULED) {
    return false;
  }

  // Calculate 1 hour before start time
  const oneHourBefore = new Date(startTime);
  oneHourBefore.setHours(oneHourBefore.getHours() - 1);

  // Check time window: currentTime >= (startTime - 1 hour) AND currentTime < startTime
  if (now >= oneHourBefore && now < startTime) {
    return true;
  }

  // If session is ONGOING (after startTime), also show it
  if (now >= startTime && status === SessionStatus.SCHEDULED) {
    return true;
  }

  return false;
}

/**
 * Check if a session schedule item should be visible
 * Sessions before courseStartDate must NEVER appear
 * 
 * @param scheduledDate - The scheduled date of the session schedule item
 * @param courseStartDate - The course start date
 * @returns true if session should be visible
 */
export function shouldShowScheduleItem(
  scheduledDate: Date,
  courseStartDate: Date
): boolean {
  // Sessions before courseStartDate must NEVER appear
  const courseStart = new Date(courseStartDate);
  courseStart.setHours(0, 0, 0, 0);
  
  const scheduleDate = new Date(scheduledDate);
  scheduleDate.setHours(0, 0, 0, 0);
  
  return scheduleDate >= courseStart;
}

/**
 * Get the appropriate session status based on current time
 * 
 * @param sessionDate - The scheduled date
 * @param startTime - The start time (DateTime)
 * @param currentStatus - Current session status
 * @returns New status if transition needed, null if no change
 */
export function getSessionStatusTransition(
  sessionDate: Date,
  startTime: Date,
  currentStatus: SessionStatus
): SessionStatus | null {
  const now = new Date();
  
  // Check if session date is today
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sessionDay = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());
  
  if (sessionDay.getTime() !== today.getTime()) {
    return null; // Not today, no transition
  }

  // Calculate 1 hour before start time
  const oneHourBefore = new Date(startTime);
  oneHourBefore.setHours(oneHourBefore.getHours() - 1);

  // APPROVED → SCHEDULED (UPCOMING) when: currentTime >= (startTime - 1 hour) AND currentTime < startTime
  if (currentStatus === SessionStatus.APPROVED) {
    if (now >= oneHourBefore && now < startTime) {
      return SessionStatus.SCHEDULED; // UPCOMING
    }
  }

  // SCHEDULED status remains SCHEDULED even after startTime
  // The distinction between UPCOMING and ONGOING is made by time in visibility checks
  // No status change needed here - status stays SCHEDULED

  return null; // No transition needed
}

