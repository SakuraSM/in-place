import { Package } from 'lucide-react';
import { useState } from 'react';
import type {
  ActivityLog,
  Category,
  Item,
  ItemStats,
} from '../../../legacy/database.types';
import { PageContent } from '../../../shared/ui/PageLayout';
import { SkeletonList } from '../../../shared/ui/SkeletonCard';
import HomeDashboard from './HomeDashboard';
import HomeInventoryToolbar from './HomeInventoryToolbar';
import HomeInventorySections, { type HomeViewMode } from './HomeInventorySections';

const HOME_PAGE_SIZE = 48;

interface HomePageContentProps {
  showDashboard: boolean;
  breadcrumbs: Item[];
  stats: ItemStats | null;
  recentItems: Item[];
  recentItemPaths: Record<string, string>;
  recentActivity: ActivityLog[];
  statsLoading: boolean;
  loading: boolean;
  items: Item[];
  categories: Category[];
  childCounts: Record<string, number>;
  viewMode: HomeViewMode;
  selectionMode: boolean;
  selectedIds: Set<string>;
  isAllSelected: boolean;
  onNavigateBreadcrumb: (itemId: string | null) => void;
  onToggleSelectAll: () => void;
  onViewModeChange: (viewMode: HomeViewMode) => void;
  onOpenActivity: () => void;
  onOpenItem: (item: Item) => void;
  onOpenActivityItem: (entry: ActivityLog) => void;
  onNavigateOverview: (filter?: { type?: string; status?: string }) => void;
  onOpenContainer: (item: Item) => void;
  onOpenContext: (item: Item) => void;
  onToggleSelection: (itemId: string) => void;
}

export default function HomePageContent({
  showDashboard,
  breadcrumbs,
  stats,
  recentItems,
  recentItemPaths,
  recentActivity,
  statsLoading,
  loading,
  items,
  categories,
  childCounts,
  viewMode,
  selectionMode,
  selectedIds,
  isAllSelected,
  onNavigateBreadcrumb,
  onToggleSelectAll,
  onViewModeChange,
  onOpenActivity,
  onOpenItem,
  onOpenActivityItem,
  onNavigateOverview,
  onOpenContainer,
  onOpenContext,
  onToggleSelection,
}: HomePageContentProps) {
  const isEmpty = items.length === 0;
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / HOME_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleItems = items.slice((currentPage - 1) * HOME_PAGE_SIZE, currentPage * HOME_PAGE_SIZE);

  return (
    <PageContent width="wide" className="flex min-w-0 flex-col">
        <HomeInventoryToolbar
          breadcrumbs={breadcrumbs}
          isEmpty={isEmpty}
          isSelectionMode={selectionMode}
          selectedCount={selectedIds.size}
          totalCount={items.length}
          isAllSelected={isAllSelected}
          viewMode={viewMode}
          onNavigateBreadcrumb={onNavigateBreadcrumb}
          onToggleSelectAll={onToggleSelectAll}
          onViewModeChange={onViewModeChange}
        />

        {showDashboard ? (
          <HomeDashboard
            stats={stats}
            recentItems={recentItems}
            recentItemPaths={recentItemPaths}
            recentActivity={recentActivity}
            statsLoading={statsLoading}
            onOpenActivity={onOpenActivity}
            onOpenItem={onOpenItem}
            onOpenActivityItem={onOpenActivityItem}
            onNavigateOverview={onNavigateOverview}
          />
        ) : null}

        {loading ? (
          <SkeletonList />
        ) : isEmpty ? (
          <div
            className={`flex flex-col items-center justify-center text-center ${
              showDashboard
                ? 'rounded-[28px] border border-dashed border-border bg-surface py-14'
                : 'py-20'
            }`}
          >
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-surfaceMuted">
              <Package size={36} className="text-slate-300" />
            </div>
            <h3 className="mb-1 font-semibold text-slate-700">暂时空空如也</h3>
          </div>
        ) : (
          <div
            key={viewMode}
            id="home-inventory-panel"
            role="tabpanel"
            aria-label={viewMode === 'type' ? '按类型分组的库存' : '按分类分组的库存'}
            className="flex flex-col"
          >
            {pageCount > 1 ? <p className="mb-3 text-sm text-slate-500">当前页显示第 {(currentPage - 1) * HOME_PAGE_SIZE + 1}–{Math.min(currentPage * HOME_PAGE_SIZE, items.length)} 项，分组数量仅统计本页。</p> : null}
            <HomeInventorySections
              items={visibleItems}
              categories={categories}
              childCounts={childCounts}
              viewMode={viewMode}
              isSelectionMode={selectionMode}
              selectedIds={selectedIds}
              onOpenContainer={onOpenContainer}
              onOpenItem={onOpenItem}
              onOpenContext={onOpenContext}
              onToggleSelection={onToggleSelection}
            />
            {pageCount > 1 ? <nav aria-label="首页库存分页" className="my-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-borderSoft bg-surface p-4 text-sm">
              <span>第 {currentPage} / {pageCount} 页 · 共 {items.length} 项，每页最多 {HOME_PAGE_SIZE} 项</span>
              <div className="flex gap-2">
                <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="min-h-11 rounded-xl border border-border px-4 disabled:opacity-40">上一页</button>
                <button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} className="min-h-11 rounded-xl border border-border px-4 disabled:opacity-40">下一页</button>
              </div>
            </nav> : null}
          </div>
        )}
    </PageContent>
  );
}
