import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreatedMcpCredential, McpSettings } from '@inplace/domain';
import { apiRequest } from '../../../shared/api/client';
import McpSettingsPage from './McpSettingsPage';

const context = vi.hoisted(() => ({ householdId: 'household-a' }));
vi.mock('../../../shared/api/client', () => ({ apiRequest: vi.fn() }));
vi.mock('../../../app/providers/auth-context', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }));
vi.mock('../../../app/providers/household-context', () => ({ useHousehold: () => ({ currentHousehold: { id: context.householdId } }) }));
const credential: CreatedMcpCredential = {
  secret: 'fixture-secret-not-a-valid-credential',
  credential: { id: 'credential-a', householdId: 'household-a', name: 'Agent test', tokenPrefix: 'ip_mcp_fixture',
    scopes: ['inventory:read', 'inventory:import'], createdAt: '2026-10-28T00:00:00Z', expiresAt: '2099-01-01T00:00:00Z', revokedAt: null, lastUsedAt: null },
};
let settings: McpSettings;

beforeEach(() => {
  context.householdId = 'household-a';
  settings = { endpoint: 'https://inventory.example/api/mcp', householdName: '测试家庭', canImport: true, credentials: [] };
  vi.mocked(apiRequest).mockReset();
  vi.mocked(apiRequest).mockImplementation(async (_path, options) => {
    if (options?.method === 'POST') { settings = { ...settings, credentials: [credential.credential] }; return { data: credential }; }
    if (options?.method === 'DELETE') { settings = { ...settings, credentials: [{ ...credential.credential, revokedAt: '2026-10-28T01:00:00Z' }] }; return undefined; }
    return { data: settings };
  });
});
function view(client: QueryClient) {
  return <QueryClientProvider client={client}><MemoryRouter><McpSettingsPage /></MemoryRouter></QueryClientProvider>;
}
describe('MCP credential settings', () => {
  it('creates explicit import access, clears the one-time secret, and revokes the credential', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(view(client));
    await screen.findByText('创建凭证', { selector: 'button' });
    fireEvent.change(screen.getByRole('textbox', { name: '凭证名称' }), { target: { value: 'Agent test' } });
    fireEvent.click(screen.getByRole('checkbox', { name: '允许批量新增物品、位置和收纳' }));
    fireEvent.click(screen.getByRole('button', { name: '创建凭证' }));
    expect(await screen.findByLabelText('完整凭证')).toHaveValue(credential.secret);
    expect(apiRequest).toHaveBeenCalledWith('/v1/mcp/credentials', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ name: 'Agent test', expiresInDays: 90, scopes: ['inventory:read', 'inventory:import'] }),
    }));
    expect(JSON.stringify(client.getQueryData(['mcp-credentials', 'owner', 'household-a']))).not.toContain(credential.secret);
    fireEvent.click(screen.getByRole('button', { name: '我已保存' }));
    expect(screen.queryByLabelText('完整凭证')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '撤销Agent test' }));
    fireEvent.click(screen.getByRole('button', { name: '撤销凭证' }));
    await screen.findByText('凭证已撤销');
    expect(screen.getByText('已撤销')).toBeInTheDocument();
    client.clear();
  });
  it('hides import authorization for a viewer and clears a secret when switching families', async () => {
    settings.canImport = false;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const result = render(view(client));
    await screen.findByText('当前家庭角色仅允许读取。');
    expect(screen.getByRole('checkbox')).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: '凭证名称' }), { target: { value: 'Agent test' } });
    fireEvent.click(screen.getByRole('button', { name: '创建凭证' }));
    await screen.findByLabelText('完整凭证');
    context.householdId = 'household-b';
    settings = { ...settings, credentials: [], householdName: '另一家庭' };
    result.rerender(view(client));
    await waitFor(() => expect(screen.queryByLabelText('完整凭证')).toBeNull());
    expect(apiRequest).toHaveBeenCalledWith('/v1/mcp/credentials', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ name: 'Agent test', expiresInDays: 90, scopes: ['inventory:read'] }),
    }));
    client.clear();
  });
});
