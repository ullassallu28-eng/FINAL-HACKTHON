import type {
  Farm,
  BiosecurityPassport,
  IncidentReport,
  CorrectiveAction,
  RiskFactor,
  GisMapNode,
  OfficerStats,
  NotificationItem,
  UserRole,
  ChecklistItem,
  RiskSummary,
  SpatialRiskResponse,
  ScheduledInspection,
  RecommendedAction,
  ActionPlanItem,
  ScoreTimelineEvent,
} from "../types";

import { getDefaultRecommendedActions } from "../data/recommendedActions";
import { analyzeEvidenceLocally, isVeterinaryActionPlan, VET_PLAN_MARKER } from "../utils/evidenceAnalysis";
import type { EvidenceAnalysis } from "../types";
import { cacheFarmBundle } from "../offline/storage/cacheStore";
import { cachedGet, cacheKey, invalidateApiCache, DEFAULT_CACHE_TTL_MS } from "./apiCache";
import { resolveApiBase, API_V1_PREFIX } from "../config/apiBase";
import { connectivityService } from "../offline/connectivity/connectivityService";

export { invalidateApiCache, DEFAULT_CACHE_TTL_MS as API_CACHE_TTL_MS };

function isNotFoundError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return msg.includes("404") || msg.includes("not found");
}

function resolveApiBaseLocal(): string {
  return resolveApiBase();
}

const API_BASE = resolveApiBaseLocal();
const API_V1 = `${API_BASE.replace(/\/api\/v1\/?$/, "")}${API_V1_PREFIX}`;

function markApiSuccess(): void {
  connectivityService.reportApiSuccess();
}

function scheduleIdle(task: () => void): void {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    window.requestIdleCallback(() => task(), { timeout: 3000 });
  } else {
    setTimeout(task, 0);
  }
}

async function cachedApiGet<T>(
  path: string,
  options?: { ttlMs?: number; force?: boolean; swr?: boolean }
): Promise<T> {
  return cachedGet(cacheKey("GET", path), () => apiFetch<T>(path), options);
}

function parseApiError(text: string, status: number): string {
  try {
    const payload = JSON.parse(text) as {
      error?: { message?: string };
      detail?: string | { msg?: string }[];
    };
    if (payload.error?.message) return payload.error.message;
    if (typeof payload.detail === "string") return payload.detail;
    if (Array.isArray(payload.detail) && payload.detail[0]?.msg) {
      return payload.detail.map((d) => d.msg).join(", ");
    }
  } catch {
    // plain text error body
  }
  if (text) return text;
  return `Request failed (${status})`;
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetchForm<T>(
  path: string,
  formData: FormData,
  method = "POST",
  idempotencyKey?: string
): Promise<T> {
  const headers: Record<string, string> = { ...getAuthHeaders() };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  const response = await fetch(`${API_V1}${path}`, {
    method,
    headers,
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(parseApiError(text, response.status));
  }

  markApiSuccess();
  return response.json() as Promise<T>;
}

async function apiFetch<T>(path: string, options: RequestInit = {}, idempotencyKey?: string): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
    ...(options.headers as Record<string, string> | undefined),
  };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  const response = await fetch(`${API_V1}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(parseApiError(text, response.status));
  }

  if (response.status === 204) {
    markApiSuccess();
    return undefined as T;
  }

  markApiSuccess();
  return response.json() as Promise<T>;
}

export const farmService = {
  async getFarm(farmId: string, options?: { force?: boolean }): Promise<Farm> {
    return cachedApiGet<Farm>(`/farms/${farmId}`, options);
  },

  async getAllFarms(options?: { force?: boolean }): Promise<Farm[]> {
    const farms = await cachedApiGet<Farm[]>("/farms", options);
    scheduleIdle(() => {
      Promise.all(
        farms.map((farm) => cacheFarmBundle(farm.id, { farm }).catch(() => undefined))
      ).catch(() => undefined);
    });
    return farms;
  },

  async getChecklist(farmId: string, options?: { force?: boolean }): Promise<ChecklistItem[]> {
    const path = `/farms/${farmId}/checklist`;
    const checklist = await cachedApiGet<ChecklistItem[]>(path, options);
    scheduleIdle(() => {
      import("../offline/storage/cacheStore")
        .then((m) => m.getCachedFarmBundle(farmId))
        .then((cached) => {
          if (cached) {
            return cacheFarmBundle(farmId, { farm: cached.farm, checklist });
          }
        })
        .catch(() => undefined);
    });
    return checklist;
  },

  async updateChecklistItem(
    farmId: string,
    itemId: string,
    completed: boolean
  ): Promise<ChecklistItem> {
    const result = await apiFetch<ChecklistItem>(`/farms/${farmId}/checklist/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ completed }),
    });
    invalidateApiCache(`/farms/${farmId}/checklist`);
    invalidateApiCache("/farms");
    return result;
  },
};

