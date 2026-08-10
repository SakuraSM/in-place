import { FilterX, Search } from 'lucide-react';
import type { ItemStatus } from '@inplace/domain';
import {
  GEO_ASSET_ALL_FILTER,
  type GeoAssetMapFilters,
} from '../lib/geoAssetMapFilters';

interface GeoAssetMapToolbarProps {
  filters: GeoAssetMapFilters;
  categories: string[];
  onFiltersChange: (filters: GeoAssetMapFilters) => void;
  onReset: () => void;
}

const STATUS_OPTIONS: Array<{ value: typeof GEO_ASSET_ALL_FILTER | ItemStatus; label: string }> = [
  { value: GEO_ASSET_ALL_FILTER, label: '全部状态' },
  { value: 'in_stock', label: '在库' },
  { value: 'borrowed', label: '借出' },
  { value: 'worn_out', label: '损耗' },
];

export default function GeoAssetMapToolbar({
  filters,
  categories,
  onFiltersChange,
  onReset,
}: GeoAssetMapToolbarProps) {
  return (
    <section
      className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-[minmax(16rem,1fr)_10rem_10rem_9rem_9rem_auto] xl:items-end"
      aria-label="地图筛选"
    >
      <label className="min-w-0">
        <span className="mb-1.5 block text-xs font-bold text-slate-600">搜索位置或资产</span>
        <span className="relative block">
          <Search
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={filters.query}
            onChange={(event) => onFiltersChange({ ...filters, query: event.target.value })}
            placeholder="名称、分类、标签或地址"
            className="h-11 w-full rounded-2xl border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-950 outline-none transition focus:border-brandStrong focus:ring-2 focus:ring-brand/20"
          />
        </span>
      </label>

      <label>
        <span className="mb-1.5 block text-xs font-bold text-slate-600">资产状态</span>
        <select
          value={filters.status}
          onChange={(event) => onFiltersChange({
            ...filters,
            status: event.target.value as GeoAssetMapFilters['status'],
          })}
          className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-brandStrong focus:ring-2 focus:ring-brand/20"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>

      <label>
        <span className="mb-1.5 block text-xs font-bold text-slate-600">资产分类</span>
        <select
          value={filters.category}
          onChange={(event) => onFiltersChange({ ...filters, category: event.target.value })}
          className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-brandStrong focus:ring-2 focus:ring-brand/20"
        >
          <option value={GEO_ASSET_ALL_FILTER}>全部分类</option>
          {categories.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </label>

      <label>
        <span className="mb-1.5 block text-xs font-bold text-slate-600">创建日期从</span>
        <input
          type="date"
          value={filters.createdAfter}
          max={filters.createdBefore || undefined}
          onChange={(event) => onFiltersChange({ ...filters, createdAfter: event.target.value })}
          className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-brandStrong focus:ring-2 focus:ring-brand/20"
        />
      </label>

      <label>
        <span className="mb-1.5 block text-xs font-bold text-slate-600">创建日期至</span>
        <input
          type="date"
          value={filters.createdBefore}
          min={filters.createdAfter || undefined}
          onChange={(event) => onFiltersChange({ ...filters, createdBefore: event.target.value })}
          className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-brandStrong focus:ring-2 focus:ring-brand/20"
        />
      </label>

      <button
        type="button"
        onClick={onReset}
        className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brandStrong"
      >
        <FilterX size={16} aria-hidden="true" />
        重置
      </button>
    </section>
  );
}
