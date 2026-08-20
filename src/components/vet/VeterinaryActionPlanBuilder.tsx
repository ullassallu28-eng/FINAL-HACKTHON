import React, { useEffect, useState } from "react";
import { ClipboardList, Plus, Send, Trash2 } from "lucide-react";
import type { ActionPlanItem, IncidentReport, RecommendedAction } from "../../types";
import { incidentService } from "../../services/api";
import { getDefaultRecommendedActions } from "../../data/recommendedActions";
import { useNotifications } from "../../context/NotificationContext";

interface PlanRow extends ActionPlanItem {
  id: string;
  selected: boolean;
}

interface VeterinaryActionPlanBuilderProps {
  incident: IncidentReport;
  farmId: string;
  ownerName: string;
  onSent: () => void;
}

function defaultDeadline(): string {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toISOString().slice(0, 10);
}

function toPlanRows(items: RecommendedAction[], ownerName: string): PlanRow[] {
  return items.map((item, idx) => ({
    id: `rec-${idx}-${item.key}`,
    selected: item.selected,
    title: item.title,
    description: item.description,
    priority: item.priority,
    assignedPerson: ownerName,
    deadline: defaultDeadline(),
    evidenceRequired: item.evidenceRequired,
    veterinaryNote: "",
  }));
}

export const VeterinaryActionPlanBuilder: React.FC<VeterinaryActionPlanBuilderProps> = ({
  incident,
  farmId,
  ownerName,
  onSent,
}) => {
  const { refreshNotifications } = useNotifications();
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [usedFallback, setUsedFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setUsedFallback(false);

    incidentService
      .getRecommendedActions(incident.id, incident.incidentType)
      .then((items) => {
        if (cancelled) return;
        setRows(toPlanRows(items, ownerName));
      })
      .catch(() => {
        if (cancelled) return;
        setUsedFallback(true);
        setRows(toPlanRows(getDefaultRecommendedActions(incident.incidentType), ownerName));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [incident.id, incident.incidentType, ownerName]);

  const updateRow = (id: string, patch: Partial<PlanRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        selected: true,
        title: "",
        description: "",
        priority: "medium",
        assignedPerson: ownerName,
        deadline: defaultDeadline(),
        evidenceRequired: true,
        veterinaryNote: "",
      },
    ]);
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSend = async () => {
    const selected = rows.filter((r) => r.selected && r.title.trim());
    if (selected.length === 0) {
      setError("Select at least one action with a title.");
      return;
    }
    setSending(true);
    setError("");
    setSuccess("");
    try {
      const payload: ActionPlanItem[] = selected.map(({ selected: _s, id: _id, ...rest }) => rest);
      const result = await incidentService.sendActionPlan(incident.id, farmId, payload);
      setSuccess(
        `Veterinary Action Plan sent — ${result.actionsCreated} corrective action(s) assigned. Farmer notified.`
      );
      await refreshNotifications();
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send action plan. Ensure you are logged in as veterinarian.");
    } finally {
      setSending(false);
    }
  };

  if (incident.status !== "Verified") {
    return (
      <div className="workspace-section action-plan-builder">
        <p className="text-muted">
          Verify this incident first, then the Veterinary Action Plan builder will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="workspace-section action-plan-builder">
      <div className="section-header-row">
        <ClipboardList size={20} />
        <h4 className="section-title">Veterinary Action Plan</h4>
      </div>
      <p className="section-text text-muted">
        Select recommended biosecurity actions, edit as needed, then send to the farmer. Each action
        appears under Corrective Actions with evidence upload required.
      </p>
      {usedFallback && (
        <p className="form-success-banner" style={{ marginBottom: 12 }}>
          Loaded system recommendations (API sync pending — actions will still be created on send).
        </p>
      )}

      {loading ? (
        <p className="text-muted">Loading recommended actions…</p>
      ) : rows.length === 0 ? (
        <p className="text-muted">No recommendations loaded. Click Add Action to create manually.</p>
      ) : (
        <>
          <div className="recommended-actions-list">
            {rows.map((row) => (
              <div key={row.id} className={`action-plan-row ${row.selected ? "selected" : ""}`}>
                <label className="action-plan-check">
                  <input
                    type="checkbox"
                    checked={row.selected}
                    onChange={(e) => updateRow(row.id, { selected: e.target.checked })}
                  />
                </label>
                <div className="action-plan-fields">
                  <input
                    className="form-input"
                    value={row.title}
                    placeholder="Action title"
                    onChange={(e) => updateRow(row.id, { title: e.target.value })}
                  />
                  <textarea
                    className="form-textarea"
                    rows={2}
                    value={row.description}
                    placeholder="Action description"
                    onChange={(e) => updateRow(row.id, { description: e.target.value })}
                  />
                  <div className="action-plan-meta-row">
                    <select
                      className="form-select"
                      value={row.priority}
                      onChange={(e) => updateRow(row.id, { priority: e.target.value })}
                    >
                      <option value="urgent">Urgent</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                    <input
                      type="date"
                      className="form-input"
                      value={row.deadline}
                      onChange={(e) => updateRow(row.id, { deadline: e.target.value })}
                    />
                    <label className="inline-check">
                      <input
                        type="checkbox"
                        checked={row.evidenceRequired}
                        onChange={(e) => updateRow(row.id, { evidenceRequired: e.target.checked })}
                      />
                      Evidence required
                    </label>
                  </div>
                  <input
                    className="form-input"
                    value={row.veterinaryNote ?? ""}
                    placeholder="Veterinary note (optional)"
                    onChange={(e) => updateRow(row.id, { veterinaryNote: e.target.value })}
                  />
                </div>
                <button type="button" className="btn-icon-danger" onClick={() => removeRow(row.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="action-plan-toolbar">
            <button type="button" className="btn-secondary" onClick={addRow}>
              <Plus size={16} />
              Add Action
            </button>
            <button type="button" className="btn-action-validate" disabled={sending} onClick={handleSend}>
              <Send size={16} />
              Send Action Plan to Farmer
            </button>
          </div>
        </>
      )}

      {error && <div className="form-error-banner">{error}</div>}
      {success && <div className="form-success-banner">{success}</div>}
    </div>
  );
};
