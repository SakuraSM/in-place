import { Link } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import { categoriesApi, tagsApi } from '@/shared/api/mobileClient';
import { BrandHeader } from '@/shared/ui/BrandHeader';
import { Entrance } from '@/shared/ui/Entrance';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { StateBlock } from '@/shared/ui/StateBlock';
import { palette } from '@/shared/ui/theme';

interface ManageMenuItem {
  href: Href;
  title: string;
  subtitle: string;
  iconName: ComponentProps<typeof Ionicons>['name'];
  meta?: string;
}

export default function ManageTab() {
  const { user } = useAuth();
  const categoriesQuery = useQuery({
    queryKey: ['mobile', 'categories', user?.id],
    enabled: Boolean(user),
    queryFn: () => categoriesApi.fetchCategories(user!.id),
  });
  const tagsQuery = useQuery({
    queryKey: ['mobile', 'tags', user?.id],
    enabled: Boolean(user),
    queryFn: () => tagsApi.fetchTags(user!.id),
  });

  if (categoriesQuery.isLoading || tagsQuery.isLoading) {
    return <Screen><StateBlock title="加载管理" loading /></Screen>;
  }

  if (categoriesQuery.isError || tagsQuery.isError) {
    const error = categoriesQuery.error ?? tagsQuery.error;
    return <Screen><StateBlock title="管理加载失败" body={error instanceof Error ? error.message : '请稍后重试'} /></Screen>;
  }

  const menuItems: ManageMenuItem[] = [
    {
      href: '/(tabs)/locations',
      title: '位置',
      subtitle: '空间与收纳层级',
      iconName: 'location-outline',
    },
    {
      href: '/(tabs)/activity',
      title: '记录',
      subtitle: '录入与修改日志',
      iconName: 'time-outline',
    },
    {
      href: '/manage/categories',
      title: '分类',
      subtitle: '物品与收纳分类',
      iconName: 'folder-open-outline',
      meta: `${categoriesQuery.data?.length ?? 0}`,
    },
    {
      href: '/manage/tags',
      title: '标签',
      subtitle: '搜索与筛选标签',
      iconName: 'pricetags-outline',
      meta: `${tagsQuery.data?.length ?? 0}`,
    },
  ];

  return (
    <Screen scroll contentInsetMode="page" chrome="muted">
      <Entrance variant="page">
        <BrandHeader title="管理" variant="page" />
      </Entrance>

      <SectionCard title="功能" delay={60} density="compact" headerMode="compact">
        <View style={menuStyle}>
          {menuItems.map((item) => (
            <Link key={item.title} href={item.href} asChild>
              <Pressable style={menuRowStyle}>
                <View style={iconStyle}>
                  <Ionicons name={item.iconName} size={21} color={palette.brandStrong} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={menuTitleStyle}>{item.title}</Text>
                  <Text style={menuSubtitleStyle}>{item.subtitle}</Text>
                </View>
                {item.meta ? <Text style={metaStyle}>{item.meta}</Text> : null}
                <Ionicons name="chevron-forward" size={18} color={palette.textSoft} />
              </Pressable>
            </Link>
          ))}
        </View>
      </SectionCard>
    </Screen>
  );
}

const menuStyle = {
  gap: 10,
};

const menuRowStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 12,
  borderRadius: 18,
  borderWidth: 1,
  borderColor: palette.borderSoft,
  backgroundColor: palette.surfaceMuted,
  padding: 13,
};

const iconStyle = {
  width: 40,
  height: 40,
  borderRadius: 14,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  backgroundColor: '#e0f2fe',
};

const menuTitleStyle = {
  color: palette.text,
  fontSize: 16,
  fontWeight: '800' as const,
};

const menuSubtitleStyle = {
  color: palette.textSoft,
  fontSize: 13,
};

const metaStyle = {
  minWidth: 24,
  textAlign: 'right' as const,
  color: palette.textMuted,
  fontSize: 14,
  fontWeight: '700' as const,
};
