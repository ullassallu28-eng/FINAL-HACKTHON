import React from "react";
import {
  LayoutDashboard,
  FileBadge,
  AlertTriangle,
  ShieldAlert,
  CheckSquare,
  MapPin,
  Target,
  X,
} from "lucide-react";
import type { NavTab } from "./Sidebar";
import { useTranslation } from "../../context/LocaleContext";
import { LanguageSelector } from "./LanguageSelector";
import { useAuth } from "../../context/AuthContext";

interface MobileNavProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenPassport: () => void;
  onOpenReportIncident: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  onClose,
  onOpenPassport,
  onOpenReportIncident,
}) => {
  const { t } = useTranslation();
  const { role } = useAuth();

  return (
    <>
      {isOpen && <div className="mobile-drawer-backdrop" onClick={onClose} />}

      <div className={`mobile-drawer ${isOpen ? "open" : ""}`}>
        <div className="mobile-drawer-header">
          <div>
            <h3 className="drawer-title">{t("app.name")}</h3>
            <span className="drawer-sub">{t("app.tagline")}</span>
          </div>
          <button className="drawer-close-btn" onClick={onClose} aria-label="Close drawer">
            <X size={20} />
          </button>
        </div>

        {role === "farmer" && (
          <div className="mobile-drawer-language">
            <LanguageSelector />
          </div>
        )}

        <div className="mobile-drawer-menu">
          <button
            className={`drawer-item ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("overview");
              onClose();
            }}
          >
            <LayoutDashboard size={20} />
            <span>{t("nav.dashboard")}</span>
          </button>

          {role === "farmer" && (
            <button
              className={`drawer-item ${activeTab === "action-center" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("action-center");
                onClose();
              }}
            >
              <Target size={20} />
              <span>{t("nav.actionCenter")}</span>
            </button>
          )}

          <button
            className={`drawer-item ${activeTab === "passport" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("passport");
              onOpenPassport();
              onClose();
            }}
          >
            <FileBadge size={20} />
            <span>{t("nav.passport")}</span>
          </button>

          <button
            className={`drawer-item ${activeTab === "risk" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("risk");
              onClose();
            }}
          >
            <AlertTriangle size={20} />
            <span>{t("nav.risk")}</span>
          </button>

          <button
            className={`drawer-item ${activeTab === "incident" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("incident");
              onClose();
            }}
          >
            <ShieldAlert size={20} />
            <span>{t("nav.incident")}</span>
          </button>

          <button
            className={`drawer-item ${activeTab === "actions" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("actions");
              onClose();
            }}
          >
            <CheckSquare size={20} />
            <span>{t("nav.actions")}</span>
          </button>

          <button
            className={`drawer-item ${activeTab === "gis" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("gis");
              onClose();
            }}
          >
            <MapPin size={20} />
            <span>{t("nav.gis")}</span>
          </button>
        </div>

        <div className="mobile-drawer-footer">
          <button
            className="btn-primary-action w-full"
            onClick={() => {
              onOpenReportIncident();
              onClose();
            }}
          >
            + {t("dashboard.reportIncident")}
          </button>
        </div>
      </div>

      <div className="mobile-bottom-bar">
        <button
          className={`bottom-bar-item ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <LayoutDashboard size={20} />
          <span>{t("nav.home")}</span>
        </button>

        {role === "farmer" && (
          <button
            className={`bottom-bar-item ${activeTab === "action-center" ? "active" : ""}`}
            onClick={() => setActiveTab("action-center")}
          >
            <Target size={20} />
            <span>{t("nav.actionCenter")}</span>
          </button>
        )}

        <button
          className={`bottom-bar-item ${activeTab === "passport" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("passport");
            onOpenPassport();
          }}
        >
          <FileBadge size={20} />
          <span>{t("nav.passport")}</span>
        </button>

        <button className="bottom-bar-item highlight-btn" onClick={onOpenReportIncident}>
          <ShieldAlert size={22} />
          <span>{t("nav.report")}</span>
        </button>

        <button
          className={`bottom-bar-item ${activeTab === "actions" ? "active" : ""}`}
          onClick={() => setActiveTab("actions")}
        >
          <CheckSquare size={20} />
          <span>{t("nav.actions")}</span>
        </button>
      </div>
    </>
  );
};
