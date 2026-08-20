import React, { useEffect } from "react";
import { X, Bell, ShieldAlert, CheckCircle2, XCircle, HelpCircle, Calendar, AlertTriangle } from "lucide-react";
import { useNotifications } from "../../context/NotificationContext";
import { useTranslation } from "../../context/LocaleContext";
import {
  translateNotificationMessage,
  translateNotificationTitle,
  getVetDecisionStatus,
} from "../../utils/notificationDisplay";
import { NotificationStatusBadge } from "./NotificationStatusBadge";

function NotificationTypeIcon({ type, vetStatus }: { type: string; vetStatus: ReturnType<typeof getVetDecisionStatus> }) {
  if (vetStatus === "confirmed") return <CheckCircle2 size={16} />;
  if (vetStatus === "rejected") return <XCircle size={16} />;
  if (vetStatus === "more_info") return <HelpCircle size={16} />;
  if (type === "incident") return <ShieldAlert size={16} />;
  if (type === "verification" || type === "evidence") return <CheckCircle2 size={16} />;
  if (type === "inspection") return <Calendar size={16} />;
  return <AlertTriangle size={16} />;
}

export const NotificationCenter: React.FC = () => {
  const { notifications, isDrawerOpen, setIsDrawerOpen, markAsRead, refreshNotifications } =
    useNotifications();
  const { t } = useTranslation();

  useEffect(() => {
    if (isDrawerOpen) {
      void refreshNotifications(true);
    }
  }, [isDrawerOpen, refreshNotifications]);

  if (!isDrawerOpen) return null;

  return (
    <>
      <div className="drawer-backdrop" onClick={() => setIsDrawerOpen(false)} />
      <aside className="notification-drawer">
        <div className="drawer-header">
          <div className="header-title-row">
            <Bell size={20} className="bell-icon" />
            <h3>{t("notification.title")}</h3>
          </div>
          <button className="drawer-close-btn" onClick={() => setIsDrawerOpen(false)} aria-label={t("common.close")}>
            <X size={20} />
          </button>
        </div>
        <div className="notifications-list">
          {notifications.length === 0 ? (
            <div className="empty-notif">{t("notification.empty")}</div>
          ) : (
            notifications.map((n) => {
              const vetStatus = getVetDecisionStatus(n);
              return (
                <div
                  key={n.id}
                  className={`notif-card ${!n.read ? "unread" : ""}${vetStatus ? ` notif-card-${vetStatus}` : ""}`}
                  onClick={() => markAsRead(n.id)}
                >
                  <div className="notif-top">
                    <div className={`notif-type-icon type-${n.type}${vetStatus ? ` vet-${vetStatus}` : ""}`}>
                      <NotificationTypeIcon type={n.type} vetStatus={vetStatus} />
                    </div>
                    <div className="notif-title-block">
                      <NotificationStatusBadge notification={n} />
                      <strong className="notif-title">{translateNotificationTitle(n.title, t)}</strong>
                    </div>
                    <span className="notif-time">{n.timestamp}</span>
                  </div>
                  <p className="notif-message">{translateNotificationMessage(n.message, t)}</p>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
};
