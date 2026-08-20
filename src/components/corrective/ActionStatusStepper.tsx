import React from "react";
import type { CorrectiveActionStatus } from "../../types";
import { useTranslation } from "../../context/LocaleContext";

const STEPS: { key: string; matchStatuses: CorrectiveActionStatus[] }[] = [
  { key: "actions.status.identified", matchStatuses: ["Pending"] },
  { key: "actions.status.assigned", matchStatuses: ["Pending"] },
  { key: "actions.status.inProgress", matchStatuses: ["In Progress"] },
  { key: "actions.status.evidenceSubmitted", matchStatuses: ["Evidence Submitted"] },
  { key: "actions.status.awaitingVerification", matchStatuses: ["Awaiting Verification"] },
  { key: "actions.status.verified", matchStatuses: ["Verified"] },
  { key: "actions.status.closed", matchStatuses: ["Closed"] },
];

function getStepIndex(status: CorrectiveActionStatus): number {
  const idx = STEPS.findIndex((s) => s.matchStatuses.includes(status));
  return idx >= 0 ? idx : 0;
}

interface ActionStatusStepperProps {
  status: CorrectiveActionStatus;
}

export const ActionStatusStepper: React.FC<ActionStatusStepperProps> = ({ status }) => {
  const { t } = useTranslation();
  const currentIdx = getStepIndex(status);

  return (
    <div className="action-status-stepper">
      {STEPS.map((step, idx) => (
        <div
          key={step.key}
          className={`stepper-step ${idx <= currentIdx ? "completed" : ""} ${idx === currentIdx ? "current" : ""}`}
        >
          <div className="stepper-dot" />
          <span className="stepper-label">{t(step.key)}</span>
        </div>
      ))}
    </div>
  );
};
