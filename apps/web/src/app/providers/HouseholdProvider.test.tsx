import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, it, vi } from 'vitest';
import { HouseholdProvider } from './HouseholdProvider';
import { useHousehold } from './household-context';

const state = vi.hoisted(() => ({ loading: true, user: null as { id: string } | null, householdId: 'shared' as string | null }));
vi.mock('./auth-context', () => ({ useAuth: () => state }));
vi.mock('../../shared/api/client', () => ({
  apiRequest: vi.fn(async () => ({ data: [
    { id: 'personal', name: '个人', isPersonal: true, role: 'owner' },
    { id: 'shared', name: '共享', isPersonal: false, role: 'owner' },
  ] })),
  getStoredHouseholdId: () => state.householdId,
  setStoredHouseholdId: (value: string | null) => { state.householdId = value; },
}));
function Probe() { return <output>{useHousehold().currentHousehold?.id ?? 'pending'}</output>; }

it('preserves the saved household while authentication is loading on a refresh', async () => {
  const client = new QueryClient();
  const tree = () => <QueryClientProvider client={client}><HouseholdProvider><Probe /></HouseholdProvider></QueryClientProvider>;
  const { rerender } = render(tree());
  expect(state.householdId).toBe('shared');
  state.loading = false;
  state.user = { id: 'user' };
  rerender(tree());
  await waitFor(() => expect(screen.getByText('shared')).toBeInTheDocument());
  expect(state.householdId).toBe('shared');
});
