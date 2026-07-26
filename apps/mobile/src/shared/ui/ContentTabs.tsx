import { Pressable, ScrollView, Text, View } from 'react-native';
import { palette } from './theme';

export interface ContentTab<TValue extends string> {
  value: TValue;
  label: string;
  count?: number;
}

interface ContentTabsProps<TValue extends string> {
  accessibilityLabel: string;
  tabs: ContentTab<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
}

export function ContentTabs<TValue extends string>({
  accessibilityLabel,
  tabs,
  value,
  onChange,
}: ContentTabsProps<TValue>) {
  return (
    <View accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tabListStyle}
      >
        {tabs.map((tab) => {
          const isSelected = tab.value === value;
          return (
            <Pressable
              key={tab.value}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onChange(tab.value)}
              style={[tabStyle, isSelected ? selectedTabStyle : null]}
            >
              <Text style={[tabTextStyle, isSelected ? selectedTabTextStyle : null]}>
                {tab.label}
              </Text>
              {tab.count !== undefined ? (
                <View style={[countStyle, isSelected ? selectedCountStyle : null]}>
                  <Text style={[countTextStyle, isSelected ? selectedCountTextStyle : null]}>
                    {tab.count}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const tabListStyle = {
  gap: 8,
  paddingVertical: 2,
};

const tabStyle = {
  minHeight: 40,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: palette.borderSoft,
  backgroundColor: palette.surface,
  paddingHorizontal: 14,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 7,
};

const selectedTabStyle = {
  borderColor: palette.brand,
  backgroundColor: palette.brandTint,
};

const tabTextStyle = {
  fontSize: 14,
  fontWeight: '700' as const,
  color: palette.textMuted,
};

const selectedTabTextStyle = {
  color: palette.brandStrong,
  fontWeight: '900' as const,
};

const countStyle = {
  minWidth: 20,
  height: 20,
  borderRadius: 10,
  paddingHorizontal: 5,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  backgroundColor: palette.surfaceMuted,
};

const selectedCountStyle = {
  backgroundColor: palette.surface,
};

const countTextStyle = {
  fontSize: 11,
  fontWeight: '800' as const,
  color: palette.textSoft,
};

const selectedCountTextStyle = {
  color: palette.brandStrong,
};
