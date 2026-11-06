import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import LocationTreePage from './LocationTreePage';

vi.mock('../../../app/providers/auth-context', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('../../../app/providers/household-context', () => ({
  useHousehold: () => ({ currentHousehold: { id: 'household-1' } }),
}));

vi.mock('../hooks/useAllInventoryItems', () => ({
  useAllInventoryItems: () => ({ data: [], isLoading: false }),
}));

function LocationState() {
  const location = useLocation();
  return <output aria-label="current-location">{`${location.pathname}${location.search}`}</output>;
}

function renderPage(initialEntry = '/locations') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/locations" element={<><LocationTreePage /><LocationState /></>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LocationTreePage', () => {
  it('keeps the tree as the default and switches to a shareable map URL', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByRole('tab', { name: '位置树' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('tab', { name: '资产地图' }));

    expect(await screen.findByText('地图上还没有资产')).toBeInTheDocument();
    expect(screen.getByLabelText('current-location')).toHaveTextContent('/locations?view=map');
    expect(screen.getByRole('tab', { name: '资产地图' })).toHaveAttribute('aria-selected', 'true');
  });

  it('opens the map directly from its URL', async () => {
    renderPage('/locations?view=map');

    expect(await screen.findByText('地图上还没有资产')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '资产地图' })).toHaveAttribute('aria-selected', 'true');
  });

  it('switches views with the keyboard and keeps only the selected tab in the tab order', async () => {
    const user = userEvent.setup();
    renderPage();
    const treeTab = screen.getByRole('tab', { name: '位置树' });
    const mapTab = screen.getByRole('tab', { name: '资产地图' });

    expect(treeTab).toHaveAttribute('tabindex', '0');
    expect(mapTab).toHaveAttribute('tabindex', '-1');
    treeTab.focus();
    await user.keyboard('{Home}');
    expect(screen.getByLabelText('current-location')).toHaveTextContent('/locations');
    expect(screen.getByLabelText('current-location')).not.toHaveTextContent('?view=tree');
    await user.keyboard('{ArrowRight}');

    expect(mapTab).toHaveFocus();
    expect(mapTab).toHaveAttribute('aria-selected', 'true');
    expect(treeTab).toHaveAttribute('tabindex', '-1');
    expect(screen.getByLabelText('current-location')).toHaveTextContent('/locations?view=map');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', mapTab.id);

    await user.keyboard('{Home}');
    expect(treeTab).toHaveFocus();
    expect(treeTab).toHaveAttribute('aria-selected', 'true');
  });
});
