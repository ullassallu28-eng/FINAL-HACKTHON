import { useEffect, useState } from "react";
import { simulationStore } from "../simulation/simulationState";
import {
  simulationController,
  type SimulationSpeed,
} from "../simulation/simulationController";
import type { SimulationSnapshot } from "../types";

export function useSimulation() {
  const [snapshot, setSnapshot] = useState<SimulationSnapshot>(
    simulationStore.getSnapshot()
  );

  useEffect(() => {
    return simulationStore.subscribe(() => {
      setSnapshot(simulationStore.getSnapshot());
    });
  }, []);

  const start = () => {
    simulationController.start();
  };

  const pause = () => {
    simulationController.pause();
  };

  const reset = () => {
    simulationController.reset();
  };

  const setSpeed = (speed: SimulationSpeed) => {
    simulationController.setSpeed(speed);
  };

  return {
    snapshot,
    start,
    pause,
    reset,
    setSpeed,
  };
}