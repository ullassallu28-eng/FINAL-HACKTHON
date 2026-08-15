import React, { useEffect, useState } from "react";
import { Landmark, MapPin, ArrowRight } from "lucide-react";
import type { OfficerStats } from "../../types";
import { officerService } from "../../services/api";
import { InspectionPriorityPanel } from "./InspectionPriorityPanel";
import { ScheduledInspectionsPanel } from "./ScheduledInspectionsPanel";

interface OfficerDashboardProps {
  onNavigateToGis: () => void;
}

export const OfficerDashboard: React.FC<OfficerDashboardProps> = ({ onNavigateToGis }) => {
  const [stats, setStats] = useState<OfficerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [inspectionRefreshKey, setInspectionRefreshKey] = useState(0);

  const loadStats = () => {
    setLoading(true);
    officerService
      .getOfficerStats()
      .then((statsData) => {
        setStats(statsData);
      })
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  };

  const handleScheduleSuccess = () => {
    loadStats();
    setInspectionRefreshKey((key) => key + 1);
  };

  useEffect(() => {
    loadStats();
  }, []);

  const total = stats
    ? stats.lowRiskFarms + stats.mediumRiskFarms + stats.highRiskFarms
    : 0;
  const lowPct = total ? Math.round((stats!.lowRiskFarms / total) * 100) : 0;
  const medPct = total ? Math.round((stats!.mediumRiskFarms / total) * 100) : 0;
  const highPct = total ? Math.round((stats!.highRiskFarms / total) * 100) : 0;

  return (
    <div className="officer-dashboard-view">
      <div className="officer-header-card">
        <div className="header-left">
          <div className="officer-badge-icon">
            <Landmark size={28} color="#FFFFFF" />
          </div>
          <div>
            <span className="eyebrow-text">GOVERNMENT OF INDIA • ANIMAL HUSBANDRY & BIOSECURITY</span>
            <h2 className="view-title">Regional Command Center Dashboard</h2>
            <p className="view-subtitle">District Surveillance Portal</p>
          </div>
        </div>

        <button className="btn-primary-gis" onClick={onNavigateToGis}>
          <MapPin size={18} />
          <span>Open Regional GIS Risk Map</span>
        </button>
      </div>

      {loading || !stats ? (
        <div className="loading-state">Loading regional command telemetry...</div>
      ) : (
        <div className="officer-stats-grid">
          <div className="stat-box">
            <span className="stat-label">Total Registered Farms</span>
            <strong className="stat-val">{stats.totalRegisteredFarms}</strong>
            <span className="stat-sub">Poultry & Swine Units</span>
          </div>
          <div className="stat-box border-red">
            <span className="stat-label">High-Risk Farms</span>
            <strong className="stat-val text-red">{stats.highRiskFarms}</strong>
            <span className="stat-sub">Requires Direct Audit</span>
          </div>
          <div className="stat-box border-amber">
            <span className="stat-label">Medium-Risk Farms</span>
            <strong className="stat-val text-amber">{stats.mediumRiskFarms}</strong>
            <span className="stat-sub">Under Watchlist</span>
          </div>
          <div className="stat-box border-green">
            <span className="stat-label">Low-Risk Farms</span>
            <strong className="stat-val text-green">{stats.lowRiskFarms}</strong>
            <span className="stat-sub">Compliant Status</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Active Incidents</span>
            <strong className="stat-val">{stats.openIncidents}</strong>
            <span className="stat-sub">Reported in District</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Pending Verifications</span>
            <strong className="stat-val">{stats.pendingVerifications}</strong>
            <span className="stat-sub">Awaiting Vet Officer</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Pending Inspections</span>
            <strong className="stat-val">{stats.pendingInspections}</strong>
            <span className="stat-sub">Due this week</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Open Corrective Actions</span>
            <strong className="stat-val">{stats.openCorrectiveActions}</strong>
            <span className="stat-sub">Pending farmer upload</span>
          </div>
        </div>
      )}

      <div className="officer-main-grid">
        <div className="priority-list-card priority-list-full">
          <ScheduledInspectionsPanel refreshKey={inspectionRefreshKey} />
        </div>

        <div className="priority-list-card priority-list-full">
          <InspectionPriorityPanel onScheduleSuccess={handleScheduleSuccess} />
        </div>

        {stats && (
          <div className="risk-distribution-card">
            <h3 className="panel-title">Regional Risk Distribution Summary</h3>
            <p className="panel-sub">District breakdown from officer stats API</p>

            <div className="distribution-bars-wrapper">
              <div className="dist-row">
                <div className="dist-meta">
                  <span>Low Risk Compliant ({lowPct}%)</span>
                  <strong>{stats.lowRiskFarms} Farms</strong>
                </div>
                <div className="dist-bar-bg">
                  <div className="dist-bar-fill bg-emerald" style={{ width: `${lowPct}%` }} />
                </div>
              </div>
              <div className="dist-row">
                <div className="dist-meta">
                  <span>Medium Risk Watchlist ({medPct}%)</span>
                  <strong>{stats.mediumRiskFarms} Farms</strong>
                </div>
                <div className="dist-bar-bg">
                  <div className="dist-bar-fill bg-amber" style={{ width: `${medPct}%` }} />
                </div>
              </div>
              <div className="dist-row">
                <div className="dist-meta">
                  <span>High Risk Priority ({highPct}%)</span>
                  <strong>{stats.highRiskFarms} Farms</strong>
                </div>
                <div className="dist-bar-bg">
                  <div className="dist-bar-fill bg-red" style={{ width: `${highPct}%` }} />
                </div>
              </div>
            </div>

            <div className="gis-map-promo-box" onClick={onNavigateToGis}>
              <MapPin size={28} className="promo-icon" />
              <div>
                <strong>Interactive GIS Farm Map</strong>
                <p>View registered farms, spatial risk indicators, and priority inspection areas.</p>
              </div>
              <ArrowRight size={20} className="promo-arrow" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
