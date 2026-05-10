import Constants from 'expo-constants';
import { Text, View } from 'react-native';
import { BrandHeader } from '@/shared/ui/BrandHeader';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { palette } from '@/shared/ui/theme';

const REPOSITORY_URL = 'https://github.com/SakuraSM/in-place';

export default function AboutScreen() {
  const appVersion = Constants.expoConfig?.version ?? '0.1.0';
  const runtimeVersion = typeof Constants.expoConfig?.runtimeVersion === 'string'
    ? Constants.expoConfig.runtimeVersion
    : Constants.expoConfig?.runtimeVersion?.policy ?? 'appVersion';

  return (
    <Screen scroll contentInsetMode="form" chrome="muted">
      <BrandHeader title="关于" variant="page" />

      <SectionCard title="归位" delay={60} density="compact" headerMode="compact">
        <InfoRow label="版本" value={appVersion} />
        <InfoRow label="运行时" value={runtimeVersion} />
        <InfoRow label="仓库" value={REPOSITORY_URL} />
      </SectionCard>

      <SectionCard title="开源信息" delay={120} density="compact" headerMode="compact">
        <Text style={bodyStyle}>项目源代码托管在 GitHub。问题反馈、变更记录和许可证以仓库为准。</Text>
      </SectionCard>
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={rowStyle}>
      <Text style={labelStyle}>{label}</Text>
      <Text selectable style={valueStyle}>{value}</Text>
    </View>
  );
}

const rowStyle = {
  borderTopWidth: 1,
  borderTopColor: palette.borderSoft,
  paddingTop: 12,
  gap: 4,
};
const labelStyle = { color: palette.textSoft, fontSize: 13, fontWeight: '700' as const };
const valueStyle = { color: palette.text, fontSize: 15, lineHeight: 21 };
const bodyStyle = { color: palette.textMuted, fontSize: 14, lineHeight: 21 };
