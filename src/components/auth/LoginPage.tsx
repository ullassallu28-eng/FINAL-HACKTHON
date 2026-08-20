import React, { useState } from "react";
import {
  ShieldCheck,
  Mail,
  Lock,
  ArrowRight,
  UserCheck,
  Stethoscope,
  Landmark,
  AlertTriangle,
} from "lucide-react";
import type { UserRole } from "../../types";
import { useAuth, DEMO_CREDENTIALS } from "../../context/AuthContext";

// Role tab configuration
const ROLE_TABS: Array<{
  role: UserRole;
  label: string;
  icon: React.ReactNode;
  portalLabel: string;
  dbRole: string; // matches the value returned by the backend
}> = [
  {
    role: "farmer",
    label: "Farmer",
    icon: <UserCheck size={18} />,
    portalLabel: "Farmer Portal",
    dbRole: "farmer",
  },
  {
    role: "veterinarian",
    label: "Veterinarian",
    icon: <Stethoscope size={18} />,
    portalLabel: "Veterinarian Portal",
    dbRole: "veterinarian",
  },
  {
    role: "officer",
    label: "Govt Officer",
    icon: <Landmark size={18} />,
    portalLabel: "Government Officer Portal",
    dbRole: "officer",
  },
];

export const LoginPage: React.FC = () => {
  const { loginWithCredentials, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<UserRole>("farmer");
  const [email, setEmail] = useState(DEMO_CREDENTIALS.farmer.email);
  const [password, setPassword] = useState(DEMO_CREDENTIALS.farmer.password);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTabChange = (role: UserRole) => {
    setActiveTab(role);
    setError("");
    // Pre-fill demo credentials for the selected role tab
    setEmail(DEMO_CREDENTIALS[role].email);
    setPassword(DEMO_CREDENTIALS[role].password);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email address and password.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      // loginWithCredentials calls /auth/login — the backend verifies email + password
      // and returns the user's ACTUAL role from the database (JWT claim).
      // We then compare it against the selected tab to prevent cross-role access.
      const returnedRole = await loginWithCredentials(email.trim(), password);

      // ROLE ENFORCEMENT — if the backend role does not match the selected tab,
      // log the user back out and show an error. We never trust the frontend tab;
      // this is purely a UX guard so users see a helpful message.
      if (returnedRole !== activeTab) {
        // Immediately clear the session that was just created — use the context
        // logout so both localStorage AND React auth state are fully reset.
        logout();
        const expectedLabel = ROLE_TABS.find((t) => t.role === activeTab)?.label ?? activeTab;
        const actualLabel = ROLE_TABS.find((t) => t.role === returnedRole)?.label ?? returnedRole;
        setError(
          `This account is registered as "${actualLabel}", not "${expectedLabel}". ` +
          `Please select the correct role tab and try again.`
        );
        setLoading(false);
        return;
      }
      // Role matches — App.tsx will open the correct portal automatically.
    } catch (err: unknown) {
      // The backend returns 401 for wrong credentials.
      const message =
        err instanceof Error ? err.message : "Invalid email or password. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const activeRoleConfig = ROLE_TABS.find((t) => t.role === activeTab)!;

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Header Branding */}
        <div className="login-header">
          <div className="login-brand-icon">
            <ShieldCheck size={38} color="#10B981" />
          </div>
          <h1 className="login-title">AgriSentinel</h1>
          <p className="login-subtitle">Biosecurity &amp; Disease Surveillance System</p>
        </div>

        {/* Role Selection Tabs */}
        <div className="login-role-tabs">
          {ROLE_TABS.map((tab) => (
            <button
              key={tab.role}
              type="button"
              className={`login-tab ${activeTab === tab.role ? "active" : ""}`}
              onClick={() => handleTabChange(tab.role)}
              disabled={loading}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Portal label */}
        <p className="login-portal-label">
          Sign in to&nbsp;<strong>{activeRoleConfig.portalLabel}</strong>
        </p>

        {/* Error alert */}
        {error && (
          <div className="login-error-alert">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Sign In Form — identical for all three roles */}
        <form onSubmit={handleSignIn} className="login-form" noValidate>
          <div className="form-group">
            <label htmlFor="login-email" className="form-label">
              Email Address
            </label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon" />
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="form-input"
                autoComplete="email"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="login-password" className="form-label">
              Password
            </label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input"
                autoComplete="current-password"
                required
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="login-btn-primary"
            id="btn-sign-in"
            disabled={loading}
          >
            {loading ? "Authenticating…" : "Sign In"}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        {/* Footer note — no registration link */}
        <p className="login-footer-note">
          Access is by invitation only. Contact your system administrator if you need an account.
        </p>
      </div>
    </div>
  );
};
