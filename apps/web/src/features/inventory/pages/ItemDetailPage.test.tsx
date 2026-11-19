import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Item, Loan } from '@inplace/domain';
import { fetchItem, updateItem } from '../../../legacy/items';
import { lifecycleApi } from '../../operations/api';
import ItemDetailPage from './ItemDetailPage';

vi.mock('../../../shared/hooks/useInventoryPermissions', () => ({
  useInventoryPermissions: () => ({ canEditInventory: true }),
}));
vi.mock('../../../shared/ui/toast', () => ({ useToast: () => ({ notify: vi.fn() }) }));
vi.mock('../components/InventoryArtwork', () => ({ default: () => null }));
vi.mock('../components/ItemForm', () => ({
  default: ({ onSave }: { onSave: (value: object) => Promise<void> }) => (
    <button type="button" onClick={() => void onSave({})}>完成测试编辑</button>
  ),
}));
vi.mock('../../../legacy/items', () => ({
  fetchItem: vi.fn(async () => item),
  fetchAncestors: vi.fn(async () => [item]),
  fetchChildren: vi.fn(async () => []),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
  uploadImage: vi.fn(),
}));
vi.mock('../../operations/api', () => ({ lifecycleApi: {
  listLoans: vi.fn(), listAttachments: vi.fn(), listMaintenance: vi.fn(), listBatches: vi.fn(), createLoan: vi.fn(),
} }));

const item: Item = {
  id: 'item-1', user_id: 'user-1', household_id: 'household-1', parent_id: null,
  type: 'item', name: '测试物品', description: '', category: '', price: null,
  quantity: 1, tracking_mode: 'unique', minimum_quantity: null, expiry_date: null,
  purchase_date: null, warranty_date: null, status: 'in_stock', images: [], tags: [],
  metadata: {}, created_at: '2026-11-06T00:00:00Z', updated_at: '2026-11-06T00:00:00Z',
};

const loan: Loan = {
  id: 'loan-1', household_id: 'household-1', item_id: item.id, borrower_user_id: null,
  borrower_name: '测试联系人', checked_out_at: '2026-11-06T00:00:00Z', due_at: null,
  returned_at: null, notes: '', created_by_user_id: 'user-1',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchItem).mockReset().mockResolvedValue(item);
  vi.mocked(updateItem).mockReset();
});

