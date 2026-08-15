import React, { useRef, useState } from "react";
import { X, ShieldAlert, Upload, CheckCircle2, MapPin, AlertTriangle, CloudOff } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { incidentService } from "../../services/api";
import { useTranslation } from "../../context/LocaleContext";
import { translateContent } from "../../i18n/contentTranslate";
import { isOnlineForSync, queueIncidentOffline } from "../../offline/offlineBridge";

const INCIDENT_TYPES = [
  { value: "Sudden Mortality Increase", key: "incident.type.mortality" },
  { value: "Respiratory Distress Symptoms", key: "incident.type.respiratory" },
  { value: "Feed or Water Contamination", key: "incident.type.feedWater" },
  { value: "Perimeter Fencing / Bio-Barrier Breach", key: "incident.type.perimeter" },
  { value: "Unverified Visitor Entry", key: "incident.type.visitor" },
] as const;

const ANIMAL_TYPES = [
  { value: "Poultry (Broilers)", key: "incident.animal.poultryBroilers" },
  { value: "Poultry (Layers)", key: "incident.animal.poultryLayers" },
  { value: "Swine / Pigs (Growers)", key: "incident.animal.swineGrowers" },
  { value: "Swine / Pigs (Breeding Stock)", key: "incident.animal.swineBreeding" },
] as const;

interface IncidentReportFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

