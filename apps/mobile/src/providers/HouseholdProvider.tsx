import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Household, HouseholdRole } from '@inplace/domain';
import { useAuth } from './AuthProvider';
import {
  householdsApi,
  loadMobileHouseholdId,
  saveMobileHouseholdId,
} from '@/shared/api/mobileClient';

interface HouseholdContextValue {
  households: Household[];
  currentHousehold: Household | null;
  currentHouseholdId: string | null;
  role: HouseholdRole | null;
  canEditInventory: boolean;
  loading: boolean;
  switchHousehold: (householdId: string) => Promise<void>;
  refreshHouseholds: () => Promise<void>;
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { session, user } = useAuth();
  const queryClient = useQueryClient();
  const [currentHouseholdId, setCurrentHouseholdId] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const {
    data: households,
    isLoading: householdsLoading,
    refetch: refetchHouseholds,
  } = useQuery({
    queryKey: ['mobile', 'households', user?.id],
    enabled: Boolean(session && user),
    queryFn: () => householdsApi.fetchHouseholds(),
  });

  useEffect(() => {
    let active = true;
    void loadMobileHouseholdId().then((householdId) => {
      if (!active) return;
      setCurrentHouseholdId(householdId);
      setStorageReady(true);
    });
    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!storageReady || !households) return;
    const storedHousehold = households.find((household) => household.id === currentHouseholdId);
    if (storedHousehold) return;
    const fallbackHousehold = households.find((household) => household.is_personal)
      ?? households[0]
      ?? null;
    const fallbackId = fallbackHousehold?.id ?? null;
    setCurrentHouseholdId(fallbackId);
    void saveMobileHouseholdId(fallbackId);
  }, [currentHouseholdId, households, storageReady]);

  useEffect(() => {
    if (!session) {
      setCurrentHouseholdId(null);
      setStorageReady(false);
    }
  }, [session]);

  const switchHousehold = useCallback(async (householdId: string) => {
    await saveMobileHouseholdId(householdId);
    setCurrentHouseholdId(householdId);
    await queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === 'mobile' && query.queryKey[1] !== 'households',
    });
  }, [queryClient]);
  const refreshHouseholds = useCallback(async () => {
    await refetchHouseholds();
  }, [refetchHouseholds]);

  const currentHousehold = households?.find((household) => household.id === currentHouseholdId) ?? null;
  const value = useMemo<HouseholdContextValue>(() => ({
    households: households ?? [],
    currentHousehold,
    currentHouseholdId,
    role: currentHousehold?.role ?? null,
    canEditInventory: currentHousehold?.role === 'owner' || currentHousehold?.role === 'editor',
    loading: Boolean(session) && (!storageReady || householdsLoading),
    switchHousehold,
    refreshHouseholds,
  }), [currentHousehold, currentHouseholdId, households, householdsLoading, refreshHouseholds, session, storageReady, switchHousehold]);

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}

export function useHousehold() {
  const context = useContext(HouseholdContext);
  if (!context) throw new Error('useHousehold must be used within HouseholdProvider');
  return context;
}
