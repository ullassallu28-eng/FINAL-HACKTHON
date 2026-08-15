import type { NotificationItem } from "../types";
import { translateContent } from "../i18n/contentTranslate";

export type VetDecisionStatus = "confirmed" | "rejected" | "more_info";

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

export function getVetDecisionStatus(notification: NotificationItem): VetDecisionStatus | null {
  if (notification.type !== "verification") return null;

  const title = notification.title.trim();
  const message = notification.message.trim();
  const titleUpper = title.toUpperCase();
  const combined = normalizeText(`${title} ${message}`);

  if (titleUpper.startsWith("REJECTED") || titleUpper.startsWith("अस्वीकृत")) {
    return "rejected";
  }
  if (titleUpper.startsWith("CONFIRMED") || titleUpper.startsWith("पुष्टि")) {
    return "confirmed";
  }
  if (titleUpper.startsWith("ACTION NEEDED") || titleUpper.startsWith("कार्रवाई")) {
    return "more_info";
  }

  const isRejected =
    combined.includes(" was rejected") ||
    combined.includes("was rejected.") ||
    /\brejected\b/.test(combined) ||
    combined.includes("not confirmed") ||
    combined.includes("declined by veterinarian") ||
    combined.includes("अस्वीकृत");

  const isConfirmed =
    combined.includes("has been verified") ||
    combined.includes("verified by veterinarian") ||
    (combined.includes("confirmed") && !combined.includes("not confirmed"));

  const isMoreInfo =
    combined.includes("more information required") ||
    combined.includes("info requested") ||
    combined.includes("more info required") ||
    combined.includes("action needed") ||
    combined.includes("upload additional");

  if (isRejected) return "rejected";
  if (isConfirmed) return "confirmed";
  if (isMoreInfo) return "more_info";

  return null;
}

export function pickVetDecisionNotification(notifications: NotificationItem[]): NotificationItem | null {
  const verificationItems = notifications.filter((n) => n.type === "verification");
  const withDecision = verificationItems.find((n) => getVetDecisionStatus(n) !== null);
  return withDecision ?? verificationItems[0] ?? null;
}

export function translateNotificationTitle(
  title: string,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  return translateContent(title, t);
}

export function translateNotificationMessage(
  message: string,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  const rejected = message.match(
    /^Incident (.+) at (.+) was rejected(?: by the veterinarian)?\. Reason: (.+)$/
  );
  if (rejected) {
    return t("notification.msg.incidentRejected", {
      id: rejected[1],
      farm: rejected[2],
      reason: rejected[3],
    });
  }

  const verified = message.match(
    /^Incident (.+) has been verified\. Biosecurity score updated to (\d+)\/100\. (.+)$/
  );
  if (verified) {
    return t("notification.msg.incidentVerified", {
      id: verified[1],
      score: verified[2],
      note: verified[3],
    });
  }

  const moreInfo = message.match(/^Incident (.+) at (.+): (.+)$/);
  if (moreInfo && message.toLowerCase().includes("upload")) {
    return t("notification.msg.incidentMoreInfo", {
      id: moreInfo[1],
      farm: moreInfo[2],
      request: moreInfo[3],
    });
  }

  const legacy = message.match(/^Incident (.+) update by Veterinarian Officer\.$/i);
  if (legacy) {
    return t("notification.msg.incidentVetUpdateLegacy", { id: legacy[1] });
  }

  return translateContent(message, t);
}

export function getVetStatusLabel(
  status: VetDecisionStatus,
  t: (key: string) => string
): string {
  if (status === "confirmed") return t("notification.vetStatus.confirmed");
  if (status === "rejected") return t("notification.vetStatus.rejected");
  return t("notification.vetStatus.moreInfo");
}
