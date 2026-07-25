import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { Item, ItemStatus } from '../../../legacy/database.types';
import LocationTreePanel from './LocationTreePanel';
import {
  OVERVIEW_STATUS_FILTERS,
  OVERVIEW_TYPE_FILTERS,
} from '../lib/overviewFilterOptions';
import type {
  OverviewStatusFilter,
  OverviewTypeFilter,
} from '../lib/overviewSearchParams';

interface OverviewFiltersProps {
  type: OverviewTypeFilter;
  status: OverviewStatusFilter;
  selectedTags: string[];
  selectedLocationId: string | null;
  availableTags: string[];
  tagCounts: Record<string, number>;
  allItems: Item[];
  onTypeChange: (value: OverviewTypeFilter) => void;
  onStatusChange: (value: ItemStatus | 'all') => void;
  onTagToggle: (tag: string) => void;
  onTagsClear: () => void;
  onLocationChange: (locationId: string | null) => void;
}

export default function OverviewFilters({
  type,
  status,
  selectedTags,
  selectedLocationId,
  availableTags,
  tagCounts,
  allItems,
  onTypeChange,
  onStatusChange,
  onTagToggle,
  onTagsClear,
  onLocationChange,
}: OverviewFiltersProps) {
  const [tagQuery, setTagQuery] = useState('');
  const filteredTags = useMemo(() => {
    const normalizedQuery = tagQuery.trim().toLocaleLowerCase('zh-CN');
    return availableTags.filter((tag) => tag.toLocaleLowerCase('zh-CN').includes(normalizedQuery));
  }, [availableTags, tagQuery]);
  const statusDisabled = type === 'location' || type === 'container';

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">类型</legend>
        <div className="flex flex-wrap gap-2">
          {OVERVIEW_TYPE_FILTERS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => onTypeChange(value)}
              aria-pressed={type === value}
              className={`flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition-colors ${
                type === value
                  ? 'bg-brandStrong text-white'
                  : 'bg-surfaceMuted text-slate-700 hover:bg-brandTint hover:text-brandStrong'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset disabled={statusDisabled}>
        <legend className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">状态</legend>
        <div className="grid grid-cols-2 gap-2">
          {OVERVIEW_STATUS_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => onStatusChange(value)}
              aria-pressed={status === value}
              className={`min-h-10 rounded-xl px-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                status === value
                  ? 'bg-brandStrong text-white'
                  : 'bg-surfaceMuted text-slate-700 hover:bg-brandTint hover:text-brandStrong'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {statusDisabled ? (
          <p className="mt-2 text-xs leading-5 text-slate-500">位置和收纳不使用库存状态筛选。</p>
        ) : null}
      </fieldset>

      <section aria-labelledby="overview-tags-heading">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="overview-tags-heading" className="text-xs font-bold uppercase tracking-wider text-slate-500">
            标签
          </h2>
          {selectedTags.length > 0 ? (
            <button type="button" onClick={onTagsClear} className="text-xs font-bold text-brandStrong">
              清空
            </button>
          ) : null}
        </div>
        {availableTags.length === 0 ? (
          <p className="text-sm text-slate-500">还没有可筛选的标签。</p>
        ) : (
          <>
            <div className="relative mb-2">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={tagQuery}
                onChange={(event) => setTagQuery(event.target.value)}
                aria-label="搜索标签"
                placeholder="搜索标签"
                className="w-full rounded-xl border border-border bg-surfaceMuted py-2.5 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-500"
              />
              {tagQuery ? (
                <button
                  type="button"
                  onClick={() => setTagQuery('')}
                  aria-label="清空标签搜索"
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-brandTint hover:text-brandStrong"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-2xl border border-borderSoft bg-surfaceMuted p-2">
              {filteredTags.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-slate-500">没有匹配的标签</p>
              ) : filteredTags.map((tag) => (
                <label
                  key={tag}
                  className="flex min-h-10 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm text-slate-700 hover:bg-brandTint"
                >
                  <input
                    type="checkbox"
                    checked={selectedTags.includes(tag)}
                    onChange={() => onTagToggle(tag)}
                    className="h-4 w-4 rounded border-border text-brandStrong focus:ring-brand"
                  />
                  <span className="min-w-0 flex-1 truncate">{tag}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500">
                    {tagCounts[tag] ?? 0}
                  </span>
                </label>
              ))}
            </div>
          </>
        )}
      </section>

      <section aria-labelledby="overview-location-heading">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="overview-location-heading" className="text-xs font-bold uppercase tracking-wider text-slate-500">
            位置
          </h2>
          {selectedLocationId ? (
            <button type="button" onClick={() => onLocationChange(null)} className="text-xs font-bold text-brandStrong">
              清空
            </button>
          ) : null}
        </div>
        <div className="rounded-2xl border border-borderSoft bg-surfaceMuted p-3">
          <LocationTreePanel
            items={allItems}
            selectedLocationId={selectedLocationId}
            onSelectLocation={onLocationChange}
            allLabel="全部位置"
            emptyLabel="还没有位置"
          />
        </div>
      </section>
    </div>
  );
}