export const IncidentReportForm: React.FC<IncidentReportFormProps> = ({
  isOpen,
  onClose,
  onSubmitted,
}) => {
  const { activeFarm, refreshFarms } = useAuth();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultAnimal =
    activeFarm.farmType === "poultry" ? "Poultry (Broilers)" : "Swine / Pigs (Growers)";

  const [incidentType, setIncidentType] = useState<string>(INCIDENT_TYPES[0].value);
  const [animalType, setAnimalType] = useState<string>(defaultAnimal);
  const [numberAffected, setNumberAffected] = useState<number>(12);
  const [dateTime, setDateTime] = useState<string>(new Date().toISOString().slice(0, 16));
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedStatus, setSubmittedStatus] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);
  const [localIncidentId, setLocalIncidentId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isOpen) return null;

  const displayIncidentType =
    INCIDENT_TYPES.find((x) => x.value === incidentType)?.key
      ? t(INCIDENT_TYPES.find((x) => x.value === incidentType)!.key)
      : incidentType;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    const payload = {
      farmId: activeFarm.id,
      farmName: activeFarm.name,
      farmType: activeFarm.farmType,
      incidentType,
      animalType,
      numberAffected,
      dateTime,
      description: description || t("incident.defaultDescription"),
      location,
      evidenceFiles: evidenceFile
        ? [{ name: evidenceFile.name, url: "#", timestamp: new Date().toISOString() }]
        : [],
    };

    try {
      const online = await isOnlineForSync();
      if (!online) {
        const { localId } = await queueIncidentOffline(payload, evidenceFile);
        setLocalIncidentId(localId);
        setSavedOffline(true);
        setSubmittedStatus(true);
        setSubmitting(false);
        return;
      }

      await incidentService.submitIncident(payload, evidenceFile);
      setSavedOffline(false);
      setSubmitting(false);
      setSubmittedStatus(true);
      await refreshFarms(true);
      onSubmitted?.();
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : t("incident.errorSubmit");
      const online = await isOnlineForSync();
      if (!online) {
        try {
          const { localId } = await queueIncidentOffline(payload, evidenceFile);
          setLocalIncidentId(localId);
          setSavedOffline(true);
          setSubmittedStatus(true);
          setSubmitting(false);
          return;
        } catch (queueErr) {
          setSubmitError(queueErr instanceof Error ? queueErr.message : msg);
        }
      } else {
        setSubmitError(msg);
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={() => { setSubmittedStatus(false); onClose(); }}>
      <div className="incident-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-title-box">
            <ShieldAlert size={24} className="icon-red" />
            <div>
              <span className="modal-eyebrow">{t("incident.eyebrow")}</span>
              <h2 className="modal-title">{t("incident.title")}</h2>
            </div>
          </div>
          <button className="modal-close-btn" onClick={() => { setSubmittedStatus(false); onClose(); }} aria-label={t("common.close")}>
            <X size={20} />
          </button>
        </div>

        {submittedStatus ? (
          <div className="submitted-success-card">
            <div className="success-icon-box">
              {savedOffline ? <CloudOff size={54} color="#D97706" /> : <CheckCircle2 size={54} color="#154D38" />}
            </div>
            <h3 className="success-title">
              {savedOffline ? "Incident saved offline" : t("incident.successTitle")}
            </h3>
            <p className="success-status-badge">
              {savedOffline
                ? localIncidentId
                  ? `Incident #${localIncidentId} · Saved locally · Pending sync`
                  : "Saved locally · Pending sync"
                : t("incident.successStatus")}
            </p>
            <p className="success-desc">
              {savedOffline
                ? "It will be submitted automatically when internet returns. This is not yet verified by a veterinarian."
                : t("incident.successDesc", {
                    type: displayIncidentType,
                    count: numberAffected,
                    location: translateContent(location, t),
                  })}
            </p>
            <div className="success-note-box">
              <AlertTriangle size={16} />
              <span>
                {savedOffline
                  ? "Status: SAVED LOCALLY / PENDING SYNC — not server-confirmed."
                  : t("incident.successNote")}
              </span>
            </div>
            <button className="btn-primary-action" onClick={() => { setSubmittedStatus(false); onClose(); }}>
              {t("incident.doneReturn")}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="incident-form-wrapper">
            <div className="incident-form-body">
              <div className="form-grid-two">
                <div className="form-group">
                  <label className="form-label">{t("incident.category")} *</label>
                  <select value={incidentType} onChange={(e) => setIncidentType(e.target.value)} className="form-input" required>
                    {INCIDENT_TYPES.map((opt) => (
                      <option key={opt.value} value={opt.value}>{t(opt.key)}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t("incident.animalSpecies")} *</label>
                  <select value={animalType} onChange={(e) => setAnimalType(e.target.value)} className="form-input" required>
                    {ANIMAL_TYPES.map((opt) => (
                      <option key={opt.value} value={opt.value}>{t(opt.key)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-grid-two">
                <div className="form-group">
                  <label className="form-label">{t("incident.numberAffected")} *</label>
                  <input type="number" min="1" value={numberAffected} onChange={(e) => setNumberAffected(Number(e.target.value))} className="form-input" required />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("incident.dateObserved")} *</label>
                  <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} className="form-input" required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{t("incident.farmZone")} *</label>
                <div className="input-with-icon">
                  <MapPin size={18} className="input-icon" />
                  <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("incident.zonePlaceholder")} className="form-input pl-10" required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{t("incident.symptoms")}</label>
                <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("incident.symptomsPlaceholder")} className="form-textarea" />
              </div>
              <div className="form-group">
                <label className="form-label">{t("incident.uploadEvidence")}</label>
                <div className="file-upload-dropzone" onClick={() => fileInputRef.current?.click()} role="button" tabIndex={0}>
                  <Upload size={24} className="upload-icon" />
                  <span>{t("incident.uploadHint")}</span>
                  <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setEvidenceFile(e.target.files[0]);
                      setFileName(e.target.files[0].name);
                    }
                  }} className="file-input-hidden" />
                  {fileName && (
                    <div className="uploaded-preview-tag">
                      <span>{t("incident.attached")}: {fileName}</span>
                      <button type="button" onClick={() => { setFileName(null); setEvidenceFile(null); }}><X size={14} /></button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {submitError && (
              <div className="form-error-banner" role="alert">
                <AlertTriangle size={16} />
                <span>{submitError}</span>
              </div>
            )}
            <div className="form-actions-row">
              <button type="button" className="btn-secondary-action" onClick={() => onClose()}>{t("common.cancel")}</button>
              <button type="submit" disabled={submitting} className="btn-primary-action">
                {submitting ? t("incident.submitting") : t("incident.submit")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
