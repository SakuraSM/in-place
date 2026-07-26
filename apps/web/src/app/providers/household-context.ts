import { createContext, useContext } from 'react';
import type { Household } from '@inplace/domain';

export interface HouseholdContextValue {
  households: Household[];
  currentHousehold: Household | null;
  loading: boolean;
  switchHousehold: (householdId: string) => Promise<void>;
  refreshHouseholds: () => Promise<void>;
}

export const HouseholdContext = createContext<HouseholdContextValue | null>(null);

export function useHousehold() {
  const context = useContext(HouseholdContext);
  if (!context) {
    throw new Error('useHousehold must be used within HouseholdProvider');
  }
  return context;
}
