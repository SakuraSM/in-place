import { ArrowRight, Box, Package } from 'lucide-react';
import { useState } from 'react';
import type { ActivityLog, Item } from '../../../legacy/database.types';
import { getContainerTypeLabel } from '../lib/locationTag';
import ActivityFeed from '../../activity/components/ActivityFeed';
import { buildInventoryImageUrl } from '../lib/itemImage';
import { ContentTabs } from '../../../shared/ui/ContentTabs';

type RecentPanel = 'items' | 'activity';
function formatRecentTime(value: string): string { return new Date(value).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }

interface RecentItemsListProps {
  recentItems: Item[];
  recentItemPaths: Record<string, string>;
  onOpenItem: (item: Item) => void;
}

function RecentItemsList({ recentItems, recentItemPaths, onOpenItem }: RecentItemsListProps) {
  if (recentItems.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surfaceMuted px-4 py-10 text-center text-sm text-slate-600 xl:flex-1">
        还没有新增内容，点右下角按钮开始整理吧。
      </div>
    );
  }

  return (
    <div className="space-y-2 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
      {recentItems.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onOpenItem(item)}
          className="flex min-h-[78px] w-full items-center gap-3 border-b border-borderSoft px-0 py-3 text-left transition-colors hover:bg-brandTint focus-visible:outline focus-visible:outline-2 focus-visible:outline-brandStrong"
        >
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-2xl ${item.images[0] ? 'bg-slate-100' : item.type === 'item' ? 'bg-amber-50 text-amber-500' : 'bg-brandTint text-brandStrong'}`}>
            {item.images[0] ? (
              <img src={buildInventoryImageUrl(item.images[0], 'icon')} alt={item.name} className="h-full w-full object-cover" />
            ) : item.type === 'item' ? (
              <Package size={16} aria-hidden="true" />
            ) : (
              <Box size={16} aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
            <p className="mt-1 text-xs text-slate-600">
              {item.type === 'item' ? '物品' : getContainerTypeLabel(item)} · {formatRecentTime(item.created_at)}
            </p>
            <p className="mt-1 truncate text-[11px] text-slate-500">{recentItemPaths[item.id] || '顶层'}</p>
          </div>
          <ArrowRight size={14} className="shrink-0 text-slate-300" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

interface HomeRecentPanelsProps extends RecentItemsListProps {
  recentActivity: ActivityLog[];
  onOpenActivity: () => void;
  onOpenActivityItem: (entry: ActivityLog) => void;
}

export default function HomeRecentPanels({
  recentItems,
  recentItemPaths,
  recentActivity,
  onOpenActivity,
  onOpenItem,
  onOpenActivityItem,
}: HomeRecentPanelsProps) {
  const [activePanel, setActivePanel] = useState<RecentPanel>('items');
  const panelId = `home-recent-${activePanel}`;

  return (
    <section aria-labelledby="mobile-recent-heading" className="min-w-0 self-start overflow-hidden rounded-3xl border border-border bg-surface p-[18px] md:p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 id="mobile-recent-heading" className="text-base font-semibold text-slate-900">最近动态</h3>
        <button type="button" onClick={onOpenActivity} className="text-sm font-semibold text-brandStrong focus-visible:outline focus-visible:outline-2 focus-visible:outline-brandStrong">
          全部记录
        </button>
      </div>
      <ContentTabs
        label="最近动态类型"
        value={activePanel}
        onChange={setActivePanel}
        panelId={panelId}
        options={[
          { value: 'items', label: '最近添加' },
          { value: 'activity', label: '最近操作' },
        ]}
        className="mb-3 w-full"
      />
      <div id={panelId} role="tabpanel">
        {activePanel === 'items' ? (
          <RecentItemsList recentItems={recentItems} recentItemPaths={recentItemPaths} onOpenItem={onOpenItem} />
        ) : (
          <ActivityFeed logs={recentActivity} compact onOpenItem={onOpenActivityItem} emptyMessage="还没有操作记录。" />
        )}
      </div>
    </section>
  );
}
