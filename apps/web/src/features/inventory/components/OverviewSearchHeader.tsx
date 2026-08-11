import { ListFilter, Search, X } from 'lucide-react';
import { PageHeader } from '../../../shared/ui/PageLayout';

export function OverviewSearchField({
  value,
  onChange,
  autoFocus = false,
}: {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <div className="relative">
      <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="搜索名称、描述或标签"
        aria-label="搜索库存"
        autoFocus={autoFocus}
        className="w-full rounded-2xl border border-border bg-surfaceMuted py-3 pl-10 pr-11 text-sm text-slate-900 placeholder:text-slate-500"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="清空搜索"
          className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 hover:bg-brandTint hover:text-brandStrong"
        >
          <X size={15} />
        </button>
      ) : null}
    </div>
  );
}

export function OverviewPageHeader() {
  return (
    <PageHeader
      width="wide"
      title="库存检索"
      description="跨位置查找并筛选全部库存。"
    />
  );
}

export function OverviewMobileControls({
  query,
  activeFilterCount,
  onQueryChange,
  onOpenFilters,
}: {
  query: string;
  activeFilterCount: number;
  onQueryChange: (value: string) => void;
  onOpenFilters: () => void;
}) {
  return (
    <section
      aria-label="搜索与筛选"
      className="flex min-w-0 gap-2 xl:hidden"
    >
      <div className="min-w-0 flex-1">
        <OverviewSearchField value={query} onChange={onQueryChange} />
      </div>
      <button
        type="button"
        onClick={onOpenFilters}
        className="relative flex min-h-11 shrink-0 items-center gap-2 rounded-2xl border border-border bg-surface px-3 text-sm font-bold text-slate-700"
      >
        <ListFilter size={17} />
        筛选
        {activeFilterCount > 0 ? (
          <span className="rounded-full bg-brandStrong px-2 py-0.5 text-xs text-white">
            {activeFilterCount}
          </span>
        ) : null}
      </button>
    </section>
  );
}
