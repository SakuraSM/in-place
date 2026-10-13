import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, it, vi } from 'vitest';
import { useHomeDashboardData } from './useHomeDashboardData';

const state = vi.hoisted(() => ({ householdId: 'a', fetchStats: vi.fn() }));
vi.mock('../../../app/providers/household-context', () => ({ useHousehold: () => ({ currentHousehold: { id: state.householdId } }) }));
vi.mock('./useAllInventoryItems', () => ({ useAllInventoryItems: () => ({ data: [] }) }));
vi.mock('../../../legacy/items', () => ({ fetchItemStats: state.fetchStats }));
vi.mock('../../../legacy/activity', () => ({ fetchActivityLogsPage: async () => ({ data: [] }) }));

function DashboardProbe() {
  const result = useHomeDashboardData('user', true);
  return <output data-testid="total">{result.rootStats?.total ?? 'loading'}</output>;
}

it('does not show a slow previous household response in the new household', async () => {
  let finishOld: (value: { total: number }) => void = () => undefined;
  state.fetchStats.mockImplementationOnce(() => new Promise((resolve) => { finishOld = resolve; })).mockResolvedValueOnce({ total: 6 });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { rerender } = render(<QueryClientProvider client={client}><DashboardProbe /></QueryClientProvider>);
  await waitFor(() => expect(state.fetchStats).toHaveBeenCalledTimes(1));
  state.householdId = 'b';
  rerender(<QueryClientProvider client={client}><DashboardProbe /></QueryClientProvider>);
  await waitFor(() => expect(screen.getByTestId('total')).toHaveTextContent('6'));
  await act(async () => { finishOld({ total: 1 }); });
  expect(screen.getByTestId('total')).toHaveTextContent('6');
});
