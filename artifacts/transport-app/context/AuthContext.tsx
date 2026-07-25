import React, { createContext, useContext } from 'react';
import { useAuth, useUser } from '@clerk/expo';
import { useGetMe, UserProfile } from '@workspace/api-client-react';

type AuthContextType = {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: any; // Clerk user
  profile: UserProfile | undefined;
  role: 'customer' | 'driver' | 'admin' | 'super_admin' | null;
  isLoadingProfile: boolean;
  refetchProfile: () => void;
  isCustomer: boolean;
  isDriver: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  const { data: profile, isLoading: isLoadingProfile, refetch: refetchProfile } = useGetMe({
    query: {
      enabled: isLoaded && !!isSignedIn,
    }
  });

  const role = profile?.role as any || null;

  const value = {
    isLoaded,
    isSignedIn: !!isSignedIn,
    user,
    profile,
    role,
    isLoadingProfile,
    refetchProfile,
    isCustomer: role === 'customer',
    isDriver: role === 'driver',
    isAdmin: role === 'admin' || role === 'super_admin',
    isSuperAdmin: role === 'super_admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAppAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAppAuth must be used within AuthProvider');
  return ctx;
};