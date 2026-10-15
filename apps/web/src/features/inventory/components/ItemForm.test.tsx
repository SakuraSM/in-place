import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCategories } from '../../../legacy/categories';
import { fetchTags } from '../../../legacy/tags';
import ItemForm from './ItemForm';

vi.mock('../../../app/providers/auth-context', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('../../../legacy/categories', () => ({
  fetchCategories: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../../legacy/tags', () => ({
  fetchTags: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../../legacy/items', () => ({
  fetchItem: vi.fn().mockResolvedValue(null),
  uploadImage: vi.fn(),
}));

describe('ItemForm', () => {
  it('retains location and category for the next item, with failed input kept for retry', async () => {
    const user = userEvent.setup();
    const save = vi.fn().mockResolvedValue(true);
    const continueSave = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    render(<ItemForm defaultParentId="box" initial={{ category: '数码' }} onSave={save} onSaveAndContinue={continueSave} onClose={vi.fn()} />);
    await user.type(screen.getByLabelText('名称 *'), '第一件');
    await user.click(screen.getByRole('button', { name: '保存并继续' }));
    await waitFor(() => expect(screen.getByLabelText('名称 *')).toHaveValue(''));
    expect(screen.getByLabelText('名称 *')).toHaveFocus();
    await user.type(screen.getByLabelText('名称 *'), '第二件');
    await user.click(screen.getByRole('button', { name: '保存并继续' }));
    expect(screen.getByLabelText('名称 *')).toHaveValue('第二件');
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ name: '第二件', category: '数码', parent_id: 'box', quantity: 1, images: [] }));
  });

  it('confirms before discarding an unfinished item', async () => {
    const user = userEvent.setup();
    const close = vi.fn();
    render(<ItemForm onSave={vi.fn()} onClose={close} />);
    await user.type(screen.getByLabelText('名称 *'), '尚未保存');
    await user.click(screen.getByRole('button', { name: '关闭新增物品表单' }));
    expect(close).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '取消' }));
    expect(screen.getByLabelText('名称 *')).toHaveValue('尚未保存');
    await user.click(screen.getByRole('button', { name: '关闭新增物品表单' }));
    await user.click(screen.getByRole('button', { name: '放弃修改' }));
    expect(close).toHaveBeenCalledTimes(1);
  });
  beforeEach(() => {
    vi.mocked(fetchCategories).mockResolvedValue([]);
    vi.mocked(fetchTags).mockResolvedValue([]);
  });

  it('keeps optional fields collapsed until the user asks for them', async () => {
    const user = userEvent.setup();
    render(<ItemForm onSave={vi.fn()} onClose={vi.fn()} />);

    expect(screen.queryByLabelText('购买价格')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /更多信息/ }));
    expect(screen.getByLabelText('购买价格')).toBeInTheDocument();
  });

  it('submits the minimum item fields without opening optional details', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ItemForm onSave={onSave} onClose={vi.fn()} />);

    await user.type(screen.getByLabelText('名称 *'), '旅行背包');
    await user.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      name: '旅行背包',
      type: 'item',
      status: 'in_stock',
      tracking_mode: 'unique',
    })));
  });
});
