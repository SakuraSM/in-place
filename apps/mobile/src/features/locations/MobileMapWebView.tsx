import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview';
import {
  parseMobileMapToNativeMessage,
  serializeNativeToMobileMapMessage,
  type AssetGeoLocation,
  type MobileMapPoint,
  type NativeToMobileMapMessage,
} from '@inplace/app-core';
import { getMobileWebBaseUrl } from '@/shared/api/mobileClient';
import { palette } from '@/shared/ui/theme';
import { isAllowedMobileMapNavigation } from './mobileMapSecurity';

interface MobileMapWebViewProps {
  points: MobileMapPoint[];
  selectedPointIds: string[];
  coordinateTarget: { id: string; name: string } | null;
  onSelectPoints: (pointIds: string[]) => void;
  onChooseCoordinate: (coordinate: AssetGeoLocation) => void;
  onError: (message: string) => void;
}

export function MobileMapWebView({
  points,
  selectedPointIds,
  coordinateTarget,
  onSelectPoints,
  onChooseCoordinate,
  onError,
}: MobileMapWebViewProps) {
  const webViewRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const webBaseUrl = useMemo(() => getMobileWebBaseUrl(), []);
  const mapUrl = `${webBaseUrl}/mobile-map`;

  const sendMessage = useCallback((message: NativeToMobileMapMessage) => {
    const payload = serializeNativeToMobileMapMessage(message);
    webViewRef.current?.injectJavaScript(
      `window.dispatchEvent(new CustomEvent('inplace:mobile-map-message',{detail:${payload}}));true;`,
    );
  }, []);

  useEffect(() => {
    if (!ready) return;
    sendMessage({ type: 'update-points', points });
  }, [points, ready, sendMessage]);

  useEffect(() => {
    if (!ready) return;
    sendMessage({ type: 'select-points', pointIds: selectedPointIds });
  }, [ready, selectedPointIds, sendMessage]);

  useEffect(() => {
    if (!ready) return;
    sendMessage({
      type: 'set-coordinate-mode',
      targetId: coordinateTarget?.id ?? null,
      targetName: coordinateTarget?.name ?? null,
    });
  }, [coordinateTarget, ready, sendMessage]);

  const handleMessage = (event: WebViewMessageEvent) => {
    let rawMessage: unknown;
    try {
      rawMessage = JSON.parse(event.nativeEvent.data);
    } catch {
      onError('地图返回了无法识别的消息');
      return;
    }
    const message = parseMobileMapToNativeMessage(rawMessage);
    if (!message) {
      onError('地图消息校验失败');
      return;
    }
    if (message.type === 'ready') {
      setReady(true);
      setLoadError(null);
      sendMessage({ type: 'initialize', points, selectedPointIds });
      if (coordinateTarget) {
        sendMessage({ type: 'set-coordinate-mode', targetId: coordinateTarget.id, targetName: coordinateTarget.name });
      }
      return;
    }
    if (message.type === 'select-points') onSelectPoints(message.pointIds);
    if (message.type === 'choose-coordinate') onChooseCoordinate(message.coordinate);
    if (message.type === 'error') {
      setLoadError(message.message);
      onError(message.message);
    }
  };

  return (
    <View style={frameStyle} accessibilityLabel="资产位置地图">
      <WebView
        ref={webViewRef}
        testID="mobile-map-webview"
        source={{ uri: mapUrl }}
        originWhitelist={[new URL(webBaseUrl).origin]}
        onMessage={handleMessage}
        onLoadStart={() => {
          setReady(false);
          setLoadError(null);
        }}
        onError={() => setLoadError('地图页面加载失败，请检查网络和服务地址')}
        onHttpError={(event) => setLoadError(`地图页面加载失败（${event.nativeEvent.statusCode}）`)}
        onShouldStartLoadWithRequest={(request: WebViewNavigation) => isAllowedMobileMapNavigation(request.url, webBaseUrl)}
        javaScriptEnabled
        domStorageEnabled
        allowsBackForwardNavigationGestures={false}
        setSupportMultipleWindows={false}
        style={webViewStyle}
      />
      {!ready && !loadError ? (
        <View style={overlayStyle} accessibilityRole="progressbar">
          <ActivityIndicator color={palette.brandStrong} />
          <Text style={statusTextStyle}>正在加载地图…</Text>
        </View>
      ) : null}
      {loadError ? (
        <View style={overlayStyle} accessibilityRole="alert">
          <Text style={errorTextStyle}>{loadError}</Text>
          <Text style={errorHintStyle}>请检查设备网络、DNS 和地图服务配置后重新进入地图</Text>
        </View>
      ) : null}
    </View>
  );
}

const frameStyle = {
  height: 380,
  overflow: 'hidden' as const,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: palette.borderSoft,
  backgroundColor: palette.surfaceMuted,
};
const webViewStyle = { flex: 1, backgroundColor: palette.surfaceMuted };
const overlayStyle = {
  position: 'absolute' as const,
  inset: 0,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 10,
  padding: 24,
  backgroundColor: 'rgba(248,250,252,0.96)',
};
const statusTextStyle = { fontSize: 14, fontWeight: '700' as const, color: palette.textMuted };
const errorTextStyle = { fontSize: 14, lineHeight: 21, textAlign: 'center' as const, fontWeight: '700' as const, color: palette.danger };
const errorHintStyle = { fontSize: 12, lineHeight: 18, textAlign: 'center' as const, color: palette.textSoft };
