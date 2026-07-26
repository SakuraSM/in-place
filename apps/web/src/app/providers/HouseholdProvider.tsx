import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createHouseholdsApi } from '@inplace/app-core';
import type { Household } from '@inplace/domain';
import { apiRequest, getStoredHouseholdId, setStoredHouseholdId } from '../../shared/api/client';
import { useAuth } from './auth-context';
import { HouseholdContext } from './household-context';

const householdsApi = createHouseholdsApi(apiRequest);

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [currentHousehold, setCurrentHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshHouseholds = useCallback(async () => {
    if (!user) {
      setHouseholds([]);
      setCurrentHousehold(null);
      setStoredHouseholdId(null);
      return;
    }

    setLoading(true);
    try {
      const nextHouseholds = await householdsApi.fetchHouseholds();
      const storedId = getStoredHouseholdId();
      const nextCurrent = nextHouseholds.find((household) => household.id === storedId)
        ?? nextHouseholds.find((household) => household.is_personal)
        ?? nextHouseholds[0]
        ?? null;
      setHouseholds(nextHouseholds);
      setCurrentHousehold(nextCurrent);
      setStoredHouseholdId(nextCurrent?.id ?? null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refreshHouseholds();
  }, [refreshHouseholds]);

  const switchHousehold = useCallback(async (householdId: string) => {
    const nextHousehold = households.find((household) => household.id === householdId);
    if (!nextHousehold) {
      setStoredHouseholdId(householdId);
      await refreshHouseholds();
      await queryClient.invalidateQueries();
      return;
    }
    if (nextHousehold.id === currentHousehold?.id) return;
    setStoredHouseholdId(nextHousehold.id);
    setCurrentHousehold(nextHousehold);
    await queryClient.invalidateQueries();
  }, [currentHousehold?.id, households, queryClient, refreshHouseholds]);

  const value = useMemo(() => ({
    households,
    currentHousehold,
    loading,
    switchHousehold,
    refreshHouseholds,
  }), [currentHousehold, households, loading, refreshHouseholds, switchHousehold]);

  return (
    <HouseholdContext.Provider value={value}>
      <Fragment key={currentHousehold?.id ?? 'no-household'}>{children}</Fragment>
    </HouseholdContext.Provider>
  );
}