export const passportService = {
  async getBiosecurityPassport(farmId: string, options?: { force?: boolean }): Promise<BiosecurityPassport> {
    return cachedApiGet<BiosecurityPassport>(`/farms/${farmId}/passport`, options);
  },
};

export const incidentService = {
  async getIncidents(farmId?: string, options?: { force?: boolean }): Promise<IncidentReport[]> {
    const query = farmId ? `?farmId=${encodeURIComponent(farmId)}` : "";
    const path = `/incidents${query}`;
    const incidents = await cachedApiGet<IncidentReport[]>(path, options);
    if (farmId) {
      scheduleIdle(() => {
        import("../offline/storage/cacheStore")
          .then((m) => m.getCachedFarmBundle(farmId))
          .then((cached) => {
            if (cached) {
              return cacheFarmBundle(farmId, { farm: cached.farm, incidents });
            }
          })
          .catch(() => undefined);
      });
    }
    return incidents;
  },

  async submitIncident(
    newIncident: Omit<IncidentReport, "id" | "status" | "severity">,
    evidenceFile?: File | null,
    idempotencyKey?: string
  ): Promise<IncidentReport> {
    let result: IncidentReport;
    if (evidenceFile) {
      const form = new FormData();
      form.append("farm_id", newIncident.farmId);
      form.append("incident_type", newIncident.incidentType);
      form.append("animal_type", newIncident.animalType);
      form.append("number_affected", String(newIncident.numberAffected));
      form.append("date_time", newIncident.dateTime);
      form.append("description", newIncident.description);
      form.append("location", newIncident.location);
      form.append("evidence", evidenceFile);
      result = await apiFetchForm<IncidentReport>("/incidents", form, "POST", idempotencyKey);
    } else {
      result = await apiFetch<IncidentReport>(
        "/incidents/json",
        {
          method: "POST",
          body: JSON.stringify({
            farmId: newIncident.farmId,
            incidentType: newIncident.incidentType,
            animalType: newIncident.animalType,
            numberAffected: newIncident.numberAffected,
            dateTime: newIncident.dateTime,
            description: newIncident.description,
            location: newIncident.location,
          }),
        },
        idempotencyKey
      );
    }
    invalidateApiCache("/incidents");
    invalidateApiCache("/farms");
    invalidateApiCache("/notifications");
    return result;
  },

  async verifyIncident(
    incidentId: string,
    action: "validate" | "request_info" | "reject",
    notes?: string
  ): Promise<IncidentReport> {
    const result = await apiFetch<IncidentReport>(`/incidents/${incidentId}/verify`, {
      method: "POST",
      body: JSON.stringify({ action, notes }),
    });
    invalidateApiCache("/incidents");
    invalidateApiCache("/farms");
    invalidateApiCache("/corrective-actions");
    invalidateApiCache("/notifications");
    return result;
  },

  async getRecommendedActions(
    incidentId: string,
    incidentType?: string
  ): Promise<RecommendedAction[]> {
    try {
      return await cachedApiGet<RecommendedAction[]>(`/incidents/${incidentId}/recommended-actions`);
    } catch (err) {
      if (incidentType && isNotFoundError(err)) {
        return getDefaultRecommendedActions(incidentType);
      }
      throw err;
    }
  },

  async sendActionPlan(
    incidentId: string,
    farmId: string,
    actions: ActionPlanItem[]
  ): Promise<{ incidentId: string; actionsCreated: number; actionIds: string[] }> {
    try {
      const result = await apiFetch<{ incidentId: string; actionsCreated: number; actionIds: string[] }>(
        `/incidents/${incidentId}/action-plan`,
        {
          method: "POST",
          body: JSON.stringify({ actions }),
        }
      );
      invalidateApiCache("/corrective-actions");
      invalidateApiCache("/notifications");
      return result;
    } catch (err) {
      if (!isNotFoundError(err)) throw err;
      const actionIds: string[] = [];
      for (const action of actions) {
        const body = action.veterinaryNote
          ? `${action.description}\n\nVeterinary note: ${action.veterinaryNote}`
          : action.description;
        const created = await apiFetch<CorrectiveAction>("/corrective-actions", {
          method: "POST",
          body: JSON.stringify({
            farmId,
            incidentId,
            title: action.title,
            description: `${VET_PLAN_MARKER}\n${body}`,
            priority: action.priority,
            assignedPerson: action.assignedPerson || "Farm Owner",
            deadline: action.deadline,
            evidenceRequired: action.evidenceRequired,
          }),
        });
        actionIds.push(created.id);
      }
      return { incidentId, actionsCreated: actionIds.length, actionIds };
    }
  },
};

