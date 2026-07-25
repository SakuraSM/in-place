import { Package } from 'lucide-react';
import type {
  ActivityLog,
  Category,
  Item,
  ItemStats,
} from '../../../legacy/database.types';
import { APP_PAGE_CONTENT } from '../../../shared/ui/pageHeader';
import { SkeletonList } from '../../../shared/ui/SkeletonCard';
import HomeDashboard from './HomeDashboard';
import HomeInventorySections, { type HomeViewMode } from './HomeInventorySections';

interface HomePageContentProps {
  showDashboard: boolean;
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
  onOpenActivity,
  onOpenItem,
  onOpenActivityItem,
  onNavigateOverview,
  onOpenContainer,
  onOpenContext,
  onToggleSelection,
}: HomePageContentProps) {
  const isEmpty = items.length === 0;

  return (
    <div data-scroll-root className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
      <div className={`flex min-h-full min-w-0 flex-1 flex-col md:min-h-full ${APP_PAGE_CONTENT}`}>
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
            className="flex min-h-full flex-1 flex-col"
          >
            <HomeInventorySections
              items={items}
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
          </div>
        )}
      </div>
    </div>
  );
}
