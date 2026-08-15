import { lazy, Suspense, useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import type { UserRole } from "./types";
import { NotificationProvider } from "./context/NotificationContext";
import { LocaleProvider } from "./context/LocaleContext";
import { Navbar } from "./components/common/Navbar";
import { Sidebar, type NavTab } from "./components/common/Sidebar";
import { MobileNav } from "./components/common/MobileNav";
import { FarmerDashboard } from "./components/farmer/FarmerDashboard";
import { BiosecurityActionCenter } from "./components/farmer/BiosecurityActionCenter";
import { IncidentReportForm } from "./components/incident/IncidentReportForm";
import { NotificationCenter } from "./components/notifications/NotificationCenter";
import { SyncProvider } from "./context/SyncContext";
import { OfflineBanner } from "./components/common/OfflineBanner";
import "./App.css";

const RiskDashboard = lazy(() =>
  import("./components/risk/RiskDashboard").then((m) => ({ default: m.RiskDashboard }))
);
const VetDashboard = lazy(() =>
  import("./components/vet/VetDashboard").then((m) => ({ default: m.VetDashboard }))
);
const VetEvidenceInspectionView = lazy(() =>
  import("./components/vet/VetEvidenceInspectionView").then((m) => ({
    default: m.VetEvidenceInspectionView,
  }))
);
const CorrectiveActionsList = lazy(() =>
  import("./components/corrective/CorrectiveActionsList").then((m) => ({
    default: m.CorrectiveActionsList,
  }))
);
const OfficerDashboard = lazy(() =>
  import("./components/officer/OfficerDashboard").then((m) => ({ default: m.OfficerDashboard }))
);
const GisFarmMap = lazy(() =>
  import("./components/gis/GisFarmMap").then((m) => ({ default: m.GisFarmMap }))
);
const BiosecurityPassportModal = lazy(() =>
  import("./components/farmer/BiosecurityPassportModal").then((m) => ({
    default: m.BiosecurityPassportModal,
  }))
);
const AarohiAdvisorModal = lazy(() =>
  import("./components/common/AarohiAdvisorModal").then((m) => ({ default: m.AarohiAdvisorModal }))
);

function TabLoadingFallback() {
  return <div className="loading-state">Loading…</div>;
}

const TABS_BY_ROLE: Record<UserRole, NavTab[]> = {
  farmer: ["overview", "action-center", "passport", "risk", "incident", "actions", "gis"],
  veterinarian: [
    "overview",
    "passport",
    "risk",
    "incident",
    "evidence-inspection",
    "actions",
    "gis",
    "officer",
  ],
  officer: ["overview", "passport", "risk", "incident", "actions", "gis", "officer"],
};

function AppContent() {
  const { role, refreshFarms } = useAuth();

  const [activeTab, setActiveTab] = useState<NavTab>("overview");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    const allowedTabs = TABS_BY_ROLE[role];
    setActiveTab((current) => (allowedTabs.includes(current) ? current : "overview"));
  }, [role]);

  const [isPassportOpen, setIsPassportOpen] = useState(false);
  const [isReportIncidentOpen, setIsReportIncidentOpen] = useState(false);
  const [isAarohiOpen, setIsAarohiOpen] = useState(false);

  return (
    <div className="bioshield-app">
      <Navbar onToggleMobileNav={() => setIsMobileNavOpen(true)} />
      <OfflineBanner />

      <div className="app-workspace-layout">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenPassport={() => setIsPassportOpen(true)}
          onOpenReportIncident={() => setIsReportIncidentOpen(true)}
          onOpenAarohi={() => setIsAarohiOpen(true)}
        />

        <MobileNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpen={isMobileNavOpen}
          onClose={() => setIsMobileNavOpen(false)}
          onOpenPassport={() => setIsPassportOpen(true)}
          onOpenReportIncident={() => setIsReportIncidentOpen(true)}
        />

        <main className="bioshield-main-content">
          {activeTab === "overview" && (
            <Suspense fallback={<TabLoadingFallback />}>
              {role === "farmer" ? (
                <FarmerDashboard
                  onOpenPassport={() => setIsPassportOpen(true)}
                  onOpenReportIncident={() => setIsReportIncidentOpen(true)}
                  onNavigateToActions={() => setActiveTab("actions")}
                  onNavigateToRisk={() => setActiveTab("risk")}
                  onNavigateToActionCenter={() => setActiveTab("action-center")}
                />
              ) : role === "veterinarian" ? (
                <VetDashboard />
              ) : (
                <OfficerDashboard onNavigateToGis={() => setActiveTab("gis")} />
              )}
            </Suspense>
          )}

          {activeTab === "passport" && (
            <FarmerDashboard
              onOpenPassport={() => setIsPassportOpen(true)}
              onOpenReportIncident={() => setIsReportIncidentOpen(true)}
              onNavigateToActions={() => setActiveTab("actions")}
              onNavigateToRisk={() => setActiveTab("risk")}
              onNavigateToActionCenter={() => setActiveTab("action-center")}
            />
          )}

          {activeTab === "action-center" && (
            role === "farmer" ? (
              <BiosecurityActionCenter
                onNavigateToActions={() => setActiveTab("actions")}
              />
            ) : (
              <Suspense fallback={<TabLoadingFallback />}>
                {role === "officer" ? (
                  <OfficerDashboard onNavigateToGis={() => setActiveTab("gis")} />
                ) : (
                  <VetDashboard />
                )}
              </Suspense>
            )
          )}

          {activeTab === "risk" && (
            <Suspense fallback={<TabLoadingFallback />}>
              <RiskDashboard />
            </Suspense>
          )}

          {activeTab === "incident" && (
            <Suspense fallback={<TabLoadingFallback />}>
              {role === "veterinarian" ? (
                <VetDashboard />
              ) : (
                <FarmerDashboard
                  onOpenPassport={() => setIsPassportOpen(true)}
                  onOpenReportIncident={() => setIsReportIncidentOpen(true)}
                  onNavigateToActions={() => setActiveTab("actions")}
                  onNavigateToRisk={() => setActiveTab("risk")}
                  onNavigateToActionCenter={() => setActiveTab("action-center")}
                />
              )}
            </Suspense>
          )}

          {activeTab === "actions" && (
            <Suspense fallback={<TabLoadingFallback />}>
              <CorrectiveActionsList />
            </Suspense>
          )}

          {activeTab === "evidence-inspection" && role === "veterinarian" && (
            <Suspense fallback={<TabLoadingFallback />}>
              <VetEvidenceInspectionView />
            </Suspense>
          )}

          {activeTab === "gis" && (
            <Suspense fallback={<TabLoadingFallback />}>
              <GisFarmMap
                onOpenPassport={() => setIsPassportOpen(true)}
                onNavigateToRisk={() => setActiveTab("risk")}
              />
            </Suspense>
          )}

          {activeTab === "officer" && (
            <Suspense fallback={<TabLoadingFallback />}>
              <OfficerDashboard onNavigateToGis={() => setActiveTab("gis")} />
            </Suspense>
          )}
        </main>
      </div>

      {isPassportOpen && (
        <Suspense fallback={<TabLoadingFallback />}>
          <BiosecurityPassportModal
            isOpen={isPassportOpen}
            onClose={() => setIsPassportOpen(false)}
          />
        </Suspense>
      )}

      <IncidentReportForm
        isOpen={isReportIncidentOpen}
        onClose={() => setIsReportIncidentOpen(false)}
        onSubmitted={() => {
          void refreshFarms(true);
        }}
      />

      {isAarohiOpen && (
        <Suspense fallback={null}>
          <AarohiAdvisorModal
            isOpen={isAarohiOpen}
            onClose={() => setIsAarohiOpen(false)}
          />
        </Suspense>
      )}

      <NotificationCenter />
    </div>
  );
}

export default function App() {
  return (
    <LocaleProvider>
      <AuthProvider>
        <SyncProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </SyncProvider>
      </AuthProvider>
    </LocaleProvider>
  );
}
