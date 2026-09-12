// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient } from '@inplace/api-client';

afterEach(() => vi.unstubAllGlobals());

describe('API response transport', () => {
  it('preserves the selected household and authentication for raw downloads', async () => {
    let householdId = 'household-a';
    const fetchMock = vi.fn().mockImplementation(async () => new Response('inventory,csv', {
      headers: { 'Content-Disposition': 'attachment; filename="inventory.csv"' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const client = createApiClient({
      baseUrl: 'https://inventory.test/api',
      tokenStorage: { get: () => 'test-token', set: () => undefined },
      contextHeaders: () => ({ 'X-InPlace-Household-ID': householdId }),
    });

    await client.requestResponse('/v1/items/export?format=json');
    householdId = 'household-b';
    const response = await client.requestResponse('/v1/items/export?format=csv');

    expect(fetchMock).toHaveBeenLastCalledWith('https://inventory.test/api/v1/items/export?format=csv',
      expect.objectContaining({ credentials: 'include' }));
    const headers = fetchMock.mock.calls[1][1].headers as Headers;
    expect(headers.get('X-InPlace-Household-ID')).toBe('household-b');
    expect(headers.get('Authorization')).toBe('Bearer test-token');
    expect(await response.text()).toBe('inventory,csv');
    expect(response.headers.get('Content-Disposition')).toContain('inventory.csv');
  });

  it.each([
    [401, '{"message":"会话已过期"}', '会话已过期'],
    [403, '{"message":"无权访问该家庭"}', '无权访问该家庭'],
    [502, 'upstream unavailable', 'upstream unavailable'],
  ])('reports %i without consuming the error body twice', async (status, body, message) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status })));
    const client = createApiClient({ baseUrl: '/api' });
    await expect(client.requestResponse('/export')).rejects.toMatchObject({ name: 'ApiError', status, message });
  });

  it('preserves JSON and empty-response behavior', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response('{"data":[1]}'))
      .mockResolvedValueOnce(new Response(null, { status: 204 })));
    const client = createApiClient({ baseUrl: '/api' });
    await expect(client.request('/items')).resolves.toEqual({ data: [1] });
    await expect(client.request('/items/1', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('retains ApiError classification for an empty failure response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 500 })));
    await expect(createApiClient({ baseUrl: '/api' }).request('/items')).rejects.toBeInstanceOf(ApiError);
  });
});
