import { ActionButtonRow } from '@/shared/ui/ActionButtonRow';
import { FormField } from '@/shared/ui/FormField';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import { fetchProfileUpdate } from '@/features/profile/mobileProfileApi';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { palette } from '@/shared/ui/theme';

export default function ProfileEditScreen() {
  const { user, setCurrentUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(user?.displayName ?? '');
  }, [user?.displayName]);

  const mutation = useMutation({
    mutationFn: () => fetchProfileUpdate(displayName),
    onSuccess: (nextUser) => {
      setCurrentUser(nextUser);
      setMessage('已保存');
    },
  });

  return (
    <Screen scroll contentInsetMode="form" chrome="muted" footer={<ActionButtonRow actions={[{ key: 'save', label: '保存资料', variant: 'primary', onPress: () => void mutation.mutateAsync(), loading: mutation.isPending }]} />}>
      <PageHeader title="个人资料" subtitle="更新账号显示信息" />

      <SectionCard title="昵称" delay={60} density="compact" headerMode="compact">
        <FormField label="昵称"
          value={displayName}
          onChangeText={(value) => {
            setMessage(null);
            setDisplayName(value);
          }}
          placeholder="昵称"
        />
        {message ? <Text style={successTextStyle}>{message}</Text> : null}
        {mutation.isError ? <Text style={errorTextStyle}>{mutation.error instanceof Error ? mutation.error.message : '保存失败'}</Text> : null}

      </SectionCard>
    </Screen>
  );
}

const successTextStyle = { color: '#15803d', fontSize: 14 };
const errorTextStyle = { color: palette.danger, fontSize: 14 };
