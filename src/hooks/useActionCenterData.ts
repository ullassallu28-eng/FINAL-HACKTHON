import { useEffect, useState } from "react";
import type { Farm, CorrectiveAction, IncidentReport, ChecklistItem, NotificationItem, RiskSummary } from "../types";
import {
  farmService,
  incidentService,
  correctiveActionService,
  riskService,
  notificationService,
} from "../services/api";
import { NOTIFICATIONS_UPDATED_EVENT } from "../context/NotificationContext";
import type { UserRole } from "../types";

const ACTION_CENTER_POLL_MS = 20_000;

export interface ActionCenterData {
  farm: Farm | null;
  summary: RiskSummary | null;
  history: { time: string; score: number }[];
  checklist: ChecklistItem[];
  incidents: IncidentReport[];
  actions: CorrectiveAction[];
  notifications: NotificationItem[];
  loading: boolean;
  error: string;
}

export function useActionCenterData(farmId: string, role: UserRole): ActionCenterData {
  const [data, setData] = useState<ActionCenterData>({
    farm: null,
    summary: null,
    history: [],
    checklist: [],
    incidents: [],
    actions: [],
    notifications: [],
    loading: true,
    error: "",
  });

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      setData((prev) => ({ ...prev, loading: prev.farm === null, error: "" }));

      Promise.all([
        farmService.getFarm(farmId),
        riskService.getRiskSummary(farmId).catch(() => null),
        riskService.getRiskHistory(farmId, 14).catch(() => []),
        farmService.getChecklist(farmId).catch(() => []),
        incidentService.getIncidents(farmId, { force: true }).catch(() => []),
        correctiveActionService.getActions(farmId).catch(() => []),
        notificationService.getNotifications(role, { force: true }).catch(() => []),
      ])
        .then(([farm, summary, history, checklist, incidents, actions, notifications]) => {
          if (!cancelled) {
            setData({
              farm,
              summary,
              history,
              checklist,
              incidents,
              actions,
              notifications: notifications.slice(0, 5),
              loading: false,
              error: "",
            });
          }
        })
        .catch(() => {
          if (!cancelled) {
            setData((prev) => ({
              ...prev,
              loading: false,
              error: "Unable to load action center data.",
            }));
          }
        });
    };

    load();
    const onUpdated = () => load();
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, onUpdated);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, ACTION_CENTER_POLL_MS);

    return () => {
      cancelled = true;
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, onUpdated);
      window.clearInterval(interval);
    };
  }, [farmId, role]);

  return data;
}

export function getCriticalGaps(checklist: ChecklistItem[]): ChecklistItem[] {
  return checklist.filter((item) => !item.completed);
}

export function getNextAction(actions: CorrectiveAction[]): CorrectiveAction | null {
  const pending = actions.filter(
    (a) =>
      a.status === "Pending" ||
      a.status === "In Progress" ||
      (a.evidenceRequired && a.status !== "Verified" && a.status !== "Closed")
  );
  pending.sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
  return pending[0] ?? null;
}

export function getActiveIncidents(incidents: IncidentReport[]): IncidentReport[] {
  return incidents.filter(
    (i) => i.status !== "Verified" && i.status !== "Rejected"
  );
}
