import type { SimulationSnapshot } from "../types";
import {
  initialFarm,
  initialZones,
  initialEvents,
  initialAlerts,
  initialRiskHistory,
  initialVisitors,
  initialVehicles,
  initialBatches,
  initialChecklist,
  initialRecommendations,
} from "../data/mockData";

// Single source of truth for the whole simulated farm.
// Components never mutate this directly — only the simulation engine does,
// via setSnapshot(). This mirrors how a future WebSocket-fed store would work:
// the transport layer changes, this contract does not.

const initialSnapshot: SimulationSnapshot = {
  farm: initialFarm,
  zones: initialZones,
  events: initialEvents,
  alerts: initialAlerts,
  riskHistory: initialRiskHistory,
  riskContributors: [],
  visitors: initialVisitors,
  vehicles: initialVehicles,
  batches: initialBatches,
  checklist: initialChecklist,
  recommendations: initialRecommendations,
  aarohi: { mood: "happy", message: "Good morning! Your farm is safe today." },
  isRunning: false,
  speed: 1,
  tickCount: 0,
};

type Listener = () => void;

class SimulationStore {
  private snapshot: SimulationSnapshot = deepCloneInitial();
  private listeners = new Set<Listener>();

  getSnapshot = (): SimulationSnapshot => this.snapshot;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  setSnapshot = (next: SimulationSnapshot): void => {
    this.snapshot = next;
    this.listeners.forEach((l) => l());
  };

  update = (updater: (prev: SimulationSnapshot) => SimulationSnapshot): void => {
    this.setSnapshot(updater(this.snapshot));
  };

  reset = (): void => {
    this.setSnapshot(deepCloneInitial());
  };
}

function deepCloneInitial(): SimulationSnapshot {
  return JSON.parse(JSON.stringify(initialSnapshot));
}

export const simulationStore = new SimulationStore();
