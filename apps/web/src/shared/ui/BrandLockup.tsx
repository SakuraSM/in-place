import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface BrandLockupProps {
  title?: string;
  subtitle?: string;
  tagline?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  logoVariant?: 'mark' | 'full';
  showTagline?: boolean;
  showSubtitle?: boolean;
  framelessLogo?: boolean;
  rightSlot?: ReactNode;
  animated?: boolean;
  className?: string;
}

const SIZE_MAP = {
  xs: {
    wrapper: 'gap-2.5',
    logo: 'h-11 w-11 rounded-[18px]',
    title: 'text-lg',
    subtitle: 'text-xs',
    tagline: 'text-[10px]',
  },
  sm: {
    wrapper: 'gap-3',
    logo: 'h-12 w-12 rounded-2xl',
    title: 'text-base',
    subtitle: 'text-xs',
    tagline: 'text-xs',
  },
  md: {
    wrapper: 'gap-4',
    logo: 'h-16 w-16 rounded-[22px]',
    title: 'text-xl',
    subtitle: 'text-sm',
    tagline: 'text-xs',
  },
  lg: {
    wrapper: 'gap-4',
    logo: 'h-20 w-20 rounded-[26px]',
    title: 'text-2xl',
    subtitle: 'text-sm',
    tagline: 'text-sm',
  },
} as const;

export default function BrandLockup({
  title = '归位',
  subtitle = '家庭物品管理系统',
  tagline,
  size = 'md',
  logoVariant = 'mark',
  showTagline = false,
  showSubtitle = true,
  framelessLogo = false,
  rightSlot,
  animated = false,
  className = '',
}: BrandLockupProps) {
  const styles = SIZE_MAP[size];
  const LogoWrapper = animated ? motion.div : 'div';
  const logoSrc =
    logoVariant === 'full'
      ? '/branding/inplace-logo-full.png'
      : '/branding/inplace-logo-mark.png';

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className={`flex min-w-0 items-center ${styles.wrapper}`}>
        <LogoWrapper
          {...(animated
            ? {
                whileHover: { rotate: [0, -6, 6, 0], scale: 1.04 },
                transition: { duration: 0.45 },
              }
            : {})}
          className={`shrink-0 overflow-hidden ${framelessLogo || logoVariant === 'mark' ? '' : 'bg-white ring-1 ring-slate-200/70 shadow-[0_14px_28px_rgba(15,23,42,0.08)]'} ${styles.logo}`}
        >
          <img
            src={logoSrc}
            alt={title}
            className={`h-full w-full ${logoVariant === 'mark' ? 'object-cover object-center' : 'object-contain object-center'}`}
          />
        </LogoWrapper>

        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className={`truncate font-bold leading-none text-slate-900 ${styles.title}`}>{title}</h1>
            {showTagline && tagline && (
              <span className="hidden rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700 lg:inline-flex">
                {tagline}
              </span>
            )}
          </div>
          {showSubtitle ? (
            <p className={`mt-1 max-w-[40rem] text-slate-500 ${styles.subtitle}`}>{subtitle}</p>
          ) : null}
        </div>
      </div>

      {rightSlot ? <div className="ml-4 shrink-0">{rightSlot}</div> : null}
    </div>
  );
}
