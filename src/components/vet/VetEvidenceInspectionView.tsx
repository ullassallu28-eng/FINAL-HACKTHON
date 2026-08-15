import React, { useCallback, useEffect, useState } from "react";
import { Brain, CheckCircle, FileSearch, HelpCircle, RefreshCw, XCircle } from "lucide-react";
import type { CorrectiveAction, EvidenceAnalysis } from "../../types";
import { correctiveActionService, riskService } from "../../services/api";
import { EvidencePreview } from "../common/EvidencePreview";
import { StatusBadge } from "../common/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { analyzeEvidenceLocally, isVeterinaryActionPlan, relevanceBadge, stripVetPlanMarker } from "../../utils/evidenceAnalysis";

const AWAITING_STATUSES = new Set(["Evidence Submitted", "Awaiting Verification"]);

function evidenceTimestamp(action: CorrectiveAction): string {
  return action.submittedEvidence?.timestamp ?? "";
}

export const VetEvidenceInspectionView: React.FC = () => {
  const { refreshFarms } = useAuth();
  const { refreshNotifications } = useNotifications();
  const [actions, setActions] = useState<CorrectiveAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [vetNote, setVetNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [analysis, setAnalysis] = useState<EvidenceAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [displayEvidence, setDisplayEvidence] = useState<CorrectiveAction["submittedEvidence"]>(undefined);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    try {
      let list = await correctiveActionService.getAwaitingVerification();
      list = list.filter(
        (a) =>
          AWAITING_STATUSES.has(a.status) &&
          !!a.submittedEvidence?.fileUrl &&
          isVeterinaryActionPlan(a)
      );
      setActions(list);
      setSelectedId((prev) => {
        if (prev && list.some((a) => a.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch {
      setActions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => load({ silent: true }), 12000);
    const onFocus = () => load({ silent: true });
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  const selected = actions.find((a) => a.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) {
      setDisplayEvidence(undefined);
      return;
    }

    let cancelled = false;
    setEvidenceLoading(true);
    correctiveActionService
      .getSubmittedEvidence(selected.id)
      .then((evidence) => {
        if (!cancelled) setDisplayEvidence(evidence ?? undefined);
      })
      .catch(() => {
        if (!cancelled) setDisplayEvidence(selected.submittedEvidence);
      })
      .finally(() => {
        if (!cancelled) setEvidenceLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selected?.id, selected?.submittedEvidence?.fileUrl, selected?.submittedEvidence?.timestamp]);

  useEffect(() => {
    if (!selected || !displayEvidence) {
      setAnalysis(null);
      return;
    }
    const actionForAnalysis = { ...selected, submittedEvidence: displayEvidence };
    if (selected.evidenceAnalysis) {
      setAnalysis(selected.evidenceAnalysis);
      return;
    }
    let cancelled = false;
    setAnalysisLoading(true);
    correctiveActionService
      .analyzeEvidence(selected.id)
      .then((result) => {
        if (!cancelled) setAnalysis(result);
      })
      .catch(() => {
        if (!cancelled) setAnalysis(analyzeEvidenceLocally(actionForAnalysis));
      })
      .finally(() => {
        if (!cancelled) setAnalysisLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected?.id, displayEvidence?.fileUrl, displayEvidence?.fileName]);

  const handleVerify = async (approved: boolean, noteOverride?: string) => {
    if (!selected) return;
    const note = noteOverride ?? vetNote;
    setProcessing(true);
    setMessage("");
    try {
      await correctiveActionService.verifyAction(selected.id, approved, note || undefined);
      if (selected.farmId) {
        await riskService.recalculateFarm(selected.farmId).catch(() => undefined);
      }
      await refreshFarms();
      await refreshNotifications();
      setVetNote("");
      setMessage(
        approved
          ? "Evidence confirmed. Corrective action closed. Farmer notified."
          : "Evidence rejected. Farmer must upload new evidence."
      );
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="vet-evidence-view">
      <div className="vet-header-card">
        <div className="header-left">
          <div className="vet-badge-icon">
            <FileSearch size={28} color="#FFFFFF" />
          </div>
          <div>
            <span className="eyebrow-text">EVIDENCE INSPECTION PORTAL</span>
            <h2 className="view-title">Corrective Action Evidence Inspection</h2>
            <p className="view-subtitle">
              Review photos uploaded by farmers from the Corrective Actions page — not incident report
              images.
            </p>
          </div>
        </div>
        <div className="vet-status-summary">
          <div className="summary-pill">
            <span>Awaiting inspection:</span>
            <strong>{actions.length}</strong>
          </div>
          <button type="button" className="btn-secondary" onClick={() => load()}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {loading && actions.length === 0 ? (
        <p className="loading-state">Loading evidence queue…</p>
      ) : actions.length === 0 ? (
        <div className="empty-state evidence-empty-state">
          <FileSearch size={40} />
          <p>No corrective-action evidence awaiting inspection.</p>
          <p className="text-muted">
            When a farmer uploads evidence from the Veterinary Action Plan section in Corrective Actions,
            it will appear here. Incident report photos stay on the Vet Dashboard only.
          </p>
        </div>
      ) : (
        <div className="evidence-inspection-layout">
          <aside className="evidence-inspection-queue">
            <h3 className="panel-title">Evidence Queue</h3>
            {actions.map((act) => (
              <button
                key={act.id}
                type="button"
                className={`evidence-queue-card ${selectedId === act.id ? "selected" : ""}`}
                onClick={() => {
                  setSelectedId(act.id);
                  setVetNote("");
                  setMessage("");
                }}
              >
                <strong>{act.title}</strong>
                <span>{act.farmName}</span>
                {act.submittedEvidence && (
                  <span className="evidence-queue-thumb-label">
                    Corrective upload: {act.submittedEvidence.fileName}
                  </span>
                )}
                {evidenceTimestamp(act) && (
                  <span className="evidence-queue-time">{evidenceTimestamp(act)}</span>
                )}
                <StatusBadge type="action" value={act.status} size="sm" />
              </button>
            ))}
          </aside>

          {selected && (
            <section className="evidence-inspection-main">
              <div className="workspace-details-grid">
                <div className="detail-box">
                  <span className="label">Farm</span>
                  <strong>{selected.farmName}</strong>
                </div>
                <div className="detail-box">
                  <span className="label">Incident</span>
                  <strong>{selected.incidentId ?? "—"}</strong>
                </div>
                <div className="detail-box">
                  <span className="label">Required action</span>
                  <strong>{selected.title}</strong>
                </div>
                <div className="detail-box">
                  <span className="label">Status</span>
                  <StatusBadge type="action" value={selected.status} size="sm" />
                </div>
              </div>

              <p className="section-text">{stripVetPlanMarker(selected.description)}</p>

              <div className="farmer-evidence-block">
                <div className="evidence-source-banner">
                  Corrective Actions upload — this is the photo the farmer submitted for this action
                  plan task, not the original incident report image.
                </div>
                <h4 className="section-title">Farmer corrective action evidence</h4>
                {evidenceLoading ? (
                  <p className="text-muted">Loading farmer upload…</p>
                ) : displayEvidence ? (
                  <>
                    <div className="farmer-photo-frame">
                      <EvidencePreview
                        fileName={displayEvidence.fileName}
                        fileUrl={displayEvidence.fileUrl}
                        notes={displayEvidence.notes}
                      />
                    </div>
                    <div className="evidence-meta-grid">
                      <div>
                        <span className="label">Action ID</span>
                        <strong>{selected.id}</strong>
                      </div>
                      <div>
                        <span className="label">Uploaded file</span>
                        <strong>{displayEvidence.fileName}</strong>
                      </div>
                      <div>
                        <span className="label">Submitted at</span>
                        <strong>{displayEvidence.timestamp}</strong>
                      </div>
                      <div>
                        <span className="label">Location</span>
                        <strong>{displayEvidence.location || "—"}</strong>
                      </div>
                      <div>
                        <span className="label">Farmer note</span>
                        <strong>{displayEvidence.notes || "—"}</strong>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-muted">Waiting for farmer to upload evidence from Corrective Actions.</p>
                )}
              </div>

              {displayEvidence && (
                <div className="ai-evidence-analysis-block">
                  <div className="ai-analysis-header">
                    <Brain size={20} />
                    <h4 className="section-title">Aarohi AI Evidence Analysis</h4>
                    {analysis && (
                      <span className={`ai-relevance-badge ${relevanceBadge(analysis.relevanceLevel).className}`}>
                        {relevanceBadge(analysis.relevanceLevel).label}
                        {analysis.relevanceScore != null ? ` (${analysis.relevanceScore}/100)` : ""}
                      </span>
                    )}
                    {analysis?.analysisMethod && (
                      <span className="ai-method-badge">{analysis.analysisMethod}</span>
                    )}
                  </div>
                  {analysisLoading ? (
                    <p className="text-muted">Analyzing image pixels and problem description…</p>
                  ) : analysis ? (
                    <>
                      <p className="ai-analysis-summary">{analysis.summary}</p>
                      {analysis.relevanceLevel === "unrelated" && (
                        <div className="ai-reject-hint">
                          This upload does not appear to show farm corrective work. Recommended: reject and
                          ask the farmer for a photo of the actual completed action.
                        </div>
                      )}
                      <div className="ai-observations">
                        <span className="label">Observations</span>
                        <ul>
                          {analysis.observations.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="ai-recommended-actions">
                        <span className="label">Recommended follow-up actions</span>
                        <div className="ai-rec-cards">
                          {analysis.recommendedActions.map((rec) => (
                            <div key={rec.title} className="ai-rec-card">
                              <strong>{rec.title}</strong>
                              <p>{rec.description}</p>
                              <span className={`priority-badge priority-${rec.priority}`}>
                                {rec.priority}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <p className="ai-disclaimer text-muted">{analysis.disclaimer}</p>
                    </>
                  ) : null}
                </div>
              )}

              <label className="form-label">Veterinary inspection note</label>
              <textarea
                className="form-textarea"
                rows={3}
                value={vetNote}
                onChange={(e) => setVetNote(e.target.value)}
                placeholder="Document whether the photo demonstrates the corrective action was completed…"
              />

              <div className="action-button-group">
                <button
                  type="button"
                  className="btn-action-validate"
                  disabled={processing || !displayEvidence}
                  onClick={() => handleVerify(true)}
                >
                  <CheckCircle size={16} />
                  Confirm Evidence
                </button>
                <button
                  type="button"
                  className="btn-action-reject"
                  disabled={processing || !displayEvidence}
                  onClick={() => handleVerify(false)}
                >
                  <XCircle size={16} />
                  Reject Evidence
                </button>
                <button
                  type="button"
                  className="btn-action-request"
                  disabled={processing || !displayEvidence}
                  onClick={() =>
                    handleVerify(
                      false,
                      vetNote ||
                        "Please submit additional photographic evidence clearly showing the completed corrective work."
                    )
                  }
                >
                  <HelpCircle size={16} />
                  Request More Evidence
                </button>
              </div>
            </section>
          )}
        </div>
      )}

      {message && <div className="form-success-banner">{message}</div>}
    </div>
  );
};
