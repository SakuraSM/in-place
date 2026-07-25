import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import EntityBadge from './EntityBadge';

describe('EntityBadge', () => {
  it.each([
    ['location', '位置'],
    ['container', '收纳'],
    ['item', '物品'],
    ['category', '类别'],
  ] as const)('renders the semantic label for %s', (kind, label) => {
    render(<EntityBadge kind={kind} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
