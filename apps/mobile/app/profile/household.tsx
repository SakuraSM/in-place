import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { householdsApi, saveMobileHouseholdId } from '@/shared/api/mobileClient';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { StateBlock } from '@/shared/ui/StateBlock';
import { palette } from '@/shared/ui/theme';

export default function HouseholdSwitchScreen() {
  const queryClient = useQueryClient();
  const householdsQuery = useQuery({
    queryKey: ['mobile', 'households'],
    queryFn: () => householdsApi.fetchHouseholds(),
  });

  if (householdsQuery.isLoading) return <Screen><StateBlock title="加载家庭空间" loading /></Screen>;
  if (householdsQuery.isError) return <Screen><StateBlock title="加载失败" body={householdsQuery.error instanceof Error ? householdsQuery.error.message : '请稍后重试'} /></Screen>;

  return (
    <Screen scroll contentInsetMode="page" chrome="muted">
      <Stack.Screen options={{ title: '家庭空间', headerShown: true }} />
      <SectionCard title="切换空间" subtitle="切换后所有库存操作只影响当前家庭" density="dense">
        <View style={{ gap: 10 }}>
          {householdsQuery.data?.map((household) => (
            <Pressable
              key={household.id}
              onPress={() => void saveMobileHouseholdId(household.id).then(async () => {
                await queryClient.invalidateQueries({ queryKey: ['mobile'] });
                router.back();
              })}
              style={({ pressed }) => ({
                borderWidth: 1,
                borderColor: palette.borderSoft,
                borderRadius: 16,
                backgroundColor: pressed ? palette.surfaceMuted : palette.surface,
                padding: 14,
              })}
            >
              <Text style={{ color: palette.text, fontSize: 16, fontWeight: '800' }}>{household.name}</Text>
              <Text style={{ marginTop: 4, color: palette.textMuted, fontSize: 13 }}>{household.is_personal ? '个人家庭空间' : '共享家庭空间'} · {household.role}</Text>
            </Pressable>
          ))}
        </View>
      </SectionCard>
    </Screen>
  );
}
