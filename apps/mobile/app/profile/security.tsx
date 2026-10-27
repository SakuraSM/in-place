import { ActionButtonRow } from '@/shared/ui/ActionButtonRow';
import { FormField } from '@/shared/ui/FormField';
import { useState } from 'react';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Pressable, Text } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import { PageHeader } from '@/shared/ui/PageHeader';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { palette } from '@/shared/ui/theme';
import { fetchPasswordChange } from '@/features/profile/mobileProfileApi';

export default function SecurityScreen() {
  const { replaceSessionToken, signOut } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [showLogout, setShowLogout] = useState(false);

  const handleLogout = async (): Promise<void> => {
    await signOut();
    setShowLogout(false);
    router.replace('/(auth)/login');
  };

  const passwordMutation = useMutation({
    mutationFn: () => fetchPasswordChange(currentPassword, newPassword),
    onSuccess: async (token) => {
      await replaceSessionToken(token);
      setCurrentPassword('');
      setNewPassword('');
      setMessage('密码已更新');
    },
  });

  return (
    <Screen scroll contentInsetMode="form" chrome="muted" footer={<ActionButtonRow actions={[{ key: 'save', label: '修改密码', variant: 'primary', onPress: () => void passwordMutation.mutateAsync(), loading: passwordMutation.isPending }]} />}>
      <PageHeader title="账号安全" subtitle="密码与登录会话" />

      <SectionCard title="修改密码" subtitle="至少 8 位" delay={60} density="compact">
        <FormField label="当前密码"
          value={currentPassword}
          onChangeText={(value) => {
            setMessage(null);
            setCurrentPassword(value);
          }}
          placeholder="当前密码"
          secureTextEntry
        />
        <FormField label="新密码"
          value={newPassword}
          onChangeText={(value) => {
            setMessage(null);
            setNewPassword(value);
          }}
          placeholder="新密码（至少 8 位）"
          secureTextEntry
        />
        {message ? <Text style={successTextStyle}>{message}</Text> : null}
        {passwordMutation.isError ? <Text style={errorTextStyle}>{passwordMutation.error instanceof Error ? passwordMutation.error.message : '密码修改失败'}</Text> : null}

      </SectionCard>

      <SectionCard title="登录会话" delay={120} density="compact" tone="muted">
        <Pressable onPress={() => setShowLogout(true)} style={dangerButtonStyle}>
          <Text style={dangerButtonTextStyle}>退出登录</Text>
        </Pressable>
      </SectionCard>

      <ConfirmDialog
        visible={showLogout}
        title="退出登录"
        message="确定要退出当前账号吗？"
        confirmLabel="退出"
        danger
        onCancel={() => setShowLogout(false)}
        onConfirm={() => void handleLogout()}
      />
    </Screen>
  );
}




const dangerButtonStyle = {
  alignItems: 'center' as const,
  backgroundColor: palette.danger,
  borderRadius: 12,
  paddingVertical: 13,
};

const dangerButtonTextStyle = {
  color: '#ffffff',
  fontWeight: '600' as const,
};

const successTextStyle = {
  color: '#15803d',
  fontSize: 14,
};

const errorTextStyle = {
  color: palette.danger,
  fontSize: 14,
};
