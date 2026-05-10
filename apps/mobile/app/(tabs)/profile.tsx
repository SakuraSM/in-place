import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { aiApi } from '@/shared/api/mobileClient';
import { BrandHeader } from '@/shared/ui/BrandHeader';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Entrance } from '@/shared/ui/Entrance';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { StateBlock } from '@/shared/ui/StateBlock';
import { palette } from '@/shared/ui/theme';

interface ProfileMenuItem {
  href?: Href;
  title: string;
  subtitle: string;
  iconName: ComponentProps<typeof Ionicons>['name'];
  danger?: boolean;
  onPress?: () => void;
}

export default function ProfileTab() {
  const { user, signOut } = useAuth();
  const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);
  const aiSettingsQuery = useQuery({
    queryKey: ['mobile', 'ai-settings', user?.id],
    enabled: Boolean(user),
    queryFn: () => aiApi.fetchAiSettings(),
  });

  if (aiSettingsQuery.isLoading) {
    return <Screen><StateBlock title="加载个人中心" loading /></Screen>;
  }

  if (aiSettingsQuery.isError) {
    return <Screen><StateBlock title="个人中心加载失败" body={aiSettingsQuery.error instanceof Error ? aiSettingsQuery.error.message : '请稍后重试'} /></Screen>;
  }

  const aiSettings = aiSettingsQuery.data;
  const menuItems: ProfileMenuItem[] = [
    {
      href: '/profile/edit',
      title: '个人资料',
      subtitle: user?.displayName || user?.email || '未设置昵称',
      iconName: 'person-outline',
    },
    {
      href: '/profile/ai',
      title: 'AI 配置',
      subtitle: `${aiSettings?.enabled ? '已启用' : '未启用'} · ${aiSettings?.source === 'user' ? '账号配置' : '系统默认'}`,
      iconName: 'sparkles-outline',
    },
    {
      href: '/profile/security',
      title: '账号安全',
      subtitle: '密码与会话',
      iconName: 'shield-checkmark-outline',
    },
    {
      href: '/profile/data',
      title: '数据管理',
      subtitle: '导入与导出',
      iconName: 'server-outline',
    },
    {
      href: '/profile/about',
      title: '关于',
      subtitle: '版本与开源信息',
      iconName: 'information-circle-outline',
    },
    {
      title: '退出登录',
      subtitle: '退出当前账号',
      iconName: 'log-out-outline',
      danger: true,
      onPress: () => setIsSignOutDialogOpen(true),
    },
  ];

  return (
    <Screen scroll contentInsetMode="page" chrome="muted">
      <Entrance variant="page">
        <BrandHeader title="我的" variant="page" />
      </Entrance>

      <SectionCard title="账户" delay={70} density="compact" headerMode="compact">
        <View style={profileSummaryStyle}>
          <View style={avatarStyle}>
            <Text style={avatarTextStyle}>{(user?.displayName || user?.email || '归').slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={profileNameStyle}>{user?.displayName || '未设置昵称'}</Text>
            <Text style={bodyStyle}>{user?.email ?? '未登录'}</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard title="设置" delay={120} density="compact" headerMode="compact">
        <View style={menuStyle}>
          {menuItems.map((item) => <ProfileMenuRow key={item.title} item={item} />)}
        </View>
      </SectionCard>

      <ConfirmDialog
        visible={isSignOutDialogOpen}
        title="退出登录"
        message="确定退出当前账号？"
        confirmLabel="退出"
        danger
        onCancel={() => setIsSignOutDialogOpen(false)}
        onConfirm={() => void signOut()}
      />
    </Screen>
  );
}

function ProfileMenuRow({ item }: { item: ProfileMenuItem }) {
  const handlePress = () => {
    if (item.onPress) {
      item.onPress();
      return;
    }

    if (item.href) {
      router.push(item.href);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={handlePress}
      style={({ pressed }) => [
        menuRowStyle,
        item.danger ? dangerMenuRowStyle : null,
        pressed ? menuRowPressedStyle : null,
      ]}
    >
      <View style={[iconStyle, item.danger ? dangerIconStyle : null]}>
        <Ionicons name={item.iconName} size={20} color={item.danger ? palette.danger : palette.brandStrong} />
      </View>
      <View style={menuTextStyle}>
        <Text numberOfLines={1} style={[menuTitleStyle, item.danger ? dangerTitleStyle : null]}>{item.title}</Text>
        <Text numberOfLines={1} ellipsizeMode="tail" style={bodyStyle}>{item.subtitle}</Text>
      </View>
      {item.href ? (
        <View style={chevronBoxStyle}>
          <Ionicons name="chevron-forward" size={18} color={palette.textSoft} />
        </View>
      ) : null}
    </Pressable>
  );
}

const bodyStyle = { fontSize: 14, color: palette.textMuted };
const profileSummaryStyle = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 };
const avatarStyle = {
  width: 52,
  height: 52,
  borderRadius: 18,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  backgroundColor: palette.brand,
};
const avatarTextStyle = { color: '#ffffff', fontSize: 22, fontWeight: '900' as const };
const profileNameStyle = { color: palette.text, fontSize: 18, fontWeight: '800' as const };
const menuStyle = { gap: 10, width: '100%' as const };
const menuRowStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 12,
  width: '100%' as const,
  minHeight: 60,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: palette.borderSoft,
  backgroundColor: palette.surfaceMuted,
  paddingHorizontal: 12,
  paddingVertical: 10,
};
const menuRowPressedStyle = {
  opacity: 0.72,
};
const menuTextStyle = {
  flex: 1,
  minWidth: 0,
  gap: 3,
};
const iconStyle = {
  width: 36,
  height: 36,
  flexShrink: 0,
  borderRadius: 13,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  backgroundColor: '#e0f2fe',
};
const chevronBoxStyle = {
  flexShrink: 0,
  width: 24,
  alignItems: 'flex-end' as const,
};
const menuTitleStyle = { color: palette.text, fontSize: 16, fontWeight: '800' as const };
const dangerMenuRowStyle = { backgroundColor: '#fff1f2', borderColor: '#fecdd3' };
const dangerIconStyle = { backgroundColor: '#ffe4e6' };
const dangerTitleStyle = { color: palette.danger };
