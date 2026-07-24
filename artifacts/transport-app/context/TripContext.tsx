import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useGetActiveTrip, Trip, getGetActiveTripQueryKey } from '@workspace/api-client-react';
import { useAppAuth } from './AuthContext';
import { useQueryClient } from '@tanstack/react-query';

type TripContextType = {
  activeTrip: Trip | undefined;
  isLoading: boolean;
  refetch: () => void;
};

const TripContext = createContext<TripContextType | null>(null);

export const TripProvider = ({ children }: { children: React.ReactNode }) => {
  const { isSignedIn, isCustomer, isDriver } = useAppAuth();
  const queryClient = useQueryClient();

  const { data: activeTrip, isLoading, refetch } = useGetActiveTrip({
    query: {
      enabled: isSignedIn && (isCustomer || isDriver),
      refetchInterval: 3000,
    }
  });

  const value = {
    activeTrip,
    isLoading,
    refetch,
  };

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
};

export const useTrip = () => {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error('useTrip must be used within TripProvider');
  return ctx;
};