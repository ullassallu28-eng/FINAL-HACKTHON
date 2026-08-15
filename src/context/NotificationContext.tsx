import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { NotificationItem } from "../types";
import { notificationService } from "../services/api";
import { useAuth } from "./AuthContext";
import { NotificationToast } from "../components/notifications/NotificationToast";
import { pickVetDecisionNotification } from "../utils/notificationDisplay";

const NOTIFICATION_POLL_MS = 15_000;

export const NOTIFICATIONS_UPDATED_EVENT = "agrisentinel:notifications-updated";

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  markAsRead: (id: string) => Promise<void>;
  refreshNotifications: (force?: boolean) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toastNotification, setToastNotification] = useState<NotificationItem | null>(null);
  const initialLoadDone = useRef(false);

  const fetchNotifications = useCallback(async (force = false) => {
    try {
      const items = await notificationService.getNotifications(role, { force });
      setNotifications((prev) => {
        if (!initialLoadDone.current) {
          initialLoadDone.current = true;
          return items;
        }

        const prevIds = new Set(prev.map((n) => n.id));
        const newlyArrived = items.filter((n) => !prevIds.has(n.id));
        if (newlyArrived.length > 0) {
          const toastTarget =
            pickVetDecisionNotification(newlyArrived) ?? newlyArrived[0];
          setToastNotification(toastTarget);
          window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT));
        }
        return items;
      });
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  }, [role]);

  useEffect(() => {
    initialLoadDone.current = false;
    void fetchNotifications(true);
  }, [fetchNotifications]);

  useEffect(() => {
    const poll = () => {
      if (document.visibilityState === "visible") {
        void fetchNotifications(true);
      }
    };
    const interval = window.setInterval(poll, NOTIFICATION_POLL_MS);
    return () => window.clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    await notificationService.markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      isDrawerOpen,
      setIsDrawerOpen,
      markAsRead,
      refreshNotifications: fetchNotifications,
    }),
    [notifications, unreadCount, isDrawerOpen, markAsRead, fetchNotifications]
  );

  const openDrawerFromToast = useCallback(() => {
    setToastNotification(null);
    void fetchNotifications(true);
    setIsDrawerOpen(true);
  }, [fetchNotifications]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationToast
        notification={toastNotification}
        onDismiss={() => setToastNotification(null)}
        onOpen={openDrawerFromToast}
      />
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};
