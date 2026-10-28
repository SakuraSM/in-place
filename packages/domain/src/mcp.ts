export type McpScope = 'inventory:read' | 'inventory:import';

export interface McpCredential {
  id: string;
  name: string;
  tokenPrefix: string;
  householdId: string;
  scopes: McpScope[];
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface CreateMcpCredentialInput {
  name: string;
  scopes: McpScope[];
  expiresInDays: number;
}

export interface CreatedMcpCredential {
  credential: McpCredential;
  secret: string;
}

export interface McpSettings {
  endpoint: string;
  householdName: string;
  canImport: boolean;
  credentials: McpCredential[];
}
