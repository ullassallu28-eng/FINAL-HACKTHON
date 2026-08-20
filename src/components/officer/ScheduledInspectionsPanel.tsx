import React, { useCallback, useEffect, useState } from "react";
import { Calendar, MapPin } from "lucide-react";
import { officerService } from "../../services/api";
import type { ScheduledInspection } from "../../types";
import { useTranslation } from "../../context/LocaleContext";

interface ScheduledInspectionsPanelProps {
  refreshKey?: number;
}

export const ScheduledInspectionsPanel: React.FC<ScheduledInspectionsPanelProps> = ({
  refreshKey = 0,
}) => {
  const { t } = useTranslation();
  const [inspections, setInspections] = useState<ScheduledInspection[]>([]);
  const [loading, setLoading] = useState(true);

  const loadInspections = useCallback(() => {
    setLoading(true);
    officerService
      .getScheduledInspections()
      .then(setInspections)
      .catch(() => setInspections([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadInspections();
  }, [loadInspections, refreshKey]);

  return (
    <div className="scheduled-inspections-panel">
      <div className="priority-panel-header">
        <div>
          <span className="panel-eyebrow">{t("officer.scheduled.title")}</span>
          <p className="panel-sub">{t("officer.scheduled.subtitle")}</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">{t("common.loading")}</div>
      ) : inspections.length === 0 ? (
        <p className="empty-state">{t("officer.scheduled.empty")}</p>
      ) : (
        <div className="scheduled-inspections-list">
          {inspections.map((inspection) => (
            <div key={inspection.id} className="scheduled-inspection-card">
              <div className="scheduled-inspection-icon">
                <Calendar size={18} />
              </div>
              <div className="scheduled-inspection-body">
                <strong>{inspection.farmName || inspection.farmId}</strong>
                <span className="sub-text">
                  <MapPin size={12} /> {inspection.farmId}
                </span>
                <span className="sub-text">
                  {t("officer.scheduled.date")}:{" "}
                  {new Date(inspection.scheduledAt).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                {inspection.inspectorName && (
                  <span className="sub-text">
                    {t("officer.scheduled.officer")}: {inspection.inspectorName}
                  </span>
                )}
                {inspection.notes && (
                  <span className="sub-text">{inspection.notes}</span>
                )}
              </div>
              <span className="status-pill status-pill-scheduled">{inspection.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
