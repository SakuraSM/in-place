import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import ToastProvider from './ToastProvider';
import { useToast } from './toast';

function ToastHarness() {
  const { notify } = useToast();
  return (
    <>
      <button
        type="button"
        onClick={() => notify({ tone: 'success', title: '修改已保存', description: '旅行箱' })}
      >
        成功
      </button>
      <button
        type="button"
        onClick={() => notify({ tone: 'error', title: '保存失败', description: '请重试' })}
      >
        失败
      </button>
    </>
  );
}

describe('ToastProvider', () => {
  it('announces success and error outcomes through live regions', async () => {
    const user = userEvent.setup();
    render(<ToastProvider><ToastHarness /></ToastProvider>);

    await user.click(screen.getByRole('button', { name: '成功' }));
    expect(screen.getByText('修改已保存')).toBeInTheDocument();
    expect(screen.getByText('旅行箱')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '失败' }));
    expect(screen.getByRole('alert')).toHaveTextContent('保存失败');
    expect(screen.getByRole('alert')).toHaveTextContent('请重试');
  });
});
