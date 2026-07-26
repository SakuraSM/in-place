import type { ReactElement } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { palette } from './theme';

interface FormFieldProps extends TextInputProps {
  label: string;
  hint?: string;
  error?: string;
  trailing?: ReactElement;
}

export function FormField({ label, hint, error, trailing, style, ...inputProps }: FormFieldProps) {
  return (
    <View style={fieldStyle}>
      <Text style={labelStyle}>{label}</Text>
      <View style={[inputFrameStyle, error ? errorFrameStyle : null]}>
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={hint}
          accessibilityState={{ disabled: inputProps.editable === false }}
          placeholderTextColor={palette.textSoft}
          style={[inputStyle, style]}
          {...inputProps}
        />
        {trailing as never}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={errorStyle}>{error}</Text>
      ) : hint ? (
        <Text style={hintStyle}>{hint}</Text>
      ) : null}
    </View>
  );
}

const fieldStyle = { gap: 6 };
const labelStyle = { fontSize: 13, fontWeight: '800' as const, color: palette.textMuted };
const inputFrameStyle = {
  minHeight: 46,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: palette.border,
  backgroundColor: palette.surfaceMuted,
  paddingHorizontal: 13,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 8,
};
const errorFrameStyle = { borderColor: palette.danger };
const inputStyle = { flex: 1, minHeight: 44, fontSize: 15, color: palette.text };
const hintStyle = { fontSize: 12, lineHeight: 17, color: palette.textSoft };
const errorStyle = { fontSize: 12, lineHeight: 17, color: palette.danger };
