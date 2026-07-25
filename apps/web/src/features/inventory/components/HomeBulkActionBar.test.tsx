import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import HomeBulkActionBar from './HomeBulkActionBar';

describe('HomeBulkActionBar', () => {
  it('disables destructive actions when nothing is selected', () => {
    render(<HomeBulkActionBar selectedCount={0} onEdit={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByRole('button', { name: '批量编辑' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '批量删除' })).toBeDisabled();
  });

  it('announces the selection count and invokes enabled actions', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<HomeBulkActionBar selectedCount={2} onEdit={onEdit} onDelete={vi.fn()} />);

    expect(screen.getByText('已选择 2 项')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '批量编辑' }));
    expect(onEdit).toHaveBeenCalledOnce();
  });
});
