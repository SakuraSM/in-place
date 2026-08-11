import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ScrollToTop from './ScrollToTop';

const windowScrollTo = vi.fn();
const elementScrollTo = vi.fn();

function NavigationHarness() {
  const navigate = useNavigate();
  return (
    <>
      <ScrollToTop />
      <button type="button" onClick={() => navigate('/locations?view=map')}>切换地图</button>
      <button type="button" onClick={() => navigate('/locations?view=map&mapStatus=borrowed')}>筛选地图</button>
      <div data-scroll-root />
    </>
  );
}

describe('ScrollToTop', () => {
  beforeEach(() => {
    windowScrollTo.mockReset();
    elementScrollTo.mockReset();
    Object.defineProperty(window, 'scrollTo', { value: windowScrollTo, configurable: true });
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', { value: elementScrollTo, configurable: true });
  });

  it('resets scroll when the location view changes but not when map filters change', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/locations?view=tree']}>
        <NavigationHarness />
      </MemoryRouter>,
    );
    await waitFor(() => expect(windowScrollTo).toHaveBeenCalled());
    windowScrollTo.mockClear();
    elementScrollTo.mockClear();

    await user.click(screen.getByRole('button', { name: '切换地图' }));
    await waitFor(() => expect(windowScrollTo).toHaveBeenCalledTimes(1));
    expect(elementScrollTo).toHaveBeenCalledTimes(1);
    windowScrollTo.mockClear();
    elementScrollTo.mockClear();

    await user.click(screen.getByRole('button', { name: '筛选地图' }));
    expect(windowScrollTo).not.toHaveBeenCalled();
    expect(elementScrollTo).not.toHaveBeenCalled();
  });
});
