// lib/auth-context.tsx — holds the logged-in user, role-aware routing + guards.
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getMe, getToken, clearToken, CurrentUser } from "@/lib/api";

type AuthState = {
  user: CurrentUser | null;
  loading: boolean;
  refresh: () => Promise<CurrentUser | null>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

// Where each role lands after login / when they hit a wrong-role page.
export const HOME_FOR_ROLE: Record<string, string> = {
  patient: "/app",
  caregiver: "/care",
  lab: "/lab",
  admin: "/admin",
};

export function homeForRole(userType: string | undefined): string {
  return (userType && HOME_FOR_ROLE[userType]) || "/login";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function refresh(): Promise<CurrentUser | null> {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const me = await getMe();
      setUser(me);
      return me;
    } catch {
      clearToken();
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function logout() {
    clearToken();
    setUser(null);
    router.push("/login");
  }

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
