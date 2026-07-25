import { ArrowLeft, CheckSquare, FolderTree, LayoutGrid, Plus, X } from 'lucide-react';
import type { Item } from '../../../legacy/database.types';
import BrandLockup from '../../../shared/ui/BrandLockup';
import {
  APP_PAGE_HEADER,
  APP_PAGE_HEADER_TOP_ZONE,
} from '../../../shared/ui/pageHeader';
import Breadcrumb from './Breadcrumb';
import type { HomeViewMode } from './HomeInventorySections';

interface HomePageHeaderProps {
  currentParentId: string | null;
  breadcrumbs: Item[];
  isRootLevel: boolean;
  isEmpty: boolean;
  isSelectionMode: boolean;
  selectedCount: number;
  totalCount: number;
  isAllSelected: boolean;
  viewMode: HomeViewMode;
  onNavigateParent: () => void;
  onNavigateBreadcrumb: (itemId: string | null) => void;
  onToggleSelectionMode: () => void;
  onToggleSelectAll: () => void;
  onViewModeChange: (viewMode: HomeViewMode) => void;
  onCreate: () => void;
}

const VIEW_MODE_OPTIONS: readonly {
  value: HomeViewMode;
  label: string;
  icon: typeof LayoutGrid;
}[] = [
  { value: 'type', label: '按类型', icon: LayoutGrid },
  { value: 'category', label: '按分类', icon: FolderTree },
];

export default function HomePageHeader({
  currentParentId,
  breadcrumbs,
  isRootLevel,
  isEmpty,
  isSelectionMode,
  selectedCount,
  totalCount,
  isAllSelected,
  viewMode,
  onNavigateParent,
  onNavigateBreadcrumb,
  onToggleSelectionMode,
  onToggleSelectAll,
  onViewModeChange,
  onCreate,
}: HomePageHeaderProps) {
  const hasHeaderDetail = breadcrumbs.length > 0 || (isSelectionMode && !isEmpty);

  return (
    <header className={APP_PAGE_HEADER}>
      <div className={`px-4 md:px-8 ${hasHeaderDetail ? 'pb-3 md:pb-4' : ''}`}>
        <div className={`${hasHeaderDetail ? 'mb-2' : ''} flex items-center gap-3 ${APP_PAGE_HEADER_TOP_ZONE}`}>
          {currentParentId ? (
            <button
              type="button"
              onClick={onNavigateParent}
              aria-label="返回上一级"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surfaceMuted text-slate-700 transition-colors hover:bg-brandTint hover:text-brandStrong"
            >
              <ArrowLeft size={17} />
            </button>
          ) : null}

          <div className="min-w-0 flex-1">
            {isRootLevel ? (
              <>
                <BrandLockup
                  size="xs"
                  titleAs="h1"
                  tagline="INPLACE"
                  logoVariant="mark"
                  showTagline={false}
                  showSubtitle={false}
                  framelessLogo
                  className="px-0 py-1 md:hidden"
                />
                <div className="hidden md:block">
                  <h1 className="text-xl font-bold text-slate-900">物品首页</h1>
                  <p className="mt-1 text-sm text-slate-600">快速查看、整理和新增家中物品。</p>
                </div>
              </>
            ) : (
              <h1 className="truncate text-lg font-bold text-slate-900">
                {breadcrumbs[breadcrumbs.length - 1]?.name}
              </h1>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {!isEmpty ? (
              <button
                type="button"
                onClick={onToggleSelectionMode}
                aria-pressed={isSelectionMode}
                className={`flex h-10 items-center gap-1.5 rounded-2xl px-3 text-sm font-bold transition-colors ${
                  isSelectionMode
                    ? 'bg-brandStrong text-white'
                    : 'bg-surfaceMuted text-slate-700 hover:bg-brandTint hover:text-brandStrong'
                }`}
              >
                {isSelectionMode ? <X size={16} /> : <CheckSquare size={16} />}
                {isSelectionMode ? '退出' : '批量'}
              </button>
            ) : null}

            {!isSelectionMode ? (
              <button
                type="button"
                onClick={onCreate}
                className="hidden h-10 items-center gap-2 rounded-2xl bg-brandStrong px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-700 md:flex"
              >
                <Plus size={17} />
                新增
              </button>
            ) : null}

            {!isEmpty ? (
              <div
                role="group"
                aria-label="首页分组方式"
                className="hidden shrink-0 gap-1 rounded-2xl bg-surfaceMuted p-1 sm:flex"
              >
                {VIEW_MODE_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onViewModeChange(value)}
                    aria-label={label}
                    aria-pressed={viewMode === value}
                    className={`relative flex h-8 items-center gap-1.5 rounded-xl px-2.5 text-xs font-bold transition-colors ${
                      viewMode === value
                        ? 'bg-white text-brandStrong shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Icon size={14} />
                    <span className="hidden lg:inline">{label}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {breadcrumbs.length > 0 ? (
          <Breadcrumb
            items={breadcrumbs.map((breadcrumb) => ({
              id: breadcrumb.id,
              name: breadcrumb.name,
            }))}
            onNavigate={onNavigateBreadcrumb}
          />
        ) : null}

        {isSelectionMode && !isEmpty ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-brand/25 bg-brandTint px-4 py-3">
            <div>
              <p className="text-sm font-bold text-slate-900">批量操作已开启</p>
              <p className="mt-0.5 text-xs text-slate-600">
                已选 {selectedCount} / {totalCount} 项
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleSelectAll}
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-surfaceMuted"
            >
              {isAllSelected ? '取消全选' : '全选'}
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