export const correctiveActionService = {
  attachEvidenceAnalysis(action: CorrectiveAction): CorrectiveAction {
    if (action.evidenceAnalysis || !action.submittedEvidence) return action;
    return { ...action, evidenceAnalysis: analyzeEvidenceLocally(action) };
  },

  sortEvidenceQueue(actions: CorrectiveAction[]): CorrectiveAction[] {
    return [...actions]
      .filter((a) => a.submittedEvidence?.fileUrl)
      .sort((a, b) => {
        const vetA = isVeterinaryActionPlan(a) ? 0 : 1;
        const vetB = isVeterinaryActionPlan(b) ? 0 : 1;
        if (vetA !== vetB) return vetA - vetB;
        const ta = a.submittedEvidence?.timestamp ?? "";
        const tb = b.submittedEvidence?.timestamp ?? "";
        return tb.localeCompare(ta);
      });
  },

  async getAction(actionId: string, options?: { force?: boolean }): Promise<CorrectiveAction> {
    try {
      const action = await cachedApiGet<CorrectiveAction>(`/corrective-actions/${actionId}`, options);
      return correctiveActionService.attachEvidenceAnalysis(action);
    } catch (err) {
      if (!isNotFoundError(err)) throw err;
      const all = await correctiveActionService.getActions();
      const found = all.find((a) => a.id === actionId);
      if (!found) throw err;
      return correctiveActionService.attachEvidenceAnalysis(found);
    }
  },

  async getSubmittedEvidence(actionId: string): Promise<CorrectiveAction["submittedEvidence"]> {
    try {
      return await apiFetch<NonNullable<CorrectiveAction["submittedEvidence"]>>(
        `/corrective-actions/${actionId}/submitted-evidence`
      );
    } catch (err) {
      if (!isNotFoundError(err)) throw err;
      const action = await correctiveActionService.getAction(actionId);
      return action.submittedEvidence;
    }
  },

  async getActions(farmId?: string, options?: { force?: boolean }): Promise<CorrectiveAction[]> {
    const query = farmId ? `?farmId=${encodeURIComponent(farmId)}` : "";
    const path = `/corrective-actions${query}`;
    const list = await cachedApiGet<CorrectiveAction[]>(path, options);
    const mapped = list.map((a) => correctiveActionService.attachEvidenceAnalysis(a));
    if (farmId) {
      scheduleIdle(() => {
        import("../offline/storage/cacheStore")
          .then((m) => m.getCachedFarmBundle(farmId))
          .then((cached) => {
            if (cached) {
              return cacheFarmBundle(farmId, { farm: cached.farm, correctiveActions: mapped });
            }
          })
          .catch(() => undefined);
      });
    }
    return mapped;
  },

  async createAction(payload: {
    farmId: string;
    incidentId?: string;
    title: string;
    description: string;
    priority: string;
    assignedPerson: string;
    deadline: string;
    evidenceRequired?: boolean;
  }): Promise<CorrectiveAction> {
    return apiFetch<CorrectiveAction>("/corrective-actions", {
      method: "POST",
      body: JSON.stringify({
        farmId: payload.farmId,
        incidentId: payload.incidentId,
        title: payload.title,
        description: payload.description,
        priority: payload.priority,
        assignedPerson: payload.assignedPerson,
        deadline: payload.deadline,
        evidenceRequired: payload.evidenceRequired ?? true,
      }),
    });
  },

  async submitEvidence(
    actionId: string,
    evidence: { file: File; notes: string; location: string },
    idempotencyKey?: string
  ): Promise<CorrectiveAction> {
    const form = new FormData();
    form.append("file", evidence.file);
    form.append("notes", evidence.notes);
    form.append("location", evidence.location);
    const result = await apiFetchForm<CorrectiveAction>(
      `/corrective-actions/${actionId}/evidence`,
      form,
      "POST",
      idempotencyKey
    );
    invalidateApiCache("/corrective-actions");
    invalidateApiCache("/notifications");
    return correctiveActionService.attachEvidenceAnalysis(result);
  },

  async analyzeEvidence(actionId: string): Promise<EvidenceAnalysis> {
    try {
      return await apiFetch<EvidenceAnalysis>(`/corrective-actions/${actionId}/analyze-evidence`);
    } catch (err) {
      if (!isNotFoundError(err)) throw err;
      const all = await correctiveActionService.getActions();
      const action = all.find((a) => a.id === actionId);
      if (!action) throw err;
      return analyzeEvidenceLocally(action);
    }
  },

  async verifyAction(actionId: string, approved: boolean, notes?: string): Promise<CorrectiveAction> {
    const result = await apiFetch<CorrectiveAction>(`/corrective-actions/${actionId}/verify`, {
      method: "POST",
      body: JSON.stringify({ approved, notes }),
    });
    invalidateApiCache("/corrective-actions");
    invalidateApiCache("/farms");
    invalidateApiCache("/notifications");
    return result;
  },

  async getAwaitingVerification(options?: { force?: boolean }): Promise<CorrectiveAction[]> {
    try {
      const list = await cachedApiGet<CorrectiveAction[]>("/corrective-actions/awaiting-verification", options);
      return correctiveActionService.sortEvidenceQueue(
        list.map((a) => correctiveActionService.attachEvidenceAnalysis(a))
      );
    } catch (err) {
      if (!isNotFoundError(err)) throw err;
      const all = await correctiveActionService.getActions();
      return correctiveActionService.sortEvidenceQueue(
        all
          .filter(
            (a) =>
              (a.status === "Evidence Submitted" || a.status === "Awaiting Verification") &&
              !!a.submittedEvidence?.fileUrl
          )
          .map((a) => correctiveActionService.attachEvidenceAnalysis(a))
      );
    }
  },
};

