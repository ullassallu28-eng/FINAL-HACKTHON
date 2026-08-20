import React from "react";
import { useTranslation } from "../../context/LocaleContext";

interface ScoreTrendChartProps {
  history: { time: string; score: number }[];
  compact?: boolean;
}

export const ScoreTrendChart: React.FC<ScoreTrendChartProps> = ({ history, compact = false }) => {
  const { t } = useTranslation();
  if (history.length === 0) {
    return null;
  }

  const maxScore = Math.max(...history.map((h) => h.score), 100);
  const minScore = Math.min(...history.map((h) => h.score), 0);
  const range = Math.max(maxScore - minScore, 10);

  return (
    <div className={`score-trend-chart ${compact ? "compact" : ""}`}>
      {compact ? (
        <div className="score-sparkline">
          {history.map((point, idx) => (
            <React.Fragment key={point.time}>
              <span className="spark-score">{point.score}</span>
              {idx < history.length - 1 && <span className="spark-arrow">→</span>}
            </React.Fragment>
          ))}
        </div>
      ) : (
        <div className="trend-timeline-bars">
          {history.map((point, idx) => {
            const heightPct = ((point.score - minScore) / range) * 60 + 25;
            const isLast = idx === history.length - 1;
            const dateLabel = new Date(point.time).toLocaleDateString([], {
              month: "short",
              day: "numeric",
            });

            return (
              <div key={point.time} className={`bar-day ${isLast ? "active" : ""}`}>
                <div
                  className={`bar-column ${isLast ? "active-column" : ""}`}
                  style={{ height: `${heightPct}%` }}
                >
                  <span className="bar-val">{point.score}</span>
                </div>
                <span className="day-name">{isLast ? t("score.latest") : dateLabel}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
