import type { ReactNode } from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createInventoryDraft, toInventoryItemInput } from '@inplace/app-core';
import type { Item, ItemCreateInput } from '@inplace/domain';
import { categoriesApi, itemsApi, uploadImageFromUri } from '@/shared/api/mobileClient';
import { HomeItemFormSheet } from '@/features/home/HomeItemFormSheet';
import ItemFormScreen from '../../../../app/item/form';

const mockParams: { id?: string; type?: string } = {};
const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => mockParams,
  router: { replace: (...args: unknown[]) => mockReplace(...args), back: () => mockBack(), canGoBack: () => true },
  useFocusEffect: (callback: () => void) => { const React = jest.requireActual('react'); React.useEffect(callback, [callback]); },
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/shared/ui/ToastProvider', () => ({ useNotify: () => jest.fn() }));
jest.mock('@/shared/ui/Entrance', () => ({ Entrance: ({ children }: { children: ReactNode }) => children }));
jest.mock('@/providers/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'user' } }) }));
jest.mock('@/providers/HouseholdProvider', () => ({ useHousehold: () => ({ currentHouseholdId: 'family', canEditInventory: true }) }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: { children: ReactNode }) => children, useSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }) }));
jest.mock('@/shared/lib/imagePickerPermission', () => ({ getMediaLibraryPermissionError: async () => null }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: async () => ({ canceled: false, assets: [{ uri: 'file:///fixture.png', type: 'image', mimeType: 'image/png' }] }) }));
jest.mock('@/shared/api/mobileClient', () => ({
  itemsApi: { createItem: jest.fn(), updateItem: jest.fn(), fetchItem: jest.fn(), fetchChildren: jest.fn(async () => []) },
  categoriesApi: { fetchCategories: jest.fn(async () => []) }, tagsApi: { fetchTags: jest.fn(async () => []) }, uploadImageFromUri: jest.fn(),
}));

function saved(payload: ItemCreateInput): Item {
  return { ...payload, id: 'saved-item', household_id: 'family', created_at: '', updated_at: '' };
}
const clients: QueryClient[] = [];
function mount(children: React.JSX.Element) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });
  clients.push(queryClient);
  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
}
afterEach(() => { clients.splice(0).forEach((client) => client.clear()); });
beforeEach(() => {
  jest.clearAllMocks();
  delete mockParams.id;
  delete mockParams.type;
  jest.mocked(itemsApi.createItem).mockImplementation(async (payload) => saved(payload));
  jest.mocked(itemsApi.updateItem).mockImplementation(async (_id, payload) => saved(payload as ItemCreateInput));
});

describe('shared native inventory form', () => {
  it.each(['screen', 'sheet'])('%s submits quantity, tracking and dates without losing zero values', async (presentation) => {
    const screen = mount(presentation === 'sheet' ? <HomeItemFormSheet visible onClose={jest.fn()} /> : <ItemFormScreen />);
    expect(screen.queryByLabelText('购买价格')).toBeNull();
    fireEvent.changeText(screen.getByLabelText('名称'), '同一物品');
    fireEvent.press(screen.getByRole('button', { name: '更多信息' }));
    fireEvent.changeText(screen.getByLabelText('数量'), '0');
    fireEvent.changeText(screen.getByLabelText('最低库存'), '0');
    fireEvent.changeText(screen.getByLabelText('购买价格'), '0');
    fireEvent.press(screen.getByRole('button', { name: '消耗品' }));
    fireEvent.changeText(screen.getByLabelText('到期日期'), '2027-05-01');
    fireEvent.press(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(itemsApi.createItem).toHaveBeenCalledWith(expect.objectContaining({ name: '同一物品', quantity: 0, minimum_quantity: 0, price: 0, tracking_mode: 'consumable', expiry_date: '2027-05-01', metadata: {} })));
  });

  it.each(['screen', 'sheet'])('%s updates category queries after choosing a location', async (presentation) => {
    const screen = mount(presentation === 'sheet' ? <HomeItemFormSheet visible onClose={jest.fn()} /> : <ItemFormScreen />);
    await waitFor(() => expect(categoriesApi.fetchCategories).toHaveBeenCalledWith('user', 'item'));
    fireEvent.changeText(screen.getByLabelText('分类'), '旧类别');
    fireEvent.press(screen.getByRole('button', { name: '位置' }));
    await waitFor(() => expect(categoriesApi.fetchCategories).toHaveBeenCalledWith('user', 'location'));
    expect(screen.getByLabelText('分类').props.value).toBe('');
    fireEvent.changeText(screen.getByLabelText('名称'), '房间');
    fireEvent.press(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(itemsApi.createItem).toHaveBeenCalledWith(expect.objectContaining({ type: 'container', metadata: { location_tag: true } })));
  });

  it('blocks invalid price and preserves the draft after an upload failure', async () => {
    jest.mocked(uploadImageFromUri).mockRejectedValue(new Error('图片上传失败'));
    const screen = mount(<ItemFormScreen />);
    fireEvent.changeText(screen.getByLabelText('名称'), '保留的名称');
    fireEvent.press(screen.getByRole('button', { name: '更多信息' }));
    fireEvent.changeText(screen.getByLabelText('购买价格'), 'invalid');
    fireEvent.press(screen.getByRole('button', { name: '保存' }));
    expect(itemsApi.createItem).not.toHaveBeenCalled();
    expect(screen.getAllByText('请输入有效的非负价格').length).toBeGreaterThan(0);
    fireEvent.press(screen.getByRole('button', { name: '添加图片' }));
    await waitFor(() => expect(screen.getByText('图片上传失败')).toBeTruthy());
    expect(screen.getByLabelText('名称').props.value).toBe('保留的名称');
  });

  it('requires confirmation before discarding dirty sheet content', () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const close = jest.fn();
    const screen = mount(<HomeItemFormSheet visible onClose={close} />);
    fireEvent.changeText(screen.getByLabelText('名称'), '未保存');
    fireEvent.press(screen.getByRole('button', { name: '关闭表单' }));
    expect(close).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith('放弃修改？', expect.any(String), expect.any(Array));
    act(() => alert.mock.calls[0][2]?.find((button) => button.text === '放弃修改')?.onPress?.());
    expect(close).toHaveBeenCalledTimes(1);
    alert.mockRestore();
  });

  it('keeps editing fields and metadata when only the name changes', async () => {
    mockParams.id = 'saved-item';
    const initial = saved(toInventoryItemInput({ userId: 'user', draft: { ...createInventoryDraft(), name: '旧名称', quantity: '0', trackingMode: 'consumable', minimumQuantity: '2', expiryDate: '2027-04-01', images: ['https://inventory.test/original.webp'], metadata: { custom: { retained: true } } } }));
    jest.mocked(itemsApi.fetchItem).mockResolvedValue(initial);
    const screen = mount(<ItemFormScreen />);
    await waitFor(() => expect(screen.getByLabelText('名称').props.value).toBe('旧名称'));
    fireEvent.changeText(screen.getByLabelText('名称'), '新名称');
    fireEvent.press(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(itemsApi.updateItem).toHaveBeenCalledWith('saved-item', expect.objectContaining({ name: '新名称', quantity: 0, tracking_mode: 'consumable', minimum_quantity: 2, expiry_date: '2027-04-01', images: initial.images, metadata: initial.metadata })));
  });
});
