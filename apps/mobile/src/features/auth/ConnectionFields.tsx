import { useRef } from 'react';
import { Text, type TextInput } from 'react-native';
import { FormField } from '@/shared/ui/FormField';
import { palette } from '@/shared/ui/theme';

export function ConnectionFields({ server, email, password, disabled, registering = false, onServerChange, onEmailChange, onPasswordChange, onSubmit }: {
  server: string; email: string; password: string; disabled: boolean; registering?: boolean;
  onServerChange: (value: string) => void; onEmailChange: (value: string) => void; onPasswordChange: (value: string) => void; onSubmit: () => void;
}) {
  const emailInput = useRef<TextInput>(null);
  const passwordInput = useRef<TextInput>(null);
  return <>
    <Text style={{ color: palette.textSoft, fontSize: 13, lineHeight: 20 }}>先连接家庭的归位服务器。地址由部署者或家庭管理员提供，登录和注册使用同一个地址。</Text>
    <FormField label="服务器地址" value={server} onChangeText={onServerChange} placeholder="https://home.example.com" hint="可直接填写域名，自动补全 HTTPS 和 /api" autoCapitalize="none" autoCorrect={false} keyboardType="url" editable={!disabled} returnKeyType="next" onSubmitEditing={() => emailInput.current?.focus()} />
    <FormField inputRef={emailInput} label="邮箱" value={email} onChangeText={onEmailChange} placeholder="邮箱" autoCapitalize="none" autoCorrect={false} autoComplete="email" keyboardType="email-address" editable={!disabled} returnKeyType="next" onSubmitEditing={() => passwordInput.current?.focus()} />
    <FormField inputRef={passwordInput} label="密码" value={password} onChangeText={onPasswordChange} placeholder={registering ? '至少 8 位' : '密码'} secureTextEntry autoComplete={registering ? 'new-password' : 'current-password'} editable={!disabled} returnKeyType="go" onSubmitEditing={onSubmit} />
  </>;
}
