import { MapPin, Tags, X } from 'lucide-react';
import type { Item } from '../../../legacy/database.types';
import type {
  OverviewSearchState,
  OverviewStatusFilter,
  OverviewTypeFilter,
} from '../lib/overviewSearchParams';
import {
  OVERVIEW_STATUS_FILTERS,
  OVERVIEW_TYPE_FILTERS,
} from '../lib/overviewFilterOptions';

interface OverviewActiveFiltersProps {
  filters: OverviewSearchState;
  selectedLocation: Item | null;
  onQueryClear: () => void;
  onTypeChange: (type: OverviewTypeFilter) => void;
  onStatusChange: (status: OverviewStatusFilter) => void;
  onLocationClear: () => void;
  onTagToggle: (tag: string) => void;
  onClearAll: () => void;
}

export default function OverviewActiveFilters({
  filters,
  selectedLocation,
  onQueryClear,
  onTypeChange,
  onStatusChange,
  onLocationClear,
  onTagToggle,
  onClearAll,
}: OverviewActiveFiltersProps) {
  const typeLabel = OVERVIEW_TYPE_FILTERS.find(({ value }) => value === filters.type)?.label;
  const statusLabel = OVERVIEW_STATUS_FILTERS.find(({ value }) => value === filters.status)?.label;

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2" aria-label="已启用筛选">
      {filters.q ? (
        <button type="button" onClick={onQueryClear} className="filter-chip">
          搜索「{filters.q}」<X size={13} />
        </button>
      ) : null}
      {filters.type !== 'all' ? (
        <button type="button" onClick={() => onTypeChange('all')} className="filter-chip">
          类型：{typeLabel}<X size={13} />
        </button>
      ) : null}
      {filters.status !== 'all' ? (
        <button type="button" onClick={() => onStatusChange('all')} className="filter-chip">
          状态：{statusLabel}<X size={13} />
        </button>
      ) : null}
      {selectedLocation ? (
        <button type="button" onClick={onLocationClear} className="filter-chip">
          <MapPin size={13} />{selectedLocation.name}<X size={13} />
        </button>
      ) : null}
      {filters.tags.map((tag) => (
        <button key={tag} type="button" onClick={() => onTagToggle(tag)} className="filter-chip">
          <Tags size={13} />{tag}<X size={13} />
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="min-h-9 px-2 text-sm font-bold text-brandStrong"
      >
        清除全部
      </button>
    </div>
  );
}
