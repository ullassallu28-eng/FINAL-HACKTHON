import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, Calendar } from "lucide-react";
import type { Farm } from "../../types";
import { officerService } from "../../services/api";
import { useTranslation } from "../../context/LocaleContext";
import { translateData } from "../../i18n/dataTranslations";

interface ScheduleInspectionModalProps {
  farm: Farm | null;
  isOpen: boolean;
  onClose: () => void;
  onScheduled?: () => void;
}

export const ScheduleInspectionModal: React.FC<ScheduleInspectionModalProps> = ({
  farm,
  isOpen,
  onClose,
  onScheduled,
}) => {
  const { t, locale } = useTranslation();
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen || !farm) return null;

  const minDate = new Date().toISOString().slice(0, 10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      setError(t("officer.schedule.dateRequired"));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const scheduledAt = new Date(`${date}T09:00:00`).toISOString();
      await officerService.scheduleInspection(farm.id, scheduledAt, notes || undefined);
      setSuccess(true);
      onScheduled?.();
      setTimeout(() => {
        setSuccess(false);
        setDate("");
        setNotes("");
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("officer.schedule.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="modal-backdrop schedule-modal-backdrop" onClick={onClose}>
      <div className="incident-modal-container schedule-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-title-box">
            <Calendar size={24} className="icon-green" />
            <div>
              <span className="modal-eyebrow">{t("officer.schedule.eyebrow")}</span>
              <h2 className="modal-title">{t("officer.schedule.title")}</h2>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label={t("common.close")}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="incident-form-wrapper">
          <div className="incident-form-body">
            <div className="form-group">
              <label className="form-label">{t("officer.schedule.farm")}</label>
              <p className="schedule-farm-summary">
                <strong>{translateData(farm.name, locale)}</strong>
                <span className="sub-text">{translateData(farm.location, locale)}</span>
              </p>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="inspection-date">
                {t("officer.schedule.date")} *
              </label>
              <input
                id="inspection-date"
                type="date"
                min={minDate}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="inspection-notes">
                {t("officer.schedule.notes")}
              </label>
              <textarea
                id="inspection-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("officer.schedule.notesPlaceholder")}
                className="form-textarea"
              />
            </div>
            {error && (
              <div className="form-error-banner" role="alert">
                {error}
              </div>
            )}
            {success && (
              <div className="form-success-banner" role="status">
                {t("officer.schedule.success")}
              </div>
            )}
          </div>
          <div className="form-actions-row">
            <button type="button" className="btn-secondary-action" onClick={onClose}>
              {t("common.cancel")}
            </button>
            <button type="submit" disabled={submitting} className="btn-primary-action">
              {submitting ? t("common.loading") : t("officer.schedule.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
