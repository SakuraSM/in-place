import { useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getMcpCredentialStatus } from '@inplace/app-core';
import { useHousehold } from '../../../app/providers/household-context';
import { PageContent, PageHeader, PageShell } from '../../../shared/ui/PageLayout';
import ConfirmDialog from '../../../shared/ui/ConfirmDialog';
import { SectionPanel } from '../components/ProfileUi';
import { McpCredentialForm } from '../components/McpCredentialForm';
import { useMcpSettings } from '../hooks/useMcpSettings';

export default function McpSettingsPage(): ReactElement {
  const { currentHousehold } = useHousehold();
  return <PageShell>
    <PageHeader title="MCP 接入" description="让 Agent 查询与录入当前家庭的库存" width="narrow" backLink={<Link to="/profile" className="inline-flex items-center gap-2"><ArrowLeft size={18} />返回设置</Link>} />
    <PageContent width="narrow" className="space-y-5 pb-8">
      {currentHousehold ? <McpSettingsPanel key={currentHousehold.id} householdId={currentHousehold.id} /> : <p>请先选择家庭空间。</p>}
    </PageContent>
  </PageShell>;
}

function McpSettingsPanel({ householdId }: { householdId: string }): ReactElement {
  const model = useMcpSettings(householdId);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [isSecretVisible, setIsSecretVisible] = useState(false);
  const settings = model.query.data;
  if (model.query.isPending) return <p role="status">加载 MCP 设置…</p>;
  if (!settings || model.query.isError) return <div role="alert"><p>{model.query.error?.message ?? '加载失败'}</p><button onClick={() => void model.query.refetch()} className="min-h-11 text-brandStrong">重新加载</button></div>;
  const confirmRevoke = async () => { if (revokeId && await model.revoke(revokeId)) setRevokeId(null); };
  return <>
    {model.error ? <p role="alert" className="text-sm text-red-700">{model.error}</p> : null}
    {model.message ? <p role="status" className="text-sm text-brandStrong">{model.message}</p> : null}
    <SectionPanel title="连接 Agent" description={`此页创建的凭证固定关联「${settings.householdName}」，切换家庭不会改变已有凭证的范围。`}>
      <p className="text-sm text-muted">传输方式：Streamable HTTP · 认证方式：Bearer</p>
      <p className="break-all rounded-xl bg-canvas p-3 font-mono text-sm text-ink">{settings.endpoint}</p>
      <button onClick={() => void model.copy(settings.endpoint)} className="min-h-11 rounded-xl border border-border px-4 text-sm">复制 MCP 地址</button>
      <p className="text-sm text-muted">在 Agent 的 MCP 设置中填入地址和凭证。导入默认先预览，确认后整批写入；同一请求编号重试不会重复新增。</p>
    </SectionPanel>
    {model.created ? <SectionPanel title="凭证已创建" description="完整凭证仅在本次创建后可见，请保存到 Agent 的凭证配置中。">
      <label className="block text-sm text-ink">完整凭证<input readOnly type={isSecretVisible ? 'text' : 'password'} value={model.created.secret} className="mt-2 min-h-11 w-full rounded-xl border border-border px-3 font-mono" /></label>
      <div className="flex flex-wrap gap-3">
        <button onClick={() => void model.copy(model.created!.secret)} className="min-h-11 rounded-xl bg-brandStrong px-4 text-sm text-white">复制凭证</button>
        <button onClick={() => void model.copy(model.config)} className="min-h-11 rounded-xl border border-border px-4 text-sm">复制连接配置</button>
        <button aria-pressed={isSecretVisible} onClick={() => setIsSecretVisible(value => !value)} className="min-h-11 px-3 text-sm text-muted">{isSecretVisible ? '隐藏凭证' : '显示凭证'}</button>
        <button onClick={() => { model.dismissSecret(); setIsSecretVisible(false); }} className="min-h-11 px-3 text-sm text-muted">我已保存</button>
      </div>
    </SectionPanel> : null}
    {!model.created ? <SectionPanel title="创建凭证"><McpCredentialForm canImport={settings.canImport} isBusy={model.isBusy} onCreate={model.create} /></SectionPanel> : null}
    <SectionPanel title="我的凭证" description="撤销、过期或离开家庭后，Agent 将失去访问权限。">
      {settings.credentials.length === 0 ? <p className="text-sm text-muted">还没有凭证，创建后即可连接 Agent。</p> : null}
      <ul className="divide-y divide-borderSoft">{settings.credentials.map(credential => <li key={credential.id} className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0 last:pb-0">
        <div className="min-w-0 flex-1"><p className="break-words font-semibold text-ink">{credential.name} <span className="text-xs font-normal text-muted">{getMcpCredentialStatus(credential)}</span></p>
          <p className="mt-1 text-xs text-muted">{credential.tokenPrefix}… · {credential.scopes.includes('inventory:import') ? '查询与导入' : '仅查询'}</p>
          <p className="mt-1 text-xs text-muted">有效至 {new Date(credential.expiresAt).toLocaleDateString()} · 最近使用 {credential.lastUsedAt ? new Date(credential.lastUsedAt).toLocaleString() : '尚未使用'}</p>
        </div>
        {!credential.revokedAt ? <button disabled={model.isBusy} onClick={() => setRevokeId(credential.id)} aria-label={`撤销${credential.name}`} className="min-h-11 rounded-xl border border-red-200 px-4 text-sm text-red-700 disabled:opacity-50">撤销</button> : null}
      </li>)}</ul>
    </SectionPanel>
    <SectionPanel title="配置示例" description="通用 HTTP MCP 配置；具体字段请以 Agent 客户端的接入方式为准。">
      <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-xl bg-canvas p-4 text-xs text-muted">{model.created ? '请使用上方“复制连接配置”保存完整配置。' : model.config}</pre>
    </SectionPanel>
    {revokeId ? <ConfirmDialog title="撤销 MCP 凭证" message="使用此凭证的 Agent 将立即失去访问权限。" confirmLabel="撤销凭证" danger isConfirming={model.isBusy} onConfirm={() => void confirmRevoke()} onCancel={() => setRevokeId(null)} /> : null}
  </>;
}
