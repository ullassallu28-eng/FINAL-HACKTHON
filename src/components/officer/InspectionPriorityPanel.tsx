import React, { useEffect, useMemo, useState } from "react";
import { HelpCircle, Calendar } from "lucide-react";
import type { Farm, CorrectiveAction, IncidentReport } from "../../types";
import { officerService, correctiveActionService, incidentService } from "../../services/api";
import { StatusBadge } from "../common/StatusBadge";
import { ScheduleInspectionModal } from "./ScheduleInspectionModal";
import { OfficerFarmDetailModal } from "./OfficerFarmDetailModal";
import { useTranslation } from "../../context/LocaleContext";

type SortKey = "priority" | "risk" | "incidents" | "compliance";

interface InspectionPriorityPanelProps {
  onScheduleSuccess?: () => void;
}

function deriveReasons(
  farm: Farm,
  actions: CorrectiveAction[],
  incidents: IncidentReport[],
  t: (key: string, params?: Record<string, string | number>) => string
): string[] {
  const reasons: string[] = [];

  if (farm.biosecurityScore < 50) {
    reasons.push(t("officer.priority.reason.lowScore", { score: farm.biosecurityScore }));
  } else if (farm.biosecurityScore < 75) {
    reasons.push(t("officer.priority.reason.lowScore", { score: farm.biosecurityScore }));
  }

  const farmIncidents = incidents.filter((i) => i.farmId === farm.id);
  const openIncidents = farmIncidents.filter(
    (i) => i.status !== "Verified" && i.status !== "Rejected"
  );
  if (openIncidents.length > 0) {
    reasons.push(t("officer.priority.reason.incidents", { count: openIncidents.length }));
  }

  const farmActions = actions.filter((a) => a.farmId === farm.id);
  const openActions = farmActions.filter((a) => a.status !== "Verified" && a.status !== "Closed");
  if (openActions.length > 0) {
    reasons.push(t("officer.priority.reason.actions", { count: openActions.length }));
  }

  const overdue = farmActions.some((a) => {
    const deadline = new Date(a.deadline);
    return deadline < new Date() && a.status !== "Verified" && a.status !== "Closed";
  });
  if (overdue) {
    reasons.push(t("officer.priority.reason.overdue"));
  }

  if (farm.riskLevel === "critical" || farm.riskLevel === "high") {
    reasons.push(t("officer.priority.reason.highRisk"));
  }

  return reasons;
}

