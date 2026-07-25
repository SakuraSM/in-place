import type { ReactNode } from 'react';
import { Boxes, Search, ShieldCheck } from 'lucide-react';
import BrandLockup from '../../../shared/ui/BrandLockup';

interface AuthShellProps {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}

const AUTH_BENEFITS = [
  { icon: Search, text: '快速找到每件物品所在位置' },
  { icon: Boxes, text: '用位置、收纳和标签建立清晰结构' },
  { icon: ShieldCheck, text: '数据归属账号，支持备份和迁移' },
] as const;

export default function AuthShell({
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
  return (
    <main className="min-h-screen bg-canvas px-4 py-6 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(420px,560px)] lg:gap-6 lg:p-6">
      <section className="relative hidden min-h-[calc(100vh-48px)] overflow-hidden rounded-[32px] bg-slate-900 px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-14">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand/20 blur-3xl" />
        <div className="absolute -bottom-24 left-16 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
        <BrandLockup
          size="md"
          logoVariant="mark"
          className="relative w-fit rounded-[22px] border border-white/15 bg-white/10 p-2 pr-4 shadow-sm backdrop-blur-md [&_[data-brand-title]]:text-white [&_p]:text-slate-300"
        />
        <div className="relative max-w-xl">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.22em] text-teal-300">
            InPlace · 归位
          </p>
          <h1 className="text-4xl font-bold leading-tight xl:text-5xl">
            让家里的每件东西，
            <br />
            都有迹可循。
          </h1>
          <p className="mt-5 max-w-lg text-base leading-8 text-slate-300">
            记录位置、收纳、状态与标签，减少重复购买和翻找时间，把整理变成一件轻松的事。
          </p>
          <ul className="mt-9 space-y-4">
            {AUTH_BENEFITS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm font-medium text-slate-200">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 text-teal-300">
                  <Icon size={17} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-slate-500">整理有序，生活松弛。</p>
      </section>

      <section className="mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-md flex-col justify-center lg:max-w-none lg:px-10 xl:px-16">
        <BrandLockup
          size="sm"
          logoVariant="mark"
          titleAs="h1"
          showSubtitle={false}
          className="mx-auto mb-8 w-fit border-0 bg-transparent px-0 shadow-none lg:hidden"
        />
        <div className="rounded-[28px] border border-border bg-surface p-6 shadow-card sm:p-8">
          <div className="mb-7">
            <p className="mb-2 text-sm font-bold text-brandStrong">欢迎使用归位</p>
            <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
          </div>
          {children}
        </div>
        <div className="mt-6 text-center text-sm text-slate-600">{footer}</div>
      </section>
    </main>
  );
}
