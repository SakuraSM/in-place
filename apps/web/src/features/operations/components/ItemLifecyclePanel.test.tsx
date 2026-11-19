import { act, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Item } from '@inplace/domain';
import { fetchItem, updateItem } from '../../../legacy/items';
import { lifecycleApi } from '../api';
import ItemLifecyclePanel from './ItemLifecyclePanel';

const { notify } = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock('../../../shared/ui/toast', () => ({ useToast: () => ({ notify }) }));
vi.mock('../../../shared/hooks/useInventoryPermissions', () => ({ useInventoryPermissions: () => ({ canEditInventory: true }) }));
vi.mock('../../../legacy/items', () => ({ fetchItem: vi.fn(), updateItem: vi.fn() }));
vi.mock('../api', () => ({ lifecycleApi: {
  listLoans: vi.fn(), listAttachments: vi.fn(), listMaintenance: vi.fn(), listBatches: vi.fn(), createMaintenance: vi.fn(), createLoan: vi.fn(), createBatch: vi.fn(),
} }));
const item = { id: 'item', tracking_mode: 'unique' } as Item;
beforeEach(() => {
  vi.clearAllMocks();
  for (const method of [lifecycleApi.listLoans, lifecycleApi.listAttachments, lifecycleApi.listMaintenance, lifecycleApi.listBatches]) vi.mocked(method).mockResolvedValue([]);
  vi.mocked(fetchItem).mockResolvedValue(item);
});

