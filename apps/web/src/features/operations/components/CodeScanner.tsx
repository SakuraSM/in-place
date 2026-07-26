import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, ImageUp, Keyboard, Loader2 } from 'lucide-react';
import { parseInventoryCode } from '../lib/inventoryCode';

interface DetectedBarcode {
  rawValue: string;
}

interface BarcodeDetectorInstance {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new(options: { formats: string[] }): BarcodeDetectorInstance;
}

function getBarcodeDetector() {
  return (window as typeof window & {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }).BarcodeDetector;
}

export default function CodeScanner({
  onCode,
  continuous = false,
}: {
  onCode: (code: string) => void;
  continuous?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastCodeRef = useRef<{ code: string; detectedAt: number } | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState('');

  const submitDetectedValue = useCallback((value: string) => {
    const code = parseInventoryCode(value);
    if (!code) {
      setError('未识别到有效的“归位”标签，请重试或手动输入标签码。');
      return;
    }
    const last = lastCodeRef.current;
    if (last?.code === code && Date.now() - last.detectedAt < 2500) return;
    lastCodeRef.current = { code, detectedAt: Date.now() };
    setError('');
    onCode(code);
  }, [onCode]);

  useEffect(() => {
    if (!cameraActive) return;
    const Detector = getBarcodeDetector();
    const video = videoRef.current;
    if (!Detector || !video) {
      setError('当前浏览器不支持实时扫码，请使用图片识别或手动输入。');
      setCameraActive(false);
      return;
    }

    let cancelled = false;
    let frameId = 0;
    const detector = new Detector({ formats: ['qr_code'] });

    void navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    }).then(async (stream) => {
      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();

      const scanFrame = async () => {
        if (cancelled) return;
        try {
          const [result] = await detector.detect(video);
          if (result) {
            submitDetectedValue(result.rawValue);
            if (!continuous) {
              setCameraActive(false);
              return;
            }
          }
        } catch {
          // Video frames may be temporarily unavailable while the camera starts.
        }
        frameId = window.requestAnimationFrame(() => void scanFrame());
      };
      void scanFrame();
    }).catch(() => {
      setError('无法使用摄像头，请检查权限，或改用图片识别。');
      setCameraActive(false);
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      video.srcObject = null;
    };
  }, [cameraActive, continuous, submitDetectedValue]);

  const detectImage = async (file: File) => {
    const Detector = getBarcodeDetector();
    if (!Detector) {
      setError('当前浏览器不支持图片扫码，请手动输入标签码。');
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const [result] = await new Detector({ formats: ['qr_code'] }).detect(bitmap);
      bitmap.close();
      if (!result) {
        setError('图片中没有识别到二维码，请换一张更清晰的图片。');
        return;
      }
      submitDetectedValue(result.rawValue);
    } catch {
      setError('图片识别失败，请换一张图片或手动输入。');
    }
  };

  return (
    <div className="space-y-4">
      {cameraActive ? (
        <div className="overflow-hidden rounded-3xl bg-slate-950">
          <video ref={videoRef} muted playsInline className="aspect-[4/3] w-full object-cover" />
          <div className="flex items-center justify-center gap-2 px-4 py-3 text-sm text-white">
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            对准“归位”二维码
          </div>
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setCameraActive((active) => !active)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-brandStrong px-4 text-sm font-semibold text-white hover:bg-teal-700"
        >
          <Camera size={18} />
          {cameraActive ? '关闭摄像头' : '打开摄像头'}
        </button>
        <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-4 text-sm font-semibold text-slate-700 hover:bg-surfaceMuted">
          <ImageUp size={18} />
          从图片识别
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void detectImage(file);
            }}
          />
        </label>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          submitDetectedValue(manualCode);
        }}
      >
        <label className="min-w-0 flex-1">
          <span className="sr-only">标签码或二维码地址</span>
          <span className="relative block">
            <Keyboard size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value)}
              placeholder="粘贴标签码或 /s/ 地址"
              autoComplete="off"
              className="h-11 w-full rounded-2xl border border-border bg-surface pl-10 pr-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </span>
        </label>
        <button type="submit" className="h-11 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white">
          确认
        </button>
      </form>
      {error ? <p role="alert" className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
