import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { searchItemsPage } from '../../../legacy/items';
import SearchPage from './SearchPage';

vi.mock('../../../app/providers/auth-context', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('../../../app/providers/household-context', () => ({ useHousehold: () => ({ currentHousehold: { id: 'household-1' } }) }));
vi.mock('../../../shared/lib/useIsMobile', () => ({ useIsMobile: () => true }));
vi.mock('../hooks/useAllInventoryItems', () => ({ useAllInventoryItems: () => ({ data: [], isLoading: false }) }));
vi.mock('../components/SavedOverviewSearches', () => ({ default: () => null }));
vi.mock('../../../legacy/items', () => ({ searchItemsPage: vi.fn() }));

afterEach(() => {
  onlineManager.setOnline(true);
  vi.mocked(searchItemsPage).mockReset();
});

it('does not present previous results as the new filter while loading or offline', async () => {
  const user = userEvent.setup();
  const emptyResult = { data: [], meta: { page: 1, pageSize: 24, total: 0, totalPages: 1, hasNextPage: false } };
  let finishBorrowed: (value: typeof emptyResult) => void = () => {};
  const borrowedResult = new Promise<typeof emptyResult>((resolve) => { finishBorrowed = resolve; });
  vi.mocked(searchItemsPage).mockImplementation((_query, _userId, options) => {
    if (options?.status === 'borrowed') return borrowedResult;
    if (options?.status === 'in_stock') return Promise.reject(new Error('network error'));
    return Promise.resolve(emptyResult);
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/overview']}><SearchPage /></MemoryRouter></QueryClientProvider>);

  expect(await screen.findByText('还没有库存记录')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '筛选' }));
  const dialog = screen.getByRole('dialog', { name: '筛选库存' });
  await user.click(within(dialog).getByRole('button', { name: '借出' }));
  expect(await within(dialog).findByRole('button', { name: '查看结果（更新中）' })).toBeInTheDocument();
  expect(screen.queryByText('还没有库存记录')).not.toBeInTheDocument();
  expect(screen.getByText('正在加载库存…')).toBeInTheDocument();

  await act(async () => { finishBorrowed(emptyResult); });
  expect(await within(dialog).findByRole('button', { name: '查看 0 个结果' })).toBeInTheDocument();
  act(() => onlineManager.setOnline(false));
  await user.click(within(dialog).getByRole('button', { name: '损耗' }));
  expect(await screen.findByText('等待网络连接，已保留筛选条件。')).toBeInTheDocument();
  expect(within(dialog).getByRole('button', { name: '查看结果（等待联网）' })).toBeInTheDocument();

  act(() => onlineManager.setOnline(true));
  await waitFor(() => expect(within(dialog).getByRole('button', { name: '查看 0 个结果' })).toBeInTheDocument());
  expect(screen.queryByText('等待网络连接，已保留筛选条件。')).not.toBeInTheDocument();

  await user.click(within(dialog).getByRole('button', { name: '在库' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('库存加载失败');
  expect(within(dialog).getByRole('button', { name: '查看结果' })).toBeInTheDocument();
});
