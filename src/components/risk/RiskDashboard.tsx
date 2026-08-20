import React from "react";
import { Info } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/LocaleContext";
import { translateData } from "../../i18n/dataTranslations";
import { StatusBadge } from "../common/StatusBadge";
import { ScoreHistoryPanel } from "../farmer/ScoreHistoryPanel";

function riskLabel(level: string, t: (k: string) => string): string {
  if (level === "safe" || level === "low") return t("status.risk.safe");
  if (level === "caution" || level === "medium") return t("status.risk.caution");
  if (level === "critical" || level === "high") return t("status.risk.critical");
  return level.toUpperCase();
}

export const RiskDashboard: React.FC = () => {
  const { activeFarm } = useAuth();
  const { t, locale } = useTranslation();

  return (
    <div className="risk-dashboard-view">
      <div className="risk-header-card">
        <div>
          <span className="eyebrow-text">{t("risk.eyebrow")}</span>
          <h2 className="view-title">{t("risk.title")}</h2>
          <p className="view-subtitle">
            {t("risk.farmLabel")}: <strong>{translateData(activeFarm.name, locale)}</strong> ({activeFarm.id}) • {t("risk.typeLabel")}:{" "}
            <strong>{activeFarm.farmType === "poultry"
              ? t("status.farmType.poultry")
              : activeFarm.farmType === "pig"
              ? t("status.farmType.pig")
              : t("status.farmType.mixed")}</strong>
          </p>
        </div>
        <StatusBadge type="risk" value={activeFarm.riskLevel} size="lg" />
      </div>

      <div className="risk-gauge-panel">
        <div className="gauge-score-display">
          <div className="score-ring-circle">
            <span className="score-ring-number">{activeFarm.biosecurityScore}</span>
            <span className="score-ring-denom">/100</span>
          </div>
          <div className="gauge-text-info">
            <h3 className="gauge-status-title">
              {t("risk.currentLevel")}:{" "}
              <strong className="text-emerald">{riskLabel(activeFarm.riskLevel, t)}</strong>
            </h3>
            <p className="gauge-status-desc">{t("risk.dataSource")}</p>
          </div>
        </div>
      </div>

      <ScoreHistoryPanel />

      <div className="risk-disclaimer-box">
        <Info size={20} className="disclaimer-icon" />
        <div>
          <strong>{t("risk.disclaimerTitle")}</strong>
          <p>{t("risk.dataSource")}</p>
        </div>
      </div>
    </div>
  );
};
