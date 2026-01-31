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
    SecureStore.getItemAsync(TOKEN_KEY).then((t) => {
      setTokenState(t);
      if (!t) setUser(null);
      setLoading(false);
    });
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
      setUser(null);
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("Unauthorized") || msg.includes("missing") || msg.includes("invalid")) {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        setTokenState(null);
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
