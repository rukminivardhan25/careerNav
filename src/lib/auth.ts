/**
 * Authentication utility functions
 */

export interface User {
  id: string
  email: string
  name: string
  role: "student" | "mentor"
  [key: string]: any
}

/**
 * Get the authentication token from localStorage
 */
export function getAuthToken(): string | null {
  return localStorage.getItem("authToken")
}

/**
 * Get the current user data from localStorage
 */
export function getCurrentUser(): User | null {
  const userStr = localStorage.getItem("user")
  if (!userStr) return null
  
  try {
    return JSON.parse(userStr)
  } catch (e) {
    console.error("Failed to parse user data:", e)
    return null
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getAuthToken() !== null
}

/**
 * Store authentication data
 */
export function setAuthData(token: string, user: User): void {
  localStorage.setItem("authToken", token)
  localStorage.setItem("user", JSON.stringify(user))
}

/**
 * Clear authentication data (logout)
 */
export function clearAuthData(): void {
  localStorage.removeItem("authToken")
  localStorage.removeItem("user")
  // Optionally clear role as well
  // localStorage.removeItem("role")
}

/**
 * Get user role from localStorage or user data
 */
export function getUserRole(): "student" | "mentor" | null {
  const role = localStorage.getItem("role")
  if (role === "student" || role === "mentor") {
    return role
  }
  
  const user = getCurrentUser()
  return user?.role || null
}

