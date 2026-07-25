import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import LoginPage from './LoginPage';

const auth = vi.hoisted(() => ({
  signIn: vi.fn(),
  user: null,
}));

vi.mock('../../../app/providers/auth-context', () => ({
  useAuth: () => auth,
}));

describe('LoginPage', () => {
  it('associates labels and toggles password visibility', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    const password = screen.getByLabelText('密码');

    expect(screen.getByLabelText('邮箱地址')).toHaveAttribute('autocomplete', 'email');
    expect(password).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: '显示密码' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: '隐藏密码' })).toBeInTheDocument();
  });

  it('prevents repeated submission while pending', async () => {
    const user = userEvent.setup();
    auth.signIn.mockImplementation(() => new Promise(() => undefined));
    render(<MemoryRouter><LoginPage /></MemoryRouter>);

    await user.type(screen.getByLabelText('邮箱地址'), 'me@example.com');
    await user.type(screen.getByLabelText('密码'), 'password123');
    const submit = screen.getByRole('button', { name: '登录' });
    await user.click(submit);
    await user.click(submit);

    expect(auth.signIn).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: '登录中...' })).toBeDisabled();
  });

  it('announces a network error and retains entered values', async () => {
    const user = userEvent.setup();
    auth.signIn.mockRejectedValueOnce(new Error('网络连接失败'));
    render(<MemoryRouter><LoginPage /></MemoryRouter>);

    const email = screen.getByLabelText('邮箱地址');
    const password = screen.getByLabelText('密码');
    await user.type(email, 'me@example.com');
    await user.type(password, 'password123');
    await user.click(screen.getByRole('button', { name: '登录' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('网络连接失败'));
    expect(email).toHaveValue('me@example.com');
    expect(password).toHaveValue('password123');
  });
});
