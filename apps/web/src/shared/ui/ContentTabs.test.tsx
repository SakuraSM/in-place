import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ContentTabs } from './ContentTabs';

const OPTIONS = [
  { value: 'location', label: '位置分类', count: 2 },
  { value: 'container', label: '收纳分类', count: 4 },
  { value: 'item', label: '物品分类', count: 6 },
] as const;

describe('ContentTabs', () => {
  it('exposes the selected tab and changes it by click', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <ContentTabs
        label="分类范围"
        options={OPTIONS}
        value="location"
        onChange={onChange}
        panelId="category-panel"
      />,
    );

    expect(screen.getByRole('tab', { name: /位置分类/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: /位置分类/ })).toHaveAttribute(
      'aria-controls',
      'category-panel',
    );

    await user.click(screen.getByRole('tab', { name: /收纳分类/ }));
    expect(onChange).toHaveBeenCalledWith('container');
  });

  it('supports arrow-key navigation', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <ContentTabs
        label="分类范围"
        options={OPTIONS}
        value="location"
        onChange={onChange}
      />,
    );

    const activeTab = screen.getByRole('tab', { name: /位置分类/ });
    activeTab.focus();
    await user.keyboard('{ArrowRight}');

    expect(onChange).toHaveBeenCalledWith('container');
    expect(screen.getByRole('tab', { name: /收纳分类/ })).toHaveFocus();
  });
});
