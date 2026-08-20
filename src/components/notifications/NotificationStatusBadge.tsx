import React from "react";
import type { NotificationItem } from "../../types";
import { useTranslation } from "../../context/LocaleContext";
import { getVetDecisionStatus, getVetStatusLabel } from "../../utils/notificationDisplay";

interface NotificationStatusBadgeProps {
  notification: NotificationItem;
  compact?: boolean;
}

export const NotificationStatusBadge: React.FC<NotificationStatusBadgeProps> = ({
  notification,
  compact = false,
}) => {
  const { t } = useTranslation();
  const status = getVetDecisionStatus(notification);
  if (!status) return null;

  return (
    <span className={`notif-vet-status notif-vet-status-${status}${compact ? " compact" : ""}`}>
      {getVetStatusLabel(status, t)}
    </span>
  );
};
