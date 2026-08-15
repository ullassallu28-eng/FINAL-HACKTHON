import React, { useEffect } from "react";
import { Bell, X, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import type { NotificationItem } from "../../types";
import { useTranslation } from "../../context/LocaleContext";
import {
  getVetDecisionStatus,
  translateNotificationMessage,
  translateNotificationTitle,
} from "../../utils/notificationDisplay";
import { NotificationStatusBadge } from "./NotificationStatusBadge";

interface NotificationToastProps {
  notification: NotificationItem | null;
  onDismiss: () => void;
  onOpen: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onDismiss,
  onOpen,
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (!notification) return;
    const timer = window.setTimeout(onDismiss, 10000);
    return () => window.clearTimeout(timer);
  }, [notification, onDismiss]);

  if (!notification) return null;

  const vetStatus = getVetDecisionStatus(notification);
  const toastClass = vetStatus ? ` notification-toast-${vetStatus}` : "";

  return (
    <div className={`notification-toast${toastClass}`} role="alert" aria-live="polite">
      <button type="button" className="notification-toast-body" onClick={onOpen}>
        <span className={`notification-toast-icon${vetStatus ? ` vet-${vetStatus}` : ""}`}>
          {vetStatus === "confirmed" ? (
            <CheckCircle2 size={18} />
          ) : vetStatus === "rejected" ? (
            <XCircle size={18} />
          ) : vetStatus === "more_info" ? (
            <HelpCircle size={18} />
          ) : (
            <Bell size={18} />
          )}
        </span>
        <span className="notification-toast-text">
          <NotificationStatusBadge notification={notification} />
          <strong>{translateNotificationTitle(notification.title, t)}</strong>
          <span>{translateNotificationMessage(notification.message, t)}</span>
        </span>
      </button>
      <button
        type="button"
        className="notification-toast-close"
        onClick={onDismiss}
        aria-label={t("common.close")}
      >
        <X size={16} />
      </button>
    </div>
  );
};
