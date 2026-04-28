import { Link, Redirect } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import { getMobileApiBaseUrl } from '@/shared/api/mobileClient';
import { BrandHeader } from '@/shared/ui/BrandHeader';
import { Entrance } from '@/shared/ui/Entrance';
import { palette, shadows } from '@/shared/ui/theme';

export default function RegisterScreen() {
  const { signUp, session, loading } = useAuth();
  const [apiBaseUrl, setApiBaseUrl] = useState(getMobileApiBaseUrl());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && session) {
    return <Redirect href="/(tabs)" />;
  }

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    if (password.length < 8) {
      setError('密码至少需要 8 位');
      setSubmitting(false);
      return;
    }

    try {
      await signUp(email.trim(), password, apiBaseUrl.trim());
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '注册失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.canvas }}>
      <View style={{ position: 'absolute', top: -80, right: -30, width: 220, height: 220, borderRadius: 999, backgroundColor: '#dbeafe', opacity: 0.75 }} />
      <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 18 }}>
        <Entrance>
          <BrandHeader title="创建账号" subtitle="先配置服务器地址，再创建或加入你的归位空间。" />
        </Entrance>

        <Entrance delay={90}>
          <View style={cardStyle}>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              value={apiBaseUrl}
              onChangeText={setApiBaseUrl}
              placeholder="服务器地址，例如 https://demo.example.com/api"
              placeholderTextColor={palette.textSoft}
              style={inputStyle}
            />
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholder="邮箱"
              placeholderTextColor={palette.textSoft}
              style={inputStyle}
            />
            <TextInput
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="密码（至少 8 位）"
              placeholderTextColor={palette.textSoft}
              style={inputStyle}
            />

            {error ? <Text style={{ color: palette.danger }}>{error}</Text> : null}

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
          </View>
        </Entrance>
      </View>
    </SafeAreaView>
  );
}

const inputStyle = {
  backgroundColor: palette.surfaceMuted,
  borderRadius: 16,
  paddingHorizontal: 16,
  paddingVertical: 14,
  borderWidth: 1,
  borderColor: palette.border,
  color: palette.text,
};

const buttonStyle = {
  backgroundColor: palette.brand,
  borderRadius: 16,
  paddingVertical: 15,
  alignItems: 'center' as const,
};

const buttonTextStyle = {
  color: '#ffffff',
  fontSize: 16,
  fontWeight: '600' as const,
};

const cardStyle = {
  backgroundColor: palette.surface,
  borderRadius: 28,
  borderWidth: 1,
  borderColor: palette.borderSoft,
  padding: 18,
  gap: 16,
  ...shadows.card,
};
