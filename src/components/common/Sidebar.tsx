import React from "react";
import {
  LayoutDashboard,
  FileBadge,
  AlertTriangle,
  FileSpreadsheet,
  CheckSquare,
  MapPin,
  ShieldAlert,
  FileSearch,
  HelpCircle,
  Target,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/LocaleContext";

export type NavTab =
  | "overview"
  | "passport"
  | "risk"
  | "incident"
  | "actions"
  | "gis"
  | "officer"
  | "action-center"
  | "evidence-inspection";

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenPassport: () => void;
  onOpenReportIncident: () => void;
  onOpenAarohi?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenPassport,
  onOpenReportIncident,
  onOpenAarohi,
}) => {
  const { role } = useAuth();
  const { t } = useTranslation();

  return (
    <aside className="bioshield-sidebar">
      <div className="sidebar-role-indicator">
        <span className="role-label">{t("sidebar.activePortal")}</span>
        <strong className="role-name">
          {role === "farmer"
            ? t("app.portal.farmer")
            : role === "veterinarian"
            ? t("app.portal.vet")
            : t("app.portal.officer")}
        </strong>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`sidebar-link ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <LayoutDashboard size={18} />
          <span>{t("nav.dashboard")}</span>
        </button>

        {role === "farmer" && (
          <button
            className={`sidebar-link ${activeTab === "action-center" ? "active" : ""}`}
            onClick={() => setActiveTab("action-center")}
          >
            <Target size={18} />
            <span>{t("nav.actionCenter")}</span>
          </button>
        )}

        <button
          className={`sidebar-link ${activeTab === "passport" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("passport");
            onOpenPassport();
          }}
        >
          <FileBadge size={18} />
          <span>{t("nav.passport")}</span>
        </button>

        <button
          className={`sidebar-link ${activeTab === "risk" ? "active" : ""}`}
          onClick={() => setActiveTab("risk")}
        >
          <AlertTriangle size={18} />
          <span>{t("nav.risk")}</span>
        </button>

        <button
          className={`sidebar-link ${activeTab === "incident" ? "active" : ""}`}
          onClick={() => setActiveTab("incident")}
        >
          <ShieldAlert size={18} />
          <span>
            {role === "veterinarian" ? t("nav.incident.vet") : t("nav.incident")}
          </span>
        </button>

        {role === "veterinarian" && (
          <button
            className={`sidebar-link ${activeTab === "evidence-inspection" ? "active" : ""}`}
            onClick={() => setActiveTab("evidence-inspection")}
          >
            <FileSearch size={18} />
            <span>Evidence Inspection</span>
          </button>
        )}

        <button
          className={`sidebar-link ${activeTab === "actions" ? "active" : ""}`}
          onClick={() => setActiveTab("actions")}
        >
          <CheckSquare size={18} />
          <span>{t("nav.actions")}</span>
        </button>

        <button
          className={`sidebar-link ${activeTab === "gis" ? "active" : ""}`}
          onClick={() => setActiveTab("gis")}
        >
          <MapPin size={18} />
          <span>{t("nav.gis")}</span>
        </button>

        {(role === "officer" || role === "veterinarian") && (
          <button
            className={`sidebar-link ${activeTab === "officer" ? "active" : ""}`}
            onClick={() => setActiveTab("officer")}
          >
            <FileSpreadsheet size={18} />
            <span>{t("nav.officer")}</span>
          </button>
        )}
      </nav>

      {role === "farmer" && (
        <div className="sidebar-quick-actions">
          <p className="quick-action-title">{t("sidebar.quickActions")}</p>
          <button className="btn-primary-action" onClick={onOpenReportIncident}>
            + {t("dashboard.reportIncident")}
          </button>
          <button className="btn-secondary-action" onClick={onOpenPassport}>
            {t("dashboard.viewPassport")}
          </button>
        </div>
      )}

      <div
        className="sidebar-assistant"
        role="button"
        tabIndex={0}
        onClick={onOpenAarohi}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onOpenAarohi?.();
        }}
      >
        <div className="assistant-avatar">A</div>
        <div className="assistant-info">
          <strong>{t("sidebar.aarohiTitle")}</strong>
          <span>{t("sidebar.aarohiSub")}</span>
        </div>
        <HelpCircle size={16} className="assistant-help-icon" />
      </div>
    </aside>
  );
};