describe('lifecycle save recovery', () => {
  it('waits for the initial records before allowing a new loan', async () => {
    let resolveLoans: (loans: never[]) => void = () => {};
    const pendingLoans = new Promise<never[]>((resolve) => { resolveLoans = resolve; });
    vi.mocked(lifecycleApi.listLoans).mockReturnValueOnce(pendingLoans);
    render(<ItemLifecyclePanel item={item} onItemChange={vi.fn()} />);

    expect(screen.getByLabelText('借用人')).toBeDisabled();
    await act(async () => { resolveLoans([]); await pendingLoans; });
    await waitFor(() => expect(screen.getByLabelText('借用人')).toBeEnabled());
  });

  it('does not replace a newer initial result with an older request', async () => {
    let resolveOlder: (loans: never[]) => void = () => {};
    const olderRequest = new Promise<never[]>((resolve) => { resolveOlder = resolve; });
    vi.mocked(lifecycleApi.listLoans).mockReturnValueOnce(olderRequest).mockResolvedValueOnce([{
      id: 'loan', household_id: 'household', item_id: item.id, borrower_user_id: null,
      borrower_name: '小陈', checked_out_at: '2026-11-06T00:00:00Z', due_at: null,
      returned_at: null, notes: '', created_by_user_id: 'user',
    }]);
    render(<StrictMode><ItemLifecyclePanel item={item} onItemChange={vi.fn()} /></StrictMode>);

    expect(await screen.findByText('借给 小陈')).toBeInTheDocument();
    await act(async () => { resolveOlder([]); await olderRequest; });
    expect(screen.getByText('借给 小陈')).toBeInTheDocument();
  });

  it('retains failed input and clears it only after the retry succeeds', async () => {
    const user = userEvent.setup();
    vi.mocked(lifecycleApi.createLoan).mockRejectedValueOnce(new Error('网络中断')).mockResolvedValueOnce(undefined);
    render(<ItemLifecyclePanel item={item} onItemChange={vi.fn()} />);
    await user.type(screen.getByLabelText('借用人'), '小陈');
    await user.click(screen.getByRole('button', { name: '登记借出' }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith(expect.objectContaining({ tone: 'error' })));
    expect(screen.getByLabelText('借用人')).toHaveValue('小陈');
    await user.click(screen.getByRole('button', { name: '登记借出' }));
    await waitFor(() => expect(screen.getByLabelText('借用人')).toHaveValue(''));
    expect(lifecycleApi.createLoan).toHaveBeenCalledTimes(2);
  });

  it('does not describe a committed record as a failed write when refresh fails', async () => {
    const user = userEvent.setup();
    vi.mocked(lifecycleApi.createMaintenance).mockResolvedValue(undefined);
    render(<ItemLifecyclePanel item={item} onItemChange={vi.fn()} />);
    await waitFor(() => expect(lifecycleApi.listLoans).toHaveBeenCalledTimes(1));
    vi.mocked(lifecycleApi.listLoans).mockRejectedValueOnce(new Error('刷新离线'));
    await user.type(screen.getByLabelText('维护事项'), '换滤芯');
    await user.click(screen.getByRole('button', { name: '添加' }));
    await waitFor(() => expect(screen.getByLabelText('维护事项')).toHaveValue(''));
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ title: '记录已保存，数据刷新失败', tone: 'info' }));
    await user.click(screen.getByRole('button', { name: '重试加载' }));
    await waitFor(() => expect(screen.queryByText('记录或物品信息加载失败。')).not.toBeInTheDocument());
    expect(lifecycleApi.createMaintenance).toHaveBeenCalledTimes(1);
  });

  it('refreshes the item status after a loan is saved', async () => {
    const user = userEvent.setup();
    const onItemChange = vi.fn();
    const updatedItem = { ...item, status: 'borrowed' as const };
    vi.mocked(lifecycleApi.createLoan).mockResolvedValue(undefined);
    vi.mocked(fetchItem).mockResolvedValue(updatedItem);
    render(<ItemLifecyclePanel item={item} onItemChange={onItemChange} />);

    await user.type(screen.getByLabelText('借用人'), '小陈');
    await user.click(screen.getByRole('button', { name: '登记借出' }));
    await waitFor(() => expect(onItemChange).toHaveBeenCalledWith(updatedItem));
  });

  it('refreshes tracking mode and quantity after a batch is added', async () => {
    const user = userEvent.setup();
    const onItemChange = vi.fn();
    const updatedItem = { ...item, tracking_mode: 'consumable' as const, quantity: 3 };
    vi.mocked(lifecycleApi.createBatch).mockResolvedValue(undefined);
    vi.mocked(fetchItem).mockResolvedValue(updatedItem);
    render(<ItemLifecyclePanel item={item} onItemChange={onItemChange} />);

    await waitFor(() => expect(screen.getByLabelText('批次数量')).toBeEnabled());
    await user.clear(screen.getByLabelText('批次数量'));
    await user.type(screen.getByLabelText('批次数量'), '3');
    await user.click(screen.getByRole('button', { name: '入库' }));
    await waitFor(() => expect(onItemChange).toHaveBeenCalledWith(updatedItem));
  });

  it('retries item refresh without submitting the saved loan again', async () => {
    const user = userEvent.setup();
    const onItemChange = vi.fn();
    const updatedItem = { ...item, status: 'borrowed' as const };
    vi.mocked(lifecycleApi.createLoan).mockResolvedValue(undefined);
    vi.mocked(fetchItem).mockRejectedValueOnce(new Error('网络中断')).mockResolvedValueOnce(updatedItem);
    render(<ItemLifecyclePanel item={item} onItemChange={onItemChange} />);

    await user.type(screen.getByLabelText('借用人'), '小陈');
    await user.click(screen.getByRole('button', { name: '登记借出' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('记录或物品信息加载失败');
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ title: '记录已保存，数据刷新失败', tone: 'info' }));
    await user.click(screen.getByRole('button', { name: '重试加载' }));
    await waitFor(() => expect(onItemChange).toHaveBeenCalledWith(updatedItem));
    expect(lifecycleApi.createLoan).toHaveBeenCalledTimes(1);
  });

  it('does not apply a previous item refresh after switching to another item', async () => {
    const user = userEvent.setup();
    const onItemChange = vi.fn();
    const updatedItem = { ...item, status: 'borrowed' as const };
    let resolveItem: (value: Item) => void = () => {};
    const pendingItem = new Promise<Item>((resolve) => { resolveItem = resolve; });
    vi.mocked(lifecycleApi.createLoan).mockResolvedValue(undefined);
    vi.mocked(fetchItem).mockReturnValueOnce(pendingItem);
    const { rerender } = render(<ItemLifecyclePanel item={item} onItemChange={onItemChange} />);
    await user.type(screen.getByLabelText('借用人'), '小陈');
    await user.click(screen.getByRole('button', { name: '登记借出' }));
    await waitFor(() => expect(fetchItem).toHaveBeenCalledWith(item.id));

    rerender(<ItemLifecyclePanel item={{ ...item, id: 'other-item' }} onItemChange={onItemChange} />);
    await act(async () => { resolveItem(updatedItem); await pendingItem; });
    expect(onItemChange).not.toHaveBeenCalled();
  });

  it('does not apply an old quantity update after switching items', async () => {
    const user = userEvent.setup();
    const onItemChange = vi.fn();
    const countedItem = { ...item, tracking_mode: 'quantity' as const, quantity: 2 };
    let resolveUpdate: (value: Item) => void = () => {};
    const pendingUpdate = new Promise<Item>((resolve) => { resolveUpdate = resolve; });
    vi.mocked(updateItem).mockReturnValueOnce(pendingUpdate);
    const { rerender } = render(<ItemLifecyclePanel item={countedItem} onItemChange={onItemChange} />);
    await waitFor(() => expect(screen.getByRole('button', { name: '库存加一' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: '库存加一' }));
    await waitFor(() => expect(updateItem).toHaveBeenCalledWith(item.id, { quantity: 3 }));

    rerender(<ItemLifecyclePanel item={{ ...countedItem, id: 'other-item' }} onItemChange={onItemChange} />);
    await act(async () => { resolveUpdate({ ...countedItem, quantity: 3 }); await pendingUpdate; });
    expect(onItemChange).not.toHaveBeenCalled();
  });

  it('ignores a pending mutation after switching away and back to the same item', async () => {
    const user = userEvent.setup();
    const onItemChange = vi.fn();
    let resolveLoan: () => void = () => {};
    const pendingLoan = new Promise<void>((resolve) => { resolveLoan = resolve; });
    vi.mocked(lifecycleApi.createLoan).mockReturnValueOnce(pendingLoan);
    const { rerender } = render(<ItemLifecyclePanel item={item} onItemChange={onItemChange} />);
    await waitFor(() => expect(screen.getByLabelText('借用人')).toBeEnabled());
    await user.type(screen.getByLabelText('借用人'), '小陈');
    await user.click(screen.getByRole('button', { name: '登记借出' }));
    rerender(<ItemLifecyclePanel item={{ ...item, id: 'other-item' }} onItemChange={onItemChange} />);
    rerender(<ItemLifecyclePanel item={item} onItemChange={onItemChange} />);

    await act(async () => { resolveLoan(); await pendingLoan; });
    expect(fetchItem).not.toHaveBeenCalled();
    expect(onItemChange).not.toHaveBeenCalled();
  });
});
