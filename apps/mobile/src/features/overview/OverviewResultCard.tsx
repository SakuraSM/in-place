import type { ReactElement } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import type { Category, Item } from '@inplace/domain';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { palette } from '@/shared/ui/theme';
import { getContainerTypeLabel } from '@/shared/lib/location';
import { OverviewResultArtwork } from './OverviewResultArtwork';

interface OverviewResultCardProps { item: Item; category?: Category; path: string; selected: boolean }

const TITLE_LINES = 2;
const TITLE_LINE_HEIGHT = 21;

/** Content only: navigation, long press and selection remain owned by ResultRow. */
export function OverviewResultCard({ item, category, path, selected }: OverviewResultCardProps): ReactElement {
  const { fontScale } = useWindowDimensions();
  const kind = item.type === 'item' ? '物品' : getContainerTypeLabel(item);
  return <>
    <View style={{ height: 122, overflow: 'hidden', backgroundColor: palette.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
      <OverviewResultArtwork item={item} category={category} presentation="card" />
      <View style={{ position: 'absolute', top: 8, left: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 4, maxWidth: '88%' }}>
        <Text style={{ fontSize: 10, color: palette.info, backgroundColor: palette.infoTint, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6 }}>{kind}</Text>
        {item.type === 'item' ? <StatusBadge status={item.status} /> : null}
      </View>
      {selected ? <Text style={{ position: 'absolute', right: 8, bottom: 8, color: palette.brandStrong, backgroundColor: palette.brandTint, padding: 4, borderRadius: 6, fontSize: 11 }}>已选择</Text> : null}
    </View>
    <View style={{ flexGrow: 1, padding: 12, gap: 6 }}>
      <Text numberOfLines={TITLE_LINES} style={{ minHeight: TITLE_LINES * TITLE_LINE_HEIGHT * fontScale, fontSize: 14, lineHeight: TITLE_LINE_HEIGHT, includeFontPadding: false, textAlignVertical: 'top', fontWeight: '600', color: palette.text }}>{item.name}</Text>
      <Text numberOfLines={1} style={{ fontSize: 11, lineHeight: 17, color: palette.textMuted }}>{item.category || '未分类'}</Text>
      <Text numberOfLines={1} style={{ fontSize: 11, lineHeight: 17, color: palette.textMuted }}>{path || '根目录'}</Text>
      <Text style={{ marginTop: 'auto', fontSize: 11, lineHeight: 17, color: palette.textMuted }}>{item.quantity} 件</Text>
    </View>
  </>;
}
