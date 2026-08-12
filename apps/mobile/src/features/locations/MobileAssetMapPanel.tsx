import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import {
  DEFAULT_GEO_ASSET_MAP_FILTERS,
  GEO_ASSET_ALL_FILTER,
  type AssetGeoLocation,
  type GeoAssetMapFilters,
} from '@inplace/app-core';
import type { ItemStatus } from '@inplace/domain';
import { MobileMapWebView } from './MobileMapWebView';
import { useMobileAssetMap } from './useMobileAssetMap';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { CompactListRow } from '@/shared/ui/CompactListRow';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { FormField } from '@/shared/ui/FormField';
import { MetricGrid } from '@/shared/ui/MetricGrid';
import { SectionCard } from '@/shared/ui/SectionCard';
import { StateBlock } from '@/shared/ui/StateBlock';
import { useNotify } from '@/shared/ui/ToastProvider';
import { palette } from '@/shared/ui/theme';
import { resolveMobileDetailHref } from '@/shared/lib/detailPath';

const STATUS_OPTIONS: Array<{ value: GeoAssetMapFilters['status']; label: string }> = [
  { value: GEO_ASSET_ALL_FILTER, label: '全部状态' },
  { value: 'in_stock', label: '在库' },
  { value: 'borrowed', label: '借出' },
  { value: 'worn_out', label: '耗尽' },
];