export const riskService = {
  async getRiskFactors(farmId?: string, options?: { force?: boolean }): Promise<RiskFactor[]> {
    const query = farmId ? `?farmId=${encodeURIComponent(farmId)}` : "";
    return cachedApiGet<RiskFactor[]>(`/risk/factors${query}`, options);
  },

  async getRiskHistory(
    farmId: string,
    days = 7,
    options?: { force?: boolean }
  ): Promise<{ time: string; score: number }[]> {
    return cachedApiGet<{ time: string; score: number }[]>(
      `/risk/farms/${farmId}/history?days=${days}`,
      options
    );
  },

  async getRiskSummary(farmId: string, options?: { force?: boolean }): Promise<RiskSummary> {
    return cachedApiGet<RiskSummary>(`/risk/farms/${farmId}/summary`, options);
  },

  async recalculateFarm(farmId: string): Promise<RiskSummary> {
    const result = await apiFetch<RiskSummary>(`/risk/farms/${farmId}/recalculate`, {
      method: "POST",
    });
    invalidateApiCache("/risk/");
    invalidateApiCache("/farms");
    return result;
  },

  async getScoreTimeline(
    farmId: string,
    days = 30,
    options?: { force?: boolean }
  ): Promise<ScoreTimelineEvent[]> {
    return cachedApiGet<ScoreTimelineEvent[]>(
      `/risk/farms/${farmId}/timeline?days=${days}`,
      options
    );
  },
};

