import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import type { AuthUser } from '@inplace/domain';
import { useAuth } from '@/providers/AuthProvider';
import { aiApi, itemsApi, mobileApiClient } from '@/shared/api/mobileClient';
import { BrandHeader } from '@/shared/ui/BrandHeader';
import { Entrance } from '@/shared/ui/Entrance';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { StateBlock } from '@/shared/ui/StateBlock';
import { palette } from '@/shared/ui/theme';

export default function ProfileTab() {
  const { user, signOut, setCurrentUser } = useAuth();
  const queryClient = useQueryClient();
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const itemsQuery = useQuery({
    queryKey: ['mobile', 'profile-stats', user?.id],
    enabled: Boolean(user),
    queryFn: () => itemsApi.fetchItemStats(user!.id),
  });
  const aiSettingsQuery = useQuery({
    queryKey: ['mobile', 'ai-settings', user?.id],
    enabled: Boolean(user),
    queryFn: () => aiApi.fetchAiSettings(),
  });

  useEffect(() => {
    if (aiSettingsQuery.data) {
      setBaseUrl(aiSettingsQuery.data.baseUrl ?? '');
      setModel(aiSettingsQuery.data.model ?? '');
    }
  }, [aiSettingsQuery.data]);

  useEffect(() => {
    setDisplayName(user?.displayName ?? '');
  }, [user?.displayName]);

  const profileMutation = useMutation({
    mutationFn: () => fetchProfileUpdate(displayName),
    onSuccess: (nextUser) => {
      setCurrentUser(nextUser);
      setSaveMessage('昵称已更新');
    },
  });

  const passwordMutation = useMutation({
    mutationFn: () => fetchPasswordChange(currentPassword, newPassword),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setSaveMessage('密码已更新');
    },
  });

  const saveAiMutation = useMutation({
    mutationFn: () => aiApi.updateAiSettings({
      baseUrl: baseUrl.trim(),
      model: model.trim(),
      ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
    }),
    onSuccess: async () => {
      setApiKey('');
      setSaveMessage('AI 配置已保存');
      await queryClient.invalidateQueries({ queryKey: ['mobile', 'ai-settings', user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['mobile', 'ai-status', user?.id] });
    },
  });

  const resetAiMutation = useMutation({
    mutationFn: () => aiApi.resetAiSettings(),
    onSuccess: async () => {
      setApiKey('');
      setSaveMessage('AI 配置已重置');
      await queryClient.invalidateQueries({ queryKey: ['mobile', 'ai-settings', user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['mobile', 'ai-status', user?.id] });
    },
  });

  if (itemsQuery.isLoading || aiSettingsQuery.isLoading) {
    return <Screen><StateBlock title="正在加载个人中心" loading body="正在读取统计信息和 AI 配置。" /></Screen>;
  }

  if (itemsQuery.isError || aiSettingsQuery.isError) {
    const error = itemsQuery.error ?? aiSettingsQuery.error;
    return <Screen><StateBlock title="个人中心加载失败" body={error instanceof Error ? error.message : '请稍后重试。'} /></Screen>;
  }

  const aiSettings = aiSettingsQuery.data;
  const stats = itemsQuery.data ?? {
    total: 0,
    containers: 0,
    items: 0,
    borrowed: 0,
  };

  return (
    <Screen scroll>
      <Entrance>
        <BrandHeader
          title="我的"
          subtitle={`当前账号：${user?.email ?? '未登录'}，把资料、统计和 AI 设置放在一个地方。`}
        />
      </Entrance>

      <SectionCard title="资料与统计" subtitle="昵称、账户概况和库存统计会保持同步。" delay={70}>
        <TextInput
          value={displayName}
          onChangeText={(value) => {
            setSaveMessage(null);
            setDisplayName(value);
          }}
          placeholder="昵称"
          style={inputStyle}
        />
        {profileMutation.isError ? <Text style={errorTextStyle}>{profileMutation.error instanceof Error ? profileMutation.error.message : '昵称保存失败'}</Text> : null}
        <Pressable onPress={() => void profileMutation.mutateAsync()} style={primaryButtonStyle}>
          {profileMutation.isPending ? <ActivityIndicator color="#ffffff" /> : <Text style={primaryButtonTextStyle}>保存昵称</Text>}
        </Pressable>
        <View style={statsGridStyle}>
          <View style={statCardStyle}>
            <Text style={statValueStyle}>{stats.items}</Text>
            <Text style={bodyStyle}>物品</Text>
          </View>
          <View style={statCardStyle}>
            <Text style={statValueStyle}>{stats.containers}</Text>
            <Text style={bodyStyle}>容器</Text>
          </View>
          <View style={statCardStyle}>
            <Text style={statValueStyle}>{stats.borrowed}</Text>
            <Text style={bodyStyle}>借出</Text>
          </View>
          <View style={statCardStyle}>
            <Text style={statValueStyle}>{stats.total}</Text>
            <Text style={bodyStyle}>总计</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard title="AI 配置" subtitle="这里沿用 Web 端的配置逻辑，并保持轻量入场动画。" delay={140}>
        <Text style={bodyStyle}>启用状态：{aiSettings?.enabled ? '已启用' : '未启用'}</Text>
        <Text style={bodyStyle}>来源：{aiSettings?.source ?? 'unknown'}</Text>
        <TextInput
          value={baseUrl}
          onChangeText={(value) => {
            setSaveMessage(null);
            setBaseUrl(value);
          }}
          placeholder="Base URL，例如 https://api.openai.com/v1"
          style={inputStyle}
          autoCapitalize="none"
        />
        <TextInput
          value={model}
          onChangeText={(value) => {
            setSaveMessage(null);
            setModel(value);
          }}
          placeholder="模型，例如 gpt-4o"
          style={inputStyle}
          autoCapitalize="none"
        />
        <TextInput
          value={apiKey}
          onChangeText={(value) => {
            setSaveMessage(null);
            setApiKey(value);
          }}
          placeholder={aiSettings?.hasStoredApiKey ? '留空则保持当前服务端密钥' : '输入后保存为账号级密钥'}
          style={inputStyle}
          autoCapitalize="none"
          secureTextEntry
        />
        {saveMessage ? <Text style={successTextStyle}>{saveMessage}</Text> : null}
        {saveAiMutation.isError ? <Text style={errorTextStyle}>{saveAiMutation.error instanceof Error ? saveAiMutation.error.message : '保存失败'}</Text> : null}
        {resetAiMutation.isError ? <Text style={errorTextStyle}>{resetAiMutation.error instanceof Error ? resetAiMutation.error.message : '重置失败'}</Text> : null}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable onPress={() => void resetAiMutation.mutateAsync()} style={buttonStyle}>
            {resetAiMutation.isPending ? <ActivityIndicator /> : <Text style={buttonTextStyle}>重置</Text>}
          </Pressable>
          <Pressable onPress={() => void saveAiMutation.mutateAsync()} style={primaryButtonStyle}>
            {saveAiMutation.isPending ? <ActivityIndicator color="#ffffff" /> : <Text style={primaryButtonTextStyle}>保存</Text>}
          </Pressable>
        </View>
      </SectionCard>

      <SectionCard title="账号安全" subtitle="密码修改和退出操作放在最底部，减少误触。" delay={210}>
        <TextInput
          value={currentPassword}
          onChangeText={(value) => {
            setSaveMessage(null);
            setCurrentPassword(value);
          }}
          placeholder="当前密码"
          style={inputStyle}
          secureTextEntry
        />
        <TextInput
          value={newPassword}
          onChangeText={(value) => {
            setSaveMessage(null);
            setNewPassword(value);
          }}
          placeholder="新密码"
          style={inputStyle}
          secureTextEntry
        />
        {passwordMutation.isError ? <Text style={errorTextStyle}>{passwordMutation.error instanceof Error ? passwordMutation.error.message : '密码修改失败'}</Text> : null}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable onPress={() => void passwordMutation.mutateAsync()} style={primaryButtonStyle}>
            {passwordMutation.isPending ? <ActivityIndicator color="#ffffff" /> : <Text style={primaryButtonTextStyle}>修改密码</Text>}
          </Pressable>
          <Pressable onPress={() => void signOut()} style={buttonStyle}>
            <Text style={buttonTextStyle}>退出登录</Text>
          </Pressable>
        </View>
      </SectionCard>
    </Screen>
  );
}

async function fetchProfileUpdate(displayName: string) {
  const response = await mobileApiClient.request<{ user: AuthUser }>('/v1/auth/me', {
    method: 'PATCH',
    body: JSON.stringify({ displayName }),
  });

  return response.user;
}

async function fetchPasswordChange(currentPassword: string, newPassword: string) {
  await mobileApiClient.request<void>('/v1/auth/password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

const bodyStyle = {
  fontSize: 15,
  color: palette.textMuted,
};

const statsGridStyle = {
  flexDirection: 'row' as const,
  flexWrap: 'wrap' as const,
  gap: 12,
};

const statCardStyle = {
  minWidth: '47%' as const,
  backgroundColor: palette.surfaceMuted,
  borderRadius: 18,
  padding: 16,
  gap: 4,
  borderWidth: 1,
  borderColor: palette.borderSoft,
};

const statValueStyle = {
  fontSize: 24,
  fontWeight: '700' as const,
  color: palette.text,
};

const buttonStyle = {
  alignSelf: 'flex-start' as const,
  backgroundColor: palette.canvasStrong,
  borderRadius: 14,
  paddingHorizontal: 16,
  paddingVertical: 12,
};

const buttonTextStyle = {
  color: palette.text,
  fontWeight: '600' as const,
};

const primaryButtonStyle = {
  alignSelf: 'flex-start' as const,
  backgroundColor: palette.brand,
  borderRadius: 14,
  paddingHorizontal: 16,
  paddingVertical: 12,
};

const primaryButtonTextStyle = {
  color: '#ffffff',
  fontWeight: '600' as const,
};

const inputStyle = {
  backgroundColor: palette.surfaceMuted,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: palette.border,
  paddingHorizontal: 16,
  paddingVertical: 14,
  fontSize: 15,
  color: palette.text,
};

const successTextStyle = {
  color: '#15803d',
  fontSize: 14,
};

const errorTextStyle = {
  color: palette.danger,
  fontSize: 14,
};
