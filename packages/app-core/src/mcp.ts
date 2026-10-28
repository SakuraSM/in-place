import type { CreatedMcpCredential, CreateMcpCredentialInput, McpCredential, McpSettings } from '@inplace/domain';
import type { AppCoreRequest } from './shared';

export const MCP_DEFAULT_EXPIRY_DAYS = 90;
export const MCP_EXPIRY_CHOICES = Object.values({ week: 7, month: 30, quarter: 90, year: 365 });

export function createMcpApi(request: AppCoreRequest) {
  return {
    async settings(): Promise<McpSettings> {
      return (await request<{ data: McpSettings }>('/v1/mcp/credentials')).data;
    },
    async create(input: CreateMcpCredentialInput): Promise<CreatedMcpCredential> {
      return (await request<{ data: CreatedMcpCredential }>('/v1/mcp/credentials', {
        method: 'POST', body: JSON.stringify(input),
      })).data;
    },
    async revoke(id: string): Promise<void> {
      await request(`/v1/mcp/credentials/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
  };
}

export function buildMcpConnectionConfig(endpoint: string, secret: string): string {
  return JSON.stringify({ mcpServers: { inplace: { url: endpoint, headers: { Authorization: `Bearer ${secret}` } } } }, null, 2);
}

export function getMcpCredentialStatus(credential: McpCredential): string {
  if (credential.revokedAt) return '已撤销';
  if (new Date(credential.expiresAt).getTime() <= Date.now()) return '已过期';
  return '可用';
}
