"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { getFirebaseAuth } from "@/lib/firebase";
import type { User } from "firebase/auth";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  idToken: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getAdminUids(): string[] {
  if (typeof window === "undefined") return [];
  const env = process.env.NEXT_PUBLIC_FIREBASE_ADMIN_UIDS ?? "";
  if (env) return env.split(",").map((u) => u.trim()).filter(Boolean);
  return [];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [idToken, setIdToken] = useState<string | null>(null);

  const isAdmin = Boolean(user && getAdminUids().includes(user.uid));

  const updateToken = useCallback(async (u: User | null) => {
    if (!u) {
      setIdToken(null);
      return;
    }
    try {
      const token = await u.getIdToken();
      setIdToken(token);
    } catch {
      setIdToken(null);
    }
  }, []);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u ?? null);
      await updateToken(u ?? null);
      setLoading(false);
    });
    return () => unsub();
  }, [updateToken]);

  const signOut = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (auth) await auth.signOut();
    setUser(null);
    setIdToken(null);
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    isAdmin,
    idToken,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