export function MobileAssetMapPanel() {
  const notify = useNotify();
  const map = useMobileAssetMap();
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  if (map.itemsQuery.isLoading || map.categoriesQuery.isLoading) {
    return <StateBlock title="加载位置地图" loading />;
  }
  if (map.itemsQuery.isError || map.categoriesQuery.isError) {
    const error = map.itemsQuery.error ?? map.categoriesQuery.error;
    return <StateBlock title="位置地图加载失败" body={error instanceof Error ? error.message : '请稍后重试'} />;
  }

  const activeFilterCount = [
    map.filters.query.trim(),
    map.filters.status !== GEO_ASSET_ALL_FILTER,
    map.filters.category !== GEO_ASSET_ALL_FILTER,
    map.filters.createdAfter,
    map.filters.createdBefore,
  ].filter(Boolean).length;

  const handleChooseCoordinate = (coordinate: AssetGeoLocation) => {
    if (!map.assignmentTarget) return;
    map.setPendingCoordinate({ item: map.assignmentTarget, coordinate });
  };

  const confirmCoordinate = async () => {
    if (!map.pendingCoordinate) return;
    try {
      const targetName = map.pendingCoordinate.item.name;
      await map.coordinateMutation.mutateAsync(map.pendingCoordinate);
      notify({ tone: 'success', title: '位置坐标已保存', description: targetName });
    } catch (error) {
      notify({ tone: 'error', title: '坐标保存失败', description: error instanceof Error ? error.message : '请稍后重试' });
    }
  };

  return (
    <View style={panelStyle}>
      <SectionCard title="地图概览" subtitle="按最外层位置聚合库存，标记显示位置分类图标" density="compact">
        <MetricGrid
          columns={4}
          dense
          items={[
            { key: 'mapped', label: '已定位', value: map.projection.totals.mappedLocationCount },
            { key: 'assets', label: '资产', value: map.projection.totals.assetCount },
            { key: 'unmapped', label: '待标注', value: map.projection.totals.unmappedLocationCount },
            { key: 'unlocated', label: '未归位', value: map.projection.totals.unlocatedAssetCount },
          ]}
        />
        <View style={filterHeaderStyle}>
          <FormField
            label="地图搜索"
            value={map.filters.query}
            onChangeText={(query) => map.setFilters((current) => ({ ...current, query }))}
            placeholder="位置、分类或物品"
            returnKeyType="search"
            style={{ minWidth: 0 }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`更多地图筛选，已启用 ${activeFilterCount} 项`}
            onPress={() => setFilterSheetOpen(true)}
            style={({ pressed }) => [filterButtonStyle, pressed ? pressedStyle : null]}
          >
            <Ionicons name="options-outline" size={18} color={palette.brandStrong} />
            <Text style={filterButtonTextStyle}>筛选{activeFilterCount ? ` ${activeFilterCount}` : ''}</Text>
          </Pressable>
        </View>
      </SectionCard>

      <View style={mapSectionStyle}>
        <MobileMapWebView
          points={map.mapPoints}
          selectedPointIds={map.selectedPointIds}
          coordinateTarget={map.assignmentTarget ? { id: map.assignmentTarget.id, name: map.assignmentTarget.name } : null}
          onSelectPoints={map.setSelectedPointIds}
          onChooseCoordinate={handleChooseCoordinate}
          onError={(message) => notify({ tone: 'error', title: '地图交互失败', description: message })}
        />
        {map.mapPoints.length === 0 && !map.assignmentTarget ? (
          <View style={emptyHintStyle} accessibilityRole="summary">
            <Ionicons name="map-outline" size={20} color={palette.textSoft} />
            <Text style={emptyHintTextStyle}>
              {activeFilterCount ? '当前筛选没有匹配点位' : '还没有已标注的位置'}
            </Text>
          </View>
        ) : null}
        {map.assignmentTarget ? (
          <View style={assignmentBannerStyle} accessibilityLiveRegion="polite">
            <Text style={assignmentTextStyle}>请在地图上点击“{map.assignmentTarget.name}”的实际位置</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => map.setAssignmentTarget(null)}
              style={cancelMarkButtonStyle}
            >
              <Text style={cancelMarkTextStyle}>取消标注</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {map.selectedPoints.map((point) => (
        <SectionCard
          key={point.id}
          title={point.sourceNode.item.name}
          subtitle={point.coordinate.address || `${point.coordinate.longitude.toFixed(5)}, ${point.coordinate.latitude.toFixed(5)}`}
          density="dense"
          headerMode="compact"
        >
          <MetricGrid
            columns={3}
            dense
            items={[
              { key: 'assets', label: '资产', value: point.metrics.assetCount },
              { key: 'quantity', label: '数量', value: point.metrics.totalQuantity },
              { key: 'value', label: '估值', value: `¥${point.metrics.estimatedValue.toFixed(0)}` },
            ]}
          />
          <Link href={resolveMobileDetailHref(point.sourceNode.item)} asChild>
            <Pressable accessibilityRole="link" style={detailButtonStyle}>
              <Text style={detailButtonTextStyle}>查看位置详情</Text>
              <Ionicons name="chevron-forward" size={17} color={palette.brandStrong} />
            </Pressable>
          </Link>
        </SectionCard>
      ))}

      {map.projection.unmappedLocations.length > 0 ? (
        <SectionCard
          title="待标注位置"
          subtitle={map.canEditInventory ? '选择位置后在地图上点击坐标' : '当前家庭为只读，仅可查看'}
          density="dense"
          headerMode="compact"
        >
          {map.projection.unmappedLocations.map((node) => (
            <CompactListRow
              key={node.id}
              title={node.item.name}
              subtitle={node.path.join(' / ') || '最外层位置'}
              iconName="location-outline"
              meta={map.canEditInventory ? '去标注' : '未定位'}
              onPress={map.canEditInventory ? () => map.setAssignmentTarget(node.item) : undefined}
            />
          ))}
        </SectionCard>
      ) : null}

      {map.projection.unlocatedAssets.length > 0 ? (
        <SectionCard title="未归位资产" subtitle="先移动到一个位置，随后会自动出现在地图中" density="dense" headerMode="compact">
          {map.projection.unlocatedAssets.slice(0, 8).map((node) => (
            <Link key={node.id} href={resolveMobileDetailHref(node.item)} asChild>
              <Pressable>
                <CompactListRow title={node.item.name} subtitle={node.item.category || '未分类'} iconName="cube-outline" meta="详情" chevron />
              </Pressable>
            </Link>
          ))}
          {map.projection.unlocatedAssets.length > 8 ? (
            <Text style={moreTextStyle}>另有 {map.projection.unlocatedAssets.length - 8} 项，可在库存中继续处理</Text>
          ) : null}
        </SectionCard>
      ) : null}

      <MapFilterSheet
        visible={filterSheetOpen}
        filters={map.filters}
        categories={map.projection.categories}
        onChange={map.setFilters}
        onClose={() => setFilterSheetOpen(false)}
      />
      <ConfirmDialog
        visible={Boolean(map.pendingCoordinate)}
        title="确认保存坐标"
        message={map.pendingCoordinate
          ? `${map.pendingCoordinate.item.name}\n${map.pendingCoordinate.coordinate.address || '未识别到地址，将保存经纬度'}\n${map.pendingCoordinate.coordinate.longitude.toFixed(6)}, ${map.pendingCoordinate.coordinate.latitude.toFixed(6)}`
          : ''}
        confirmLabel={map.coordinateMutation.isPending ? '保存中…' : '保存坐标'}
        loading={map.coordinateMutation.isPending}
        onCancel={() => map.setPendingCoordinate(null)}
        onConfirm={() => void confirmCoordinate()}
      />
    </View>
  );
}

function MapFilterSheet({
  visible,
  filters,
  categories,
  onChange,
  onClose,
}: {
  visible: boolean;
  filters: GeoAssetMapFilters;
  categories: string[];
  onChange: React.Dispatch<React.SetStateAction<GeoAssetMapFilters>>;
  onClose: () => void;
}) {
  const setStatus = (status: typeof GEO_ASSET_ALL_FILTER | ItemStatus) => onChange((current) => ({ ...current, status }));
  return (
    <BottomSheet visible={visible} title="地图筛选" onClose={onClose}>
      <Text style={sheetLabelStyle}>库存状态</Text>
      <View style={chipWrapStyle}>
        {STATUS_OPTIONS.map((option) => (
          <FilterChip key={option.value} label={option.label} selected={filters.status === option.value} onPress={() => setStatus(option.value)} />
        ))}
      </View>
      <Text style={sheetLabelStyle}>资产分类</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={horizontalChipsStyle}>
        <FilterChip label="全部分类" selected={filters.category === GEO_ASSET_ALL_FILTER} onPress={() => onChange((current) => ({ ...current, category: GEO_ASSET_ALL_FILTER }))} />
        {categories.map((category) => (
          <FilterChip key={category} label={category} selected={filters.category === category} onPress={() => onChange((current) => ({ ...current, category }))} />
        ))}
      </ScrollView>
      <View style={dateRowStyle}>
        <View style={dateFieldStyle}><FormField label="创建日期起" value={filters.createdAfter} onChangeText={(createdAfter) => onChange((current) => ({ ...current, createdAfter }))} placeholder="YYYY-MM-DD" /></View>
        <View style={dateFieldStyle}><FormField label="创建日期止" value={filters.createdBefore} onChangeText={(createdBefore) => onChange((current) => ({ ...current, createdBefore }))} placeholder="YYYY-MM-DD" /></View>
      </View>
      <View style={sheetActionsStyle}>
        <Pressable onPress={() => onChange(DEFAULT_GEO_ASSET_MAP_FILTERS)} style={resetButtonStyle}><Text style={resetButtonTextStyle}>重置</Text></Pressable>
        <Pressable onPress={onClose} style={applyButtonStyle}><Text style={applyButtonTextStyle}>查看结果</Text></Pressable>
      </View>
    </BottomSheet>
  );
}

function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [chipStyle, selected ? activeChipStyle : null, pressed ? pressedStyle : null]}
    >
      <Text style={selected ? activeChipTextStyle : chipTextStyle}>{label}</Text>
    </Pressable>
  );
}

