import React, { useEffect, useMemo, useState } from "react";
import { Upload, Calendar, CheckCircle2, ChevronDown, ChevronUp, ClipboardList } from "lucide-react";
import type { CorrectiveAction } from "../../types";
import { correctiveActionService, riskService } from "../../services/api";
import { StatusBadge } from "../common/StatusBadge";
import { EvidenceUploadModal } from "./EvidenceUploadModal";
import { CorrectiveActionTraceability } from "./CorrectiveActionTraceability";
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
  const { role, activeFarm, refreshFarms } = useAuth();
  const { refreshNotifications } = useNotifications();
  const { t, locale } = useTranslation();
  const [actions, setActions] = useState<CorrectiveAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedActionForEvidence, setSelectedActionForEvidence] = useState<CorrectiveAction | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchActions = async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
      setError("");
    }
    try {
      const data = await correctiveActionService.getActions(
        role === "farmer" ? activeFarm.id : undefined
      );
      setActions(sortActions(data));
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
    fetchActions();
    const onFocus = () => fetchActions({ silent: true });
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [role, activeFarm.id]);

  const vetPlanActions = useMemo(() => {
    if (role !== "farmer") return [];
    return actions.filter(
      (a) =>
        isVeterinaryActionPlan(a) &&
        (a.status === "Pending" || a.status === "In Progress" || a.status === "Awaiting Verification")
    );
  }, [actions, role]);

  const tableActions = useMemo(() => {
    if (role !== "farmer") return actions;
    return actions.filter(
      (a) =>
        isVeterinaryActionPlan(a) ||
        a.status === "Awaiting Verification" ||
        a.status === "Evidence Submitted" ||
        a.status === "Closed" ||
        a.status === "Verified"
    );
  }, [actions, role]);

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

  const renderRow = (act: CorrectiveAction) => (
    <React.Fragment key={act.id}>
      <tr className={vetPlanActions.some((v) => v.id === act.id) ? "vet-plan-row" : ""}>
        <td className="cell-main-info">
          <strong className="action-item-title">{translateContent(act.title, t)}</strong>
          <p className="action-item-desc">
            {translateContent(stripVetPlanMarker(act.description), t)}
          </p>
          {act.createdAt && (
            <span className="farm-tag-sub">Assigned: {act.createdAt}</span>
          )}
          {act.incidentId && (
            <span className="farm-tag-sub">Source incident: {act.incidentId}</span>
          )}
          <span className="farm-tag-sub">
            {t("actions.farmTag")}: {translateData(act.farmName, locale)}
          </span>
          <button
            type="button"
            className="btn-trace-toggle"
            onClick={() => setExpandedId(expandedId === act.id ? null : act.id)}
          >
            {expandedId === act.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {t("actions.traceability")}
          </button>
        </td>
        <td>
          <span className={`priority-badge priority-${act.priority}`}>
            {t(
              `actionCenter.priority.${act.priority.toLowerCase() as "urgent" | "high" | "medium" | "low"}`
            )}
          </span>
        </td>
        <td className="cell-person">{translateData(act.assignedPerson, locale)}</td>
        <td className="cell-date">
          <Calendar size={14} className="inline-icon" /> {act.deadline}
        </td>
        <td>
          <StatusBadge type="action" value={act.status} size="sm" />
        </td>
        <td>
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
        </td>
        <td className="cell-buttons">
          {role === "farmer" && farmerCanUpload(act) && (
            <button
              className="btn-upload-evidence"
              onClick={() => setSelectedActionForEvidence(act)}
            >
              <Upload size={14} />
              <span>{t("actions.uploadEvidence")}</span>
            </button>
          )}

          {(role === "veterinarian" || role === "officer") &&
            (act.status === "Evidence Submitted" || act.status === "Awaiting Verification") && (
              <div className="btn-group-verify">
                <button className="btn-verify-approve" onClick={() => handleVerify(act.id, true)}>
                  {t("actions.verify")}
                </button>
                <button className="btn-verify-reject" onClick={() => handleVerify(act.id, false)}>
                  {t("actions.reject")}
                </button>
              </div>
            )}
        </td>
      </tr>
      {expandedId === act.id && (
        <tr className="traceability-row">
          <td colSpan={7}>
            <CorrectiveActionTraceability action={act} />
          </td>
        </tr>
      )}
    </React.Fragment>
  );

  return (
    <div className="corrective-actions-view">
      <div className="actions-header-card">
        <div>
          <span className="eyebrow-text">{t("actions.eyebrow")}</span>
          <h2 className="view-title">{t("actions.title")}</h2>
          <p className="view-subtitle">{t("actions.subtitle")}</p>
        </div>
      </div>

      {error && (
        <div className="form-error-banner" role="alert">
          <span>{error}</span>
        </div>
      )}

      {role === "farmer" && !loading && vetPlanActions.length === 0 && actions.some(isVeterinaryActionPlan) === false && (
        <div className="empty-state vet-plan-empty-hint">
          <ClipboardList size={32} />
          <p>No veterinary action plan tasks yet.</p>
          <p className="text-muted">
            When your veterinarian sends an action plan after verifying an incident, your upload tasks
            will appear here — not the old auto-generated items from August.
          </p>
        </div>
      )}

      {role === "farmer" && !loading && vetPlanActions.length > 0 && (
        <section className="vet-action-plan-farmer-section">
          <div className="section-header-row">
            <ClipboardList size={20} />
            <h3 className="panel-title">Veterinary Action Plan — Your Tasks</h3>
          </div>
          <p className="section-text text-muted">
            Complete each action below and upload photo evidence. The veterinarian will inspect your
            uploads in Evidence Inspection.
          </p>
          <div className="vet-plan-cards">
            {vetPlanActions.map((act) => (
              <div key={act.id} className="vet-plan-card">
                <div className="vet-plan-card-head">
                  <strong>{act.title}</strong>
                  <StatusBadge type="action" value={act.status} size="sm" />
                </div>
                <p>{stripVetPlanMarker(act.description)}</p>
                <div className="vet-plan-card-meta">
                  {act.createdAt && <span>Assigned: {act.createdAt}</span>}
                  <span>Due: {act.deadline}</span>
                  <span className={`priority-badge priority-${act.priority}`}>{act.priority}</span>
                </div>
                {farmerCanUpload(act) && (
                  <button
                    type="button"
                    className="btn-upload-evidence"
                    onClick={() => setSelectedActionForEvidence(act)}
                  >
                    <Upload size={14} />
                    Upload Evidence Photo
                  </button>
                )}
                {act.submittedEvidence && (
                  <p className="text-muted">Evidence submitted — awaiting veterinary inspection.</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="actions-table-card">
        {loading ? (
          <div className="loading-state">{t("actions.loading")}</div>
        ) : tableActions.length === 0 ? (
          <div className="empty-state">{t("actions.empty")}</div>
        ) : (
          <div className="table-responsive-wrapper">
            <table className="bioshield-table">
              <thead>
                <tr>
                  <th>{t("actions.colTitle")}</th>
                  <th>{t("actions.colPriority")}</th>
                  <th>{t("actions.colAssigned")}</th>
                  <th>{t("actions.colDeadline")}</th>
                  <th>{t("actions.colStatus")}</th>
                  <th>{t("actions.colEvidence")}</th>
                  <th>{t("actions.colActions")}</th>
                </tr>
              </thead>
              <tbody>{tableActions.map(renderRow)}</tbody>
            </table>
          </div>
        )}
      </div>

      <EvidenceUploadModal
        action={selectedActionForEvidence}
        isOpen={!!selectedActionForEvidence}
        onClose={() => setSelectedActionForEvidence(null)}
        onSubmitted={() => fetchActions()}
      />
    </div>
  );
};
