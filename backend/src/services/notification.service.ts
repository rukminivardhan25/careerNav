/**
 * Notification Service
 * Handles user notifications for session requests, approvals, rejections
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class NotificationService {
  /**
   * Create a notification
   */
  async createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    relatedId?: string
  ): Promise<any> {
    try {
      const notification = await prisma.notifications.create({
        data: {
          user_id: userId,
          type,
          title,
          message,
          related_id: relatedId || null,
        },
      });

      return notification;
    } catch (error) {
      console.error("[NotificationService] createNotification error:", error);
      throw error;
    }
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(
    userId: string,
    unreadOnly: boolean = false
  ): Promise<any[]> {
    try {
      const where: any = { user_id: userId };
      if (unreadOnly) {
        where.is_read = false;
      }

      const notifications = await prisma.notifications.findMany({
        where,
        orderBy: {
          created_at: "desc",
        },
        take: 50, // Limit to 50 most recent
      });

      return notifications;
    } catch (error) {
      console.error("[NotificationService] getNotifications error:", error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: number, userId: string): Promise<void> {
    try {
      await prisma.notifications.updateMany({
        where: {
          id: notificationId,
          user_id: userId,
        },
        data: {
          is_read: true,
        },
      });
    } catch (error) {
      console.error("[NotificationService] markAsRead error:", error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      await prisma.notifications.updateMany({
        where: {
          user_id: userId,
          is_read: false,
        },
        data: {
          is_read: true,
        },
      });
    } catch (error) {
      console.error("[NotificationService] markAllAsRead error:", error);
      throw error;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const count = await prisma.notifications.count({
        where: {
          user_id: userId,
          is_read: false,
        },
      });

      return count;
    } catch (error) {
      console.error("[NotificationService] getUnreadCount error:", error);
      throw error;
    }
  }

  /**
   * Delete all notifications for a user
   */
  async deleteAllNotifications(userId: string): Promise<void> {
    try {
      await prisma.notifications.deleteMany({
        where: {
          user_id: userId,
        },
      });
    } catch (error) {
      console.error("[NotificationService] deleteAllNotifications error:", error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();

