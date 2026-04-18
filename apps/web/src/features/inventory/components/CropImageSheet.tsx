import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Crop, Image as ImageIcon, RotateCcw, X } from 'lucide-react';
import type { NormalizedCropBox } from '../lib/imageCrop';
import { clampCropBox, fullImageCropBox } from '../lib/imageCrop';

interface Props {
  imageUrl: string;
  initialCrop?: NormalizedCropBox | null;
  onConfirm: (crop: NormalizedCropBox) => void;
  onClose: () => void;
}

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';

type DragState =
  | {
      mode: 'create' | 'move';
      startPoint: { x: number; y: number };
      startCrop: NormalizedCropBox;
    }
  | {
      mode: 'resize';
      handle: ResizeHandle;
      startPoint: { x: number; y: number };
      startCrop: NormalizedCropBox;
    };

const HANDLE_POSITION_CLASS: Record<ResizeHandle, string> = {
  nw: '-left-2 -top-2 cursor-nwse-resize',
  ne: '-right-2 -top-2 cursor-nesw-resize',
  sw: '-left-2 -bottom-2 cursor-nesw-resize',
  se: '-right-2 -bottom-2 cursor-nwse-resize',
};

export default function CropImageSheet({ imageUrl, initialCrop, onConfirm, onClose }: Props) {
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [crop, setCrop] = useState<NormalizedCropBox | null>(initialCrop ?? null);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const cropStyle = useMemo(() => {
    if (!crop) {
      return null;
    }

    return {
      left: `${crop.x * 100}%`,
      top: `${crop.y * 100}%`,
      width: `${crop.width * 100}%`,
      height: `${crop.height * 100}%`,
    };
  }, [crop]);

  const handleCanvasPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const nextPoint = resolveNormalizedPoint(event.clientX, event.clientY, imageContainerRef.current);
    if (!nextPoint) {
      return;
    }

    const nextCrop = clampCropBox({
      x: nextPoint.x,
      y: nextPoint.y,
      width: 0.08,
      height: 0.08,
    });

    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({
      mode: 'create',
      startPoint: nextPoint,
      startCrop: nextCrop,
    });
    setCrop(nextCrop);
  };

  const handleCropPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!crop) {
      return;
    }

    const nextPoint = resolveNormalizedPoint(event.clientX, event.clientY, imageContainerRef.current);
    if (!nextPoint) {
      return;
    }

    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({
      mode: 'move',
      startPoint: nextPoint,
      startCrop: crop,
    });
  };

  const handleHandlePointerDown = (handle: ResizeHandle) => (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!crop) {
      return;
    }

    const nextPoint = resolveNormalizedPoint(event.clientX, event.clientY, imageContainerRef.current);
    if (!nextPoint) {
      return;
    }

    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({
      mode: 'resize',
      handle,
      startPoint: nextPoint,
      startCrop: crop,
    });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState) {
      return;
    }

    const nextPoint = resolveNormalizedPoint(event.clientX, event.clientY, imageContainerRef.current);
    if (!nextPoint) {
      return;
    }

    if (dragState.mode === 'create') {
      const x = Math.min(dragState.startPoint.x, nextPoint.x);
      const y = Math.min(dragState.startPoint.y, nextPoint.y);
      const width = Math.abs(nextPoint.x - dragState.startPoint.x);
      const height = Math.abs(nextPoint.y - dragState.startPoint.y);
      setCrop(clampCropBox({ x, y, width, height }));
      return;
    }

    if (dragState.mode === 'move') {
      const deltaX = nextPoint.x - dragState.startPoint.x;
      const deltaY = nextPoint.y - dragState.startPoint.y;
      setCrop(clampCropBox({
        ...dragState.startCrop,
        x: dragState.startCrop.x + deltaX,
        y: dragState.startCrop.y + deltaY,
      }));
      return;
    }

    if (dragState.mode === 'resize') {
      setCrop(resizeCrop(dragState.startCrop, dragState.handle, nextPoint));
    }
  };

  const handlePointerUp = () => {
    setDragState(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <motion.div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
      />
      <motion.div
        className="relative w-full max-w-2xl bg-white rounded-t-3xl shadow-2xl max-h-[94vh] flex flex-col"
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
      >
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-1" />
        <div className="flex items-center justify-between px-5 pt-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-900 text-lg">手动裁图</h2>
            <p className="text-xs text-slate-400 mt-1">拖拽创建选区，也可以拖动已有框或拉动四角缩放</p>
          </div>
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.08, rotate: 90 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500"
          >
            <X size={16} />
          </motion.button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div
            ref={imageContainerRef}
            className="relative rounded-2xl overflow-hidden bg-slate-100 touch-none select-none"
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            <img src={imageUrl} alt="原图裁剪" className="w-full max-h-[68vh] object-contain bg-slate-100" />

            <div className="absolute inset-0 border border-white/15 pointer-events-none" />
            {cropStyle && crop && (
              <div
                className="absolute border-2 border-sky-400 bg-sky-400/15 shadow-[0_0_0_9999px_rgba(15,23,42,0.35)]"
                style={cropStyle}
                onPointerDown={handleCropPointerDown}
              >
                {(['nw', 'ne', 'sw', 'se'] as ResizeHandle[]).map((handle) => (
                  <button
                    key={handle}
                    type="button"
                    onPointerDown={handleHandlePointerDown(handle)}
                    className={`absolute w-4 h-4 rounded-full border-2 border-white bg-sky-500 shadow-sm ${HANDLE_POSITION_CLASS[handle]}`}
                    aria-label={`调整${handle}角`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setCrop(initialCrop ?? null)}
              className="py-3 rounded-2xl bg-slate-100 text-slate-700 font-medium text-sm hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw size={15} />
              重置
            </button>
            <button
              type="button"
              onClick={() => setCrop(fullImageCropBox())}
              className="py-3 rounded-2xl bg-slate-100 text-slate-700 font-medium text-sm hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
            >
              <ImageIcon size={15} />
              整张图
            </button>
            <button
              type="button"
              disabled={!crop}
              onClick={() => crop && onConfirm(crop)}
              className="py-3 rounded-2xl bg-sky-500 disabled:bg-sky-300 text-white font-medium text-sm hover:bg-sky-600 transition-colors flex items-center justify-center gap-2"
            >
              <Crop size={15} />
              使用此区域
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function resizeCrop(startCrop: NormalizedCropBox, handle: ResizeHandle, point: { x: number; y: number }) {
  const right = startCrop.x + startCrop.width;
  const bottom = startCrop.y + startCrop.height;

  const next = {
    x: handle.includes('w') ? point.x : startCrop.x,
    y: handle.includes('n') ? point.y : startCrop.y,
    width: handle.includes('w') ? right - point.x : point.x - startCrop.x,
    height: handle.includes('n') ? bottom - point.y : point.y - startCrop.y,
  };

  return clampCropBox(normalizeNegativeDimensions(next));
}

function normalizeNegativeDimensions(box: NormalizedCropBox): NormalizedCropBox {
  return {
    x: box.width >= 0 ? box.x : box.x + box.width,
    y: box.height >= 0 ? box.y : box.y + box.height,
    width: Math.abs(box.width),
    height: Math.abs(box.height),
  };
}

function resolveNormalizedPoint(clientX: number, clientY: number, element: HTMLDivElement | null) {
  if (!element) {
    return null;
  }

  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
  return { x, y };
}