export const InspectionPriorityPanel: React.FC<InspectionPriorityPanelProps> = ({
  onScheduleSuccess,
}) => {
  const { t } = useTranslation();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [actions, setActions] = useState<CorrectiveAction[]>([]);
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleFarm, setScheduleFarm] = useState<Farm | null>(null);
  const [detailFarm, setDetailFarm] = useState<Farm | null>(null);

  const [filterRisk, setFilterRisk] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterIncident, setFilterIncident] = useState(false);
  const [filterAction, setFilterAction] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("priority");

  const loadPanelData = () => {
    setLoading(true);
    Promise.all([
      officerService.getInspectionPriority(),
      correctiveActionService.getActions(),
      incidentService.getIncidents(),
    ])
      .then(([priorityFarms, allActions, allIncidents]) => {
        setFarms(priorityFarms);
        setActions(allActions);
        setIncidents(allIncidents);
      })
      .catch(() => {
        setFarms([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPanelData();
  }, []);

  const enrichedFarms = useMemo(() => {
    return farms.map((farm, idx) => ({
      farm,
      rank: idx + 1,
      reasons: deriveReasons(farm, actions, incidents, t),
    }));
  }, [farms, actions, incidents, t]);

  const filtered = useMemo(() => {
    let list = enrichedFarms;

    if (filterRisk !== "all") {
      list = list.filter(({ farm }) => farm.riskLevel === filterRisk);
    }
    if (filterType !== "all") {
      list = list.filter(({ farm }) => farm.farmType === filterType);
    }
    if (filterIncident) {
      list = list.filter(({ farm }) =>
        incidents.some(
          (i) =>
            i.farmId === farm.id &&
            i.status !== "Verified" &&
            i.status !== "Rejected"
        )
      );
    }
    if (filterAction) {
      list = list.filter(({ farm }) =>
        actions.some(
          (a) => a.farmId === farm.id && a.status !== "Verified" && a.status !== "Closed"
        )
      );
    }

    if (sortKey === "risk") {
      list = [...list].sort((a, b) => a.farm.biosecurityScore - b.farm.biosecurityScore);
    } else if (sortKey === "incidents") {
      list = [...list].sort(
        (a, b) => b.farm.activeIncidents - a.farm.activeIncidents
      );
    } else if (sortKey === "compliance") {
      list = [...list].sort((a, b) => a.farm.complianceRate - b.farm.complianceRate);
    }

    return list;
  }, [enrichedFarms, filterRisk, filterType, filterIncident, filterAction, sortKey, incidents, actions]);

  if (loading) {
    return <div className="loading-state">{t("common.loading")}</div>;
  }

  return (
    <div className="inspection-priority-panel">
      <div className="priority-panel-header">
        <div>
          <span className="panel-eyebrow">{t("officer.priority.title")}</span>
          <p className="panel-sub">{t("officer.priority.subtitle")}</p>
            <p className="panel-sub officer-click-hint">{t("officer.detail.clickHint")}</p>
            <p className="panel-sub">{t("officer.priority.nationalScope")}</p>
        </div>
      </div>

      <div className="priority-filters-bar">
        <select value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)} className="filter-select">
          <option value="all">{t("officer.priority.filter.risk")}: All</option>
          <option value="safe">Low</option>
          <option value="caution">Medium</option>
          <option value="critical">High</option>
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="filter-select">
          <option value="all">{t("officer.priority.filter.farmType")}: All</option>
          <option value="poultry">Poultry</option>
          <option value="pig">Pig</option>
          <option value="mixed">Mixed</option>
        </select>
        <label className="filter-checkbox">
          <input type="checkbox" checked={filterIncident} onChange={(e) => setFilterIncident(e.target.checked)} />
          {t("officer.priority.filter.incident")}
        </label>
        <label className="filter-checkbox">
          <input type="checkbox" checked={filterAction} onChange={(e) => setFilterAction(e.target.checked)} />
          {t("officer.priority.filter.action")}
        </label>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="filter-select">
          <option value="priority">{t("officer.priority.rank")}</option>
          <option value="risk">Risk Score</option>
          <option value="incidents">Incidents</option>
          <option value="compliance">Compliance</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="empty-state">{t("officer.priority.empty")}</p>
      ) : (
        <div className="priority-cards-list">
          {filtered.map(({ farm, rank, reasons }) => (
            <div
              key={farm.id}
              className={`priority-farm-card priority-farm-card-clickable ${rank === 1 ? "priority-top" : ""}`}
              onClick={() => setDetailFarm(farm)}
              onKeyDown={(e) => e.key === "Enter" && setDetailFarm(farm)}
              role="button"
              tabIndex={0}
            >
              <div className="priority-card-header">
                <span className="priority-rank-badge">
                  {t("officer.priority.rank")} {rank}
                </span>
                <div>
                  <strong>{farm.name}</strong>
                  <span className="sub-text">ID: {farm.id} • {farm.location}</span>
                </div>
                <StatusBadge type="risk" value={farm.riskLevel} size="sm" />
              </div>

              <div className="priority-score-row">
                <span>{farm.biosecurityScore}/100</span>
                <StatusBadge type="farmType" value={farm.farmType} size="sm" />
              </div>

              <div className="priority-why-section">
                <div className="priority-why-header">
                  <HelpCircle size={16} />
                  <span>{t("officer.priority.why")}</span>
                </div>
                {reasons.length === 0 ? (
                  <span className="sub-text">Low biosecurity score relative to district</span>
                ) : (
                  <ul className="priority-reasons-list">
                    {reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                )}
              </div>

              <button
                className="btn-table-audit"
                onClick={(e) => {
                  e.stopPropagation();
                  setScheduleFarm(farm);
                }}
              >
                <Calendar size={14} />
                {t("officer.priority.schedule")}
              </button>
            </div>
          ))}
        </div>
      )}
      <ScheduleInspectionModal
        farm={scheduleFarm}
        isOpen={!!scheduleFarm}
        onClose={() => setScheduleFarm(null)}
        onScheduled={() => {
          loadPanelData();
          onScheduleSuccess?.();
        }}
      />
      <OfficerFarmDetailModal
        farm={detailFarm}
        isOpen={!!detailFarm}
        onClose={() => setDetailFarm(null)}
        onSchedule={(farm) => setScheduleFarm(farm)}
      />
    </div>
  );
};
