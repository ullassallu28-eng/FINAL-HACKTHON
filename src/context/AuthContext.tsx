import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { UserRole, Farm } from "../types";
import { initialFarm } from "../data/mockData";
import { farmService, authService, API_CACHE_TTL_MS } from "../services/api";
import { getAllCachedFarmBundles } from "../offline/storage/cacheStore";
import { isCacheFresh, cacheKey } from "../services/apiCache";

const DEMO_CREDENTIALS: Record<UserRole, { email: string; password: string }> = {
  farmer: { email: "farmer@bioshield.local", password: "farmer123" },
  veterinarian: { email: "vet@bioshield.local", password: "vet123" },
  officer: { email: "officer@bioshield.local", password: "officer123" },
};

async function loginDemoRole(nextRole: UserRole) {
  const creds = DEMO_CREDENTIALS[nextRole];
  await authService.login(creds.email, creds.password);
}

interface AuthContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  activeFarm: Farm;
  setActiveFarm: (farm: Farm) => void;
  allFarms: Farm[];
  refreshFarms: (force?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole>("farmer");
  const [activeFarm, setActiveFarm] = useState<Farm>(initialFarm);
  const [allFarms, setAllFarms] = useState<Farm[]>([initialFarm]);
  const lastFarmFetchRef = useRef(0);
  const allFarmsCountRef = useRef(allFarms.length);
  allFarmsCountRef.current = allFarms.length;

  const loadFarms = useCallback(async (force = false) => {
    const farmsKey = cacheKey("GET", "/farms");
    if (
      !force &&
      lastFarmFetchRef.current > 0 &&
      isCacheFresh(farmsKey, API_CACHE_TTL_MS) &&
      allFarmsCountRef.current > 1
    ) {
      return;
    }

    try {
      const farms = await farmService.getAllFarms({ force });
      lastFarmFetchRef.current = Date.now();
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

  useEffect(() => {
    loginDemoRole("farmer")
      .then(() => loadFarms(true))
      .catch(() => {
        // Backend unavailable — keep initial mock farm for offline/demo fallback
      });

    const onFocus = () => {
      if (!isCacheFresh(cacheKey("GET", "/farms"), API_CACHE_TTL_MS)) {
        void loadFarms();
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadFarms]);

  const setRole = useCallback(async (nextRole: UserRole) => {
    setRoleState(nextRole);
    try {
      await loginDemoRole(nextRole);
      await loadFarms(true);
    } catch (err) {
      console.error("Demo login failed:", err);
    }
  }, [loadFarms]);

  const contextValue = useMemo(
    () => ({
      role,
      setRole,
      activeFarm,
      setActiveFarm,
      allFarms,
      refreshFarms: loadFarms,
    }),
    [role, setRole, activeFarm, allFarms, loadFarms]
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
