import React, { useEffect, useState } from "react";
import { Stethoscope, CheckCircle, HelpCircle, XCircle, MapPin, ShieldAlert } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import type { Farm, IncidentReport, RiskFactor, RiskSummary } from "../../types";
import { farmService, gisService, incidentService, riskService } from "../../services/api";
import { StatusBadge } from "../common/StatusBadge";
import { EvidencePreview } from "../common/EvidencePreview";
import { VeterinaryActionPlanBuilder } from "./VeterinaryActionPlanBuilder";

const VET_INCIDENT_STATUS_ORDER: Record<string, number> = {
  Reported: 0,
  "Under Review": 1,
  "More Info Required": 2,
  Verified: 3,
  Rejected: 4,
};

function isPendingIncident(inc: IncidentReport): boolean {
  return (
    inc.status === "Reported" ||
    inc.status === "Under Review" ||
    inc.status === "More Info Required"
  );
}

function sortIncidentsForVetQueue(list: IncidentReport[]): IncidentReport[] {
  return [...list].sort((a, b) => {
    const sa = VET_INCIDENT_STATUS_ORDER[a.status] ?? 99;
    const sb = VET_INCIDENT_STATUS_ORDER[b.status] ?? 99;
    if (sa !== sb) return sa - sb;
    return b.dateTime.localeCompare(a.dateTime);
  });
}

