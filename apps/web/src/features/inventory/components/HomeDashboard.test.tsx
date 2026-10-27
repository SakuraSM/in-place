import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import HomeDashboard from './HomeDashboard';
import HomeRecentPanels from './HomeRecentPanels';

describe('HomeDashboard', () => {
  it('retains statistics navigation and all operational shortcuts', () => {
    const onNavigate = vi.fn();
    render(<MemoryRouter><HomeDashboard stats={{ items: 5, containers: 2, borrowed: 1, total: 7 }} onNavigateOverview={onNavigate} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /借出中/ }));
    expect(onNavigate).toHaveBeenCalledWith({ status: 'borrowed' });
    expect(screen.getByRole('link', { name: /扫标签归位/ })).toHaveAttribute('href', '/scan/codes');
    expect(screen.getByRole('link', { name: /待盘点位置/ })).toHaveAttribute('href', '/stocktakes');
    expect(screen.getByRole('link', { name: /提醒中心/ })).toHaveAttribute('href', '/reminders');
  });

  it('keeps both recent panels accessible after moving them beside inventory', () => {
    const onOpenActivity = vi.fn();
    render(<HomeRecentPanels recentItems={[]} recentItemPaths={{}} recentActivity={[]} onOpenActivity={onOpenActivity} onOpenItem={vi.fn()} onOpenActivityItem={vi.fn()} />);
    expect(screen.getByRole('tab', { name: '最近添加' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('tab', { name: '最近操作' }));
    expect(screen.getByText('还没有操作记录。')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '全部记录' }));
    expect(onOpenActivity).toHaveBeenCalledOnce();
  });
});
