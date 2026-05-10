import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import { fetchProfileUpdate } from '@/features/profile/mobileProfileApi';
import { BrandHeader } from '@/shared/ui/BrandHeader';
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
    <Screen scroll contentInsetMode="form" chrome="muted">
      <BrandHeader title="个人资料" variant="page" />

      <SectionCard title="昵称" delay={60} density="compact" headerMode="compact">
        <TextInput
          value={displayName}
          onChangeText={(value) => {
            setMessage(null);
            setDisplayName(value);
          }}
          placeholder="昵称"
          style={inputStyle}
        />
        {message ? <Text style={successTextStyle}>{message}</Text> : null}
        {mutation.isError ? <Text style={errorTextStyle}>{mutation.error instanceof Error ? mutation.error.message : '保存失败'}</Text> : null}
        <Pressable onPress={() => void mutation.mutateAsync()} style={primaryButtonStyle}>
          {mutation.isPending ? <ActivityIndicator color="#ffffff" /> : <Text style={primaryButtonTextStyle}>保存</Text>}
        </Pressable>
      </SectionCard>
    </Screen>
  );
}

const inputStyle = {
  backgroundColor: palette.surfaceMuted,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: palette.border,
  paddingHorizontal: 16,
  paddingVertical: 14,
  fontSize: 15,
  color: palette.text,
};
const successTextStyle = { color: '#15803d', fontSize: 14 };
const errorTextStyle = { color: palette.danger, fontSize: 14 };
const primaryButtonStyle = { borderRadius: 16, backgroundColor: palette.brand, paddingVertical: 14, alignItems: 'center' as const };
const primaryButtonTextStyle = { color: '#ffffff', fontSize: 15, fontWeight: '800' as const };
