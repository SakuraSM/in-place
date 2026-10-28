import { useState, type FormEvent, type ReactElement } from 'react';
import type { CreateMcpCredentialInput } from '@inplace/domain';
import { MCP_DEFAULT_EXPIRY_DAYS, MCP_EXPIRY_CHOICES } from '@inplace/app-core';

interface McpCredentialFormProps {
  canImport: boolean;
  isBusy: boolean;
  onCreate: (input: CreateMcpCredentialInput) => Promise<void>;
}

export function McpCredentialForm({ canImport, isBusy, onCreate }: McpCredentialFormProps): ReactElement {
  const [name, setName] = useState('');
  const [days, setDays] = useState(MCP_DEFAULT_EXPIRY_DAYS);
  const [allowImport, setAllowImport] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onCreate({ name: name.trim(), expiresInDays: days, scopes: allowImport && canImport ? ['inventory:read', 'inventory:import'] : ['inventory:read'] });
  };
  return <form onSubmit={submit} className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="space-y-2 text-sm font-medium text-ink">凭证名称
        <input required maxLength={80} value={name} onChange={event => setName(event.target.value)} placeholder="例如：我的 Agent" className="block min-h-11 w-full rounded-xl border border-border bg-canvas px-3" />
      </label>
      <label className="space-y-2 text-sm font-medium text-ink">有效期
        <select value={days} onChange={event => setDays(Number(event.target.value))} className="block min-h-11 w-full rounded-xl border border-border bg-canvas px-3">
          {MCP_EXPIRY_CHOICES.map(value => <option key={value} value={value}>{value} 天</option>)}
        </select>
      </label>
    </div>
    <p className="text-sm text-muted">默认允许查询库存、详情和分类。</p>
    <label className="flex min-h-11 items-center gap-3 text-sm text-ink">
      <input type="checkbox" checked={allowImport && canImport} disabled={!canImport} onChange={event => setAllowImport(event.target.checked)} className="h-5 w-5 accent-brandStrong" />
      允许批量新增物品、位置和收纳
    </label>
    {!canImport ? <p className="text-sm text-muted">当前家庭角色仅允许读取。</p> : null}
    <button disabled={isBusy || !name.trim()} className="min-h-11 rounded-xl bg-brandStrong px-5 text-sm font-semibold text-white disabled:opacity-50">{isBusy ? '处理中…' : '创建凭证'}</button>
  </form>;
}
