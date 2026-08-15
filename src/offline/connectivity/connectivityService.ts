import type { ConnectivityState } from "../types";
import { resolveHealthCheckUrl } from "../../config/apiBase";

type Listener = (state: ConnectivityState) => void;

const HEALTH_TIMEOUT_MS = 15000;
const API_SUCCESS_WINDOW_MS = 90_000;

class ConnectivityService {
  private state: ConnectivityState = "CHECKING_CONNECTION";
  private listeners = new Set<Listener>();
  private checkTimer: number | null = null;
  private lastApiSuccessAt = 0;

  getState(): ConnectivityState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  /** Called when any API request succeeds — avoids false "server unreachable". */
  reportApiSuccess(): void {
    this.lastApiSuccessAt = Date.now();
    if (this.state !== "ONLINE") {
      this.emit("ONLINE");
    }
  }

  hadRecentApiSuccess(): boolean {
    return this.lastApiSuccessAt > 0 && Date.now() - this.lastApiSuccessAt < API_SUCCESS_WINDOW_MS;
  }

  private emit(state: ConnectivityState) {
    this.state = state;
    this.listeners.forEach((l) => l(state));
  }

  async checkServerReachable(): Promise<boolean> {
    if (!navigator.onLine) return false;
    if (this.hadRecentApiSuccess()) return true;

    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
      const res = await fetch(resolveHealthCheckUrl(), {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      window.clearTimeout(timeout);
      return res.ok;
    } catch {
      return this.hadRecentApiSuccess();
    }
  }

  async refresh(): Promise<ConnectivityState> {
    if (!navigator.onLine) {
      this.emit("OFFLINE");
      return "OFFLINE";
    }

    if (this.hadRecentApiSuccess()) {
      this.emit("ONLINE");
      return "ONLINE";
    }

    this.emit("CHECKING_CONNECTION");
    const reachable = await this.checkServerReachable();
    const next: ConnectivityState = reachable ? "ONLINE" : "ONLINE_BUT_SERVER_UNREACHABLE";
    this.emit(next);
    return next;
  }

  start() {
    if (typeof window === "undefined") return;
    const onOnline = () => void this.refresh();
    const onOffline = () => this.emit("OFFLINE");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    void this.refresh();
    this.checkTimer = window.setInterval(() => void this.refresh(), 45000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      if (this.checkTimer) window.clearInterval(this.checkTimer);
    };
  }

  canSync(): boolean {
    return this.state === "ONLINE" || this.hadRecentApiSuccess();
  }

  canUseOfflineFeatures(): boolean {
    return this.state === "OFFLINE" || this.state === "ONLINE_BUT_SERVER_UNREACHABLE";
  }
}

export const connectivityService = new ConnectivityService();
