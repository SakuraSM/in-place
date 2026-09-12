import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DataManagementPage from './DataManagementPage';

afterEach(() => { window.localStorage.clear(); vi.unstubAllGlobals(); });

describe('Web household export', () => {
  it.each(['JSON', 'CSV'])('exports %s from the selected household using the real API adapter', async (format) => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, blob: async () => new Blob(['inventory']), headers: new Headers(),
    });
    vi.stubGlobal('fetch', fetchMock);
    const originalUrl = globalThis.URL;
    vi.stubGlobal('URL', class extends originalUrl {
      static createObjectURL = vi.fn(() => 'blob:synthetic');
      static revokeObjectURL = vi.fn();
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    window.localStorage.setItem('inplace.household.id', 'shared-family-b');
    render(<MemoryRouter><DataManagementPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: `导出 ${format}` }));
    await waitFor(() => expect(screen.getByText(format === 'JSON' ? 'JSON 备份已开始下载' : 'CSV 导出已开始下载')).toBeInTheDocument());
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain(`/v1/items/export?format=${format.toLowerCase()}`);
    expect(new Headers(options.headers).get('X-InPlace-Household-ID')).toBe('shared-family-b');
    expect(options.credentials).toBe('include');
  });
});
