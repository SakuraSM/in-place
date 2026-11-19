import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

type PageBackProps = {
  label: string;
  iconOnly?: boolean;
} & (
  | { to: string; onClick?: never }
  | { to?: never; onClick: () => void }
);

export default function PageBack({ label, iconOnly = false, ...destination }: PageBackProps) {
  const className = `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-slate-600 transition-colors hover:bg-brandTint hover:text-brandStrong focus-visible:outline focus-visible:outline-2 focus-visible:outline-brandStrong ${iconOnly ? 'w-11 bg-surfaceMuted' : 'px-2'}`;
  const content = <><ArrowLeft size={17} aria-hidden="true" /><span className={iconOnly ? 'sr-only' : undefined}>{label}</span></>;

  return destination.to !== undefined ? (
    <Link to={destination.to} className={className}>{content}</Link>
  ) : (
    <button type="button" onClick={destination.onClick} className={className}>{content}</button>
  );
}
