import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Entrance } from './Entrance';
import { palette } from './theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface InventoryStatsLike {
  total: number;
  containers: number;
  items: number;
  borrowed: number;
}

interface InventoryStatsGridProps {
  stats: InventoryStatsLike | null;
  loading?: boolean;
  onNavigate?: (filter: { type?: 'item' | 'container'; status?: 'borrowed' }) => void;
}

const STAT_CARDS: ReadonlyArray<{
  label: string;
  statKey: keyof InventoryStatsLike;
  icon: IoniconName;
  iconColor: string;
  iconBackground: string;
  filter: { type?: 'item' | 'container'; status?: 'borrowed' };
}> = [
  {
    label: '总物品',
    statKey: 'items',
    icon: 'cube-outline',
    iconColor: '#0ea5e9',
    iconBackground: '#e0f2fe',
    filter: { type: 'item' },
  },
  {
    label: '收纳数',
    statKey: 'containers',
    icon: 'cube',
    iconColor: '#14b8a6',
    iconBackground: '#ccfbf1',
    filter: { type: 'container' },
  },
  {
    label: '借出中',
    statKey: 'borrowed',
    icon: 'time-outline',
    iconColor: '#f59e0b',
    iconBackground: '#fef3c7',
    filter: { status: 'borrowed' },
  },
  {
    label: '总计',
    statKey: 'total',
    icon: 'shield-checkmark',
    iconColor: '#10b981',
    iconBackground: '#d1fae5',
    filter: {},
  },
];

/**
 * 与 web 端 `InventoryStatsGrid` 视觉对齐的统计卡片。
 * 使用 2 列网格，点击卡片可携带筛选条件跳转到总览。
 */
export function InventoryStatsGrid({ stats, loading = false, onNavigate }: InventoryStatsGridProps) {
  return (
    <View style={styles.grid}>
      {STAT_CARDS.map((card, index) => {
        const value = loading ? '-' : stats?.[card.statKey] ?? 0;
        const clickable = Boolean(onNavigate);
        return (
          <Entrance key={card.label} delay={index * 50} offset={10} style={styles.cell}>
            <Pressable
              disabled={!clickable}
              onPress={() => onNavigate?.(card.filter)}
              style={({ pressed }) => [
                styles.card,
                pressed && clickable ? styles.cardPressed : null,
              ]}
            >
              <View style={[styles.iconBubble, { backgroundColor: card.iconBackground }]}>
                <Ionicons name={card.icon} size={18} color={card.iconColor} />
              </View>
              <Text style={styles.value}>{value}</Text>
              <Text style={styles.label}>{card.label}</Text>
            </Pressable>
          </Entrance>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cell: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  card: {
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#eef2f7',
    minHeight: 120,
    justifyContent: 'space-between',
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 26,
    fontWeight: '800',
    color: palette.text,
  },
  label: {
    fontSize: 12,
    color: '#94a3b8',
  },
});
