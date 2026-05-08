import { Link } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import { aiApi, itemsApi } from '@/shared/api/mobileClient';
import { BrandHeader } from '@/shared/ui/BrandHeader';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Entrance } from '@/shared/ui/Entrance';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { StateBlock } from '@/shared/ui/StateBlock';
import { palette } from '@/shared/ui/theme';
import { fetchProfileUpdate } from '@/features/profile/mobileProfileApi';

export default function ProfileTab() {
  const { user, signOut, setCurrentUser } = useAuth();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);
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
    setDisplayName(user?.displayName ?? '');
  }, [user?.displayName]);

  const profileMutation = useMutation({
    mutationFn: () => fetchProfileUpdate(displayName),
    onSuccess: (nextUser) => {
      setCurrentUser(nextUser);
      setSaveMessage('昵称已更新');
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
    <Screen scroll contentInsetMode="page" chrome="muted">
      <Entrance variant="page">
        <BrandHeader
          title="我的"
          subtitle={user?.email ?? '当前未登录'}
          variant="page"
        />
      </Entrance>

      <SectionCard title="资料与统计" subtitle="昵称和库存概况会保持同步。" delay={70} density="compact" headerMode="compact">
        <View style={profileEditRowStyle}>
          <TextInput
            value={displayName}
            onChangeText={(value) => {
              setSaveMessage(null);
              setDisplayName(value);
            }}
            placeholder="昵称"
            style={[inputStyle, { flex: 1 }]}
          />
          <Pressable onPress={() => void profileMutation.mutateAsync()} style={primaryButtonStyle}>
            {profileMutation.isPending ? <ActivityIndicator color="#ffffff" /> : <Text style={primaryButtonTextStyle}>保存</Text>}
          </Pressable>
        </View>
        {saveMessage ? <Text style={successTextStyle}>{saveMessage}</Text> : null}
        {profileMutation.isError ? <Text style={errorTextStyle}>{profileMutation.error instanceof Error ? profileMutation.error.message : '昵称保存失败'}</Text> : null}
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

      <SectionCard title="账户工作台" subtitle="AI、账号安全和数据管理。" delay={140} density="compact" headerMode="compact">
        <Link href="/profile/ai" asChild>
          <Pressable style={navRowStyle}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={listTitleStyle}>AI 配置</Text>
              <Text style={bodyStyle}>
                {aiSettings?.enabled ? '当前已启用 AI 识别' : '当前未启用 AI 识别'} · {aiSettings?.source === 'user' ? '账号配置' : '系统默认'}
              </Text>
            </View>
            <Text style={linkMetaStyle}>进入</Text>
          </Pressable>
        </Link>

        <Link href="/profile/security" asChild>
          <Pressable style={navRowStyle}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={listTitleStyle}>账号安全</Text>
              <Text style={bodyStyle}>修改密码、处理当前登录会话。</Text>
            </View>
            <Text style={linkMetaStyle}>进入</Text>
          </Pressable>
        </Link>

        <Link href="/profile/data" asChild>
          <Pressable style={navRowStyle}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={listTitleStyle}>数据管理</Text>
              <Text style={bodyStyle}>导出 JSON / CSV，并导入 JSON 备份。</Text>
            </View>
            <Text style={linkMetaStyle}>进入</Text>
          </Pressable>
        </Link>
      </SectionCard>

      <SectionCard title="会话操作" subtitle="退出当前账号。" delay={210} density="compact" tone="muted" headerMode="compact">
        <Pressable onPress={() => setIsSignOutDialogOpen(true)} style={buttonStyle}>
          <Text style={buttonTextStyle}>退出登录</Text>
        </Pressable>
      </SectionCard>

      <ConfirmDialog
        visible={isSignOutDialogOpen}
        title="退出登录"
        message="确定要退出当前账号吗？退出后需要重新登录才能继续管理库存。"
        confirmLabel="退出"
        danger
        onCancel={() => setIsSignOutDialogOpen(false)}
        onConfirm={() => void signOut()}
      />
    </Screen>
  );
}

const bodyStyle = {
  fontSize: 15,
  color: palette.textMuted,
};

const statsGridStyle = {
  flexDirection: 'row' as const,
  flexWrap: 'wrap' as const,
  gap: 10,
};

const statCardStyle = {
  minWidth: '47%' as const,
  backgroundColor: palette.surfaceMuted,
  borderRadius: 16,
  padding: 14,
  gap: 4,
  borderWidth: 1,
  borderColor: palette.borderSoft,
};

const statValueStyle = {
  fontSize: 24,
  fontWeight: '700' as const,
  color: palette.text,
};

const navRowStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 12,
  borderTopWidth: 1,
  borderTopColor: palette.borderSoft,
  paddingTop: 12,
};

const listTitleStyle = {
  fontSize: 16,
  fontWeight: '700' as const,
  color: palette.text,
};

const linkMetaStyle = {
  color: palette.textSoft,
  fontSize: 13,
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
  backgroundColor: palette.brand,
  borderRadius: 14,
  paddingHorizontal: 15,
  paddingVertical: 13,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

const primaryButtonTextStyle = {
  color: '#ffffff',
  fontWeight: '600' as const,
};

const profileEditRowStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 10,
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
