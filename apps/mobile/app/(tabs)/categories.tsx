import { Link } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import type { ComponentProps } from 'react';
import { Pressable, View } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import { categoriesApi, tagsApi } from '@/shared/api/mobileClient';
import { BrandHeader } from '@/shared/ui/BrandHeader';
import { CompactListRow } from '@/shared/ui/CompactListRow';
import { Entrance } from '@/shared/ui/Entrance';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { StateBlock } from '@/shared/ui/StateBlock';

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

      <SectionCard title="功能" delay={60} density="dense" headerMode="compact">
        <View style={menuStyle}>
          {menuItems.map((item) => (
            <Link key={item.title} href={item.href} asChild>
              <Pressable>
                <CompactListRow
                  title={item.title}
                  subtitle={item.subtitle}
                  iconName={item.iconName}
                  meta={item.meta}
                  chevron
                />
              </Pressable>
            </Link>
          ))}
        </View>
      </SectionCard>
    </Screen>
  );
}

const menuStyle = {
  gap: 8,
};
