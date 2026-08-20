import React, { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus, HelpCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/LocaleContext";
import { passportService, riskService } from "../../services/api";
import type { BiosecurityPassport, RiskFactor, RiskSummary, ScoreTimelineEvent } from "../../types";
import { translateContent } from "../../i18n/contentTranslate";
import { ScoreTrendChart } from "./ScoreTrendChart";
import { StatusBadge } from "../common/StatusBadge";

export const ScoreHistoryPanel: React.FC = () => {
  const { activeFarm } = useAuth();
  const { t } = useTranslation();
  const [summary, setSummary] = useState<RiskSummary | null>(null);
  const [history, setHistory] = useState<{ time: string; score: number }[]>([]);
  const [factors, setFactors] = useState<RiskFactor[]>([]);
  const [passport, setPassport] = useState<BiosecurityPassport | null>(null);
  const [timeline, setTimeline] = useState<ScoreTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      riskService.getRiskSummary(activeFarm.id),
      riskService.getRiskHistory(activeFarm.id, 30),
      riskService.getRiskFactors(activeFarm.id),
      passportService.getBiosecurityPassport(activeFarm.id),
      riskService.getScoreTimeline(activeFarm.id, 30),
    ])
      .then(([summaryData, historyData, factorsData, passportData, timelineData]) => {
        if (!cancelled) {
          setSummary(summaryData);
          setHistory(historyData);
          setFactors(factorsData);
          setPassport(passportData);
          setTimeline(timelineData);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSummary(null);
          setHistory([]);
          setFactors([]);
          setPassport(null);
          setTimeline([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeFarm.id]);

  const scoreDelta = summary
    ? summary.biosecurityScore - summary.previousScore
    : activeFarm.biosecurityScore - activeFarm.previousScore;

  const trendIcon =
    summary?.riskTrend === "improving" ? (
      <TrendingUp size={16} className="text-green" />
    ) : summary?.riskTrend === "deteriorating" ? (
      <TrendingDown size={16} className="text-red" />
    ) : (
      <Minus size={16} />
    );

  const components = passport
    ? [
        { key: "score.hygiene", value: passport.hygieneScore },
        { key: "score.visitorControl", value: passport.visitorControlScore },
        { key: "score.quarantine", value: passport.quarantineProtocolScore },
        { key: "score.vaccination", value: passport.vaccinationCoverage },
        { key: "score.wasteManagement", value: passport.wasteManagementScore },
      ]
    : [];

  return (
    <div className="score-history-panel">
      <div className="score-history-header">
        <div>
          <span className="panel-eyebrow">{t("score.history")}</span>
          <h3 className="panel-title">{t("score.current")}</h3>
        </div>
        <StatusBadge type="risk" value={summary?.riskLevel ?? activeFarm.riskLevel} />
      </div>

      {loading ? (
        <div className="loading-state">{t("common.loading")}</div>
      ) : (
        <>
          <div className="score-summary-row">
            <div className="score-current-box">
              <span className="score-big">{summary?.biosecurityScore ?? activeFarm.biosecurityScore}</span>
              <span className="score-max">/100</span>
            </div>
            <div className="score-delta-box">
              <span className="score-delta-label">{t("score.previous")}</span>
              <strong>{summary?.previousScore ?? activeFarm.previousScore}</strong>
              <div className="score-change-badge">
                {trendIcon}
                <span>
                  {scoreDelta >= 0 ? "+" : ""}
                  {scoreDelta} {t("dashboard.scoreTrend")}
                </span>
              </div>
            </div>
          </div>

          {history.length >= 2 ? (
            <ScoreTrendChart history={history} />
          ) : (
            <p className="score-empty-note">{t("score.noHistory")}</p>
          )}

          {components.length > 0 && (
            <div className="score-components-grid">
              <h4>{t("score.components")}</h4>
              {components.map((comp) => (
                <div key={comp.key} className="component-bar-row">
                  <span className="component-label">{t(comp.key)}</span>
                  <div className="component-bar-bg">
                    <div className="component-bar-fill" style={{ width: `${comp.value}%` }} />
                  </div>
                  <span className="component-val">{comp.value}</span>
                </div>
              ))}
            </div>
          )}

          {timeline.length > 0 && (
            <div className="score-timeline-section">
              <h4>Score change timeline</h4>
              <ol className="score-timeline-list">
                {timeline.map((evt, idx) => (
                  <li key={`${evt.referenceId}-${idx}`} className={`timeline-event timeline-${evt.eventType}`}>
                    <span className="timeline-score">{evt.score}</span>
                    <div>
                      <strong>{evt.label}</strong>
                      <span className="timeline-time">{new Date(evt.time).toLocaleString()}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="score-why-section">
            <div className="score-why-header">
              <HelpCircle size={18} />
              <h4>{t("score.whyChanged")}</h4>
            </div>
            {factors.length === 0 ? (
              <p className="score-empty-note">{t("score.noHistory")}</p>
            ) : (
              <ul className="score-contributors-list">
                {factors.map((factor) => (
                  <li key={factor.id}>
                    <strong>{translateContent(factor.label, t)}</strong>
                    <span className="factor-delta-inline">
                      {factor.delta >= 0 ? "+" : ""}
                      {factor.delta} {t("score.points")}
                    </span>
                    <p>{translateContent(factor.description ?? "", t)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
};