export const VetDashboard: React.FC = () => {
  const { activeFarm, setActiveFarm, allFarms, refreshFarms } = useAuth();
  // Track which farm ID we last fetched for — prevents stale data on farm switch
  const [fetchedFarmId, setFetchedFarmId] = useState<string>("all");
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<IncidentReport | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [farmContext, setFarmContext] = useState<Farm | null>(null);
  const [riskSummary, setRiskSummary] = useState<RiskSummary | null>(null);
  const [riskFactors, setRiskFactors] = useState<RiskFactor[]>([]);
  const [spatialNote, setSpatialNote] = useState<string>("");
  const [farmFilter, setFarmFilter] = useState<string>("all");

  const fetchIncidents = async (farmId?: string, preferIncidentId?: string) => {
    setLoading(true);
    try {
      // Pass farmId so the backend scopes results to the selected farm.
      // Backend validates the vet is authorized for that farm — 403 if not.
      const list = sortIncidentsForVetQueue(
        await incidentService.getIncidents(farmId !== "all" ? farmId : undefined)
      );
      setIncidents(list);
      setFetchedFarmId(farmId ?? "all");
      if (list.length > 0) {
        setSelectedIncident((prev) => {
          const keepId = preferIncidentId ?? prev?.id;
          if (keepId) {
            const found = list.find((i) => i.id === keepId);
            if (found) return found;
          }
          return list.find(isPendingIncident) ?? list[0];
        });
      } else {
        setSelectedIncident(null);
      }
    } catch (err) {
      console.error(err);
      setIncidents([]);
      setSelectedIncident(null);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch — load all incidents the vet is authorized to see
  useEffect(() => {
    void fetchIncidents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when the active farm changes in the navbar
  // This ensures farm isolation: selecting Farm A shows only Farm A incidents
  useEffect(() => {
    if (activeFarm.id !== fetchedFarmId) {
      setFarmFilter(activeFarm.id);
      void fetchIncidents(activeFarm.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFarm.id]);

  useEffect(() => {
    if (!selectedIncident) return;
    let cancelled = false;
    Promise.all([
      farmService.getFarm(selectedIncident.farmId),
      riskService.getRiskSummary(selectedIncident.farmId),
      riskService.getRiskFactors(selectedIncident.farmId),
      gisService.getSpatialRisk(selectedIncident.farmId).catch(() => null),
    ]).then(([farm, summary, factors, spatial]) => {
      if (cancelled) return;
      setFarmContext(farm);
      setRiskSummary(summary);
      setRiskFactors(factors);
      if (spatial?.nearbyHighRiskFarms?.length) {
        setSpatialNote(
          `${spatial.nearbyHighRiskFarms.length} high-risk farm(s) within ${spatial.radiusKm}km.`
        );
      } else {
        setSpatialNote("No nearby high-risk farms detected in GIS radius.");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedIncident?.id, selectedIncident?.farmId]);

  const handleAction = async (action: "validate" | "request_info" | "reject") => {
    if (!selectedIncident) return;
    if (selectedIncident.status === "Verified" || selectedIncident.status === "Rejected") {
      setActionError("This incident is already closed.");
      return;
    }
    setProcessing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const updated = await incidentService.verifyIncident(selectedIncident.id, action, actionNotes);
      setSelectedIncident(updated);
      setActionNotes("");
      if (action === "validate") {
        setActionSuccess(
          "Incident verified. Risk/biosecurity status recalculated. Create and send the Veterinary Action Plan below."
        );
      } else if (action === "request_info") {
        setActionSuccess("More information requested from the farmer.");
      } else {
        setActionSuccess("Incident rejected. Risk factor removed and score recalculated.");
      }
      await fetchIncidents(
        action === "validate" || action === "reject"
          ? undefined
          : updated.id
      );
      await refreshFarms();
      const summary = await riskService.getRiskSummary(updated.farmId);
      setRiskSummary(summary);
      setRiskFactors(await riskService.getRiskFactors(updated.farmId));
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "";
      if (message.includes("already closed") || message.includes("409")) {
        setActionError("This incident is already verified or rejected.");
      } else {
        setActionError(message || "Verification action failed.");
      }
    } finally {
      setProcessing(false);
    }
  };

  const filteredIncidents = incidents.filter((inc) => {
    // Client-side filter: backend already scopes by farm/district,
    // but this ensures the displayed list matches the selected dropdown value
    if (farmFilter !== "all" && inc.farmId !== farmFilter) return false;
    return true;
  });

  const pendingCount = filteredIncidents.filter(
    (i) => i.status === "Reported" || i.status === "Under Review" || i.status === "More Info Required"
  ).length;

  const pendingIncidents = filteredIncidents.filter(isPendingIncident);
  const closedIncidents = filteredIncidents.filter((i) => !isPendingIncident(i));

  const renderIncidentCard = (inc: IncidentReport) => (
    <div
      key={inc.id}
      className={`queue-item-card ${selectedIncident?.id === inc.id ? "selected" : ""} ${
        isPendingIncident(inc) ? "queue-item-pending" : "queue-item-closed"
      }`}
      onClick={() => {
        setSelectedIncident(inc);
        setActionNotes("");
        setActionError(null);
        setActionSuccess(null);
        const matchingFarm = allFarms.find((f) => f.id === inc.farmId);
        if (matchingFarm) {
          setActiveFarm(matchingFarm);
        }
      }}
    >
      <div className="item-top">
        <span className="inc-id">{inc.id}</span>
        <StatusBadge type="incident" value={inc.status} size="sm" />
      </div>
      <strong className="inc-type">{inc.incidentType}</strong>
      <p className="inc-farm-name">{inc.farmName}</p>
      <div className="item-meta">
        <span>{inc.numberAffected} Affected</span>
        <span>{inc.dateTime}</span>
      </div>
    </div>
  );

  return (
    <div className="vet-dashboard-view">
      <div className="vet-header-card">
        <div className="header-left">
          <div className="vet-badge-icon">
            <Stethoscope size={28} color="#FFFFFF" />
          </div>
          <div>
            <span className="eyebrow-text">DISTRICT VETERINARY VERIFICATION PORTAL</span>
            <h2 className="view-title">Veterinary Verification Queue</h2>
            <p className="view-subtitle">
              Active Focus: <strong>{activeFarm.name}</strong> ({activeFarm.id}) • Review incidents → verify → send action plan across all district farms.
            </p>
          </div>
        </div>
        <div className="vet-status-summary">
          <div className="summary-pill">
            <span>Pending Review:</span>
            <strong>{pendingCount}</strong>
          </div>
          <div className="summary-pill">
            <span>Verified:</span>
            <strong>{incidents.filter((i) => i.status === "Verified").length}</strong>
          </div>
        </div>
      </div>

      <div className="vet-queue-grid">
        <div className="queue-list-panel">
          <div className="panel-header-with-filter" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 className="panel-title" style={{ margin: 0 }}>Incident Reports</h3>
            <select
              value={farmFilter}
              onChange={(e) => {
                const val = e.target.value;
                setFarmFilter(val);
                // Re-fetch from backend when farm filter changes
                // Backend validates authorization for the selected farm
                void fetchIncidents(val);
              }}
              className="filter-select"
              style={{ fontSize: "0.825rem", padding: "4px 8px" }}
            >
              <option value="all">All Farms ({allFarms.length})</option>
              {allFarms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name} ({farm.id})
                </option>
              ))}
            </select>
          </div>
          {loading ? (
            <div className="loading-state">Loading incoming incidents...</div>
          ) : filteredIncidents.length === 0 ? (
            <div className="empty-state">No incidents for selected farm filter.</div>
          ) : (
            <div className="queue-items-scroll">
              {pendingIncidents.length > 0 && (
                <>
                  <p className="queue-section-label">New &amp; pending review</p>
                  {pendingIncidents.map(renderIncidentCard)}
                </>
              )}
              {closedIncidents.length > 0 && (
                <>
                  <p className="queue-section-label queue-section-closed">
                    Verified &amp; rejected (archived)
                  </p>
                  {closedIncidents.map(renderIncidentCard)}
                </>
              )}
            </div>
          )}
        </div>

        {selectedIncident ? (
          <div className="incident-inspection-workspace">
            <div className="workspace-header">
              <div>
                <div className="id-status-row">
                  <span className="inc-id-tag">{selectedIncident.id}</span>
                  <StatusBadge type="incident" value={selectedIncident.status} size="md" />
                  <span className={`severity-tag ${selectedIncident.severity}`}>
                    Severity: {selectedIncident.severity.toUpperCase()}
                  </span>
                </div>
                <h3 className="inc-title">{selectedIncident.incidentType}</h3>
              </div>
            </div>

            {riskSummary && (
              <div className="workspace-section risk-context-banner">
                <ShieldAlert size={18} />
                <div>
                  <strong>
                    Biosecurity Score: {riskSummary.biosecurityScore}/100 — Risk: {riskSummary.riskLevel.toUpperCase()}
                  </strong>
                  <p className="text-muted">
                    Event 1 (verify incident) worsens risk. Event 2 (verify corrective evidence) allows recovery.
                  </p>
                </div>
              </div>
            )}

            <div className="workspace-details-grid">
              <div className="detail-box">
                <span className="label">Reporting Farm</span>
                <strong>{selectedIncident.farmName} ({selectedIncident.farmId})</strong>
              </div>
              <div className="detail-box">
                <span className="label">Farm Type / Population</span>
                <strong>
                  {selectedIncident.farmType.toUpperCase()}
                  {farmContext ? ` — ${farmContext.animalCount} animals` : ""}
                </strong>
              </div>
              <div className="detail-box">
                <span className="label">Species & Affected</span>
                <strong>
                  {selectedIncident.animalType} ({selectedIncident.numberAffected})
                </strong>
              </div>
              <div className="detail-box">
                <span className="label">Date / Zone</span>
                <strong>{selectedIncident.dateTime} — {selectedIncident.location}</strong>
              </div>
            </div>

            <div className="workspace-section">
              <h4 className="section-title">Health Observations & Symptoms</h4>
              <p className="section-text">{selectedIncident.description}</p>
            </div>

            <div className="workspace-section">
              <h4 className="section-title">Submitted Diagnostic Evidence</h4>
              {selectedIncident.evidenceFiles.length > 0 ? (
                <div className="evidence-preview-list">
                  {selectedIncident.evidenceFiles.map((file, idx) => (
                    <EvidencePreview key={idx} fileName={file.name} fileUrl={file.url} />
                  ))}
                </div>
              ) : (
                <p className="text-muted">No evidence media uploaded with initial report.</p>
              )}
            </div>

            {riskFactors.length > 0 && (
              <div className="workspace-section">
                <h4 className="section-title">Active Risk Factors</h4>
                <ul className="risk-factor-mini-list">
                  {riskFactors.slice(0, 5).map((f) => (
                    <li key={f.id}>
                      {f.label} <span className="text-red">−{f.delta}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="workspace-section nearby-risk-box">
              <MapPin size={18} className="icon-amber" />
              <div>
                <strong>Spatial / Regional Context</strong>
                <p>{spatialNote}</p>
              </div>
            </div>

            {selectedIncident.verifiedBy && (
              <div className="workspace-section">
                <h4 className="section-title">Verification Record</h4>
                <p className="section-text">
                  Verified by {selectedIncident.verifiedBy} at {selectedIncident.verifiedAt}
                  {selectedIncident.veterinarianNotes ? ` — ${selectedIncident.veterinarianNotes}` : ""}
                </p>
              </div>
            )}

            <div className="status-workflow-tracker">
              <span className="workflow-title">Workflow Progress:</span>
              <div className="workflow-steps">
                <div className="step-pill done">Reported</div>
                <div className={`step-pill ${selectedIncident.status !== "Reported" ? "done" : "active"}`}>
                  Pending Review
                </div>
                <div
                  className={`step-pill ${
                    selectedIncident.status === "Verified"
                      ? "verified"
                      : selectedIncident.status === "Rejected"
                      ? "rejected"
                      : selectedIncident.status === "More Info Required"
                      ? "warning"
                      : ""
                  }`}
                >
                  {selectedIncident.status === "Reported" || selectedIncident.status === "Under Review"
                    ? "Awaiting Verification"
                    : selectedIncident.status}
                </div>
              </div>
            </div>

            {(selectedIncident.status === "Reported" ||
              selectedIncident.status === "Under Review" ||
              selectedIncident.status === "More Info Required") && (
              <div className="workspace-action-box">
                <label className="form-label">Veterinary Inspector Notes</label>
                <textarea
                  rows={2}
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Diagnostic notes, lab directives, or rejection reasons…"
                  className="form-textarea"
                />
                {actionSuccess && <div className="form-success-banner">{actionSuccess}</div>}
                {actionError && <div className="form-error-banner">{actionError}</div>}
                <div className="action-button-group">
                  <button disabled={processing} className="btn-action-validate" onClick={() => handleAction("validate")}>
                    <CheckCircle size={16} />
                    Verify Incident
                  </button>
                  <button disabled={processing} className="btn-action-request" onClick={() => handleAction("request_info")}>
                    <HelpCircle size={16} />
                    Request More Information
                  </button>
                  <button disabled={processing} className="btn-action-reject" onClick={() => handleAction("reject")}>
                    <XCircle size={16} />
                    Reject
                  </button>
                </div>
              </div>
            )}

            <VeterinaryActionPlanBuilder
              incident={selectedIncident}
              farmId={selectedIncident.farmId}
              ownerName={farmContext?.owner ?? "Farm Owner"}
              onSent={() =>
                setActionSuccess(
                  "Veterinary Action Plan sent. Farmer will see items under Corrective Actions. Check Evidence Inspection when they upload photos."
                )
              }
            />

            <div className="workspace-section evidence-link-banner">
              <p>
                After the farmer uploads evidence, open the{" "}
                <strong>Evidence Inspection</strong> tab in the sidebar to review their photos and
                confirm.
              </p>
            </div>
          </div>
        ) : (
          <div className="workspace-empty">Select an incident from the queue to verify.</div>
        )}
      </div>
    </div>
  );
};
