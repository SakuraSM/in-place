import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCategories } from '../../../legacy/categories';
import { uploadImage } from '../../../legacy/items';
import { fetchTags } from '../../../legacy/tags';
import type { Category } from '../../../legacy/database.types';
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
    vi.mocked(uploadImage).mockReset();
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

  it('shows the loading state and ignores categories returned for an earlier type', async () => {
    const user = userEvent.setup();
    let resolveItems: (categories: Category[]) => void = () => {};
    let resolveContainers: (categories: Category[]) => void = () => {};
    const itemRequest = new Promise<Category[]>((resolve) => { resolveItems = resolve; });
    const containerRequest = new Promise<Category[]>((resolve) => { resolveContainers = resolve; });
    vi.mocked(fetchCategories).mockImplementation((_userId, scope) => scope === 'item' ? itemRequest : containerRequest);
    render(<ItemForm onSave={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByText('正在加载分类…')).toBeInTheDocument();
    expect(screen.queryByText(/暂无分类/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '收纳' }));
    resolveContainers([categoryFixture('收纳分类', 'container')]);
    expect(await screen.findByRole('button', { name: '收纳分类' })).toBeInTheDocument();
    act(() => resolveItems([categoryFixture('物品分类', 'item')]));
    await itemRequest;

    await waitFor(() => expect(screen.queryByRole('button', { name: '物品分类' })).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: '收纳分类' })).toBeInTheDocument();
  });

  it('offers a retry when categories cannot be loaded', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchCategories).mockRejectedValueOnce(new Error('network error')).mockResolvedValueOnce([categoryFixture('已恢复分类', 'item')]);
    render(<ItemForm onSave={vi.fn()} onClose={vi.fn()} />);

    expect(await screen.findByText(/分类加载失败/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重试加载分类' }));
    expect(await screen.findByRole('button', { name: '已恢复分类' })).toBeInTheDocument();
  });

  it('uploads selected images one at a time and saves every successful image', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    let isUploading = false;
    vi.mocked(uploadImage).mockImplementation(async (file) => {
      if (isUploading) throw new Error('同时上传被限流');
      isUploading = true;
      await Promise.resolve();
      isUploading = false;
      return `/uploads/${file.name}`;
    });
    const { container } = render(<ItemForm onSave={onSave} onClose={vi.fn()} />);
    await user.type(screen.getByLabelText('名称 *'), '测试图片');
    await user.click(screen.getByRole('button', { name: /更多信息/ }));
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');
    if (!fileInput) throw new Error('缺少图片选择控件');
    await user.upload(fileInput, [new File(['a'], 'first.png', { type: 'image/png' }), new File(['b'], 'second.png', { type: 'image/png' })]);

    expect(await screen.findByRole('button', { name: '移除图片 2' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ images: ['/uploads/first.png', '/uploads/second.png'] })));
  });

  it('disables form controls while images are uploading', async () => {
    const user = userEvent.setup();
    let resolveUpload: (url: string) => void = () => {};
    const pendingUpload = new Promise<string>((resolve) => { resolveUpload = resolve; });
    vi.mocked(uploadImage).mockReturnValueOnce(pendingUpload);
    const onClose = vi.fn();
    const { container } = render(<ItemForm onSave={vi.fn()} onClose={onClose} />);
    await user.type(screen.getByLabelText('名称 *'), '测试图片');
    await user.click(screen.getByRole('button', { name: /更多信息/ }));
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');
    if (!fileInput) throw new Error('缺少图片选择控件');
    fireEvent.change(fileInput, { target: { files: [new File(['a'], 'first.png', { type: 'image/png' })] } });

    expect(screen.getByLabelText('名称 *')).toBeDisabled();
    expect(screen.getByRole('button', { name: /保存中/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: '关闭新增物品表单' })).toBeDisabled();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    act(() => resolveUpload('/uploads/first.png'));
    await waitFor(() => expect(screen.getByLabelText('名称 *')).toBeEnabled());
  });

  it('keeps successful images and identifies failures for retry', async () => {
    const user = userEvent.setup();
    vi.mocked(uploadImage).mockResolvedValueOnce('/uploads/first.png').mockRejectedValueOnce(new Error('图片超过大小限制'));
    const { container } = render(<ItemForm onSave={vi.fn()} onClose={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /更多信息/ }));
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');
    if (!fileInput) throw new Error('缺少图片选择控件');
    await user.upload(fileInput, [new File(['a'], 'first.png', { type: 'image/png' }), new File(['b'], 'second.png', { type: 'image/png' })]);

    expect(await screen.findByRole('button', { name: '移除图片 1' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('second.png');
    expect(screen.getByRole('alert')).toHaveTextContent('图片超过大小限制');
    expect(screen.getByRole('alert')).toHaveTextContent('已上传的图片已保留');
  });
});

function categoryFixture(name: string, scope: Category['scope']): Category {
  return { id: name, name, scope, item_type: scope === 'item' ? 'item' : 'container', user_id: 'user-1', household_id: 'household-1', preset_key: null, icon: 'box', color: 'slate', created_at: '2026-11-06T00:00:00Z' };
}
