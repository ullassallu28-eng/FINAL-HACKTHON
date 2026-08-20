import React from "react";
import { ArrowDown, Link2 } from "lucide-react";
import type { CorrectiveAction } from "../../types";
import { useTranslation } from "../../context/LocaleContext";
import { EvidencePreview } from "../common/EvidencePreview";
import { ActionStatusStepper } from "./ActionStatusStepper";

interface CorrectiveActionTraceabilityProps {
  action: CorrectiveAction;
}

export const CorrectiveActionTraceability: React.FC<CorrectiveActionTraceabilityProps> = ({
  action,
}) => {
  const { t } = useTranslation();

  const sourceLabel =
    action.sourceLabel ??
    (action.incidentId ? `${t("actions.source.incident")} #${action.incidentId}` : null);

  return (
    <div className="action-traceability-panel">
      <div className="traceability-header">
        <Link2 size={16} />
        <span>{t("actions.traceability")}</span>
      </div>

      {sourceLabel && (
        <div className="traceability-flow">
          <div className="trace-step source">
            <span className="trace-label">{t("actions.source")}</span>
            <strong>{sourceLabel}</strong>
          </div>
          <ArrowDown size={16} className="trace-arrow" />
          <div className="trace-step action">
            <span className="trace-label">{action.title}</span>
            <span className="trace-priority">{action.priority.toUpperCase()}</span>
          </div>
          {action.submittedEvidence && (
            <>
              <ArrowDown size={16} className="trace-arrow" />
              <div className="trace-step evidence trace-evidence-preview">
                <EvidencePreview
                  fileName={action.submittedEvidence.fileName}
                  fileUrl={action.submittedEvidence.fileUrl}
                  notes={action.submittedEvidence.notes}
                  compact
                />
              </div>
            </>
          )}
          <ArrowDown size={16} className="trace-arrow" />
          <div className="trace-step verification">
            <span className="trace-label">{action.verificationStatus}</span>
          </div>
        </div>
      )}

      <ActionStatusStepper status={action.status} />
    </div>
  );
};
