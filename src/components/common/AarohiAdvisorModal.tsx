import React, { useEffect, useState } from "react";
import { X, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/LocaleContext";
import { translateContent } from "../../i18n/contentTranslate";
import { translateData } from "../../i18n/dataTranslations";
import { riskService } from "../../services/api";
import type { RiskFactor } from "../../types";

interface AarohiAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function riskLevelLabel(level: string, t: (key: string) => string): string {
  if (level === "safe") return t("status.risk.safe");
  if (level === "caution") return t("status.risk.caution");
  return t("status.risk.critical");
}

export const AarohiAdvisorModal: React.FC<AarohiAdvisorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { activeFarm } = useAuth();
  const { t, locale } = useTranslation();
  const [factors, setFactors] = useState<RiskFactor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    riskService
      .getRiskFactors(activeFarm.id)
      .then(setFactors)
      .catch(() => setFactors([]))
      .finally(() => setLoading(false));
  }, [isOpen, activeFarm.id]);

  if (!isOpen) return null;

  const topFactor = [...factors].sort(
    (a, b) => Math.abs(b.delta) - Math.abs(a.delta)
  )[0];

  const tips = topFactor
    ? [
        t("aarohi.tip.priority", {
          factor: translateContent(topFactor.label, t),
        }),
        translateContent(topFactor.description ?? "", t) ||
          t("aarohi.tip.reviewRisk"),
        t("aarohi.tip.completeChecklist"),
      ]
    : activeFarm.riskLevel === "safe"
    ? [
        t("aarohi.tip.stable"),
        t("aarohi.tip.continueSanitation"),
        t("aarohi.tip.scheduleInspection"),
      ]
    : [
        t("aarohi.tip.attention"),
        t("aarohi.tip.checkActions"),
        t("aarohi.tip.reportMortality"),
      ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="aarohi-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="aarohi-modal-header">
          <div className="aarohi-modal-title-row">
            <div className="aarohi-avatar-large">A</div>
            <div>
              <span className="aarohi-eyebrow">{t("aarohi.eyebrow")}</span>
              <h2 className="modal-title">
                {t("aarohi.title", {
                  farmName: translateData(activeFarm.name, locale),
                })}
              </h2>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label={t("common.close")}>
            <X size={20} />
          </button>
        </div>

        <div className="aarohi-modal-body">
          <div className={`aarohi-status-chip ${activeFarm.riskLevel}`}>
            {activeFarm.riskLevel === "safe" ? (
              <CheckCircle2 size={16} />
            ) : (
              <AlertTriangle size={16} />
            )}
            <span>
              {t("aarohi.scoreStatus", {
                score: activeFarm.biosecurityScore,
                risk: riskLevelLabel(activeFarm.riskLevel, t),
              })}
            </span>
          </div>

          {loading ? (
            <p className="text-muted">{t("aarohi.loading")}</p>
          ) : (
            <ul className="aarohi-tip-list">
              {tips.map((tip, idx) => (
                <li key={idx}>
                  <Sparkles size={14} />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          )}

          <p className="aarohi-disclaimer">{t("aarohi.disclaimer")}</p>
        </div>
      </div>
    </div>
  );
};
