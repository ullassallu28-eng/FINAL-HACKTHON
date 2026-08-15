import React, { useEffect, useState } from "react";
import { MapPin, Filter, Info, Phone, User, Calendar, ExternalLink, AlertTriangle } from "lucide-react";
import type { GisMapNode, FarmType, RiskLevel, SpatialRiskResponse, IncidentReport } from "../../types";
import { gisService, incidentService } from "../../services/api";
import { useTranslation } from "../../context/LocaleContext";
import { translateContent } from "../../i18n/contentTranslate";
import { translateData } from "../../i18n/dataTranslations";
import { StatusBadge } from "../common/StatusBadge";

interface GisFarmMapProps {
  onOpenPassport?: () => void;
  onNavigateToRisk?: () => void;
}

function farmTypeIcon(farmType: FarmType): string {
  if (farmType === "poultry") return "🐔";
  if (farmType === "pig") return "🐷";
  return "🐷🐔";
}

function riskEmoji(level: RiskLevel): string {
  if (level === "safe" || level === "low") return "🟢";
  if (level === "caution" || level === "medium") return "🟡";
  if (level === "critical" || level === "high") return "🔴";
  return "🟠";
}

export const GisFarmMap: React.FC<GisFarmMapProps> = ({ onOpenPassport, onNavigateToRisk }) => {
  const { t, locale } = useTranslation();
  const [nodes, setNodes] = useState<GisMapNode[]>([]);
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [spatialRisk, setSpatialRisk] = useState<SpatialRiskResponse | null>(null);

  const [filterType, setFilterType] = useState<FarmType | "all">("all");
  const [filterRisk, setFilterRisk] = useState<RiskLevel | "all">("all");
  const [selectedNode, setSelectedNode] = useState<GisMapNode | null>(null);

  useEffect(() => {
    gisService.getGisMapNodes().then((data) => {
      setNodes(data);
      if (data.length > 0) setSelectedNode(data[0]);
    });
    incidentService.getIncidents().then(setIncidents).catch(() => setIncidents([]));
  }, []);

  useEffect(() => {
    if (!selectedNode || selectedNode.id.startsWith("VET")) {
      setSpatialRisk(null);
      return;
    }
    gisService
      .getSpatialRisk(selectedNode.id, 15)
      .then(setSpatialRisk)
      .catch(() => setSpatialRisk(null));
  }, [selectedNode?.id]);

  const filteredNodes = nodes.filter((node) => {
    if (filterType !== "all" && node.farmType !== filterType) return false;
    if (filterRisk !== "all" && node.riskLevel !== filterRisk) return false;
    return true;
  });

  const visibleFarmIds = new Set(
    filteredNodes.filter((n) => !n.id.startsWith("VET")).map((n) => n.id)
  );

  const farmIncidents = selectedNode
    ? incidents.filter((i) => i.farmId === selectedNode.id)
    : [];

  return (
    <div className="gis-map-view">
      <div className="gis-header-card">
        <div>
          <span className="eyebrow-text">{t("gis.eyebrow")}</span>
          <h2 className="view-title">{t("gis.title")}</h2>
        </div>

        <div className="gis-filter-bar">
          <div className="filter-group">
            <Filter size={16} className="filter-icon" />
            <label>{t("gis.farmType")}:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FarmType | "all")}
              className="filter-select"
            >
              <option value="all">{t("gis.allTypes")}</option>
              <option value="poultry">{t("gis.poultry")}</option>
              <option value="pig">{t("gis.pig")}</option>
              <option value="mixed">{t("gis.mixed")}</option>
            </select>
          </div>

          <div className="filter-group">
            <label>{t("gis.riskLevel")}:</label>
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value as RiskLevel | "all")}
              className="filter-select"
            >
              <option value="all">{t("gis.allRisks")}</option>
              <option value="safe">{t("gis.riskLow")}</option>
              <option value="caution">{t("gis.riskMedium")}</option>
              <option value="critical">{t("gis.riskHigh")}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="gis-workspace-grid">
        <div className="gis-canvas-container">
          <div className="gis-map-canvas">
            <div className="topology-grid-overlay" />
            <div className="river-path" />
            <div className="highway-line highway-1" />
            <div className="highway-line highway-2" />

            {filteredNodes.map((node) => {
              const topPct = Math.max(15, Math.min(85, ((24.1 - node.lat) / 1.1) * 100));
              const leftPct = Math.max(15, Math.min(85, ((node.lng - 85.1) / 0.5) * 100));
              const isSelected = selectedNode?.id === node.id;
              const isVet = node.id.startsWith("VET");

              return (
                <div
                  key={node.id}
                  className={`map-node-marker risk-${node.riskLevel} ${isSelected ? "active" : ""} ${isVet ? "vet-node" : "farm-node"}`}
                  style={{ top: `${topPct}%`, left: `${leftPct}%` }}
                  onClick={() => setSelectedNode(node)}
                >
                  <div className="marker-pin farm-marker-pin">
                    <span className="farm-type-icon" aria-hidden>
                      {isVet ? "🏥" : farmTypeIcon(node.farmType)}
                    </span>
                    <span className="risk-badge-icon" aria-hidden>
                      {riskEmoji(node.riskLevel)}
                    </span>
                  </div>
                  <span className="marker-tooltip marker-tooltip-named">
                    {translateData(node.name, locale)}
                    <br />
                    <small>{node.id} • {node.score}/100</small>
                  </span>
                </div>
              );
            })}

            {incidents.filter((inc) => visibleFarmIds.has(inc.farmId)).slice(0, 8).map((inc, idx) => {
              const farmNode = nodes.find((n) => n.id === inc.farmId);
              if (!farmNode) return null;
              const topPct = Math.max(10, Math.min(90, ((24.1 - farmNode.lat) / 1.1) * 100 + (idx % 3) * 3));
              const leftPct = Math.max(10, Math.min(90, ((farmNode.lng - 85.1) / 0.5) * 100 + (idx % 2) * 4));
              return (
                <div
                  key={inc.id}
                  className="map-incident-marker"
                  style={{ top: `${topPct}%`, left: `${leftPct}%` }}
                  title={`${t("gis.incidentMarker")}: ${translateContent(inc.incidentType, t)}`}
                >
                  <span className="incident-icon">🚨</span>
                </div>
              );
            })}

            {spatialRisk?.containmentZones.map((zone, idx) => (
              <div
                key={zone.id}
                className="quarantine-buffer-zone spatial-zone"
                style={{ top: `${30 + idx * 12}%`, left: `${55 + idx * 8}%` }}
              >
                <span className="buffer-label">{zone.reason || t("gis.containmentZones")}</span>
              </div>
            ))}

            <div className="gis-map-legend">
              <span className="legend-item"><span className="legend-emoji">🐔</span> {t("gis.poultry")}</span>
              <span className="legend-item"><span className="legend-emoji">🐷</span> {t("gis.pig")}</span>
              <span className="legend-item"><span className="legend-dot green" /> {t("gis.legendLowRisk")}</span>
              <span className="legend-item"><span className="legend-dot red" /> {t("gis.legendHighRisk")}</span>
              <span className="legend-item"><span className="legend-emoji">🚨</span> {t("gis.incidentMarker")}</span>
            </div>
          </div>
        </div>

        {selectedNode ? (
          <div className="gis-detail-panel">
            <div className="panel-header">
              <span className="node-type-tag">
                {farmTypeIcon(selectedNode.farmType)}{" "}
                {selectedNode.farmType === "poultry"
                  ? t("status.farmType.poultry")
                  : selectedNode.farmType === "pig"
                  ? t("status.farmType.pig")
                  : t("status.farmType.mixed")}
              </span>
              <h3 className="node-name">{translateData(selectedNode.name, locale)}</h3>
              <span className="node-id-sub">{t("common.farmId")}: {selectedNode.id}</span>
              <StatusBadge type="risk" value={selectedNode.riskLevel} size="sm" />
            </div>

            <div className="node-metrics-box">
              <div className="node-metric">
                <span className="label">{t("score.current")}</span>
                <strong className={`val ${selectedNode.score >= 75 ? "text-green" : "text-red"}`}>
                  {selectedNode.score}/100
                </strong>
              </div>
              <div className="node-metric">
                <span className="label">{t("gis.activeIncidents")}</span>
                <strong className="val">{selectedNode.activeIncidents}</strong>
              </div>
            </div>

            <div className="node-details-list">
              <div className="detail-row">
                <User size={16} className="icon-sub" />
                <div>
                  <span className="label">{t("gis.owner")}</span>
                  <strong>{translateData(selectedNode.owner, locale)}</strong>
                </div>
              </div>
              <div className="detail-row">
                <Phone size={16} className="icon-sub" />
                <div>
                  <span className="label">{t("gis.contact")}</span>
                  <strong>{selectedNode.contact}</strong>
                </div>
              </div>
              <div className="detail-row">
                <MapPin size={16} className="icon-sub" />
                <div>
                  <span className="label">{t("gis.gps")}</span>
                  <strong>{selectedNode.lat.toFixed(4)}° N, {selectedNode.lng.toFixed(4)}° E</strong>
                </div>
              </div>
              <div className="detail-row">
                <Calendar size={16} className="icon-sub" />
                <div>
                  <span className="label">{t("gis.lastInspection")}</span>
                  <strong>{selectedNode.lastInspection}</strong>
                </div>
              </div>
            </div>

            {spatialRisk && (
              <div className="spatial-risk-panel">
                <h4><AlertTriangle size={16} /> {t("gis.spatialRisk")}</h4>
                <p className="spatial-context">{translateContent(spatialRisk.regionalContext, t)}</p>
                <div className="spatial-stat">
                  {t("gis.nearbyIncidents")}: <strong>{spatialRisk.nearbyIncidents}</strong>
                </div>
                {spatialRisk.nearbyHighRiskFarms.length > 0 && (
                  <div className="nearby-farms-list">
                    <span className="label">{t("gis.nearbyHighRisk")}</span>
                    <ul>
                      {spatialRisk.nearbyHighRiskFarms.map((f) => (
                        <li key={f.id}>
                          {farmTypeIcon(f.farmType)} {translateData(f.name, locale)} — {f.score}/100 (
                          {t("gis.distanceKm", { distance: f.distanceKm })})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="gis-disclaimer-small">{t("gis.disclaimer")}</p>
              </div>
            )}

            <div className="gis-action-buttons">
              {onOpenPassport && !selectedNode.id.startsWith("VET") && (
                <button className="btn-view-passport-gis" onClick={onOpenPassport}>
                  <ExternalLink size={16} />
                  <span>{t("gis.viewPassport")}</span>
                </button>
              )}
              {onNavigateToRisk && (
                <button className="btn-secondary-action" onClick={onNavigateToRisk}>
                  {t("gis.viewRisk")}
                </button>
              )}
            </div>

            {farmIncidents.length > 0 && (
              <div className="gis-incidents-list">
                <strong>{t("gis.incidentMarker")} ({farmIncidents.length})</strong>
                {farmIncidents.slice(0, 3).map((inc) => (
                  <div key={inc.id} className="gis-incident-item">
                    {translateContent(inc.incidentType, t)}
                  </div>
                ))}
              </div>
            )}

            <div className="gis-api-disclaimer">
              <Info size={14} />
              <span>{t("gis.disclaimer")}</span>
            </div>
          </div>
        ) : (
          <div className="gis-detail-panel empty">{t("gis.noSpatialData")}</div>
        )}
      </div>
    </div>
  );
};
