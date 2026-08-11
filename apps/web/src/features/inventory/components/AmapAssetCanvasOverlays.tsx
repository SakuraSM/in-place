import { Crosshair, Loader2, MapPin } from 'lucide-react';

interface AmapAssetCanvasOverlaysProps {
  loadStatus: 'loading' | 'ready' | 'error';
  assignmentTargetName: string | null;
  interactionError: string | null;
}

export default function AmapAssetCanvasOverlays({
  loadStatus,
  assignmentTargetName,
  interactionError,
}: AmapAssetCanvasOverlaysProps) {
  return (
    <>
      {loadStatus === 'loading' ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90" role="status">
          <div className="text-center text-slate-600">
            <Loader2 className="mx-auto animate-spin" size={28} aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold">正在加载高德地图...</p>
          </div>
        </div>
      ) : null}

      {loadStatus === 'error' ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/95 px-6" role="alert">
          <div className="max-w-sm text-center">
            <MapPin className="mx-auto text-rose-500" size={30} aria-hidden="true" />
            <h2 className="mt-3 text-lg font-bold text-slate-950">地图加载失败</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              请检查高德 Key、域名白名单和服务端安全代理配置。
            </p>
          </div>
        </div>
      ) : null}

      {assignmentTargetName ? (
        <div className="absolute left-4 right-4 top-4 z-10 flex items-center gap-3 rounded-2xl border border-brand/30 bg-white/95 px-4 py-3 shadow-lg backdrop-blur sm:right-auto">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brandTint text-brandStrong">
            <Crosshair size={18} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-950">
              在地图上点击“{assignmentTargetName}”的位置
            </p>
            <p className="mt-0.5 text-xs text-slate-600">选点后会自动识别地址并保存</p>
          </div>
        </div>
      ) : null}

      {interactionError ? (
        <div className="absolute bottom-4 left-4 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-lg" role="alert">
          {interactionError}
        </div>
      ) : null}
    </>
  );
}
