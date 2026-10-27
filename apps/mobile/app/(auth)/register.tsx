import { AuthShell } from '@/features/auth/AuthShell';
import { Link, Redirect } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import { getMobileApiBaseUrlInput } from '@/shared/api/mobileClient';
import { ConnectionFields } from '@/features/auth/ConnectionFields';
import { palette } from '@/shared/ui/theme';

export default function RegisterScreen() {
  const { signUp, session, loading } = useAuth();
  const [apiBaseUrl, setApiBaseUrl] = useState(getMobileApiBaseUrlInput());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const busyRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && session) {
    return <Redirect href="/(tabs)" />;
  }

  const handleSubmit = async () => {
    if (busyRef.current) return;
    if (!apiBaseUrl.trim() || !email.trim() || !password) { setError('请填写服务器地址、邮箱和密码'); return; }
    busyRef.current = true;
    setSubmitting(true);
    setError(null);

    if (password.length < 8) {
      setError('密码至少需要 8 位');
      busyRef.current = false;
      setSubmitting(false);
      return;
    }

    try {
      const normalizedEmail = email.trim();
      const normalizedApiBaseUrl = apiBaseUrl.trim();
      await signUp(normalizedEmail, password, normalizedApiBaseUrl);
    } catch (nextError) {
      setError(nextError instanceof Error && /network request failed|failed to fetch/i.test(nextError.message) ? '无法连接服务器，请检查地址、网络和 HTTPS 证书' : nextError instanceof Error ? nextError.message : '注册失败');
    } finally {
      busyRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="创建你的归位账户">
          <ConnectionFields server={apiBaseUrl} email={email} password={password} disabled={submitting} registering={true} onServerChange={setApiBaseUrl} onEmailChange={setEmail} onPasswordChange={setPassword} onSubmit={() => void handleSubmit()} />

          {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: palette.danger }}>{error}</Text> : null}

          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={({ pressed }) => [
              buttonStyle,
              pressed ? { opacity: 0.92 } : null,
              submitting ? { opacity: 0.7 } : null,
            ]}
          >
            {submitting ? <ActivityIndicator color="#ffffff" /> : <Text style={buttonTextStyle}>注册</Text>}
          </Pressable>

          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text style={{ color: palette.brandStrong, textAlign: 'center', fontWeight: '600' }}>已有账号？去登录</Text>
            </Pressable>
          </Link>
    </AuthShell>
  );
}

const buttonStyle = {
  backgroundColor: palette.brandStrong,
  borderRadius: 12,
  minHeight: 44,
  paddingVertical: 12,
  alignItems: 'center' as const,
};

const buttonTextStyle = {
  color: '#ffffff',
  fontSize: 14,
  fontWeight: '600' as const,
};
