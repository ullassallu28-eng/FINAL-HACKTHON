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
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { LoginPage } from "./components/auth/LoginPage";
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
  ],
  officer: ["overview", "passport", "risk", "incident", "actions", "gis", "officer"],
};

function AppContent() {
  const { isAuthenticated, role, refreshFarms } = useAuth();

  const [activeTab, setActiveTab] = useState<NavTab>("overview");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isPassportOpen, setIsPassportOpen] = useState(false);
  const [isReportIncidentOpen, setIsReportIncidentOpen] = useState(false);
  const [isAarohiOpen, setIsAarohiOpen] = useState(false);

  // Compute allowed tabs and effective tab BEFORE hooks — must be deterministic
  const allowedTabs = TABS_BY_ROLE[role] || TABS_BY_ROLE.farmer;
  const effectiveTab = allowedTabs.includes(activeTab) ? activeTab : "overview";

  // Reset tab when role changes so we don't end up on a disallowed tab
  // NOTE: All hooks must be declared before any conditional return to satisfy
  // React's Rules of Hooks. The conditional return is below all hooks.
  useEffect(() => {
    if (effectiveTab !== activeTab) {
      setActiveTab(effectiveTab);
    }
  }, [role, activeTab, effectiveTab]);

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Role-based view helpers — backend JWT enforces this server-side too,
  // but these guards prevent accidental cross-role rendering on the client.
  const canViewVet = role === "veterinarian";
  const canViewOfficer = role === "officer";
  const canViewFarmer = role === "farmer";

  return (
    <div className="bioshield-app">
      <Navbar onToggleMobileNav={() => setIsMobileNavOpen(true)} />
      <OfflineBanner />

      <div className="app-workspace-layout">
        <Sidebar
          activeTab={effectiveTab}
          setActiveTab={setActiveTab}
          onOpenPassport={() => setIsPassportOpen(true)}
          onOpenReportIncident={() => setIsReportIncidentOpen(true)}
          onOpenAarohi={() => setIsAarohiOpen(true)}
        />

        <MobileNav
          activeTab={effectiveTab}
          setActiveTab={setActiveTab}
          isOpen={isMobileNavOpen}
          onClose={() => setIsMobileNavOpen(false)}
          onOpenPassport={() => setIsPassportOpen(true)}
          onOpenReportIncident={() => setIsReportIncidentOpen(true)}
        />

        <main className="bioshield-main-content">
          {effectiveTab === "overview" && (
            <ErrorBoundary>
              <Suspense fallback={<TabLoadingFallback />}>
                {/* Role-gated: each role sees only their own overview dashboard */}
                {canViewFarmer && (
                  <FarmerDashboard
                    onOpenPassport={() => setIsPassportOpen(true)}
                    onOpenReportIncident={() => setIsReportIncidentOpen(true)}
                    onNavigateToActions={() => setActiveTab("actions")}
                    onNavigateToRisk={() => setActiveTab("risk")}
                    onNavigateToActionCenter={() => setActiveTab("action-center")}
                  />
                )}
                {canViewVet && <VetDashboard />}
                {canViewOfficer && (
                  <OfficerDashboard onNavigateToGis={() => setActiveTab("gis")} />
                )}
              </Suspense>
            </ErrorBoundary>
          )}

          {effectiveTab === "passport" && (
            <FarmerDashboard
              onOpenPassport={() => setIsPassportOpen(true)}
              onOpenReportIncident={() => setIsReportIncidentOpen(true)}
              onNavigateToActions={() => setActiveTab("actions")}
              onNavigateToRisk={() => setActiveTab("risk")}
              onNavigateToActionCenter={() => setActiveTab("action-center")}
            />
          )}

          {effectiveTab === "action-center" && (
            canViewFarmer ? (
              <ErrorBoundary>
                <BiosecurityActionCenter
                  onNavigateToActions={() => setActiveTab("actions")}
                />
              </ErrorBoundary>
            ) : (
              <ErrorBoundary>
                <Suspense fallback={<TabLoadingFallback />}>
                  {canViewOfficer ? (
                    <OfficerDashboard onNavigateToGis={() => setActiveTab("gis")} />
                  ) : (
                    canViewVet && <VetDashboard />
                  )}
                </Suspense>
              </ErrorBoundary>
            )
          )}

          {effectiveTab === "risk" && (
            <ErrorBoundary>
              <Suspense fallback={<TabLoadingFallback />}>
                <RiskDashboard />
              </Suspense>
            </ErrorBoundary>
          )}

          {effectiveTab === "incident" && (
            <ErrorBoundary>
              <Suspense fallback={<TabLoadingFallback />}>
                {/* Role-gated: vets see their verification queue; farmers see their incidents */}
                {canViewVet ? (
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
            </ErrorBoundary>
          )}

          {effectiveTab === "actions" && (
            <ErrorBoundary>
              <Suspense fallback={<TabLoadingFallback />}>
                <CorrectiveActionsList />
              </Suspense>
            </ErrorBoundary>
          )}

          {/* Evidence inspection: strictly veterinarian-only, double-guarded */}
          {effectiveTab === "evidence-inspection" && canViewVet && (
            <ErrorBoundary fallbackLabel="Evidence Queue failed to load. Please retry.">
              <Suspense fallback={<TabLoadingFallback />}>
                <VetEvidenceInspectionView />
              </Suspense>
            </ErrorBoundary>
          )}

          {effectiveTab === "gis" && (
            <ErrorBoundary>
              <Suspense fallback={<TabLoadingFallback />}>
                <GisFarmMap
                  onOpenPassport={() => setIsPassportOpen(true)}
                  onNavigateToRisk={() => setActiveTab("risk")}
                />
              </Suspense>
            </ErrorBoundary>
          )}

          {/* Officer tab: strictly officer-only, double-guarded */}
          {effectiveTab === "officer" && canViewOfficer && (
            <ErrorBoundary>
              <Suspense fallback={<TabLoadingFallback />}>
                <OfficerDashboard onNavigateToGis={() => setActiveTab("gis")} />
              </Suspense>
            </ErrorBoundary>
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
