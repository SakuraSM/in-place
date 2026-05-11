import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ActivityLog, Category, Item, ItemStats } from '@inplace/domain';
import { ACTIVITY_ACTION_PRESENTATION, ITEM_TYPE_PRESENTATION } from '@inplace/app-core';
import { Image, Pressable, Text, View } from 'react-native';
import { getMobileApiBaseUrl } from '@/shared/api/mobileClient';
import { resolveMobileContainerBrowseHref, resolveMobileDetailHref } from '@/shared/lib/detailPath';
import { countLocationContents, getContainerTypeLabel } from '@/shared/lib/location';
import { BrandHeader } from '@/shared/ui/BrandHeader';
import { Entrance } from '@/shared/ui/Entrance';
import { palette, shadows } from '@/shared/ui/theme';

type ViewMode = 'type' | 'category';

interface HomeDashboardProps {
  stats: ItemStats | null;
  statsLoading: boolean;
  recentItems: Item[];
  recentItemPaths: Record<string, string>;
  recentActivity: ActivityLog[];
  rootItems: Item[];
  allItems: Item[];
  categories: Category[];
  viewMode: ViewMode;
  selectionMode: boolean;
  selectedIds: string[];
  onToggleSelectionMode: () => void;
  onChangeViewMode: (mode: ViewMode) => void;
  onToggleSelected: (itemId: string) => void;
}

const RECENT_SECTION_LIMIT = 3;
const HOME_INVENTORY_PREVIEW_LIMIT = 4;

const STAT_ITEMS = [
  { label: '总物品', key: 'items', icon: 'cube-outline', color: '#0ea5e9', backgroundColor: '#eff9ff' },
  { label: '收纳数', key: 'containers', icon: 'cube', color: '#14b8a6', backgroundColor: '#effdf9' },
  { label: '借出中', key: 'borrowed', icon: 'time-outline', color: '#f59e0b', backgroundColor: '#fff7e6' },
  { label: '总计', key: 'total', icon: 'shield-checkmark-outline', color: '#22c55e', backgroundColor: '#ecfdf3' },
] as const;