describe('ItemDetailPage', () => {
  it('keeps one lifecycle panel and its saved state when the viewport changes', async () => {
    const user = userEvent.setup();
    vi.mocked(lifecycleApi.listLoans).mockResolvedValueOnce([]).mockResolvedValue([loan]);
    vi.mocked(lifecycleApi.listAttachments).mockResolvedValue([]);
    vi.mocked(lifecycleApi.listMaintenance).mockResolvedValue([]);
    vi.mocked(lifecycleApi.listBatches).mockResolvedValue([]);
    vi.mocked(lifecycleApi.createLoan).mockResolvedValue(undefined);
    render(<MemoryRouter initialEntries={['/item/item-1']}><Routes><Route path="/item/:id" element={<ItemDetailPage />} /></Routes></MemoryRouter>);

    const borrower = await screen.findByLabelText('借用人');
    await waitFor(() => expect(lifecycleApi.listLoans).toHaveBeenCalledTimes(1));
    await user.type(borrower, '测试联系人');
    await user.click(screen.getByRole('button', { name: '登记借出' }));
    expect(await screen.findByText('借给 测试联系人')).toBeInTheDocument();

    window.dispatchEvent(new Event('resize'));
    expect(screen.getByRole('button', { name: '确认归还' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '登记借出' })).not.toBeInTheDocument();
  });

  it('does not overwrite a newer edit with an older lifecycle refresh', async () => {
    const user = userEvent.setup();
    let resolveRefresh: (value: Item) => void = () => {};
    const pendingRefresh = new Promise<Item>((resolve) => { resolveRefresh = resolve; });
    const editedItem = { ...item, name: '更新后的名称', updated_at: '2026-11-06T00:00:02Z' };
    const olderItem = { ...item, status: 'borrowed' as const, updated_at: '2026-11-06T00:00:01Z' };
    vi.mocked(fetchItem).mockResolvedValueOnce(item).mockReturnValueOnce(pendingRefresh);
    vi.mocked(updateItem).mockResolvedValueOnce(editedItem);
    vi.mocked(lifecycleApi.listLoans).mockResolvedValue([]);
    vi.mocked(lifecycleApi.listAttachments).mockResolvedValue([]);
    vi.mocked(lifecycleApi.listMaintenance).mockResolvedValue([]);
    vi.mocked(lifecycleApi.listBatches).mockResolvedValue([]);
    vi.mocked(lifecycleApi.createLoan).mockResolvedValue(undefined);
    render(<MemoryRouter initialEntries={['/item/item-1']}><Routes><Route path="/item/:id" element={<ItemDetailPage />} /></Routes></MemoryRouter>);

    const borrower = await screen.findByLabelText('借用人');
    await waitFor(() => expect(borrower).toBeEnabled());
    await user.click(screen.getByRole('button', { name: '编辑物品：测试物品' }));
    await user.type(borrower, '测试联系人');
    await user.click(screen.getByRole('button', { name: '登记借出' }));
    await waitFor(() => expect(fetchItem).toHaveBeenCalledTimes(2));
    await user.click(screen.getByRole('button', { name: '完成测试编辑' }));
    expect(await screen.findByRole('heading', { name: '更新后的名称', level: 1 })).toBeInTheDocument();

    await act(async () => { resolveRefresh(olderItem); await pendingRefresh; });
    expect(screen.getByRole('heading', { name: '更新后的名称', level: 1 })).toBeInTheDocument();
  });

  it('temporarily disables edit and delete while a lifecycle operation is saving', async () => {
    const user = userEvent.setup();
    let resolveLoan: () => void = () => {};
    const pendingLoan = new Promise<void>((resolve) => { resolveLoan = resolve; });
    vi.mocked(fetchItem).mockResolvedValue(item);
    vi.mocked(lifecycleApi.listLoans).mockResolvedValue([]);
    vi.mocked(lifecycleApi.listAttachments).mockResolvedValue([]);
    vi.mocked(lifecycleApi.listMaintenance).mockResolvedValue([]);
    vi.mocked(lifecycleApi.listBatches).mockResolvedValue([]);
    vi.mocked(lifecycleApi.createLoan).mockReturnValueOnce(pendingLoan);
    render(<MemoryRouter initialEntries={['/item/item-1']}><Routes><Route path="/item/:id" element={<ItemDetailPage />} /></Routes></MemoryRouter>);

    const borrower = await screen.findByLabelText('借用人');
    await waitFor(() => expect(borrower).toBeEnabled());
    await user.type(borrower, '测试联系人');
    await user.click(screen.getByRole('button', { name: '登记借出' }));
    expect(screen.getByRole('button', { name: '编辑物品：测试物品' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '删除物品：测试物品' })).toBeDisabled();

    await act(async () => { resolveLoan(); await pendingLoan; });
    await waitFor(() => expect(screen.getByRole('button', { name: '编辑物品：测试物品' })).toBeEnabled());
  });

  it('keeps edit disabled after a saved operation until the failed refresh is retried', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchItem).mockResolvedValueOnce(item).mockRejectedValueOnce(new Error('网络中断')).mockResolvedValue(item);
    vi.mocked(lifecycleApi.listLoans).mockResolvedValue([]);
    vi.mocked(lifecycleApi.listAttachments).mockResolvedValue([]);
    vi.mocked(lifecycleApi.listMaintenance).mockResolvedValue([]);
    vi.mocked(lifecycleApi.listBatches).mockResolvedValue([]);
    vi.mocked(lifecycleApi.createLoan).mockResolvedValue(undefined);
    render(<MemoryRouter initialEntries={['/item/item-1']}><Routes><Route path="/item/:id" element={<ItemDetailPage />} /></Routes></MemoryRouter>);

    const borrower = await screen.findByLabelText('借用人');
    await waitFor(() => expect(borrower).toBeEnabled());
    await user.type(borrower, '测试联系人');
    await user.click(screen.getByRole('button', { name: '登记借出' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('记录或物品信息加载失败');
    expect(screen.getByRole('button', { name: '编辑物品：测试物品' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '重试加载' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '编辑物品：测试物品' })).toBeEnabled());
    expect(lifecycleApi.createLoan).toHaveBeenCalledTimes(1);
  });

  it('keeps the selected image when another image is removed', async () => {
    const user = userEvent.setup();
    const images = ['https://example.test/first.png', 'https://example.test/second.png', 'https://example.test/third.png'];
    const initialItem = { ...item, images };
    const editedItem = { ...initialItem, images: images.slice(1) };
    vi.mocked(fetchItem).mockResolvedValue(initialItem);
    vi.mocked(updateItem).mockResolvedValueOnce(editedItem);
    vi.mocked(lifecycleApi.listLoans).mockResolvedValue([]);
    vi.mocked(lifecycleApi.listAttachments).mockResolvedValue([]);
    vi.mocked(lifecycleApi.listMaintenance).mockResolvedValue([]);
    vi.mocked(lifecycleApi.listBatches).mockResolvedValue([]);
    render(<MemoryRouter initialEntries={['/item/item-1']}><Routes><Route path="/item/:id" element={<ItemDetailPage />} /></Routes></MemoryRouter>);

    const secondImageButtons = await screen.findAllByRole('button', { name: '查看第 2 张图片' });
    await user.click(secondImageButtons[0]);
    await user.click(screen.getByRole('button', { name: '编辑物品：测试物品' }));
    await user.click(screen.getByRole('button', { name: '完成测试编辑' }));
    await waitFor(() => expect(screen.getAllByAltText('测试物品')[0]).toHaveAttribute('src', images[1]));
  });

  it('shows the saved purchase and warranty information', async () => {
    vi.mocked(fetchItem).mockResolvedValue({ ...item, price: 125.5, purchase_date: '2026-02-03', warranty_date: '2027-02-03' });
    vi.mocked(lifecycleApi.listLoans).mockResolvedValue([]);
    vi.mocked(lifecycleApi.listAttachments).mockResolvedValue([]);
    vi.mocked(lifecycleApi.listMaintenance).mockResolvedValue([]);
    vi.mocked(lifecycleApi.listBatches).mockResolvedValue([]);
    render(<MemoryRouter initialEntries={['/item/item-1']}><Routes><Route path="/item/:id" element={<ItemDetailPage />} /></Routes></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: '购买信息' })).toBeInTheDocument();
    expect(screen.getByText('¥125.50')).toBeInTheDocument();
    expect(screen.getByText('2026-02-03')).toBeInTheDocument();
    expect(screen.getByText('2027-02-03')).toBeInTheDocument();
  });
});
