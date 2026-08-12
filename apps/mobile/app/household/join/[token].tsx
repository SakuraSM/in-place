import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { householdsApi } from '@/shared/api/mobileClient';
import { useHousehold } from '@/providers/HouseholdProvider';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { StateBlock } from '@/shared/ui/StateBlock';
import { palette } from '@/shared/ui/theme';
import { PageHeader } from '@/shared/ui/PageHeader';

type JoinStatus = 'joining' | 'success' | 'error';

export default function HouseholdJoinScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { refreshHouseholds, switchHousehold } = useHousehold();
  const [status, setStatus] = useState<JoinStatus>('joining');
  const [message, setMessage] = useState('正在验证邀请…');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('邀请链接不完整');
      return;
    }
    void householdsApi.acceptInvite(token)
      .then(async (householdId) => {
        await refreshHouseholds();
        await switchHousehold(householdId);
        setStatus('success');
        setMessage('已加入家庭空间，并切换为当前空间。');
      })
      .catch((error: unknown) => {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : '邀请不存在、已使用或已过期');
      });
  }, [refreshHouseholds, switchHousehold, token]);

  if (status === 'joining') return <Screen><StateBlock title="加入家庭空间" body={message} loading /></Screen>;

  return (
    <Screen contentInsetMode="page" chrome="muted">
      <PageHeader title="家庭邀请" subtitle="加入共享家庭空间" />
      <SectionCard title={status === 'success' ? '加入成功' : '无法加入'} subtitle={message} density="compact">
        <Pressable onPress={() => router.replace(status === 'success' ? '/(tabs)' : '/profile/household')} style={buttonStyle}>
          <Text style={buttonTextStyle}>{status === 'success' ? '进入首页' : '返回家庭空间'}</Text>
        </Pressable>
      </SectionCard>
    </Screen>
  );
}

const buttonStyle = { minHeight: 48, borderRadius: 16, backgroundColor: palette.brandStrong, alignItems: 'center' as const, justifyContent: 'center' as const };
const buttonTextStyle = { fontSize: 14, fontWeight: '900' as const, color: '#ffffff' };
