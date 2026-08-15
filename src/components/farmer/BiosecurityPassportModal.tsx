import React, { useEffect, useState } from "react";
import {
  X,
  ShieldCheck,
  QrCode,
  Calendar,
  Award,
  CheckCircle,
  AlertTriangle,
  ScanLine,
} from "lucide-react";
import type { BiosecurityPassport } from "../../types";
import { passportService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/LocaleContext";
import { translateContent } from "../../i18n/contentTranslate";
import { translateData } from "../../i18n/dataTranslations";

interface BiosecurityPassportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Short text payload — scannable with any phone camera QR reader */
function buildQrPayload(passport: BiosecurityPassport) {
  return [
    "AGRISENTINEL",
    passport.farmId,
    passport.passportQrCode,
    `SCORE:${passport.biosecurityScore}`,
    `STATUS:${passport.complianceStatus}`,
  ].join("|");
}

export const BiosecurityPassportModal: React.FC<BiosecurityPassportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { activeFarm } = useAuth();
  const { t, locale } = useTranslation();
  const [passport, setPassport] = useState<BiosecurityPassport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [showScanResult, setShowScanResult] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setShowScanResult(false);
      setScanning(false);
      setQrDataUrl("");
      return;
    }

    setLoading(true);
    setError("");
    setPassport(null);

    passportService
      .getBiosecurityPassport(activeFarm.id)
      .then((data) => {
        setPassport(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : t("passport.error"));
        setLoading(false);
      });
  }, [isOpen, activeFarm.id]);

  useEffect(() => {
    if (!passport) {
      setQrDataUrl("");
      return;
    }

    import("qrcode")
      .then((QRCode) =>
        QRCode.toDataURL(buildQrPayload(passport), {
          width: 160,
          margin: 2,
          errorCorrectionLevel: "M",
        })
      )
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [passport]);

  const handleQrScan = () => {
    setScanning(true);
    window.setTimeout(() => {
      setScanning(false);
      setShowScanResult(true);
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="passport-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="passport-modal-header">
          <div className="header-left">
            <ShieldCheck size={28} className="shield-icon-badge" />
            <div>
              <span className="passport-eyebrow">{t("passport.eyebrow")}</span>
              <h2 className="passport-modal-title">{t("passport.title")}</h2>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label={t("common.close")}>
            <X size={22} />
          </button>
        </div>

        {loading ? (
          <div className="modal-loading-state">
            <div className="spinner" />
            <p>{t("passport.loading")}</p>
          </div>
        ) : error ? (
          <div className="modal-loading-state">
            <AlertTriangle size={32} color="#DC2626" />
            <p>{error}</p>
            <button className="btn-secondary-action" onClick={onClose}>{t("common.close")}</button>
          </div>
        ) : passport ? (
          <div className="passport-body">
            <div className="passport-verified-banner">
              <div className="banner-badge-icon">
                <Award size={32} />
              </div>
              <div className="banner-details">
                <div className="verified-title-row">
                  <h3>{translateData(passport.farmName, locale)}</h3>
                  <span className="status-pill-verified">
                    <CheckCircle size={14} /> {translateContent(passport.complianceStatus, t)}
                  </span>
                </div>
                <p className="passport-farm-sub">
                  {t("passport.metaLine", {
                    farmId: passport.farmId,
                    farmType:
                      passport.farmType === "poultry"
                        ? t("status.farmType.poultry")
                        : passport.farmType === "pig"
                        ? t("status.farmType.pig")
                        : t("status.farmType.mixed"),
                    issueDate: passport.issueDate,
                  })}
                </p>
                <div className="continuous-monitored-tag">
                  <span className="live-dot-green"></span>
                  <span>{t("passport.monitored")}</span>
                </div>
              </div>

              <div className="qr-box">
                {qrDataUrl ? (
                  <button
                    type="button"
                    className={`qr-scan-button ${scanning ? "scanning" : ""}`}
                    onClick={handleQrScan}
                    title={t("passport.qrScanTitle")}
                    aria-label={t("passport.qrScanAria")}
                  >
                    <img
                      src={qrDataUrl}
                      alt={t("passport.qrAlt", {
                        farmName: translateData(passport.farmName, locale),
                      })}
                      className="passport-qr-image"
                    />
                    {scanning && <span className="qr-scan-overlay">{t("passport.scanning")}</span>}
                  </button>
                ) : (
                  <QrCode size={48} />
                )}
                <span className="qr-code-text">{passport.passportQrCode}</span>
                <button type="button" className="btn-qr-scan" onClick={handleQrScan}>
                  <ScanLine size={14} />
                  {showScanResult ? t("passport.scanAgain") : t("passport.tapQr")}
                </button>
                <p className="qr-hint-text">{t("passport.qrHint")}</p>
              </div>
            </div>

            {showScanResult && (
              <div className="qr-scan-result-panel">
                <h4 className="section-title">
                  <CheckCircle size={18} color="#16A34A" /> {t("passport.scanVerified")}
                </h4>
                <div className="qr-scan-grid">
                  <div className="scan-result-item">
                    <span>{t("passport.farmName")}</span>
                    <strong>{translateData(passport.farmName, locale)}</strong>
                  </div>
                  <div className="scan-result-item">
                    <span>{t("passport.farmId")}</span>
                    <strong>{passport.farmId}</strong>
                  </div>
                  <div className="scan-result-item">
                    <span>{t("passport.owner")}</span>
                    <strong>{translateData(passport.ownerName, locale)}</strong>
                  </div>
                  <div className="scan-result-item">
                    <span>{t("passport.biosecurityScore")}</span>
                    <strong>{passport.biosecurityScore}/100</strong>
                  </div>
                  <div className="scan-result-item">
                    <span>{t("passport.complianceStatusLabel")}</span>
                    <strong>{translateContent(passport.complianceStatus, t)}</strong>
                  </div>
                  <div className="scan-result-item">
                    <span>{t("passport.passportCodeLabel")}</span>
                    <strong>{passport.passportQrCode}</strong>
                  </div>
                </div>
                <p className="qr-scan-note">
                  {t("passport.scanNote", {
                    location: translateData(passport.location, locale),
                  })}
                </p>
              </div>
            )}

            <div className="passport-info-grid">
              <div className="info-tile">
                <span className="tile-label">{t("passport.locationSector")}</span>
                <strong className="tile-value">{translateData(passport.location, locale)}</strong>
              </div>
              <div className="info-tile">
                <span className="tile-label">{t("passport.farmOwner")}</span>
                <strong className="tile-value">{translateData(passport.ownerName, locale)}</strong>
              </div>
              <div className="info-tile">
                <span className="tile-label">{t("passport.capacity")}</span>
                <strong className="tile-value">
                  {passport.animalCount} / {passport.capacity} {t("passport.headUnit")}
                </strong>
              </div>
              <div className="info-tile">
                <span className="tile-label">{t("passport.lastInspection")}</span>
                <strong className="tile-value">{passport.lastInspectionDate}</strong>
              </div>
            </div>

            <div className="passport-scores-section">
              <h4 className="section-title">{t("passport.scoreBreakdown")}</h4>
              <div className="score-bars-grid">
                <div className="score-item">
                  <div className="score-label-row">
                    <span>{t("passport.overallIndex")}</span>
                    <strong>{passport.biosecurityScore}/100</strong>
                  </div>
                  <div className="bar-bg">
                    <div
                      className="bar-fill bg-emerald"
                      style={{ width: `${passport.biosecurityScore}%` }}
                    />
                  </div>
                </div>

                <div className="score-item">
                  <div className="score-label-row">
                    <span>{t("passport.hygieneFacility")}</span>
                    <strong>{passport.hygieneScore}/100</strong>
                  </div>
                  <div className="bar-bg">
                    <div
                      className="bar-fill bg-emerald"
                      style={{ width: `${passport.hygieneScore}%` }}
                    />
                  </div>
                </div>

                <div className="score-item">
                  <div className="score-label-row">
                    <span>{t("passport.visitorVehicle")}</span>
                    <strong>{passport.visitorControlScore}/100</strong>
                  </div>
                  <div className="bar-bg">
                    <div
                      className="bar-fill bg-amber"
                      style={{ width: `${passport.visitorControlScore}%` }}
                    />
                  </div>
                </div>

                <div className="score-item">
                  <div className="score-label-row">
                    <span>{t("passport.quarantineIsolation")}</span>
                    <strong>{passport.quarantineProtocolScore}/100</strong>
                  </div>
                  <div className="bar-bg">
                    <div
                      className="bar-fill bg-emerald"
                      style={{ width: `${passport.quarantineProtocolScore}%` }}
                    />
                  </div>
                </div>

                <div className="score-item">
                  <div className="score-label-row">
                    <span>{t("passport.vaccinationRate")}</span>
                    <strong>{passport.vaccinationCoverage}%</strong>
                  </div>
                  <div className="bar-bg">
                    <div
                      className="bar-fill bg-blue"
                      style={{ width: `${passport.vaccinationCoverage}%` }}
                    />
                  </div>
                </div>

                <div className="score-item">
                  <div className="score-label-row">
                    <span>{t("passport.wasteCarcass")}</span>
                    <strong>{passport.wasteManagementScore}/100</strong>
                  </div>
                  <div className="bar-bg">
                    <div
                      className="bar-fill bg-emerald"
                      style={{ width: `${passport.wasteManagementScore}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="passport-inspection-history">
              <h4 className="section-title">{t("passport.inspectionHistory")}</h4>
              <div className="history-list">
                {passport.inspectionHistory.length === 0 ? (
                  <p className="timeline-desc">{t("passport.noInspections")}</p>
                ) : (
                  passport.inspectionHistory.map((item) => (
                    <div key={item.id} className="history-card">
                      <div className="history-meta">
                        <div className="date-box">
                          <Calendar size={16} />
                          <span>{item.date}</span>
                        </div>
                        <span className={`result-tag ${item.result.toLowerCase().replace(" ", "-")}`}>
                          {translateContent(item.result, t)}
                        </span>
                      </div>
                      <div className="history-details">
                        <strong>{item.inspectorName}</strong>
                        <p>{translateContent(item.notes, t)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="passport-footer">
              <p className="passport-disclaimer">
                <AlertTriangle size={14} className="inline-icon" /> {t("passport.disclaimer")}
              </p>
              <button className="btn-secondary-action" onClick={onClose}>{t("passport.close")}</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
