import React from "react";
import { useTranslation } from "../../context/LocaleContext";
import { translateContent } from "../../i18n/contentTranslate";

interface StatusBadgeProps {
  type: "risk" | "incident" | "action" | "farmType";
  value: string;
  size?: "sm" | "md" | "lg";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, value, size = "md" }) => {
  const { t } = useTranslation();
  const val = value.toLowerCase();

  let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200";
  let label = translateContent(value, t);

  if (type === "risk") {
    if (val === "safe" || val === "low") {
      badgeStyle = "badge-safe";
      label = t("status.risk.safe");
    } else if (val === "caution" || val === "medium") {
      badgeStyle = "badge-caution";
      label = t("status.risk.caution");
    } else if (val === "critical" || val === "high") {
      badgeStyle = "badge-critical";
      label = t("status.risk.critical");
    }
  } else if (type === "incident") {
    if (val === "reported") {
      badgeStyle = "badge-info";
      label = t("status.incident.reported");
    } else if (val === "under review") {
      badgeStyle = "badge-caution";
      label = t("status.incident.review");
    } else if (val === "verified") {
      badgeStyle = "badge-safe";
      label = t("status.incident.verified");
    } else if (val === "more info required") {
      badgeStyle = "badge-warning";
      label = t("status.incident.moreInfo");
    } else if (val === "rejected") {
      badgeStyle = "badge-muted";
      label = t("status.incident.rejected");
    }
  } else if (type === "action") {
    if (val === "pending") {
      badgeStyle = "badge-muted";
      label = t("status.action.pending");
    } else if (val === "in progress") {
      badgeStyle = "badge-info";
      label = t("status.action.inProgress");
    } else if (val === "evidence submitted") {
      badgeStyle = "badge-warning";
      label = t("status.action.evidenceSubmitted");
    } else if (val === "awaiting verification") {
      badgeStyle = "badge-caution";
      label = t("status.action.awaitingVerification");
    } else if (val === "verified" || val === "closed") {
      badgeStyle = "badge-safe";
      label = val === "closed" ? t("status.action.closed") : t("status.action.verified");
    }
  } else if (type === "farmType") {
    badgeStyle = "badge-farmtype";
    label =
      value === "poultry"
        ? t("status.farmType.poultry")
        : value === "pig"
        ? t("status.farmType.pig")
        : t("status.farmType.mixed");
  }

  const sizeClass = size === "sm" ? "badge-sm" : size === "lg" ? "badge-lg" : "badge-md";

  return <span className={`status-badge ${badgeStyle} ${sizeClass}`}>{label}</span>;
};
