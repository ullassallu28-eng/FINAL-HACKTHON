import React, { useEffect, useMemo, useState } from "react";
import { Upload, Calendar, CheckCircle2 } from "lucide-react";
import type { CorrectiveAction } from "../../types";
import { correctiveActionService, riskService } from "../../services/api";
import { StatusBadge } from "../common/StatusBadge";
import { EvidenceUploadModal } from "./EvidenceUploadModal";

import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/LocaleContext";
import { useNotifications } from "../../context/NotificationContext";
import { translateContent } from "../../i18n/contentTranslate";
import { translateData } from "../../i18n/dataTranslations";
import { isVeterinaryActionPlan, stripVetPlanMarker } from "../../utils/evidenceAnalysis";
import { getCachedCorrectiveActions } from "../../offline/offlineBridge";

const STATUS_ORDER: Record<string, number> = {
  Pending: 0,
  "In Progress": 1,
  "Evidence Submitted": 2,
  "Awaiting Verification": 3,
  Verified: 4,
  Closed: 5,
};

function sortActions(list: CorrectiveAction[]): CorrectiveAction[] {
  return [...list].sort((a, b) => {
    const sa = STATUS_ORDER[a.status] ?? 99;
    const sb = STATUS_ORDER[b.status] ?? 99;
    if (sa !== sb) return sa - sb;
    const ca = a.createdAt ?? "";
    const cb = b.createdAt ?? "";
    if (ca !== cb) return cb.localeCompare(ca);
    return a.deadline.localeCompare(b.deadline);
  });
}

function farmerCanUpload(act: CorrectiveAction): boolean {
  if (act.status === "Verified" || act.status === "Closed") return false;
  if (act.status === "Evidence Submitted" || act.status === "Awaiting Verification") return false;
  return act.evidenceRequired !== false;
}

