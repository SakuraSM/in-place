import {
  useRef,
  type ComponentType,
  type KeyboardEvent,
} from 'react';

type TabIcon = ComponentType<{
  size?: number | string;
  className?: string;
  'aria-hidden'?: boolean;
}>;

export interface ContentTabOption<Value extends string> {
  value: Value;
  label: string;
  shortLabel?: string;
  icon?: TabIcon;
  count?: number;
}

interface ContentTabsProps<Value extends string> {
  label: string;
  options: readonly ContentTabOption<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  panelId?: string;
  className?: string;
}

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(' ');
}

export function ContentTabs<Value extends string>({
  label,
  options,
  value,
  onChange,
  panelId,
  className,
}: ContentTabsProps<Value>) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % options.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + options.length) % options.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = options.length - 1;
    }

    if (nextIndex === null) return;

    event.preventDefault();
    const nextOption = options[nextIndex];
    tabRefs.current[nextIndex]?.focus();
    onChange(nextOption.value);
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className={joinClassNames(
        'flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-borderSoft bg-surfaceMuted p-1',
        className,
      )}
    >
      {options.map((option, index) => {
        const Icon = option.icon;
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={panelId}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={joinClassNames(
              'flex min-h-10 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold transition-colors sm:flex-none sm:gap-2 sm:px-3',
              isActive
                ? 'bg-surface text-brandStrong shadow-sm'
                : 'text-slate-600 hover:bg-surface/70 hover:text-slate-900',
            )}
          >
            {Icon ? <Icon size={15} aria-hidden /> : null}
            {option.shortLabel ? (
              <>
                <span className="truncate sm:hidden">{option.shortLabel}</span>
                <span className="hidden truncate sm:inline">{option.label}</span>
              </>
            ) : (
              <span className="truncate">{option.label}</span>
            )}
            {option.count !== undefined ? (
              <span
                className={joinClassNames(
                  'rounded-full px-2 py-0.5 text-xs tabular-nums',
                  isActive
                    ? 'bg-brandTint text-brandStrong'
                    : 'bg-surface text-slate-500',
                )}
              >
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
