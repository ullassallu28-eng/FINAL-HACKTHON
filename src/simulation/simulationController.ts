import { simulationStore } from "./simulationState";
import { applyRandomEvent } from "./eventGenerator";

export type SimulationSpeed = 1 | 2 | 5;

class SimulationController {
  private timer: ReturnType<typeof setInterval> | null = null;

  // Base interval between events at 1x speed.
  // 5 seconds gives the judge enough time to understand each event.
  private readonly baseInterval = 5000;

  private speed: SimulationSpeed = 1;

  private getInterval() {
    return this.baseInterval / this.speed;
  }

  start() {
    // Don't create multiple timers if Start is clicked repeatedly.
    if (this.timer !== null) {
      return;
    }

    simulationStore.update((prev) => ({
      ...prev,
      isRunning: true,
    }));

    this.startTimer();
  }

  pause() {
    this.stopTimer();

    simulationStore.update((prev) => ({
      ...prev,
      isRunning: false,
    }));
  }

  reset() {
    this.stopTimer();

    simulationStore.reset();

    this.speed = 1;

    simulationStore.update((prev) => ({
      ...prev,
      speed: 1,
      isRunning: false,
    }));
  }

  setSpeed(speed: SimulationSpeed) {
    this.speed = speed;

    simulationStore.update((prev) => ({
      ...prev,
      speed,
    }));

    // If simulation is already running,
    // restart the timer using the new speed.
    if (this.timer !== null) {
      this.startTimer();
    }
  }

  getSpeed(): SimulationSpeed {
    return this.speed;
  }

  isRunning(): boolean {
    return simulationStore.getSnapshot().isRunning;
  }

  private startTimer() {
    this.stopTimer();

    this.timer = setInterval(() => {
      this.generateEvent();
    }, this.getInterval());
  }

  private stopTimer() {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private generateEvent() {
    const currentState = simulationStore.getSnapshot();

    const nextState = applyRandomEvent(currentState);

    simulationStore.setSnapshot({
      ...nextState,
      isRunning: true,
      speed: this.speed,
    });
  }
}

export const simulationController = new SimulationController();