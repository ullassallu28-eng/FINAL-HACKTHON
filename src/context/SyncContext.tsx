import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ConnectivityState, SyncSummary } from "../offline/types";
import { connectivityService, syncEngine, triggerSync } from "../offline/offlineBridge";

interface SyncContextType {
  connectivity: ConnectivityState;
  summary: SyncSummary;
  refreshConnectivity: () => Promise<void>;
  runSync: () => Promise<void>;
  retryFailed: () => Promise<void>;
}

const defaultSummary: SyncSummary = {
  pending: 0,
  syncing: 0,
  synced: 0,
  failed: 0,
  conflicts: 0,
  isSyncing: false,
};

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connectivity, setConnectivity] = useState<ConnectivityState>("CHECKING_CONNECTION");
  const [summary, setSummary] = useState<SyncSummary>(defaultSummary);

  useEffect(() => {
    const stopConnectivity = connectivityService.start();
    const unsubConn = connectivityService.subscribe(setConnectivity);
    const unsubSync = syncEngine.subscribe(setSummary);

    const onOnline = () => {
      void triggerSync();
    };
    window.addEventListener("online", onOnline);

    return () => {
      stopConnectivity?.();
      unsubConn();
      unsubSync();
      window.removeEventListener("online", onOnline);
    };
  }, []);

  useEffect(() => {
    if (connectivity === "ONLINE") {
      void triggerSync();
    }
  }, [connectivity]);

  const refreshConnectivity = useCallback(async () => {
    await connectivityService.refresh();
  }, []);

  const runSync = useCallback(async () => {
    await triggerSync();
  }, []);

  const retryFailed = useCallback(async () => {
    await syncEngine.retryFailed();
  }, []);

  const contextValue = useMemo(
    () => ({ connectivity, summary, refreshConnectivity, runSync, retryFailed }),
    [connectivity, summary, refreshConnectivity, runSync, retryFailed]
  );

  return (
    <SyncContext.Provider value={contextValue}>
      {children}
    </SyncContext.Provider>
  );
};

export function useSync(): SyncContextType {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error("useSync must be used within SyncProvider");
  return ctx;
}