export function HomeDashboard({
  stats,
  statsLoading,
  recentItems,
  recentItemPaths,
  recentActivity,
  rootItems,
  allItems,
  categories,
  viewMode,
  selectionMode,
  selectedIds,
  onToggleSelectionMode,
  onChangeViewMode,
  onToggleSelected,
}: HomeDashboardProps) {
  const rootContainers = rootItems.filter((item) => item.type === 'container');
  const rootLeafItems = rootItems.filter((item) => item.type === 'item');
  const groupedRootItems = groupRootItems({
    rootContainers,
    rootLeafItems,
    categories,
  });

  return (
    <>
      <Entrance variant="page">
        <BrandHeader
          title="归位"
          variant="page"
          align="center"
          accessory={(
            <View style={headerActionsStyle}>
              <Pressable onPress={onToggleSelectionMode} style={[headerActionStyle, selectionMode ? headerActionActiveStyle : null]}>
                <Ionicons name={selectionMode ? 'close' : 'checkbox-outline'} size={17} color={selectionMode ? '#ffffff' : palette.textMuted} />
                <Text style={[headerActionTextStyle, selectionMode ? headerActionActiveTextStyle : null]}>
                  {selectionMode ? '退出' : '批量'}
                </Text>
              </Pressable>
              <View style={viewToggleStyle}>
                <ModeButton mode="type" viewMode={viewMode} onChangeViewMode={onChangeViewMode} />
                <ModeButton mode="category" viewMode={viewMode} onChangeViewMode={onChangeViewMode} />
              </View>
            </View>
          )}
        />
      </Entrance>

      {selectionMode ? (
        <View style={selectionNoticeStyle}>
          <Text style={selectionNoticeTitleStyle}>已选择 {selectedIds.length} 项</Text>
          <Text style={selectionNoticeTextStyle}>点击卡片选择</Text>
        </View>
      ) : null}

      {!selectionMode ? (
        <>
          <DashboardSection delay={70}>
            <View style={statsGridStyle}>
              {STAT_ITEMS.map((item) => (
                <Pressable key={item.key} onPress={() => router.push('/(tabs)/overview')} style={statCardStyle}>
                  <View style={[statIconStyle, { backgroundColor: item.backgroundColor }]}>
                    <Ionicons name={item.icon} size={17} color={item.color} />
                  </View>
                  <Text style={statValueStyle}>{statsLoading ? '—' : stats?.[item.key] ?? 0}</Text>
                  <Text style={mutedTextStyle}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </DashboardSection>

          <DashboardSection title="最近添加" delay={110}>
            {recentItems.length === 0 ? (
              <EmptyBlock text="暂无新增" />
            ) : (
              recentItems.slice(0, RECENT_SECTION_LIMIT).map((item) => (
                <RecentItemRow key={item.id} item={item} path={recentItemPaths[item.id] || '顶层'} />
              ))
            )}
          </DashboardSection>

          <DashboardSection
            title="最近操作"
            actionLabel="查看全部"
            onAction={() => router.push('/(tabs)/activity')}
            delay={150}
          >
            {recentActivity.length === 0 ? (
              <EmptyBlock text="暂无操作" />
            ) : (
              recentActivity.slice(0, RECENT_SECTION_LIMIT).map((entry) => <ActivityRow key={entry.id} entry={entry} />)
            )}
          </DashboardSection>
        </>
      ) : null}

      {selectionMode || viewMode === 'type' ? (
        <>
          <InventoryGroup
            title={`收纳 (${rootContainers.length})`}
            items={rootContainers}
            allItems={allItems}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            previewLimit={selectionMode ? undefined : HOME_INVENTORY_PREVIEW_LIMIT}
            actionLabel={selectionMode || rootContainers.length <= HOME_INVENTORY_PREVIEW_LIMIT ? undefined : '查看更多'}
            onAction={selectionMode || rootContainers.length <= HOME_INVENTORY_PREVIEW_LIMIT ? undefined : () => router.push('/(tabs)/overview?type=container')}
            onToggleSelected={onToggleSelected}
          />
          <InventoryGroup
            title={`物品 (${rootLeafItems.length})`}
            items={rootLeafItems}
            allItems={allItems}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            previewLimit={selectionMode ? undefined : HOME_INVENTORY_PREVIEW_LIMIT}
            actionLabel={selectionMode || rootLeafItems.length <= HOME_INVENTORY_PREVIEW_LIMIT ? undefined : '查看更多'}
            onAction={selectionMode || rootLeafItems.length <= HOME_INVENTORY_PREVIEW_LIMIT ? undefined : () => router.push('/(tabs)/overview?type=item')}
            onToggleSelected={onToggleSelected}
          />
        </>
      ) : (
        groupedRootItems.map((group) => (
          <InventoryGroup
            key={group.title}
            title={group.title}
            items={group.items}
            allItems={allItems}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            previewLimit={HOME_INVENTORY_PREVIEW_LIMIT}
            actionLabel={group.items.length <= HOME_INVENTORY_PREVIEW_LIMIT ? undefined : '查看更多'}
            onAction={group.items.length <= HOME_INVENTORY_PREVIEW_LIMIT ? undefined : () => router.push(resolveOverviewHrefForGroup(group.items))}
            onToggleSelected={onToggleSelected}
          />
        ))
      )}

    </>
  );
}

function DashboardSection({
  title,
  subtitle,
  actionLabel,
  onAction,
  children,
  delay,
}: {
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <Entrance delay={delay} variant="card">
      <View style={sectionStyle}>
        {title ? (
          <View style={sectionHeaderStyle}>
            <View style={{ flex: 1 }}>
              <Text style={sectionTitleStyle}>{title}</Text>
              {subtitle ? <Text style={sectionSubtitleStyle}>{subtitle}</Text> : null}
            </View>
            {actionLabel && onAction ? (
              <Pressable onPress={onAction}>
                <Text style={sectionActionStyle}>{actionLabel}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {children as never}
      </View>
    </Entrance>
  );
}

function ModeButton({
  mode,
  viewMode,
  onChangeViewMode,
}: {
  mode: ViewMode;
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
}) {
  const isActive = mode === viewMode;
  return (
    <Pressable onPress={() => onChangeViewMode(mode)} style={[modeButtonStyle, isActive ? modeButtonActiveStyle : null]}>
      <Ionicons name={mode === 'type' ? 'grid-outline' : 'git-branch-outline'} size={18} color={isActive ? palette.text : palette.textSoft} />
    </Pressable>
  );
}

function RecentItemRow({ item, path }: { item: Item; path: string }) {
  const imageUri = resolveImageUri(item.images[0]);
  const row = (
    <View style={rowCardStyle}>
      <Thumb item={item} imageUri={imageUri} />
      <View style={rowTextStyle}>
        <Text numberOfLines={1} style={rowTitleStyle}>{item.name}</Text>
        <Text numberOfLines={1} style={mutedTextStyle}>
          {item.type === 'item' ? '物品' : getContainerTypeLabel(item)} · {formatShortDateTime(item.created_at)}
        </Text>
        <Text numberOfLines={1} style={captionTextStyle}>{path}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={palette.textSoft} />
    </View>
  );

  if (item.type === 'container') {
    return (
      <Pressable
        delayLongPress={500}
        onLongPress={() => router.push(resolveMobileDetailHref(item))}
        onPress={() => router.push(resolveMobileContainerBrowseHref(item))}
      >
        {row}
      </Pressable>
    );
  }

  return (
    <Link href={resolveMobileDetailHref(item)} asChild>
      <Pressable>{row}</Pressable>
    </Link>
  );
}

function ActivityRow({ entry }: { entry: ActivityLog }) {
  const row = (
    <View style={rowCardStyle}>
      <View style={[activityIconStyle, entry.action === 'delete' ? deleteActivityIconStyle : null]}>
        <Ionicons name={entry.action === 'delete' ? 'trash-outline' : 'create-outline'} size={19} color={entry.action === 'delete' ? '#f43f5e' : '#f59e0b'} />
      </View>
      <View style={rowTextStyle}>
        <View style={activityTitleLineStyle}>
          <Text numberOfLines={1} style={[rowTitleStyle, activityTitleStyle]}>{entry.item_name || '未命名对象'}</Text>
          <Text style={activityPillStyle}>{ACTIVITY_ACTION_PRESENTATION[entry.action].label}</Text>
        </View>
        <Text numberOfLines={1} style={mutedTextStyle}>
          {ITEM_TYPE_PRESENTATION[entry.item_type].label} · {formatShortDateTime(entry.created_at)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={palette.textSoft} />
    </View>
  );

  if (!entry.item_id || entry.action === 'delete') {
    return row;
  }

  return (
    <Link href={resolveMobileDetailHref({ id: entry.item_id, type: entry.item_type })} asChild>
      <Pressable>{row}</Pressable>
    </Link>
  );
}

function InventoryGroup({
  title,
  items,
  allItems,
  selectionMode,
  selectedIds,
  previewLimit,
  actionLabel,
  onAction,
  onToggleSelected,
}: {
  title: string;
  items: Item[];
  allItems: Item[];
  selectionMode: boolean;
  selectedIds: string[];
  previewLimit?: number;
  actionLabel?: string;
  onAction?: () => void;
  onToggleSelected: (itemId: string) => void;
}) {
  if (items.length === 0) {
    return null;
  }

  const visibleItems = previewLimit ? items.slice(0, previewLimit) : items;

  return (
    <View style={inventoryGroupStyle}>
      <View style={inventoryGroupHeaderStyle}>
        <Text style={inventoryGroupTitleStyle}>{title}</Text>
        {actionLabel && onAction ? (
          <Pressable onPress={onAction} hitSlop={8} style={inventoryGroupActionStyle}>
            <Text style={inventoryGroupActionTextStyle}>{actionLabel}</Text>
            <Ionicons name="chevron-forward" size={14} color={palette.brand} />
          </Pressable>
        ) : null}
      </View>
      <View style={inventoryGridStyle}>
        {visibleItems.map((item) => (
          <InventoryTile
            key={item.id}
            item={item}
            allItems={allItems}
            selectionMode={selectionMode}
            selected={selectedIds.includes(item.id)}
            onToggleSelected={onToggleSelected}
          />
        ))}
      </View>
    </View>
  );
}

function InventoryTile({
  item,
  allItems,
  selectionMode,
  selected,
  onToggleSelected,
}: {
  item: Item;
  allItems: Item[];
  selectionMode: boolean;
  selected: boolean;
  onToggleSelected: (itemId: string) => void;
}) {
  const imageUri = resolveImageUri(item.images[0]);
  const contentStats = item.type === 'container' ? countLocationContents(allItems, item.id) : null;
  const countText = item.type === 'container' ? `${contentStats?.total ?? 0} 项` : '1 件';

  const tile = (
    <View style={[tileStyle, selected ? tileSelectedStyle : null]}>
      <View style={tilePreviewStyle}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={tileImageStyle} resizeMode="cover" />
        ) : (
          <Ionicons name={item.type === 'container' ? 'business-outline' : 'cube-outline'} size={28} color={palette.brand} />
        )}
      </View>
      <Text numberOfLines={1} style={tileTitleStyle}>{item.name}</Text>
      <View style={tileMetaLineStyle}>
        <Text style={tileMetaTextStyle}>{countText}</Text>
        <Text style={tileTypePillStyle}>{item.type === 'container' ? getContainerTypeLabel(item) : '物品'}</Text>
        {selectionMode ? null : <Ionicons name="chevron-forward" size={16} color={palette.textSoft} style={tileChevronStyle} />}
      </View>
      {selected ? (
        <View style={selectedBadgeStyle}>
          <Ionicons name="checkmark" size={14} color="#ffffff" />
        </View>
      ) : null}
    </View>
  );

  if (selectionMode) {
    return (
      <Pressable onPress={() => onToggleSelected(item.id)} style={tilePressableStyle}>
        {tile}
      </Pressable>
    );
  }

  if (item.type === 'container') {
    return (
      <Pressable
        delayLongPress={500}
        onLongPress={() => router.push(resolveMobileDetailHref(item))}
        onPress={() => router.push(resolveMobileContainerBrowseHref(item))}
        style={tilePressableStyle}
      >
        {tile}
      </Pressable>
    );
  }

  return (
    <Link href={resolveMobileDetailHref(item)} asChild>
      <Pressable style={tilePressableStyle}>{tile}</Pressable>
    </Link>
  );
}

function Thumb({ item, imageUri }: { item: Item; imageUri: string | null }) {
  if (imageUri) {
    return <Image source={{ uri: imageUri }} style={thumbStyle} resizeMode="cover" />;
  }

  return (
    <View style={thumbFallbackStyle}>
      <Ionicons name={item.type === 'item' ? 'cube-outline' : 'cube'} size={18} color={item.type === 'item' ? '#f59e0b' : '#0ea5e9'} />
    </View>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <View style={emptyBlockStyle}>
      <Text style={emptyTextStyle}>{text}</Text>
    </View>
  );
}

function groupRootItems({
  rootContainers,
  rootLeafItems,
  categories,
}: {
  rootContainers: Item[];
  rootLeafItems: Item[];
  categories: Category[];
}) {
  const containerCategories = categories.filter((category) => category.item_type === 'container');
  const itemCategories = categories.filter((category) => category.item_type === 'item');
  const groups: { title: string; items: Item[] }[] = [];

  for (const category of containerCategories) {
    const items = rootContainers.filter((item) => item.category === category.name);
    if (items.length > 0) {
      groups.push({ title: `${category.name} (${items.length})`, items });
    }
  }

  const uncategorizedContainers = rootContainers.filter((item) => !containerCategories.some((category) => category.name === item.category));
  if (uncategorizedContainers.length > 0) {
    groups.push({ title: `其他收纳 (${uncategorizedContainers.length})`, items: uncategorizedContainers });
  }

  for (const category of itemCategories) {
    const items = rootLeafItems.filter((item) => item.category === category.name);
    if (items.length > 0) {
      groups.push({ title: `${category.name} (${items.length})`, items });
    }
  }

  const uncategorizedItems = rootLeafItems.filter((item) => !itemCategories.some((category) => category.name === item.category));
  if (uncategorizedItems.length > 0) {
    groups.push({ title: `其他物品 (${uncategorizedItems.length})`, items: uncategorizedItems });
  }

  return groups;
}

function resolveOverviewHrefForGroup(items: Item[]) {
  const firstItem = items[0];
  if (!firstItem) {
    return '/(tabs)/overview';
  }

  return firstItem.type === 'item' ? '/(tabs)/overview?type=item' : '/(tabs)/overview?type=container';
}

function resolveImageUri(url: string | undefined) {
  if (!url) {
    return null;
  }

  if (/^https?:\/\//.test(url)) {
    return url;
  }

  if (url.startsWith('/api/')) {
    try {
      return `${new URL(getMobileApiBaseUrl()).origin}${url}`;
    } catch {
      return url;
    }
  }

  return url;
}

function formatShortDateTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const headerActionsStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 8,
};

const headerActionStyle = {
  height: 40,
  borderRadius: 14,
  paddingHorizontal: 12,
  backgroundColor: '#f1f5f9',
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 6,
};

const headerActionActiveStyle = {
  backgroundColor: palette.brand,
};

const headerActionTextStyle = {
  fontSize: 14,
  fontWeight: '700' as const,
  color: palette.textMuted,
};

const headerActionActiveTextStyle = {
  color: '#ffffff',
};

const viewToggleStyle = {
  height: 40,
  borderRadius: 14,
  padding: 4,
  backgroundColor: '#f1f5f9',
  flexDirection: 'row' as const,
  gap: 2,
};

const modeButtonStyle = {
  width: 34,
  height: 32,
  borderRadius: 11,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

const modeButtonActiveStyle = {
  backgroundColor: '#ffffff',
  ...shadows.sm,
};

const selectionNoticeStyle = {
  borderRadius: 18,
  borderWidth: 1,
  borderColor: '#bae6fd',
  backgroundColor: '#e0f2fe',
  padding: 12,
  gap: 2,
};

const selectionNoticeTitleStyle = {
  fontSize: 15,
  fontWeight: '800' as const,
  color: palette.text,
};

const selectionNoticeTextStyle = {
  fontSize: 12,
  color: palette.textMuted,
};

const sectionStyle = {
  borderRadius: 24,
  borderWidth: 1,
  borderColor: palette.borderSoft,
  backgroundColor: palette.surface,
  padding: 12,
  gap: 10,
  ...shadows.sm,
};

const sectionHeaderStyle = {
  flexDirection: 'row' as const,
  alignItems: 'flex-start' as const,
  gap: 12,
};

const sectionTitleStyle = {
  fontSize: 19,
  fontWeight: '800' as const,
  color: palette.text,
};

const sectionSubtitleStyle = {
  marginTop: 3,
  fontSize: 13,
  lineHeight: 18,
  color: palette.textSoft,
};

const sectionActionStyle = {
  fontSize: 14,
  fontWeight: '800' as const,
  color: palette.brand,
  paddingTop: 3,
};

const statsGridStyle = {
  flexDirection: 'row' as const,
  flexWrap: 'wrap' as const,
  justifyContent: 'space-between' as const,
  rowGap: 8,
};

const statCardStyle = {
  width: '48%' as const,
  minHeight: 96,
  borderRadius: 18,
  borderWidth: 1,
  borderColor: palette.borderSoft,
  backgroundColor: palette.surfaceMuted,
  padding: 12,
  marginBottom: 8,
  justifyContent: 'space-between' as const,
};

const statIconStyle = {
  width: 32,
  height: 32,
  borderRadius: 13,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

const statValueStyle = {
  fontSize: 25,
  lineHeight: 29,
  fontWeight: '900' as const,
  color: palette.text,
};

const mutedTextStyle = {
  fontSize: 13,
  lineHeight: 18,
  color: palette.textSoft,
};

const captionTextStyle = {
  fontSize: 12,
  lineHeight: 16,
  color: palette.textSoft,
};

const rowCardStyle = {
  minHeight: 68,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: palette.borderSoft,
  backgroundColor: palette.surface,
  paddingVertical: 10,
  paddingHorizontal: 12,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 12,
};

const rowTextStyle = {
  flex: 1,
  minWidth: 0,
  gap: 3,
};

const rowTitleStyle = {
  fontSize: 16,
  fontWeight: '800' as const,
  color: palette.text,
};

const thumbStyle = {
  width: 46,
  height: 46,
  borderRadius: 16,
  backgroundColor: palette.surfaceMuted,
};

const thumbFallbackStyle = {
  width: 46,
  height: 46,
  borderRadius: 16,
  backgroundColor: '#f0f9ff',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

const activityIconStyle = {
  width: 46,
  height: 46,
  borderRadius: 16,
  backgroundColor: '#fff7e6',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

const deleteActivityIconStyle = {
  backgroundColor: '#fff1f2',
};

const activityTitleLineStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 8,
};

const activityTitleStyle = {
  flexShrink: 1,
};

const activityPillStyle = {
  borderRadius: 999,
  backgroundColor: '#fff7e6',
  paddingHorizontal: 8,
  paddingVertical: 3,
  fontSize: 11,
  fontWeight: '800' as const,
  color: '#d97706',
};

const emptyBlockStyle = {
  borderRadius: 20,
  borderWidth: 1,
  borderStyle: 'dashed' as const,
  borderColor: palette.border,
  backgroundColor: palette.surfaceMuted,
  paddingVertical: 28,
  paddingHorizontal: 16,
};

const emptyTextStyle = {
  textAlign: 'center' as const,
  fontSize: 14,
  lineHeight: 20,
  color: palette.textSoft,
};

const inventoryGroupStyle = {
  gap: 10,
};

const inventoryGroupHeaderStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'space-between' as const,
  gap: 10,
};

const inventoryGroupTitleStyle = {
  fontSize: 13,
  fontWeight: '800' as const,
  color: palette.textSoft,
  paddingHorizontal: 2,
};

const inventoryGroupActionStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 2,
};

const inventoryGroupActionTextStyle = {
  fontSize: 13,
  fontWeight: '800' as const,
  color: palette.brand,
};

const inventoryGridStyle = {
  flexDirection: 'row' as const,
  flexWrap: 'wrap' as const,
  gap: 12,
};

const tilePressableStyle = {
  width: '47.8%' as const,
};

const tileStyle = {
  minHeight: 230,
  borderRadius: 22,
  borderWidth: 1,
  borderColor: palette.borderSoft,
  backgroundColor: palette.surface,
  padding: 14,
  gap: 11,
  ...shadows.sm,
};

const tileSelectedStyle = {
  borderColor: palette.brand,
  backgroundColor: '#f0f9ff',
};

const tilePreviewStyle = {
  height: 142,
  borderRadius: 20,
  backgroundColor: '#eef9fd',
  overflow: 'hidden' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

const tileImageStyle = {
  width: '100%' as const,
  height: '100%' as const,
};

const tileTitleStyle = {
  fontSize: 16,
  fontWeight: '800' as const,
  color: palette.text,
};

const tileMetaLineStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 8,
};

const tileMetaTextStyle = {
  fontSize: 13,
  color: palette.textSoft,
};

const tileTypePillStyle = {
  borderRadius: 999,
  backgroundColor: '#e0f2fe',
  paddingHorizontal: 8,
  paddingVertical: 3,
  fontSize: 12,
  fontWeight: '800' as const,
  color: palette.brand,
};

const tileChevronStyle = {
  marginLeft: 'auto' as const,
};

const selectedBadgeStyle = {
  position: 'absolute' as const,
  top: 10,
  right: 10,
  width: 24,
  height: 24,
  borderRadius: 999,
  backgroundColor: palette.brand,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};
