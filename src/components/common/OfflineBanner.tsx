import React from "react";
import { useSync } from "../../context/SyncContext";

export const OfflineBanner: React.FC = () => {
  const { connectivity, summary } = useSync();

  if (connectivity === "ONLINE" && summary.pending === 0) return null;

  if (connectivity === "OFFLINE") {
    return (
      <div className="offline-banner" role="status">
        You are offline. You can continue recording farm activities. Your changes will be sent
        automatically when the internet connection returns.
        {summary.pending > 0 && ` (${summary.pending} change${summary.pending === 1 ? "" : "s"} waiting)`}
      </div>
    );
  }

  if (connectivity === "ONLINE_BUT_SERVER_UNREACHABLE") {
    return (
      <div className="offline-banner offline-banner-warn" role="status">
        Internet is connected but the AgriSentinel server is unreachable. Local changes are saved
        and will sync when the server is available.
      </div>
    );
  }

  if (summary.pending > 0 || summary.isSyncing) {
    return (
      <div className="offline-banner offline-banner-sync" role="status">
        {summary.isSyncing
          ? `Syncing ${summary.syncing} of ${summary.pending + summary.syncing}…`
          : `${summary.pending} change${summary.pending === 1 ? "" : "s"} waiting to sync`}
      </div>
    );
  }

  return null;
};
