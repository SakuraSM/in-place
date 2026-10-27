import type { ReactNode } from 'react';
import BrandLockup from '../../../shared/ui/BrandLockup';
import { CategoryIcon } from '../../inventory/lib/categoryPresentation';

interface AuthShellProps { title: string; description: string; children: ReactNode; footer: ReactNode }

export default function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <main className="min-h-dvh bg-canvas px-5 py-6 md:px-10">
      <div className="mx-auto max-w-[1120px]"><BrandLockup size="sm" logoVariant="mark" subtitle="INPLACE" /></div>
      <div className="mx-auto grid max-w-[1120px] items-center gap-8 py-8 md:min-h-[calc(100dvh-120px)] md:grid-cols-[1.1fr_1fr] md:gap-20 md:py-12">
        <section className="relative min-h-40 md:min-h-0 md:px-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-brandStrong">A home for everything</p>
          <h1 className="relative z-10 mt-4 text-[28px] font-semibold leading-relaxed tracking-tight md:text-[46px]">记得拥有，<br />也记得归处。</h1>
          <p className="relative z-10 mt-4 max-w-[60%] text-xs leading-6 text-muted md:max-w-none md:text-sm md:leading-7">从一件小物开始，<br />把日常收拾成喜欢的样子。</p>
          <div className="pointer-events-none absolute -right-2 top-4 h-36 w-36 md:static md:mt-5 md:h-[280px] md:w-[280px]"><CategoryIcon icon="Building2" presetKey="location.apartment" imageClassName="h-full w-full object-contain" /></div>
        </section>
        <section className="mx-auto w-full max-w-[450px]">
          <div className="ui-panel p-6 md:p-9">
            <div className="mb-7"><p className="mb-3 text-[10px] font-medium uppercase tracking-[0.16em] text-brandStrong">Welcome home</p><h2 className="text-[25px] font-semibold tracking-tight text-ink">{title}</h2><p className="mt-2 text-xs leading-6 text-muted">{description}</p></div>
            {children}
          </div>
          <div className="mt-6 text-center text-sm text-muted">{footer}</div>
        </section>
      </div>
    </main>
  );
}