const panelStyle = { gap: 12 };
const filterHeaderStyle = { gap: 10 };
const filterButtonStyle = { minHeight: 48, borderRadius: 14, backgroundColor: palette.brandTint, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 7 };
const filterButtonTextStyle = { fontSize: 14, fontWeight: '900' as const, color: palette.brandStrong };
const pressedStyle = { opacity: 0.68 };
const mapSectionStyle = { gap: 8 };
const emptyHintStyle = { minHeight: 48, borderRadius: 14, backgroundColor: palette.surfaceMuted, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8, paddingHorizontal: 14 };
const emptyHintTextStyle = { fontSize: 13, fontWeight: '700' as const, color: palette.textSoft };
const assignmentBannerStyle = { minHeight: 52, borderRadius: 15, backgroundColor: palette.warningTint, padding: 10, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 };
const assignmentTextStyle = { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '700' as const, color: palette.textMuted };
const cancelMarkButtonStyle = { minHeight: 36, justifyContent: 'center' as const, paddingHorizontal: 10 };
const cancelMarkTextStyle = { fontSize: 12, fontWeight: '900' as const, color: palette.danger };
const detailButtonStyle = { minHeight: 48, borderRadius: 14, backgroundColor: palette.brandTint, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 6 };
const detailButtonTextStyle = { fontSize: 14, fontWeight: '900' as const, color: palette.brandStrong };
const moreTextStyle = { padding: 8, textAlign: 'center' as const, fontSize: 12, color: palette.textSoft };
const sheetLabelStyle = { fontSize: 13, fontWeight: '900' as const, color: palette.textMuted };
const chipWrapStyle = { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 };
const horizontalChipsStyle = { gap: 8, paddingRight: 8 };
const chipStyle = { minHeight: 44, borderRadius: 999, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surfaceMuted, paddingHorizontal: 14, alignItems: 'center' as const, justifyContent: 'center' as const };
const activeChipStyle = { borderColor: palette.brand, backgroundColor: palette.brandTint };
const chipTextStyle = { fontSize: 13, fontWeight: '700' as const, color: palette.textMuted };
const activeChipTextStyle = { fontSize: 13, fontWeight: '900' as const, color: palette.brandStrong };
const dateRowStyle = { flexDirection: 'row' as const, gap: 8 };
const dateFieldStyle = { flex: 1 };
const sheetActionsStyle = { flexDirection: 'row' as const, gap: 10 };
const resetButtonStyle = { flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: palette.border, alignItems: 'center' as const, justifyContent: 'center' as const };
const resetButtonTextStyle = { fontSize: 14, fontWeight: '800' as const, color: palette.textMuted };
const applyButtonStyle = { flex: 1, minHeight: 48, borderRadius: 14, backgroundColor: palette.brandStrong, alignItems: 'center' as const, justifyContent: 'center' as const };
const applyButtonTextStyle = { fontSize: 14, fontWeight: '900' as const, color: '#ffffff' };
