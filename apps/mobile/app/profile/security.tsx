import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import { BrandHeader } from '@/shared/ui/BrandHeader';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { palette } from '@/shared/ui/theme';
import { fetchPasswordChange } from '@/features/profile/mobileProfileApi';

export default function SecurityScreen() {
  const { signOut } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [showLogout, setShowLogout] = useState(false);

  const passwordMutation = useMutation({
    mutationFn: () => fetchPasswordChange(currentPassword, newPassword),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setMessage('密码已更新');
    },
  });

  return (
    <Screen scroll contentInsetMode="form" chrome="muted">
      <BrandHeader title="账号安全" subtitle="把密码修改和会话操作收进独立页面，减少首页误触。" variant="page" />

      <SectionCard title="修改密码" subtitle="和 Web 端保持同一能力，密码至少 8 位。" delay={60} density="compact">
        <TextInput
          value={currentPassword}
          onChangeText={(value) => {
            setMessage(null);
            setCurrentPassword(value);
          }}
          placeholder="当前密码"
          style={inputStyle}
          secureTextEntry
        />
        <TextInput
          value={newPassword}
          onChangeText={(value) => {
            setMessage(null);
            setNewPassword(value);
          }}
          placeholder="新密码（至少 8 位）"
          style={inputStyle}
          secureTextEntry
        />
        {message ? <Text style={successTextStyle}>{message}</Text> : null}
        {passwordMutation.isError ? <Text style={errorTextStyle}>{passwordMutation.error instanceof Error ? passwordMutation.error.message : '密码修改失败'}</Text> : null}
        <Pressable onPress={() => void passwordMutation.mutateAsync()} style={primaryButtonStyle}>
          {passwordMutation.isPending ? <ActivityIndicator color="#ffffff" /> : <Text style={primaryButtonTextStyle}>修改密码</Text>}
        </Pressable>
      </SectionCard>

      <SectionCard title="登录会话" subtitle="退出后需要重新登录才能继续使用归位。" delay={120} density="compact" tone="muted">
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
        onConfirm={() => void signOut()}
      />
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

const primaryButtonStyle = {
  alignItems: 'center' as const,
  backgroundColor: palette.brand,
  borderRadius: 14,
  paddingVertical: 13,
};

const primaryButtonTextStyle = {
  color: '#ffffff',
  fontWeight: '600' as const,
};

const dangerButtonStyle = {
  alignItems: 'center' as const,
  backgroundColor: palette.danger,
  borderRadius: 14,
  paddingVertical: 13,
};

const dangerButtonTextStyle = {
  color: '#ffffff',
  fontWeight: '700' as const,
};

const successTextStyle = {
  color: '#15803d',
  fontSize: 14,
};

const errorTextStyle = {
  color: palette.danger,
  fontSize: 14,
};
