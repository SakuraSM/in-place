import { FolderTree, LayoutGrid } from 'lucide-react';
import type { Item } from '../../../legacy/database.types';
import { ContentTabs } from '../../../shared/ui/ContentTabs';
import Breadcrumb from './Breadcrumb';
import type { HomeViewMode } from './HomeInventorySections';

interface HomeInventoryToolbarProps {
  breadcrumbs: Item[];
  isEmpty: boolean;
  isSelectionMode: boolean;
  selectedCount: number;
  totalCount: number;
  isAllSelected: boolean;
  viewMode: HomeViewMode;
  onNavigateBreadcrumb: (itemId: string | null) => void;
  onToggleSelectAll: () => void;
  onViewModeChange: (viewMode: HomeViewMode) => void;
}

const VIEW_MODE_OPTIONS = [
  { value: 'type', label: '按类型', icon: LayoutGrid },
  { value: 'category', label: '按分类', icon: FolderTree },
] as const;

export default function HomeInventoryToolbar({
  breadcrumbs,
  isEmpty,
  isSelectionMode,
  selectedCount,
  totalCount,
  isAllSelected,
  viewMode,
  onNavigateBreadcrumb,
  onToggleSelectAll,
  onViewModeChange,
}: HomeInventoryToolbarProps) {
  if (isEmpty && breadcrumbs.length === 0) return null;

  return (
    <div className="mb-5 space-y-3 md:mb-6">
      {breadcrumbs.length > 0 ? (
        <Breadcrumb
          items={breadcrumbs.map((breadcrumb) => ({
            id: breadcrumb.id,
            name: breadcrumb.name,
          }))}
          onNavigate={onNavigateBreadcrumb}
        />
      ) : null}

      {!isEmpty ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ContentTabs
            label="首页分组方式"
            options={VIEW_MODE_OPTIONS}
            value={viewMode}
            onChange={onViewModeChange}
            panelId="home-inventory-panel"
          />
          <p className="text-sm text-slate-500">
            共 <span className="font-semibold text-slate-800">{totalCount}</span> 项
          </p>
        </div>
      ) : null}

      {isSelectionMode && !isEmpty ? (
        <section
          aria-label="批量选择状态"
          className="flex items-center justify-between gap-3 rounded-2xl border border-brand/25 bg-brandTint px-4 py-3"
        >
          <div>
            <p className="text-sm font-bold text-slate-900">批量操作已开启</p>
            <p className="mt-0.5 text-xs text-slate-600">
              已选 {selectedCount} / {totalCount} 项
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleSelectAll}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-surfaceMuted"
          >
            {isAllSelected ? '取消全选' : '全选'}
          </button>
        </section>
      ) : null}
    </div>
  );
}
