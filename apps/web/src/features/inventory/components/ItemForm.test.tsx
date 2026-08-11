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
