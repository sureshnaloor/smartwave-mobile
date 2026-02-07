import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { login as apiLogin, loginWithGoogle as apiLoginWithGoogle, loginWithApple as apiLoginWithApple, getProfile } from "../api/client";

const TOKEN_KEY = "smartwave_token";

type User = { id: string; email: string; name: string | null; image: string | null };

type AuthContextType = {
  token: string | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (code: string, redirectUri: string) => Promise<void>;
  signInWithApple: (identityToken: string) => Promise<void>;
  completeSignInWithToken: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  setToken: (t: string | null) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    
    async function loadAndValidateToken() {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        
        if (!storedToken) {
          if (!cancelled) {
            setTokenState(null);
            setUser(null);
            setLoading(false);
          }
          return;
        }

        // Validate token by fetching profile
        try {
          const profile = await getProfile(storedToken);
          if (!cancelled) {
            setTokenState(storedToken);
            setUser({
              id: profile._id ?? "",
              email: profile.userEmail,
              name: profile.name ?? null,
              image: profile.photo ?? null,
            });
            setLoading(false);
          }
        } catch (e) {
          // Token is invalid, expired, or network error
          const msg = e instanceof Error ? e.message : String(e);
          
          // Clear token if unauthorized or invalid
          if (msg.includes("Unauthorized") || msg.includes("invalid") || msg.includes("expired") || msg.includes("missing")) {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
            if (!cancelled) {
              setTokenState(null);
              setUser(null);
              setLoading(false);
            }
          } else {
            // Network error - keep token but don't set user
            // User can retry or sign in again
            if (!cancelled) {
              setTokenState(storedToken);
              setUser(null);
              setLoading(false);
            }
          }
        }
      } catch (e) {
        console.error("[AuthProvider] Error loading token:", e);
        if (!cancelled) {
          setTokenState(null);
          setUser(null);
          setLoading(false);
        }
      }
    }

    loadAndValidateToken();

    return () => {
      cancelled = true;
    };
  }, []);

  const setToken = (t: string | null) => {
    setTokenState(t);
    if (!t) setUser(null);
  };

  const signIn = async (email: string, password: string) => {
    const { token: newToken, user: u } = await apiLogin(email, password);
    await SecureStore.setItemAsync(TOKEN_KEY, newToken);
    setTokenState(newToken);
    setUser(u);
  };

  const signInWithGoogle = async (code: string, redirectUri: string) => {
    const { token: newToken, user: u } = await apiLoginWithGoogle({ code, redirectUri });
    await SecureStore.setItemAsync(TOKEN_KEY, newToken);
    setTokenState(newToken);
    setUser(u);
  };

  const signInWithApple = async (identityToken: string) => {
    const { token: newToken, user: u } = await apiLoginWithApple(identityToken);
    await SecureStore.setItemAsync(TOKEN_KEY, newToken);
    setTokenState(newToken);
    setUser(u);
  };

  const completeSignInWithToken = async (token: string) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    setTokenState(token);
    try {
      const profile = await getProfile(token);
      setUser({
        id: profile._id ?? "",
        email: profile.userEmail,
        name: profile.name ?? null,
        image: profile.photo ?? null,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const isInvalidToken =
        msg.includes("Unauthorized") || msg.includes("missing") || msg.includes("invalid") || msg.includes("expired");
      if (isInvalidToken) {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        setTokenState(null);
        setUser(null);
      } else {
        // Network or other error: keep token and set minimal user from JWT so user reaches home (profile can load there)
        try {
          const b64 = (token.split(".")[1] ?? "").replace(/-/g, "+").replace(/_/g, "/");
          const padded = b64 + "==".slice(0, (3 - (b64.length % 3)) % 3);
          const decoded = typeof atob !== "undefined" ? atob(padded) : (globalThis as { atob?: (s: string) => string }).atob?.(padded) ?? "";
          const payload = JSON.parse(decoded) as { email?: string; id?: string; sub?: string };
          setUser({
            id: payload.id ?? payload.sub ?? "",
            email: payload.email ?? "",
            name: null,
            image: null,
          });
        } catch {
          setUser(null);
        }
      }
    }
  };

  const signOut = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setTokenState(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        signIn,
        signInWithGoogle,
        signInWithApple,
        completeSignInWithToken,
        signOut,
        setToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
