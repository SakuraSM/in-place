import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import HomeDashboard from './HomeDashboard';

describe('HomeDashboard', () => {
  it('lets the desktop grid derive its height from card content', () => {
    render(
      <MemoryRouter>
        <HomeDashboard
          stats={null}
          recentItems={[]}
          recentItemPaths={{}}
          recentActivity={[]}
          onOpenActivity={vi.fn()}
          onOpenItem={vi.fn()}
          onOpenActivityItem={vi.fn()}
        />
      </MemoryRouter>,
    );

    const dashboardSections = [
      screen.getByRole('region', { name: '库存统计' }),
      screen.getByRole('region', { name: '最近添加' }),
      screen.getByRole('region', { name: '最近操作' }),
    ];

    dashboardSections.forEach((section) => {
      expect(section).not.toHaveClass('xl:h-full');
    });

    expect(dashboardSections[0].parentElement?.parentElement).toHaveClass(
      'shrink-0',
    );
  });
});
