/**
 * Notification routes
 */
import express from "express";
import { authenticateToken } from "../middlewares/auth.middleware";
import { notificationService } from "../services/notification.service";

const router = express.Router();

/**
 * GET /api/notifications
 * Get user notifications
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const unreadOnly = req.query.unreadOnly === "true";

    const notifications = await notificationService.getNotifications(
      userId,
      unreadOnly
    );

    res.json(notifications);
  } catch (error: any) {
    console.error("[Notifications] Error:", error);
    res.status(500).json({
      error: "Failed to fetch notifications",
      message: error?.message || "Internal server error",
    });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get unread notification count
 */
router.get("/unread-count", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const count = await notificationService.getUnreadCount(userId);

    res.json({ count });
  } catch (error: any) {
    console.error("[Notifications] Error:", error);
    res.status(500).json({
      error: "Failed to fetch unread count",
      message: error?.message || "Internal server error",
    });
  }
});

/**
 * POST /api/notifications/:id/read
 * Mark notification as read
 */
router.post("/:id/read", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const notificationId = parseInt(req.params.id);

    await notificationService.markAsRead(notificationId, userId);

    res.json({ success: true });
  } catch (error: any) {
    console.error("[Notifications] Error:", error);
    res.status(500).json({
      error: "Failed to mark notification as read",
      message: error?.message || "Internal server error",
    });
  }
});

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read
 */
router.post("/read-all", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    await notificationService.markAllAsRead(userId);

    res.json({ success: true });
  } catch (error: any) {
    console.error("[Notifications] Error:", error);
    res.status(500).json({
      error: "Failed to mark all notifications as read",
      message: error?.message || "Internal server error",
    });
  }
});

/**
 * DELETE /api/notifications/clear-all
 * Delete all notifications for the user
 */
router.delete("/clear-all", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    await notificationService.deleteAllNotifications(userId);

    res.json({ success: true });
  } catch (error: any) {
    console.error("[Notifications] Error:", error);
    res.status(500).json({
      error: "Failed to clear notifications",
      message: error?.message || "Internal server error",
    });
  }
});

export default router;