export const gisService = {
  async getGisMapNodes(
    farmType?: string,
    riskLevel?: string,
    options?: { force?: boolean }
  ): Promise<GisMapNode[]> {
    const params = new URLSearchParams();
    if (farmType && farmType !== "all") params.set("farmType", farmType);
    if (riskLevel && riskLevel !== "all") params.set("riskLevel", riskLevel);
    const query = params.toString() ? `?${params.toString()}` : "";
    return cachedApiGet<GisMapNode[]>(`/gis/nodes${query}`, options);
  },

  async getSpatialRisk(
    farmId: string,
    radiusKm = 15,
    options?: { force?: boolean }
  ): Promise<SpatialRiskResponse> {
    return cachedApiGet<SpatialRiskResponse>(
      `/gis/spatial-risk?farmId=${encodeURIComponent(farmId)}&radiusKm=${radiusKm}`,
      options
    );
  },
};

export const officerService = {
  async getOfficerStats(options?: { force?: boolean }): Promise<OfficerStats> {
    return cachedApiGet<OfficerStats>("/officer/stats", options);
  },

  async getInspectionPriority(options?: { force?: boolean }): Promise<Farm[]> {
    return cachedApiGet<Farm[]>("/officer/inspection-priority", options);
  },

  async getScheduledInspections(options?: { force?: boolean }): Promise<ScheduledInspection[]> {
    return cachedApiGet<ScheduledInspection[]>("/officer/inspections", options);
  },

  async scheduleInspection(
    farmId: string,
    scheduledAt: string,
    notes?: string
  ): Promise<{ id: string }> {
    return apiFetch<{ id: string }>("/officer/inspections", {
      method: "POST",
      body: JSON.stringify({ farmId, scheduledAt, notes }),
    });
  },

  async getFarmProfile(farmId: string): Promise<{
    farm: Farm;
    openIncidents: number;
    openActions: number;
    incidentCount: number;
    actionCount: number;
  }> {
    return apiFetch(`/officer/farms/${encodeURIComponent(farmId)}/profile`);
  },

  async getFarmDetail(farmId: string): Promise<{
    farm: Farm;
    incidents: IncidentReport[];
    actions: CorrectiveAction[];
    passport: BiosecurityPassport | null;
    scheduledInspections: ScheduledInspection[];
    openIncidents: number;
    openActions: number;
    incidentCount: number;
    actionCount: number;
  }> {
    return apiFetch(`/officer/farms/${encodeURIComponent(farmId)}/detail`);
  },
};

export const notificationService = {
  async getNotifications(role?: UserRole, options?: { force?: boolean }): Promise<NotificationItem[]> {
    const query = role ? `?role=${encodeURIComponent(role)}` : "";
    return cachedApiGet<NotificationItem[]>(`/notifications${query}`, {
      ...options,
      ttlMs: 10_000,
      swr: false,
    });
  },

  async markAsRead(id: string): Promise<void> {
    await apiFetch<void>(`/notifications/${id}/read`, { method: "PATCH" });
  },
};

export interface HealthRecord {
  id: string;
  farmId: string;
  animalType: string;
  batchName?: string | null;
  zoneId?: string | null;
  healthStatus: string;
  mortalityCount: number;
  morbidityCount: number;
  vaccinationDate?: string | null;
  notes?: string | null;
  recordedAt: string;
}

export const healthRecordService = {
  async listRecords(farmId: string): Promise<HealthRecord[]> {
    return apiFetch<HealthRecord[]>(`/health-records/farms/${farmId}`);
  },

  async createRecord(
    farmId: string,
    payload: {
      animalType: string;
      healthStatus: string;
      notes?: string;
      batchName?: string;
      mortalityCount?: number;
      morbidityCount?: number;
    },
    idempotencyKey?: string
  ): Promise<HealthRecord> {
    return apiFetch<HealthRecord>(
      `/health-records/farms/${farmId}`,
      {
        method: "POST",
        body: JSON.stringify({
          animalType: payload.animalType,
          healthStatus: payload.healthStatus,
          notes: payload.notes,
          batchName: payload.batchName,
          mortalityCount: payload.mortalityCount ?? 0,
          morbidityCount: payload.morbidityCount ?? 0,
        }),
      },
      idempotencyKey
    );
  },
};

export const authService = {
  async login(email: string, password: string) {
    const data = await apiFetch<{
      accessToken: string;
      refreshToken: string;
      user: { id: string; fullName: string; email: string; role: UserRole; farmIds: string[] };
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    return data;
  },

  logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  },
};
