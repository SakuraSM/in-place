import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { aiApi } from '@/shared/api/mobileClient';
import { useAuth } from '@/providers/AuthProvider';
import { BrandHeader } from '@/shared/ui/BrandHeader';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { StateBlock } from '@/shared/ui/StateBlock';
import { palette } from '@/shared/ui/theme';

export default function AiSettingsScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const aiSettingsQuery = useQuery({
    queryKey: ['mobile', 'ai-settings', user?.id],
    enabled: Boolean(user),
    queryFn: () => aiApi.fetchAiSettings(),
  });

  useEffect(() => {
    if (!aiSettingsQuery.data) {
      return;
    }

    setBaseUrl(aiSettingsQuery.data.baseUrl ?? '');
    setModel(aiSettingsQuery.data.model ?? '');
  }, [aiSettingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => aiApi.updateAiSettings({
      baseUrl: baseUrl.trim(),
      model: model.trim(),
      ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
    }),
    onSuccess: async () => {
      setApiKey('');
      setMessage('AI 配置已保存');
      await queryClient.invalidateQueries({ queryKey: ['mobile', 'ai-settings', user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['mobile', 'ai-status', user?.id] });
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => aiApi.resetAiSettings(),
    onSuccess: async () => {
      setApiKey('');
      setMessage('AI 配置已重置');
      await queryClient.invalidateQueries({ queryKey: ['mobile', 'ai-settings', user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['mobile', 'ai-status', user?.id] });
    },
  });

  if (aiSettingsQuery.isLoading) {
    return <Screen><StateBlock title="正在加载 AI 配置" loading body="正在读取当前账号的识别服务配置。" /></Screen>;
  }

  if (aiSettingsQuery.isError) {
    return <Screen><StateBlock title="AI 配置加载失败" body={aiSettingsQuery.error instanceof Error ? aiSettingsQuery.error.message : '请稍后重试。'} /></Screen>;
  }

  const aiSettings = aiSettingsQuery.data;

  return (
    <Screen scroll contentInsetMode="form" chrome="muted">
      <BrandHeader title="AI 配置" subtitle="单独维护识别服务配置，避免把个人中心首页堆得太满。" variant="page" />

      <SectionCard title="当前状态" subtitle="当前账号使用的 AI 服务来源与启用情况。" delay={60} density="compact">
        <Text style={bodyStyle}>启用状态：{aiSettings?.enabled ? '已启用' : '未启用'}</Text>
        <Text style={bodyStyle}>来源：{aiSettings?.source === 'user' ? '账号配置' : '系统默认'}</Text>
        <Text style={bodyStyle}>已存密钥：{aiSettings?.hasStoredApiKey ? '是' : '否'}</Text>
      </SectionCard>

      <SectionCard title="配置项" subtitle="这里与 Web 端的字段保持一致。" delay={110} density="compact">
        <TextInput
          value={baseUrl}
          onChangeText={(value) => {
            setMessage(null);
            setBaseUrl(value);
          }}
          placeholder="Base URL，例如 https://api.openai.com/v1"
          style={inputStyle}
          autoCapitalize="none"
        />
        <TextInput
          value={model}
          onChangeText={(value) => {
            setMessage(null);
            setModel(value);
          }}
          placeholder="模型，例如 gpt-5.4"
          style={inputStyle}
          autoCapitalize="none"
        />
        <TextInput
          value={apiKey}
          onChangeText={(value) => {
            setMessage(null);
            setApiKey(value);
          }}
          placeholder={aiSettings?.hasStoredApiKey ? '留空则保持当前服务端密钥' : '输入后保存为账号级密钥'}
          style={inputStyle}
          autoCapitalize="none"
          secureTextEntry
        />
        {message ? <Text style={successTextStyle}>{message}</Text> : null}
        {saveMutation.isError ? <Text style={errorTextStyle}>{saveMutation.error instanceof Error ? saveMutation.error.message : '保存失败'}</Text> : null}
        {resetMutation.isError ? <Text style={errorTextStyle}>{resetMutation.error instanceof Error ? resetMutation.error.message : '重置失败'}</Text> : null}
        <View style={actionRowStyle}>
          <Pressable onPress={() => void resetMutation.mutateAsync()} style={secondaryButtonStyle}>
            {resetMutation.isPending ? <ActivityIndicator /> : <Text style={secondaryButtonTextStyle}>恢复默认</Text>}
          </Pressable>
          <Pressable onPress={() => void saveMutation.mutateAsync()} style={primaryButtonStyle}>
            {saveMutation.isPending ? <ActivityIndicator color="#ffffff" /> : <Text style={primaryButtonTextStyle}>保存配置</Text>}
          </Pressable>
        </View>
      </SectionCard>
    </Screen>
  );
}

const bodyStyle = {
  fontSize: 15,
  color: palette.textMuted,
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

const actionRowStyle = {
  flexDirection: 'row' as const,
  gap: 12,
};

const secondaryButtonStyle = {
  flex: 1,
  alignItems: 'center' as const,
  backgroundColor: palette.canvasStrong,
  borderRadius: 14,
  paddingVertical: 13,
};

const secondaryButtonTextStyle = {
  color: palette.text,
  fontWeight: '600' as const,
};

const primaryButtonStyle = {
  flex: 1,
  alignItems: 'center' as const,
  backgroundColor: palette.brand,
  borderRadius: 14,
  paddingVertical: 13,
};

const primaryButtonTextStyle = {
  color: '#ffffff',
  fontWeight: '600' as const,
};

const successTextStyle = {
  color: '#15803d',
  fontSize: 14,
};

const errorTextStyle = {
  color: palette.danger,
  fontSize: 14,
};