export const CorrectiveActionsList: React.FC = () => {
  const { role, activeFarm, allFarms, refreshFarms } = useAuth();
  const { refreshNotifications } = useNotifications();
  const { t, locale } = useTranslation();
  const [actions, setActions] = useState<CorrectiveAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedActionForEvidence, setSelectedActionForEvidence] = useState<CorrectiveAction | null>(null);
  // For officer: default the farm filter to the selected farm so data is auto-scoped.
  const [farmFilter, setFarmFilter] = useState<string>(
    role === "officer" ? activeFarm.id : "all"
  );

  const fetchActions = async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
      setError("");
    }
    try {
      const data = await correctiveActionService.getActions(
        role === "farmer" ? activeFarm.id : undefined
      );
      // Deduplicate by id — guard against API returning the same action twice
      const seen = new Set<string>();
      const deduped = data.filter((a) => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      });
      setActions(sortActions(deduped));
    } catch (err) {
      if (role === "farmer") {
        const cached = await getCachedCorrectiveActions(activeFarm.id);
        if (cached) {
          setActions(sortActions(cached));
          setError("Showing cached corrective actions — may be outdated.");
          setLoading(false);
          return;
        }
      }
      setActions([]);
      setError(err instanceof Error ? err.message : t("actions.error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setActions([]);
    setSelectedActionForEvidence(null);
    fetchActions();
  }, [role, activeFarm.id]);

  // When officer switches active farm, auto-update the filter to show that farm's data.
  useEffect(() => {
    if (role === "officer") {
      setFarmFilter(activeFarm.id);
    }
  }, [role, activeFarm.id]);

  const tableActions = useMemo(() => {
    if (role !== "farmer" && farmFilter !== "all") {
      return actions.filter((a) => a.farmId === farmFilter);
    }
    return actions;
  }, [actions, role, farmFilter]);

  const handleVerify = async (actionId: string, approve: boolean, notes?: string) => {
    try {
      const action = actions.find((a) => a.id === actionId);
      await correctiveActionService.verifyAction(actionId, approve, notes);
      const farmId = role === "farmer" ? activeFarm.id : action?.farmId;
      if (farmId) {
        await riskService.recalculateFarm(farmId).catch(() => undefined);
      }
      await fetchActions();
      await refreshFarms();
      await refreshNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actions.error"));
    }
  };

  const renderCard = (act: CorrectiveAction) => (
    <div
      key={act.id}
      className={`corrective-action-card ${isVeterinaryActionPlan(act) ? "vet-plan-card-highlight" : ""}`}
    >
      <div className="card-top-head">
        <div className="card-title-wrap">
          <h4 className="card-action-title">{translateContent(act.title, t)}</h4>
          <div className="card-badges-row">
            <span className={`priority-badge priority-${act.priority}`}>
              {t(
                `actionCenter.priority.${act.priority.toLowerCase() as "urgent" | "high" | "medium" | "low"}`
              )}
            </span>
            <StatusBadge type="action" value={act.status} size="sm" />
          </div>
        </div>
        <p className="card-action-desc">
          {translateContent(stripVetPlanMarker(act.description), t)}
        </p>
      </div>

      <div className="card-meta-details">
        <div className="card-meta-item">
          <Calendar size={14} className="inline-icon" />
          <span><strong>Due:</strong> {act.deadline}</span>
        </div>
        <div className="card-meta-item">
          <span><strong>Assigned:</strong> {translateData(act.assignedPerson, locale)}</span>
        </div>
        <div className="card-meta-item">
          <span><strong>Farm:</strong> {translateData(act.farmName, locale)}</span>
        </div>
        {act.incidentId && (
          <div className="card-meta-item">
            <span><strong>Incident:</strong> #{act.incidentId}</span>
          </div>
        )}
      </div>

      <div className="card-footer-actions">
        <div className="card-evidence-status">
          {act.submittedEvidence ? (
            <div className="evidence-badge-verified">
              <CheckCircle2 size={14} color="#154D38" />
              <span>
                {t("actions.evidenceSubmittedWithStatus", {
                  status: translateContent(act.verificationStatus, t),
                })}
              </span>
            </div>
          ) : (
            <span className="text-muted">{t("actions.evidenceRequired")}</span>
          )}
        </div>

        {role === "farmer" && farmerCanUpload(act) && (
          <button
            className="btn-upload-evidence full-width"
            onClick={() => setSelectedActionForEvidence(act)}
          >
            <Upload size={14} />
            <span>{t("actions.uploadEvidence")}</span>
          </button>
        )}

        {(role === "veterinarian" || role === "officer") &&
          (act.status === "Evidence Submitted" || act.status === "Awaiting Verification") && (
            <div className="btn-group-verify full-width">
              <button className="btn-verify-approve" onClick={() => handleVerify(act.id, true)}>
                {t("actions.verify")}
              </button>
              <button className="btn-verify-reject" onClick={() => handleVerify(act.id, false)}>
                {t("actions.reject")}
              </button>
            </div>
          )}
      </div>
    </div>
  );

  return (
    <div className="corrective-actions-view">
      <div className="actions-header-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span className="eyebrow-text">{t("actions.eyebrow")}</span>
          <h2 className="view-title">{t("actions.title")}</h2>
          <p className="view-subtitle">{t("actions.subtitle")}</p>
        </div>
        {role !== "farmer" && (
          <select
            value={farmFilter}
            onChange={(e) => setFarmFilter(e.target.value)}
            className="filter-select"
            style={{ padding: "6px 12px", fontSize: "0.875rem" }}
          >
            <option value="all">All Farms ({allFarms.length})</option>
            {allFarms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name} ({farm.id})
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div className="form-error-banner" role="alert">
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="loading-state">{t("actions.loading")}</div>
      ) : tableActions.length === 0 ? (
        <div className="empty-state">{t("actions.empty")}</div>
      ) : (
        <div className="corrective-cards-grid">
          {tableActions.map(renderCard)}
        </div>
      )}

      <EvidenceUploadModal
        action={selectedActionForEvidence}
        isOpen={!!selectedActionForEvidence}
        onClose={() => setSelectedActionForEvidence(null)}
        onSubmitted={() => fetchActions()}
      />
    </div>
  );
};
