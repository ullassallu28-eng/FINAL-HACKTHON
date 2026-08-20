import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { UserRole, Farm } from "../types";
import { initialFarm, allFarmsMock } from "../data/mockData";
import { farmService, authService, API_CACHE_TTL_MS, invalidateApiCache } from "../services/api";
import { getAllCachedFarmBundles } from "../offline/storage/cacheStore";
import { isCacheFresh, cacheKey } from "../services/apiCache";

// ---------------------------------------------------------------------------
// Demo credentials — displayed on the LoginPage for each role tab.
// These are NEVER used to bypass authentication. The login call always goes
// to the backend /auth/login endpoint which verifies against the database.
// Role is always derived from the backend JWT/me response — never from here.
// ---------------------------------------------------------------------------
export const DEMO_CREDENTIALS: Record<UserRole, { email: string; password: string }> = {
  farmer: { email: "farmer@bioshield.local", password: "farmer123" },
  veterinarian: { email: "vet@bioshield.local", password: "vet123" },
  officer: { email: "officer@bioshield.local", password: "officer123" },
};

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  farmIds: string[];
  districtId?: string | null;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  role: UserRole;
  activeFarm: Farm;
  setActiveFarm: (farm: Farm) => void;
  allFarms: Farm[];
  refreshFarms: (force?: boolean) => Promise<void>;
  /** Returns the backend-assigned role so the LoginPage can enforce tab matching. */
  loginWithCredentials: (email: string, password: string) => Promise<UserRole>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRoleState] = useState<UserRole>("farmer");
  const [activeFarm, setActiveFarm] = useState<Farm>(initialFarm);
  const [allFarms, setAllFarms] = useState<Farm[]>(allFarmsMock);

  const loadFarms = useCallback(async (force = false) => {
    try {
      const farms = await farmService.getAllFarms({ force });
      if (farms.length > 0) {
        setAllFarms(farms);
        setActiveFarm((current) => {
          const stillExists = farms.find((f) => f.id === current.id);
          return stillExists || farms[0];
        });
      }
    } catch {
      const cached = await getAllCachedFarmBundles();
      if (cached.length > 0) {
        const farms = cached.map((b) => b.farm);
        setAllFarms(farms);
        setActiveFarm((current) => {
          const stillExists = farms.find((f) => f.id === current.id);
          return stillExists || farms[0];
        });
      }
    }
  }, []);

  // Restore authenticated session on startup from stored access token
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setIsAuthenticated(false);
      return;
    }

    authService.getMe()
      .then((u) => {
        const authUser: AuthUser = {
          id: u.id,
          fullName: u.fullName,
          email: u.email,
          role: u.role as UserRole,
          farmIds: u.farmIds ?? [],
        };
        setUser(authUser);
        // Role comes ONLY from the backend /auth/me response — never from frontend state
        setRoleState(authUser.role);
        setIsAuthenticated(true);
        void loadFarms(true);
      })
      .catch(() => {
        // Invalid/expired token — clear storage and force re-login
        authService.logout();
        setIsAuthenticated(false);
      });
  }, [loadFarms]);

  // Refresh farm list when tab regains focus (stale-while-revalidate)
  useEffect(() => {
    if (!isAuthenticated) return;
    const onFocus = () => {
      if (!isCacheFresh(cacheKey("GET", "/farms"), API_CACHE_TTL_MS)) {
        void loadFarms();
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [isAuthenticated, loadFarms]);

  // Internal post-login handler — sets role from the server response
  const handlePostLogin = useCallback(async (userData: AuthUser) => {
    setUser(userData);
    // SECURITY: Role is always set from the authenticated server response.
    // The frontend cannot override the role — any attempt to access a
    // different role's API will be rejected with 403 by the backend.
    setRoleState(userData.role);
    setIsAuthenticated(true);
    invalidateApiCache();
    await loadFarms(true);
  }, [loadFarms]);

  const loginWithCredentials = useCallback(async (email: string, pass: string): Promise<UserRole> => {
    const data = await authService.login(email, pass);
    const authUser: AuthUser = {
      id: data.user.id,
      fullName: data.user.fullName,
      email: data.user.email,
      role: data.user.role as UserRole,
      farmIds: data.user.farmIds ?? [],
    };
    // Commit auth state — must happen AFTER the caller has validated the role tab.
    await handlePostLogin(authUser);
    // Return the backend-assigned role so the LoginPage can verify it matches
    // the selected tab. This prevents a user logging into the wrong portal.
    return data.user.role as UserRole;
  }, [handlePostLogin]);

  const logout = useCallback(() => {
    // Clear auth tokens, invalidate all API caches, reset all state
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
    setRoleState("farmer");
    // Reset farm state to prevent stale farm data from leaking to the next session
    setAllFarms([]);
    setActiveFarm(initialFarm);
  }, []);

  const contextValue = useMemo(
    () => ({
      isAuthenticated,
      user,
      role,
      activeFarm,
      setActiveFarm,
      allFarms,
      refreshFarms: loadFarms,
      loginWithCredentials,
      logout,
    }),
    [
      isAuthenticated,
      user,
      role,
      activeFarm,
      allFarms,
      loadFarms,
      loginWithCredentials,
      logout,
    ]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
