import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function SectionPanel({
  icon,
  title,
  description,
  children,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-50 px-5 py-4 md:px-6">
        <div className="flex items-center gap-2">
          {icon ? <span className="text-sky-500">{icon}</span> : null}
          <p className="text-sm font-semibold text-slate-800">{title}</p>
        </div>
        {description ? <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p> : null}
      </div>
      <div className="space-y-4 px-5 py-4 md:px-6 md:py-5">{children}</div>
    </div>
  );
}

export function QuickLinkCard({
  to,
  icon,
  title,
  description,
  tone,
}: {
  to: string;
  icon: ReactNode;
  title: string;
  description: string;
  tone: string;
}) {
  return (
    <Link to={to} className="group rounded-3xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-slate-900">{title}</p>
            <ChevronRight size={14} className="text-slate-300 transition-transform group-hover:translate-x-0.5" />
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>
        </div>
      </div>
    </Link>
  );
}
