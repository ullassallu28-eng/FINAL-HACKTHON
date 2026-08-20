import React, { useState } from "react";
import { RefreshCw, Wifi, WifiOff, CloudOff } from "lucide-react";
import { useSync } from "../../context/SyncContext";

export const SyncStatusIndicator: React.FC = () => {
  const { connectivity, summary, runSync, retryFailed } = useSync();
  const [open, setOpen] = useState(false);

  const label =
    connectivity === "ONLINE"
      ? summary.pending > 0
        ? `${summary.pending} waiting to sync`
        : summary.isSyncing
        ? "Syncing…"
        : "Online"
      : connectivity === "OFFLINE"
      ? `Offline · ${summary.pending} queued`
      : connectivity === "ONLINE_BUT_SERVER_UNREACHABLE"
      ? "Server unreachable"
      : "Checking…";

  const icon =
    connectivity === "ONLINE" ? (
      <Wifi size={14} />
    ) : connectivity === "OFFLINE" ? (
      <WifiOff size={14} />
    ) : (
      <CloudOff size={14} />
    );

  return (
    <div className="sync-status-wrap">
      <button
        type="button"
        className={`sync-status-pill sync-${connectivity.toLowerCase()}`}
        onClick={() => setOpen((v) => !v)}
        title={label}
      >
        {icon}
        <span>{label}</span>
      </button>
      {open && (
        <div className="sync-status-panel">
          <p className="sync-panel-title">Synchronization</p>
          <div className="sync-counts">
            <span>Pending: {summary.pending}</span>
            <span>Syncing: {summary.syncing}</span>
            <span>Synced: {summary.synced}</span>
            <span>Failed: {summary.failed}</span>
            <span>Conflicts: {summary.conflicts}</span>
          </div>
          {summary.lastSyncedAt && (
            <p className="text-muted">Last synced: {new Date(summary.lastSyncedAt).toLocaleString()}</p>
          )}
          <div className="sync-panel-actions">
            <button type="button" className="btn-secondary" onClick={() => runSync()}>
              <RefreshCw size={14} /> Sync now
            </button>
            {summary.failed > 0 && (
              <button type="button" className="btn-secondary" onClick={() => retryFailed()}>
                Retry failed
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
