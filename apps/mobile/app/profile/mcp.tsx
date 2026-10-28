import { useState, type ReactElement } from 'react';
import { Text, View } from 'react-native';
import { getMcpCredentialStatus } from '@inplace/app-core';
import { useHousehold } from '@/providers/HouseholdProvider';
import { useMcpSettings } from '@/features/profile/useMcpSettings';
import { McpCredentialForm } from '@/features/profile/McpCredentialForm';
import { Screen } from '@/shared/ui/Screen';
import { PageHeader } from '@/shared/ui/PageHeader';
import { SectionCard } from '@/shared/ui/SectionCard';
import { ActionButtonRow } from '@/shared/ui/ActionButtonRow';
import { StateBlock } from '@/shared/ui/StateBlock';
import { FormField } from '@/shared/ui/FormField';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { palette } from '@/shared/ui/theme';

const bodyStyle = { fontSize: 13, lineHeight: 21, color: palette.textMuted };

export default function McpSettingsScreen(): ReactElement {
  const { currentHouseholdId } = useHousehold();
  return <Screen scroll>
    <PageHeader title="MCP 接入" subtitle="让 Agent 查询与录入库存" />
    {currentHouseholdId ? <McpSettingsPanel key={currentHouseholdId} householdId={currentHouseholdId} /> : <StateBlock title="请先选择家庭空间" />}
  </Screen>;
}

function McpSettingsPanel({ householdId }: { householdId: string }): ReactElement {
  const model = useMcpSettings(householdId);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [isSecretVisible, setIsSecretVisible] = useState(false);
  const settings = model.query.data;
  if (model.query.isPending) return <StateBlock title="加载 MCP 设置" loading />;
  if (!settings || model.query.isError) return <><StateBlock title="加载失败" body={model.query.error?.message} /><ActionButtonRow actions={[{ key: 'retry', label: '重新加载', onPress: () => void model.query.refetch() }]} /></>;
  const confirmRevoke = async () => { if (revokeId && await model.revoke(revokeId)) setRevokeId(null); };
  return <>
    {model.error ? <Text accessibilityRole="alert" style={{ color: palette.danger }}>{model.error}</Text> : null}
    {model.message ? <Text accessibilityLiveRegion="polite" style={{ color: palette.brandStrong }}>{model.message}</Text> : null}
    <SectionCard title="连接 Agent">
      <Text style={bodyStyle}>凭证固定关联「{settings.householdName}」。切换家庭不会改变已有凭证的范围。</Text>
      <Text style={bodyStyle}>Streamable HTTP · Bearer 认证</Text>
      <Text selectable style={{ ...bodyStyle, color: palette.text }}>{settings.endpoint}</Text>
      <ActionButtonRow actions={[{ key: 'copy-url', label: '复制 MCP 地址', onPress: () => void model.copy(settings.endpoint) }]} />
      <Text style={bodyStyle}>在 Agent 的 MCP 设置中填入地址和凭证。导入默认先预览，确认后整批写入；重复请求不会重复新增。</Text>
    </SectionCard>
    {model.created ? <SectionCard title="凭证已创建">
      <Text style={bodyStyle}>完整凭证仅在本次创建后可见，请保存到 Agent 的凭证配置中。</Text>
      <FormField label="完整凭证" value={model.created.secret} editable={false} secureTextEntry={!isSecretVisible} />
      <ActionButtonRow actions={[
        { key: 'copy-secret', label: '复制凭证', onPress: () => void model.copy(model.created!.secret), variant: 'primary' },
        { key: 'copy-config', label: '复制配置', onPress: () => void model.copy(model.config) },
      ]} />
      <ActionButtonRow actions={[
        { key: 'show', label: isSecretVisible ? '隐藏凭证' : '显示凭证', onPress: () => setIsSecretVisible(value => !value), variant: 'ghost' },
        { key: 'dismiss', label: '我已保存', onPress: () => { model.dismissSecret(); setIsSecretVisible(false); }, variant: 'ghost' },
      ]} />
    </SectionCard> : null}
    {!model.created ? <SectionCard title="创建凭证"><McpCredentialForm canImport={settings.canImport} isBusy={model.isBusy} onCreate={model.create} /></SectionCard> : null}
    <SectionCard title="我的凭证">
      {settings.credentials.length === 0 ? <Text style={bodyStyle}>还没有凭证，创建后即可连接 Agent。</Text> : null}
      {settings.credentials.map(credential => <View key={credential.id} style={{ gap: 8, paddingVertical: 12, borderBottomWidth: 1, borderColor: palette.borderSoft }}>
        <Text style={{ color: palette.text, fontWeight: '600', fontSize: 16 }}>{credential.name} · {getMcpCredentialStatus(credential)}</Text>
        <Text style={bodyStyle}>{credential.tokenPrefix}… · {credential.scopes.includes('inventory:import') ? '查询与导入' : '仅查询'}</Text>
        <Text style={bodyStyle}>有效至 {new Date(credential.expiresAt).toLocaleDateString()}</Text>
        <Text style={bodyStyle}>最近使用：{credential.lastUsedAt ? new Date(credential.lastUsedAt).toLocaleString() : '尚未使用'}</Text>
        {!credential.revokedAt ? <ActionButtonRow actions={[{ key: 'revoke', label: `撤销${credential.name}`, onPress: () => setRevokeId(credential.id), disabled: model.isBusy, variant: 'danger' }]} /> : null}
      </View>)}
    </SectionCard>
    <ConfirmDialog visible={Boolean(revokeId)} title="撤销 MCP 凭证" message="使用此凭证的 Agent 将立即失去访问权限。" confirmLabel="撤销凭证" danger loading={model.isBusy} onConfirm={() => void confirmRevoke()} onCancel={() => setRevokeId(null)} />
  </>;
}
