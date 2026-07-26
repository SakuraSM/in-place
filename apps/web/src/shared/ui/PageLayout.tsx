import { type ReactNode } from 'react';

export type PageWidth = 'wide' | 'standard' | 'narrow';
export type PageTitleSize = 'page' | 'detail';

const PAGE_TITLE_CLASSES: Record<PageTitleSize, string> = {
  page: 'text-xl md:text-2xl',
  detail: 'text-2xl md:text-3xl',
};

interface PageShellProps {
  children: ReactNode;
  className?: string;
}

interface PageContainerProps {
  children: ReactNode;
  width: PageWidth;
  className?: string;
}

interface PageHeaderProps {
  title?: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  backLink?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  width?: PageWidth;
  titleSize?: PageTitleSize;
  className?: string;
  contentClassName?: string;
}

interface PageContentProps {
  children: ReactNode;
  width?: PageWidth;
  className?: string;
}

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(' ');
}

export function PageContainer({
  children,
  width,
  className,
}: PageContainerProps) {
  return (
    <div
      data-page-width={width}
      className={joinClassNames('app-page-gutter w-full', className)}
    >
      {children}
    </div>
  );
}

export function PageShell({ children, className }: PageShellProps) {
  return (
    <div
      className={joinClassNames(
        'flex min-h-full min-w-0 flex-1 flex-col bg-canvas',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  eyebrow,
  backLink,
  actions,
  children,
  width = 'standard',
  titleSize = 'page',
  className,
  contentClassName,
}: PageHeaderProps) {
  return (
    <header
      className={joinClassNames(
        'app-page-header sticky top-0 z-30 border-b border-borderSoft bg-surface/90 backdrop-blur-xl',
        className,
      )}
    >
      <PageContainer
        width={width}
        className={joinClassNames(
          'flex min-h-[76px] flex-col justify-center gap-3 py-3 md:min-h-[88px]',
          contentClassName,
        )}
      >
        {children ?? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                {backLink ? <div className="mb-2">{backLink}</div> : null}
                {eyebrow ? (
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-brandStrong">
                    {eyebrow}
                  </p>
                ) : null}
                {title ? (
                  <h1
                    className={joinClassNames(
                      'font-bold leading-tight text-slate-950',
                      PAGE_TITLE_CLASSES[titleSize],
                      eyebrow ? 'mt-1' : undefined,
                    )}
                  >
                    {title}
                  </h1>
                ) : null}
                {description ? (
                  <p className="mt-1 max-w-[65ch] text-sm leading-6 text-slate-600">
                    {description}
                  </p>
                ) : null}
              </div>
              {actions ? (
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {actions}
                </div>
              ) : null}
            </div>
          </>
        )}
      </PageContainer>
    </header>
  );
}

export function PageContent({
  children,
  width = 'standard',
  className,
}: PageContentProps) {
  return (
    <PageContainer
      width={width}
      className={joinClassNames(
        'flex-1 py-5 md:py-6',
        className,
      )}
    >
      {children}
    </PageContainer>
  );
}
