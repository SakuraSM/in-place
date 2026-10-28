import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createMcpApi, buildMcpConnectionConfig } from '@inplace/app-core';
import type { CreatedMcpCredential, CreateMcpCredentialInput } from '@inplace/domain';
import { apiRequest } from '../../../shared/api/client';
import { useAuth } from '../../../app/providers/auth-context';

const api = createMcpApi(apiRequest);

export function useMcpSettings(householdId: string) {
  const { user } = useAuth();
  const query = useQuery({ queryKey: ['mcp-credentials', user?.id, householdId], queryFn: api.settings });
  const [created, setCreated] = useState<CreatedMcpCredential | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function create(input: CreateMcpCredentialInput): Promise<void> {
    if (isBusy) return;
    setIsBusy(true); setError(''); setMessage('');
    try { setCreated(await api.create(input)); await query.refetch(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : '创建凭证失败'); }
    finally { setIsBusy(false); }
  }
  async function revoke(id: string): Promise<boolean> {
    if (isBusy) return false;
    setIsBusy(true); setError('');
    try {
      await api.revoke(id);
      if (created?.credential.id === id) setCreated(null);
      await query.refetch(); setMessage('凭证已撤销'); return true;
    } catch (failure) { setError(failure instanceof Error ? failure.message : '撤销失败'); return false; }
    finally { setIsBusy(false); }
  }
  async function copy(value: string): Promise<void> {
    try { await navigator.clipboard.writeText(value); setMessage('已复制'); setError(''); }
    catch { setError('复制失败，请手动选择文本复制'); }
  }
  const config = query.data ? buildMcpConnectionConfig(query.data.endpoint, created?.secret ?? '<YOUR_MCP_CREDENTIAL>') : '';
  return { query, created, isBusy, message, error, config, create, revoke, copy, dismissSecret: () => setCreated(null) };
}
