/**
 * Auth Controller
 * Handles HTTP requests for authentication
 * This controller can be used for additional auth operations
 */
import { Request, Response } from "express";

export class AuthController {
  /**
   * GET /api/auth/me
   * Get current user information
   */
  async getCurrentUser(req: any, res: Response): Promise<void> {
    try {
      // User is attached by auth middleware
      if (!req.user) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      res.json({ user: req.user });
    } catch (error) {
      console.error("[AuthController] Error:", error);
      res.status(500).json({
        error: "Failed to fetch user information.",
      });
    }
  }
}

export const authController = new AuthController();





