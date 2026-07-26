import { applyCropGesture, resolveCropGestureMode } from '../cropGesture';

const FRAME_SIZE = { width: 300, height: 200 };
const INITIAL_CROP = { x: 0.2, y: 0.2, width: 0.4, height: 0.5 };

describe('crop gesture', () => {
  it('moves the crop box from a touch inside the selection', () => {
    const mode = resolveCropGestureMode({
      touchX: 120,
      touchY: 90,
      cropBox: INITIAL_CROP,
      frameSize: FRAME_SIZE,
      handleHitSize: 24,
    });

    expect(mode).toBe('move');
    const movedCrop = applyCropGesture({
      startCrop: INITIAL_CROP,
      mode: 'move',
      deltaX: 30,
      deltaY: 20,
      frameSize: FRAME_SIZE,
    });

    expect(movedCrop.x).toBeCloseTo(0.3);
    expect(movedCrop.y).toBeCloseTo(0.3);
    expect(movedCrop.width).toBeCloseTo(0.4);
    expect(movedCrop.height).toBeCloseTo(0.5);
  });

  it('uses the enlarged corner target to resize on Android', () => {
    const mode = resolveCropGestureMode({
      touchX: 170,
      touchY: 132,
      cropBox: INITIAL_CROP,
      frameSize: FRAME_SIZE,
      handleHitSize: 24,
    });

    expect(mode).toBe('bottomRight');
    expect(applyCropGesture({
      startCrop: INITIAL_CROP,
      mode: 'bottomRight',
      deltaX: 30,
      deltaY: 20,
      frameSize: FRAME_SIZE,
    })).toEqual({
      x: 0.2,
      y: 0.2,
      width: 0.5,
      height: 0.6,
    });
  });

  it('does not start a gesture outside the crop box', () => {
    expect(resolveCropGestureMode({
      touchX: 10,
      touchY: 10,
      cropBox: INITIAL_CROP,
      frameSize: FRAME_SIZE,
      handleHitSize: 24,
    })).toBeNull();
  });
});
