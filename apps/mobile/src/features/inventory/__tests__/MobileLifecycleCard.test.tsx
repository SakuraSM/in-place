import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Item } from '@inplace/domain';
import { itemsApi, lifecycleApi } from '@/shared/api/mobileClient';
import { MobileLifecycleCard } from '../MobileLifecycleCard';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/providers/HouseholdProvider', () => ({ useHousehold: () => ({ currentHouseholdId: 'family' }) }));
jest.mock('@/shared/ui/ToastProvider', () => ({ useNotify: () => jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/shared/api/mobileClient', () => ({
  itemsApi: { updateItem: jest.fn() },
  lifecycleApi: { listLoans: jest.fn(async () => []), listMaintenance: jest.fn(async () => []), listBatches: jest.fn(async () => []), createLoan: jest.fn(), createMaintenance: jest.fn() },
}));
const item = { id: 'item', quantity: 12, tracking_mode: 'quantity' } as Item;
let client: QueryClient;
function mount() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });
  return render(<QueryClientProvider client={client}><MobileLifecycleCard item={item} /></QueryClientProvider>);
}
beforeEach(() => jest.clearAllMocks());
afterEach(() => client.clear());

it('keeps an invalid date for correction and submits a datetime after retry', async () => {
  const screen = mount();
  fireEvent.press(screen.getByRole('tab', { name: '借用' }));
  fireEvent.press(screen.getByText('新增借出'));
  fireEvent.changeText(screen.getByLabelText('借用人'), '测试借用人');
  fireEvent.changeText(screen.getByLabelText('应还日期（可选）'), '2026-02-31');
  fireEvent.press(screen.getByRole('button', { name: '保存' }));
  await waitFor(() => expect(screen.getByRole('button', { name: '保存' })).toBeEnabled());
  expect(lifecycleApi.createLoan).not.toHaveBeenCalled();
  expect(screen.getByLabelText('借用人').props.value).toBe('测试借用人');
  fireEvent.changeText(screen.getByLabelText('应还日期（可选）'), '2027-01-15');
  fireEvent.press(screen.getByRole('button', { name: '保存' }));
  await waitFor(() => expect(lifecycleApi.createLoan).toHaveBeenCalledWith(expect.objectContaining({ dueAt: new Date('2027-01-15T12:00:00').toISOString() })));
});

it('sets an exact quantity in one request and blocks duplicate presses', async () => {
  let finish: (value: Item) => void = () => undefined;
  jest.mocked(itemsApi.updateItem).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const screen = mount();
  fireEvent.press(screen.getByText('设置数量'));
  fireEvent.changeText(screen.getByLabelText('库存数量'), '120');
  fireEvent.press(screen.getByRole('button', { name: '保存' }));
  fireEvent.press(screen.getByRole('button', { name: /保存/ }));
  await waitFor(() => expect(itemsApi.updateItem).toHaveBeenCalledTimes(1));
  expect(itemsApi.updateItem).toHaveBeenCalledWith('item', { quantity: 120 });
  await act(async () => { finish({ ...item, quantity: 120 }); });
  await waitFor(() => expect(screen.queryByLabelText('库存数量')).toBeNull());
  fireEvent.press(screen.getByRole('tab', { name: '批次' }));
  fireEvent.press(screen.getByText('新增批次'));
  expect(screen.getByLabelText('批次数量').props.value).toBe('1');
});
