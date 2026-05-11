import { useEffect, useMemo, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { ActivityIndicator, Image, Modal, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NormalizedCropBox, ScanSourceImage } from './scanImageCrop';
import { clampCropBox, fullImageCropBox } from './scanImageCrop';
import { palette } from '@/shared/ui/theme';

interface ScanCropSheetProps {
  visible: boolean;
  sourceImage: ScanSourceImage | null;
  initialCropBox: NormalizedCropBox | null;
  saving: boolean;
  onClose: () => void;
  onConfirm: (cropBox: NormalizedCropBox) => void;
}

type CropHandle = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

interface FrameSize {
  width: number;
  height: number;
}

const MIN_DRAG_CROP_SIZE = 0.08;

export function ScanCropSheet({
  visible,
  sourceImage,
  initialCropBox,
  saving,
  onClose,
  onConfirm,
}: ScanCropSheetProps) {
  const [cropBox, setCropBox] = useState<NormalizedCropBox>(initialCropBox ?? fullImageCropBox());
  const [frameSize, setFrameSize] = useState<FrameSize>({ width: 1, height: 1 });
  const gestureStartCropRef = useRef<NormalizedCropBox>(cropBox);
  const latestCropRef = useRef<NormalizedCropBox>(cropBox);

  useEffect(() => {
    if (visible) {
      setCropBox(initialCropBox ?? fullImageCropBox());
    }
  }, [initialCropBox, visible]);

  useEffect(() => {
    latestCropRef.current = cropBox;
  }, [cropBox]);

  const moveResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: () => !saving,
    onStartShouldSetPanResponder: () => !saving,
    onPanResponderGrant: () => {
      gestureStartCropRef.current = cropBox;
    },
    onPanResponderMove: (_, gestureState) => {
      setCropBox(moveCropBox(gestureStartCropRef.current, gestureState.dx, gestureState.dy, frameSize));
    },
  }), [cropBox, frameSize, saving]);

  const resizeResponders = useMemo(() => ({
    topLeft: createResizeResponder('topLeft', frameSize, gestureStartCropRef, latestCropRef, setCropBox, saving),
    topRight: createResizeResponder('topRight', frameSize, gestureStartCropRef, latestCropRef, setCropBox, saving),
    bottomLeft: createResizeResponder('bottomLeft', frameSize, gestureStartCropRef, latestCropRef, setCropBox, saving),
    bottomRight: createResizeResponder('bottomRight', frameSize, gestureStartCropRef, latestCropRef, setCropBox, saving),
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
            <View
              onLayout={(event) => setFrameSize({
                width: Math.max(1, event.nativeEvent.layout.width),
                height: Math.max(1, event.nativeEvent.layout.height),
              })}
              style={[previewFrameStyle, { aspectRatio: imageAspectRatio }]}
            >
              <Image source={{ uri: sourceImage.uri }} style={previewImageStyle} />
              <View
                {...moveResponder.panHandlers}
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
                <View {...resizeResponders.topLeft.panHandlers} style={[handleStyle, topLeftHandleStyle]} />
                <View {...resizeResponders.topRight.panHandlers} style={[handleStyle, topRightHandleStyle]} />
                <View {...resizeResponders.bottomLeft.panHandlers} style={[handleStyle, bottomLeftHandleStyle]} />
                <View {...resizeResponders.bottomRight.panHandlers} style={[handleStyle, bottomRightHandleStyle]} />
              </View>
            </View>
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

function createResizeResponder(
  handle: CropHandle,
  frameSize: FrameSize,
  gestureStartCropRef: MutableRefObject<NormalizedCropBox>,
  latestCropRef: MutableRefObject<NormalizedCropBox>,
  setCropBox: Dispatch<SetStateAction<NormalizedCropBox>>,
  saving: boolean,
) {
  return PanResponder.create({
    onMoveShouldSetPanResponder: () => !saving,
    onStartShouldSetPanResponder: () => !saving,
    onPanResponderGrant: () => {
      gestureStartCropRef.current = latestCropRef.current;
    },
    onPanResponderMove: (_, gestureState) => {
      setCropBox(resizeCropBox(gestureStartCropRef.current, handle, gestureState.dx, gestureState.dy, frameSize));
    },
  });
}

function moveCropBox(startCrop: NormalizedCropBox, deltaX: number, deltaY: number, frameSize: FrameSize) {
  const nextX = startCrop.x + deltaX / frameSize.width;
  const nextY = startCrop.y + deltaY / frameSize.height;

  return clampCropBox({
    ...startCrop,
    x: Math.max(0, Math.min(1 - startCrop.width, nextX)),
    y: Math.max(0, Math.min(1 - startCrop.height, nextY)),
  });
}

function resizeCropBox(
  startCrop: NormalizedCropBox,
  handle: CropHandle,
  deltaX: number,
  deltaY: number,
  frameSize: FrameSize,
) {
  const normalizedDeltaX = deltaX / frameSize.width;
  const normalizedDeltaY = deltaY / frameSize.height;
  const right = startCrop.x + startCrop.width;
  const bottom = startCrop.y + startCrop.height;

  const next = { ...startCrop };

  if (handle === 'topLeft' || handle === 'bottomLeft') {
    next.x = Math.max(0, Math.min(right - MIN_DRAG_CROP_SIZE, startCrop.x + normalizedDeltaX));
    next.width = right - next.x;
  }

  if (handle === 'topRight' || handle === 'bottomRight') {
    next.width = Math.max(MIN_DRAG_CROP_SIZE, Math.min(1 - startCrop.x, startCrop.width + normalizedDeltaX));
  }

  if (handle === 'topLeft' || handle === 'topRight') {
    next.y = Math.max(0, Math.min(bottom - MIN_DRAG_CROP_SIZE, startCrop.y + normalizedDeltaY));
    next.height = bottom - next.y;
  }

  if (handle === 'bottomLeft' || handle === 'bottomRight') {
    next.height = Math.max(MIN_DRAG_CROP_SIZE, Math.min(1 - startCrop.y, startCrop.height + normalizedDeltaY));
  }

  return clampCropBox(next);
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
