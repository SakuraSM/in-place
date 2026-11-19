import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ResponsiveDialog from './ResponsiveDialog';

function DialogHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>打开设置</button>
      {open ? (
        <ResponsiveDialog title="筛选设置" onClose={() => setOpen(false)}>
          <div className="p-4">
            <button type="button">第一个操作</button>
            <button type="button">最后一个操作</button>
          </div>
        </ResponsiveDialog>
      ) : null}
    </>
  );
}

describe('ResponsiveDialog', () => {
  it('closes with Escape and restores focus', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    const trigger = screen.getByRole('button', { name: '打开设置' });

    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: '筛选设置' })).toBeInTheDocument();
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('keeps Tab focus inside the dialog', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    await user.click(screen.getByRole('button', { name: '打开设置' }));

    const close = screen.getByRole('button', { name: '关闭' });
    const last = screen.getByRole('button', { name: '最后一个操作' });
    last.focus();
    await user.tab();
    expect(close).toHaveFocus();

    await user.tab({ shift: true });
    expect(last).toHaveFocus();
  });

  it('prevents every close action while closing is disabled', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerender } = render(
      <ResponsiveDialog title="保存中" onClose={onClose} isCloseDisabled>
        内容
      </ResponsiveDialog>,
    );

    expect(screen.getByRole('button', { name: '关闭' })).toBeDisabled();
    fireEvent.click(screen.getByRole('dialog').previousElementSibling!);
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();

    rerender(<ResponsiveDialog title="保存完成" onClose={onClose}>内容</ResponsiveDialog>);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
