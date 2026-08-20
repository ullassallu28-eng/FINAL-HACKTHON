import React, { useEffect, useState } from "react";
import { CheckCircle, HelpCircle, XCircle, FileSearch } from "lucide-react";
import type { CorrectiveAction } from "../../types";
import { correctiveActionService, riskService } from "../../services/api";
import { EvidencePreview } from "../common/EvidencePreview";
import { StatusBadge } from "../common/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";

export const EvidenceInspectionPanel: React.FC = () => {
  const { refreshFarms } = useAuth();
  const { refreshNotifications } = useNotifications();
  const [actions, setActions] = useState<CorrectiveAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [vetNote, setVetNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const list = await correctiveActionService.getAwaitingVerification();
      setActions(list);
      if (list.length > 0 && !selectedId) setSelectedId(list[0].id);
    } catch {
      setActions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selected = actions.find((a) => a.id === selectedId) ?? null;

  const handleVerify = async (approved: boolean) => {
    if (!selected) return;
    setProcessing(true);
    setMessage("");
    try {
      await correctiveActionService.verifyAction(selected.id, approved, vetNote || undefined);
      if (selected.farmId) {
        await riskService.recalculateFarm(selected.farmId).catch(() => undefined);
      }
      await refreshFarms();
      await refreshNotifications();
      setVetNote("");
      setMessage(approved ? "Evidence confirmed — corrective action closed." : "Evidence rejected — farmer must resubmit.");
      setSelectedId(null);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="evidence-inspection-panel workspace-section">
      <div className="section-header-row">
        <FileSearch size={20} />
        <h4 className="section-title">Corrective Action Evidence Inspection</h4>
      </div>

      {loading ? (
        <p className="text-muted">Loading evidence queue…</p>
      ) : actions.length === 0 ? (
        <p className="text-muted">No evidence awaiting veterinary inspection.</p>
      ) : (
        <div className="evidence-inspection-grid">
          <div className="evidence-queue-mini">
            {actions.map((act) => (
              <button
                key={act.id}
                type="button"
                className={`queue-item-card compact ${selectedId === act.id ? "selected" : ""}`}
                onClick={() => {
                  setSelectedId(act.id);
                  setVetNote("");
                  setMessage("");
                }}
              >
                <strong>{act.title}</strong>
                <span>{act.farmName}</span>
                <StatusBadge type="action" value={act.status} size="sm" />
              </button>
            ))}
          </div>

          {selected && (
            <div className="evidence-inspection-detail">
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
                  <span className="label">Required Action</span>
                  <strong>{selected.title}</strong>
                </div>
                <div className="detail-box">
                  <span className="label">Status</span>
                  <StatusBadge type="action" value={selected.status} size="sm" />
                </div>
              </div>

              <p className="section-text">{selected.description}</p>

              {selected.submittedEvidence ? (
                <div className="evidence-preview-list">
                  <EvidencePreview
                    fileName={selected.submittedEvidence.fileName}
                    fileUrl={selected.submittedEvidence.fileUrl}
                  />
                  <div className="evidence-meta-grid">
                    <div><span className="label">Submitted</span><strong>{selected.submittedEvidence.timestamp}</strong></div>
                    <div><span className="label">Location</span><strong>{selected.submittedEvidence.location || "—"}</strong></div>
                    <div><span className="label">Farmer note</span><strong>{selected.submittedEvidence.notes || "—"}</strong></div>
                  </div>
                </div>
              ) : (
                <p className="text-muted">No evidence file attached.</p>
              )}

              <label className="form-label">Veterinary Note</label>
              <textarea
                className="form-textarea"
                rows={2}
                value={vetNote}
                onChange={(e) => setVetNote(e.target.value)}
                placeholder="Document inspection findings…"
              />

              <div className="action-button-group">
                <button className="btn-action-validate" disabled={processing} onClick={() => handleVerify(true)}>
                  <CheckCircle size={16} />
                  Confirm Evidence
                </button>
                <button className="btn-action-reject" disabled={processing} onClick={() => handleVerify(false)}>
                  <XCircle size={16} />
                  Reject Evidence
                </button>
                <button
                  className="btn-action-request"
                  disabled={processing}
                  onClick={() => {
                    setVetNote((n) => n || "Please submit additional photographic evidence showing completed work.");
                    handleVerify(false);
                  }}
                >
                  <HelpCircle size={16} />
                  Request More Evidence
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {message && <div className="form-success-banner">{message}</div>}
    </div>
  );
};
