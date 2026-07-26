import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NormalizedCropBox, ScanSourceImage } from './scanImageCrop';
import { fullImageCropBox } from './scanImageCrop';
import { applyCropGesture, resolveCropGestureMode, type CropFrameSize, type CropGestureMode } from './cropGesture';
import { palette } from '@/shared/ui/theme';

interface ScanCropSheetProps {
  visible: boolean;
  sourceImage: ScanSourceImage | null;
  initialCropBox: NormalizedCropBox | null;
  saving: boolean;
  onClose: () => void;
  onConfirm: (cropBox: NormalizedCropBox) => void;
}

const CROP_HANDLE_HIT_SIZE = 24;

export function ScanCropSheet({
  visible,
  sourceImage,
  initialCropBox,
  saving,
  onClose,
  onConfirm,
}: ScanCropSheetProps) {
  const [cropBox, setCropBox] = useState<NormalizedCropBox>(initialCropBox ?? fullImageCropBox());
  const [frameSize, setFrameSize] = useState<CropFrameSize>({ width: 1, height: 1 });
  const gestureStartCropRef = useRef<NormalizedCropBox>(cropBox);
  const latestCropRef = useRef<NormalizedCropBox>(cropBox);
  const gestureModeRef = useRef<CropGestureMode | null>(null);

  useEffect(() => {
    if (visible) {
      setCropBox(initialCropBox ?? fullImageCropBox());
    }
  }, [initialCropBox, visible]);

  useEffect(() => {
    latestCropRef.current = cropBox;
  }, [cropBox]);

  const cropResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: () => !saving,
    onStartShouldSetPanResponder: () => !saving,
    onPanResponderGrant: (event) => {
      const startCrop = latestCropRef.current;
      gestureStartCropRef.current = startCrop;
      gestureModeRef.current = resolveCropGestureMode({
        touchX: event.nativeEvent.locationX,
        touchY: event.nativeEvent.locationY,
        cropBox: startCrop,
        frameSize,
        handleHitSize: CROP_HANDLE_HIT_SIZE,
      });
    },
    onPanResponderMove: (_, gestureState) => {
      const gestureMode = gestureModeRef.current;
      if (!gestureMode) {
        return;
      }

      setCropBox(applyCropGesture({
        startCrop: gestureStartCropRef.current,
        mode: gestureMode,
        deltaX: gestureState.dx,
        deltaY: gestureState.dy,
        frameSize,
      }));
    },
    onPanResponderRelease: () => {
      gestureModeRef.current = null;
    },
    onPanResponderTerminate: () => {
      gestureModeRef.current = null;
    },
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
  }), [frameSize, saving]);

  const handleConfirm = () => {
    onConfirm(cropBox);
  };

  const imageAspectRatio = sourceImage && sourceImage.width > 0 && sourceImage.height > 0
    ? sourceImage.width / sourceImage.height
    : 4 / 3;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={modalRootStyle}>
        <Pressable style={backdropStyle} onPress={onClose} />
        <View style={sheetStyle}>
          <View style={sheetHeaderStyle}>
            <View>
              <Text style={sheetTitleStyle}>裁剪</Text>
            </View>
            <Pressable disabled={saving} onPress={onClose} style={closeButtonStyle}>
              <Text style={closeButtonTextStyle}>关闭</Text>
            </Pressable>
          </View>

          {sourceImage ? (
            <>
              <Text style={gestureHintStyle}>拖动框体移动，拖动四角调整范围</Text>
              <View
                onLayout={(event) => setFrameSize({
                  width: Math.max(1, event.nativeEvent.layout.width),
                  height: Math.max(1, event.nativeEvent.layout.height),
                })}
                style={[previewFrameStyle, { aspectRatio: imageAspectRatio }]}
              >
                <Image source={{ uri: sourceImage.uri }} style={previewImageStyle} />
                <View
                  pointerEvents="none"
                  style={[
                    cropOverlayStyle,
                    {
                      left: `${cropBox.x * 100}%`,
                      top: `${cropBox.y * 100}%`,
                      width: `${cropBox.width * 100}%`,
                      height: `${cropBox.height * 100}%`,
                    },
                  ]}
                >
                  <View style={[handleStyle, topLeftHandleStyle]} />
                  <View style={[handleStyle, topRightHandleStyle]} />
                  <View style={[handleStyle, bottomLeftHandleStyle]} />
                  <View style={[handleStyle, bottomRightHandleStyle]} />
                </View>
                <View
                  {...cropResponder.panHandlers}
                  accessibilityLabel="裁剪范围"
                  accessibilityHint="在裁剪框内拖动可移动范围，拖动四角可调整大小"
                  collapsable={false}
                  style={cropInteractionLayerStyle}
                />
              </View>
            </>
          ) : null}

          <View style={quickActionsStyle}>
            <Pressable disabled={saving} onPress={() => setCropBox(initialCropBox ?? fullImageCropBox())} style={secondaryButtonStyle}>
              <Text style={secondaryButtonTextStyle}>自动框</Text>
            </Pressable>
            <Pressable disabled={saving} onPress={() => setCropBox(fullImageCropBox())} style={secondaryButtonStyle}>
              <Text style={secondaryButtonTextStyle}>整图</Text>
            </Pressable>
          </View>

          <Pressable disabled={saving || !sourceImage} onPress={handleConfirm} style={[primaryButtonStyle, (saving || !sourceImage) ? disabledStyle : null]}>
            {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={primaryButtonTextStyle}>确认</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const modalRootStyle = {
  flex: 1,
  justifyContent: 'flex-end' as const,
};

const backdropStyle = {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: 'rgba(15, 23, 42, 0.32)',
};

const sheetStyle = {
  maxHeight: '88%' as const,
  borderTopLeftRadius: 28,
  borderTopRightRadius: 28,
  backgroundColor: palette.surface,
  padding: 18,
  gap: 14,
};

const sheetHeaderStyle = {
  flexDirection: 'row' as const,
  justifyContent: 'space-between' as const,
  alignItems: 'flex-start' as const,
  gap: 12,
};

const sheetTitleStyle = {
  fontSize: 18,
  fontWeight: '800' as const,
  color: palette.text,
};

const gestureHintStyle = {
  fontSize: 13,
  fontWeight: '600' as const,
  color: palette.textMuted,
};

const closeButtonStyle = {
  borderRadius: 999,
  backgroundColor: palette.canvasStrong,
  paddingHorizontal: 12,
  paddingVertical: 8,
};

const closeButtonTextStyle = {
  fontSize: 13,
  fontWeight: '700' as const,
  color: palette.textMuted,
};

const previewFrameStyle = {
  width: '100%' as const,
  maxHeight: 320,
  overflow: 'hidden' as const,
  borderRadius: 20,
  backgroundColor: '#0f172a',
};

const previewImageStyle = {
  width: '100%' as const,
  height: '100%' as const,
  resizeMode: 'contain' as const,
};

const cropOverlayStyle = {
  position: 'absolute' as const,
  borderWidth: 2,
  borderColor: '#38bdf8',
  backgroundColor: 'rgba(14, 165, 233, 0.16)',
};

const cropInteractionLayerStyle = {
  ...StyleSheet.absoluteFillObject,
  zIndex: 2,
};

const handleStyle = {
  position: 'absolute' as const,
  width: 28,
  height: 28,
  borderRadius: 999,
  borderWidth: 2,
  borderColor: '#ffffff',
  backgroundColor: '#38bdf8',
};

const topLeftHandleStyle = {
  left: -14,
  top: -14,
};

const topRightHandleStyle = {
  right: -14,
  top: -14,
};

const bottomLeftHandleStyle = {
  left: -14,
  bottom: -14,
};

const bottomRightHandleStyle = {
  right: -14,
  bottom: -14,
};

const quickActionsStyle = {
  flexDirection: 'row' as const,
  gap: 10,
};

const secondaryButtonStyle = {
  flex: 1,
  borderRadius: 14,
  backgroundColor: palette.canvasStrong,
  alignItems: 'center' as const,
  paddingVertical: 11,
};

const secondaryButtonTextStyle = {
  fontSize: 13,
  fontWeight: '700' as const,
  color: palette.textMuted,
};

const primaryButtonStyle = {
  borderRadius: 16,
  backgroundColor: palette.brand,
  alignItems: 'center' as const,
  paddingVertical: 14,
};

const primaryButtonTextStyle = {
  fontSize: 15,
  fontWeight: '800' as const,
  color: '#ffffff',
};

const disabledStyle = {
  opacity: 0.55,
};
