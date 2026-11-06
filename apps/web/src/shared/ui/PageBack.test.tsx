import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import PageBack from './PageBack';

describe('PageBack', () => {
  it('uses a link for a known destination', () => {
    render(<MemoryRouter><PageBack to="/profile" label="返回我的" /></MemoryRouter>);
    expect(screen.getByRole('link', { name: '返回我的' })).toHaveAttribute('href', '/profile');
  });

  it('keeps an accessible name and keyboard activation for an icon-only action', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<PageBack label="返回上一级" iconOnly onClick={onClick} />);
    const button = screen.getByRole('button', { name: '返回上一级' });
    button.focus();
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledOnce();
  });
});
