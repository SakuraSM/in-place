import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Item } from '@inplace/domain';
import { itemsApi } from '@/shared/api/mobileClient';
import { LocationSelectField } from '../LocationSelectField';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/providers/HouseholdProvider', () => ({ useHousehold: () => ({ currentHouseholdId: 'family' }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/shared/api/mobileClient', () => ({ itemsApi: { searchItems: jest.fn(), fetchAncestors: jest.fn() } }));

it('retries a failed load, searches full paths and excludes every selected subtree', async () => {
  const items = [
    { id: 'room', name: '客厅', parent_id: null, type: 'container' },
    { id: 'cabinet', name: '柜子', parent_id: 'room', type: 'container' },
    { id: 'box', name: '盒子', parent_id: 'cabinet', type: 'container' },
    { id: 'other', name: '卧室', parent_id: null, type: 'container' },
    { id: 'other-box', name: '盒子', parent_id: 'other', type: 'container' },
  ] as Item[];
  jest.mocked(itemsApi.searchItems).mockRejectedValueOnce(new Error('离线')).mockResolvedValue(items);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const change = jest.fn();
  const screen = render(<QueryClientProvider client={client}><LocationSelectField userId="user" selectedParentId={null} excludedIds={['cabinet']} onChange={change} /></QueryClientProvider>);
  try {
    fireEvent.press(screen.getByRole('button', { name: '选择收纳位置' }));
    await waitFor(() => expect(screen.getByText('位置加载失败，点击重试')).toBeTruthy());
    fireEvent.press(screen.getByText('位置加载失败，点击重试'));
    await waitFor(() => expect(screen.queryByText('位置加载失败，点击重试')).toBeNull());
    fireEvent.changeText(screen.getByLabelText('搜索收纳位置'), '盒子');
    expect(screen.queryByRole('button', { name: '选择客厅 > 柜子 > 盒子' })).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: '选择卧室 > 盒子' }));
    expect(change).toHaveBeenCalledWith('other-box');
  } finally { screen.unmount(); client.clear(); }
});
