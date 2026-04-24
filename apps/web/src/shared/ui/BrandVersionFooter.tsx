import { APP_VERSION } from '../lib/appVersion';

const GITHUB_REPO_URL = 'https://github.com/SakuraSM/in-place';

export default function BrandVersionFooter({
  compact = false,
  className = '',
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-center gap-2 text-slate-400 ${className}`}>
      <img
        src="/branding/inplace-logo-full.png"
        alt="归位"
        className={compact ? 'h-5 w-auto max-w-[88px] object-contain' : 'h-6 w-auto max-w-[108px] object-contain'}
      />
      <a
        href={GITHUB_REPO_URL}
        target="_blank"
        rel="noreferrer"
        className={`inline-flex items-center rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 font-semibold text-sky-600 transition-colors hover:border-sky-200 hover:bg-sky-100 hover:text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500/30 ${
          compact ? 'text-[10px]' : 'text-xs'
        }`}
      >
        v{APP_VERSION}
      </a>
    </div>
  );
}
