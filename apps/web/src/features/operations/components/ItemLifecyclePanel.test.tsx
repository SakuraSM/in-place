import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Item } from '@inplace/domain';
import { lifecycleApi } from '../api';
import ItemLifecyclePanel from './ItemLifecyclePanel';

const { notify } = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock('../../../shared/ui/toast', () => ({ useToast: () => ({ notify }) }));
vi.mock('../../../shared/hooks/useInventoryPermissions', () => ({ useInventoryPermissions: () => ({ canEditInventory: true }) }));
vi.mock('../api', () => ({ lifecycleApi: {
  listLoans: vi.fn(), listAttachments: vi.fn(), listMaintenance: vi.fn(), listBatches: vi.fn(), createMaintenance: vi.fn(), createLoan: vi.fn(),
} }));
const item = { id: 'item', tracking_mode: 'unique' } as Item;
beforeEach(() => {
  vi.clearAllMocks();
  for (const method of [lifecycleApi.listLoans, lifecycleApi.listAttachments, lifecycleApi.listMaintenance, lifecycleApi.listBatches]) vi.mocked(method).mockResolvedValue([]);
});

describe('lifecycle save recovery', () => {
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
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ title: '记录已保存，列表刷新失败', tone: 'info' }));
    await user.click(screen.getByRole('button', { name: '重试加载' }));
    await waitFor(() => expect(screen.queryByText('记录加载失败。')).not.toBeInTheDocument());
    expect(lifecycleApi.createMaintenance).toHaveBeenCalledTimes(1);
  });
});
