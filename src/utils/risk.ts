import type { RiskLevel } from "../types";

export function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function farmRiskLevel(score: number): RiskLevel {
  if (score >= 70) return "safe";
  if (score >= 40) return "caution";
  return "critical";
}

export function zoneRiskLevel(score: number): RiskLevel {
  if (score >= 70) return "safe";
  if (score >= 40) return "caution";
  return "critical";
}