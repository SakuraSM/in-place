import { Text, View, type DimensionValue } from 'react-native';
import { buildCategoryValueBars, type CategoryValueBar, type CategoryValueEntry } from '@inplace/ui';
import { palette } from './theme';

interface CategoryValueChartProps { entries: readonly CategoryValueEntry[] }

export function CategoryValueChart({ entries }: CategoryValueChartProps) {
  if (!entries.length) return <Text style={{ color: palette.textMuted, fontSize: 14 }}>暂无价值数据</Text>;
  return <View style={{ gap: 20 }}>{buildCategoryValueBars(entries).map(entry => <ValueBar key={entry.category} entry={entry} />)}</View>;
}

function ValueBar({ entry }: { entry: CategoryValueBar }) {
  const width: DimensionValue = `${entry.percentage}%`;
  return <View accessible accessibilityLabel={`${entry.category}，¥${entry.value.toFixed(2)}`} style={{ gap: 8 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16 }}><Text style={{ flex: 1, fontSize: 14, color: palette.text }}>{entry.category}</Text><Text style={{ fontSize: 14, color: palette.text, fontVariant: ['tabular-nums'] }}>¥{entry.value.toFixed(2)}</Text></View>
    <View style={{ height: 10, overflow: 'hidden', borderRadius: 4, backgroundColor: palette.surfaceMuted }}><View style={{ width, height: '100%', borderRadius: 4, backgroundColor: palette.brandStrong }} /></View>
  </View>;
}
