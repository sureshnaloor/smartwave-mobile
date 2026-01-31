import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

type ProfilePermissionsContextType = {
  canEditProfile: boolean;
  setCanEditProfile: (value: boolean) => void;
};

const ProfilePermissionsContext = createContext<ProfilePermissionsContextType | null>(null);

export function ProfilePermissionsProvider({ children }: { children: React.ReactNode }) {
  const [canEditProfile, setCanEditProfile] = useState(true);
  const { token } = useAuth();
  useEffect(() => {
    if (!token) setCanEditProfile(true);
  }, [token]);
  return (
    <ProfilePermissionsContext.Provider value={{ canEditProfile, setCanEditProfile }}>
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
