import { useState, useEffect, useRef } from "react";
import { Bell, Clock, User, Star, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { getAuthToken } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  related_id?: string;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Removed auto-mark-as-read on open - user can manually clear notifications

  const loadNotifications = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      // Fetch notifications and unread count in parallel
      const [notificationsRes, unreadCountRes] = await Promise.all([
        fetch(`${API_URL}/notifications`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${API_URL}/notifications/unread-count`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      if (notificationsRes.ok) {
        const data = await notificationsRes.json();
        setNotifications(data || []);
      }

      if (unreadCountRes.ok) {
        const countData = await unreadCountRes.json();
        setUnreadCount(countData.count || 0);
      } else {
        // Fallback: calculate from notifications if unread-count endpoint fails
        const data = await notificationsRes.json();
        setUnreadCount((data || []).filter((n: Notification) => !n.is_read).length);
      }
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/notifications/read-all`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Update local state
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, is_read: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
    }
  };

  const clearAllNotifications = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/notifications/clear-all`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Clear all notifications from local state
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Failed to clear notifications:", error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if not already
    if (!notification.is_read) {
      fetch(`${API_URL}/notifications/${notification.id}/read`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });
    }

    // Navigate based on notification type
    if (notification.type === "session_request") {
      navigate("/mentor/students?tab=requests");
    } else if (notification.type === "session_starting_soon" && notification.related_id) {
      navigate(`/mentor/sessions/${notification.related_id}`);
    } else if (notification.type === "new_review_received") {
      navigate("/mentor/reviews");
    }
    
    setIsOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "session_request":
        return <User className="h-4 w-4" />;
      case "session_starting_soon":
        return <Clock className="h-4 w-4" />;
      case "new_review_received":
        return <Star className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString();
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative",
            isOpen && "text-yellow-600 dark:text-yellow-500" // GOLD color when open
          )}
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <div className="p-2">
          <div className="flex items-center justify-between mb-2 px-2">
            <div className="text-sm font-semibold">Notifications</div>
            {notifications.length > 0 && unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  markAllAsRead();
                }}
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all as read
              </Button>
            )}
          </div>
          {notifications.length === 0 ? (
            <div className="text-sm text-muted-foreground px-2 py-4 text-center">
              No notifications
            </div>
          ) : (
            <>
              <div className="space-y-1">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      "flex items-start gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted transition-colors",
                      !notification.is_read && "bg-muted/50"
                    )}
                  >
                    <div className="mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTimeAgo(notification.created_at)}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
              {notifications.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearAllNotifications();
                    }}
                  >
                    <CheckCheck className="h-3 w-3 mr-1" />
                    Clear all notifications
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

