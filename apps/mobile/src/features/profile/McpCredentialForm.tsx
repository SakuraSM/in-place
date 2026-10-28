import { useState, type ReactElement } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import type { CreateMcpCredentialInput } from '@inplace/domain';
import { MCP_DEFAULT_EXPIRY_DAYS, MCP_EXPIRY_CHOICES } from '@inplace/app-core';
import { FormField } from '@/shared/ui/FormField';
import { ActionButtonRow } from '@/shared/ui/ActionButtonRow';
import { palette } from '@/shared/ui/theme';

interface McpCredentialFormProps {
  canImport: boolean;
  isBusy: boolean;
  onCreate: (input: CreateMcpCredentialInput) => Promise<void>;
}

export function McpCredentialForm({ canImport, isBusy, onCreate }: McpCredentialFormProps): ReactElement {
  const [name, setName] = useState('');
  const [days, setDays] = useState(MCP_DEFAULT_EXPIRY_DAYS);
  const [allowImport, setAllowImport] = useState(false);
  const create = () => void onCreate({ name: name.trim(), expiresInDays: days, scopes: allowImport && canImport ? ['inventory:read', 'inventory:import'] : ['inventory:read'] });
  return <View style={{ gap: 14 }}>
    <FormField label="凭证名称" value={name} onChangeText={setName} maxLength={80} placeholder="例如：我的 Agent" />
    <Text style={{ color: palette.textMuted, fontSize: 13 }}>有效期</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{MCP_EXPIRY_CHOICES.map(value =>
      <Pressable key={value} accessibilityRole="radio" accessibilityLabel={`${value} 天`} accessibilityState={{ checked: value === days }} onPress={() => setDays(value)}
        style={{ minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 12, backgroundColor: value === days ? palette.brandTint : palette.surfaceMuted }}>
        <Text style={{ color: value === days ? palette.brandStrong : palette.textMuted }}>{value} 天</Text>
      </Pressable>)}</View>
    <Text style={{ color: palette.textMuted, fontSize: 13, lineHeight: 20 }}>默认允许查询库存、详情和分类。</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Text style={{ flex: 1, color: palette.text, fontSize: 14, lineHeight: 22 }}>允许批量新增物品、位置和收纳</Text>
      <Switch accessibilityLabel="允许批量新增" disabled={!canImport} value={allowImport && canImport} onValueChange={setAllowImport} trackColor={{ true: palette.brandStrong }} />
    </View>
    {!canImport ? <Text style={{ color: palette.textMuted }}>当前家庭角色仅允许读取。</Text> : null}
    <ActionButtonRow actions={[{ key: 'create', label: '创建凭证', variant: 'primary', onPress: create, disabled: isBusy || !name.trim(), loading: isBusy }]} />
  </View>;
}
