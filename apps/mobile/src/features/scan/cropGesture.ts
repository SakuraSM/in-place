import type { NormalizedCropBox } from './scanImageCrop';
import { clampCropBox } from './scanImageCrop';

export type CropGestureMode = 'move' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

export interface CropFrameSize {
  width: number;
  height: number;
}

interface ResolveCropGestureModeInput {
  touchX: number;
  touchY: number;
  cropBox: NormalizedCropBox;
  frameSize: CropFrameSize;
  handleHitSize: number;
}

interface ApplyCropGestureInput {
  startCrop: NormalizedCropBox;
  mode: CropGestureMode;
  deltaX: number;
  deltaY: number;
  frameSize: CropFrameSize;
}

interface CropPoint {
  x: number;
  y: number;
}

const MIN_DRAG_CROP_SIZE = 0.08;

export function resolveCropGestureMode({
  touchX,
  touchY,
  cropBox,
  frameSize,
  handleHitSize,
}: ResolveCropGestureModeInput): CropGestureMode | null {
  const cropEdges = {
    left: cropBox.x * frameSize.width,
    top: cropBox.y * frameSize.height,
    right: (cropBox.x + cropBox.width) * frameSize.width,
    bottom: (cropBox.y + cropBox.height) * frameSize.height,
  };
  const cornerPoints: ReadonlyArray<{ mode: Exclude<CropGestureMode, 'move'>; point: CropPoint }> = [
    { mode: 'topLeft', point: { x: cropEdges.left, y: cropEdges.top } },
    { mode: 'topRight', point: { x: cropEdges.right, y: cropEdges.top } },
    { mode: 'bottomLeft', point: { x: cropEdges.left, y: cropEdges.bottom } },
    { mode: 'bottomRight', point: { x: cropEdges.right, y: cropEdges.bottom } },
  ];

  const touchedCorner = cornerPoints.find(({ point }) => (
    Math.abs(touchX - point.x) <= handleHitSize
    && Math.abs(touchY - point.y) <= handleHitSize
  ));
  if (touchedCorner) {
    return touchedCorner.mode;
  }

  const isInsideCrop = (
    touchX >= cropEdges.left
    && touchX <= cropEdges.right
    && touchY >= cropEdges.top
    && touchY <= cropEdges.bottom
  );

  return isInsideCrop ? 'move' : null;
}

export function applyCropGesture({
  startCrop,
  mode,
  deltaX,
  deltaY,
  frameSize,
}: ApplyCropGestureInput): NormalizedCropBox {
  if (mode === 'move') {
    return moveCropBox({ startCrop, deltaX, deltaY, frameSize });
  }

  return resizeCropBox({ startCrop, handle: mode, deltaX, deltaY, frameSize });
}

function moveCropBox({
  startCrop,
  deltaX,
  deltaY,
  frameSize,
}: Omit<ApplyCropGestureInput, 'mode'>): NormalizedCropBox {
  const nextX = startCrop.x + deltaX / frameSize.width;
  const nextY = startCrop.y + deltaY / frameSize.height;

  return clampCropBox({
    ...startCrop,
    x: Math.max(0, Math.min(1 - startCrop.width, nextX)),
    y: Math.max(0, Math.min(1 - startCrop.height, nextY)),
  });
}

function resizeCropBox({
  startCrop,
  handle,
  deltaX,
  deltaY,
  frameSize,
}: {
  startCrop: NormalizedCropBox;
  handle: Exclude<CropGestureMode, 'move'>;
  deltaX: number;
  deltaY: number;
  frameSize: CropFrameSize;
}): NormalizedCropBox {
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
