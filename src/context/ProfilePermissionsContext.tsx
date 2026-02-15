import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "./AuthContext";

type ProfilePermissionsContextType = {
  canEditProfile: boolean;
  setCanEditProfile: (value: boolean) => void;
};

const ProfilePermissionsContext = createContext<ProfilePermissionsContextType | null>(null);

export function ProfilePermissionsProvider({ children }: { children: React.ReactNode }) {
  const [canEditProfile, setCanEditProfileState] = useState(true);
  const { token } = useAuth();
  
  // Memoize setCanEditProfile to prevent unnecessary re-renders
  const setCanEditProfile = useCallback((value: boolean) => {
    setCanEditProfileState(value);
  }, []);
  
  useEffect(() => {
    if (!token) setCanEditProfileState(true);
  }, [token]);
  
  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    canEditProfile,
    setCanEditProfile,
  }), [canEditProfile, setCanEditProfile]);
  
  return (
    <ProfilePermissionsContext.Provider value={contextValue}>
      {children}
    </ProfilePermissionsContext.Provider>
  );
}

export function useProfilePermissions() {
  const ctx = useContext(ProfilePermissionsContext);
  if (!ctx) throw new Error("useProfilePermissions must be used inside ProfilePermissionsProvider");
  return ctx;
}

export const ADMIN_CREATED_MESSAGE =
  "Please contact your company administrator for changing any data. You can only view and share your details; edit function is disabled.";
