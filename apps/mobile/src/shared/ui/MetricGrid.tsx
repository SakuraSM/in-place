import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, Text, View, type DimensionValue, type ViewStyle } from 'react-native';
import { palette } from './theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface MetricGridItem {
  key: string;
  label: string;
  value: string | number;
  caption?: string;
  iconName?: IconName;
  onPress?: () => void;
}

interface MetricGridProps {
  items: MetricGridItem[];
  columns?: 2 | 3 | 4;
  dense?: boolean;
  style?: ViewStyle;
}

export function MetricGrid({ items, columns = 2, dense = false, style }: MetricGridProps) {
  return (
    <View style={[gridStyle, style]}>
      {items.map((item) => (
        <MetricTile key={item.key} item={item} columns={columns} dense={dense} />
      ))}
    </View>
  );
}

function MetricTile({
  item,
  columns,
  dense,
}: {
  item: MetricGridItem;
  columns: 2 | 3 | 4;
  dense: boolean;
}) {
  const tileWidth: DimensionValue = columns === 4 ? '23%' : columns === 3 ? '31%' : '47.5%';
  const tileStyleList: ViewStyle[] = [
    tileStyle,
    ...(dense ? [denseTileStyle] : []),
    {
      width: tileWidth,
    },
  ];

  const content = (
    <>
      <View style={metricHeaderStyle}>
        <Text numberOfLines={1} style={labelStyle}>{item.label}</Text>
        {item.iconName ? <Ionicons name={item.iconName} size={15} color={palette.brandStrong} /> : null}
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={valueStyle}>
        {item.value}
      </Text>
      {item.caption ? <Text numberOfLines={1} style={captionStyle}>{item.caption}</Text> : null}
    </>
  );

  if (!item.onPress) {
    return <View style={tileStyleList}>{content}</View>;
  }

  return (
    <Pressable onPress={item.onPress} style={({ pressed }) => [tileStyleList, pressed ? pressedStyle : null]}>
      {content}
    </Pressable>
  );
}

const gridStyle = {
  flexDirection: 'row' as const,
  flexWrap: 'wrap' as const,
  gap: 8,
};

const tileStyle = {
  flexGrow: 1,
  minHeight: 66,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: palette.borderSoft,
  backgroundColor: palette.surfaceMuted,
  paddingHorizontal: 10,
  paddingVertical: 9,
  gap: 3,
};

const denseTileStyle = {
  minHeight: 58,
  paddingVertical: 7,
};

const metricHeaderStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'space-between' as const,
  gap: 6,
};

const labelStyle = {
  flex: 1,
  minWidth: 0,
  color: palette.textSoft,
  fontSize: 12,
  fontWeight: '700' as const,
};

const valueStyle = {
  color: palette.text,
  fontSize: 20,
  fontWeight: '900' as const,
};

const captionStyle = {
  color: palette.textSoft,
  fontSize: 12,
};

const pressedStyle = {
  opacity: 0.74,
};
