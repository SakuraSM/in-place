import { ArrowRight, Bell, Box, ClipboardCheck, Package, QrCode } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import type { ActivityLog, Item, ItemStats } from '../../../legacy/database.types';
import { getContainerTypeLabel } from '../lib/locationTag';
import ActivityFeed from '../../activity/components/ActivityFeed';
import { buildInventoryImageUrl } from '../lib/itemImage';
import InventoryStatsGrid from '../../../shared/ui/InventoryStatsGrid';
import { ContentTabs } from '../../../shared/ui/ContentTabs';

interface Props {
  stats: ItemStats | null;
  recentItems: Item[];
  recentItemPaths: Record<string, string>;
  recentActivity: ActivityLog[];
  statsLoading?: boolean;
  onOpenActivity: () => void;
  onOpenItem: (item: Item) => void;
  onOpenActivityItem: (entry: ActivityLog) => void;
  onNavigateOverview?: (filter?: { type?: string; status?: string }) => void;
}

type RecentPanel = 'items' | 'activity';

function formatRecentTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HomeDashboard({
  stats,
  recentItems,
  recentItemPaths,
  recentActivity,
  statsLoading = false,
  onOpenActivity,
  onOpenItem,
  onOpenActivityItem,
  onNavigateOverview,
}: Props) {
  return (
    <div className="mb-5 min-w-0 shrink-0 space-y-3 overflow-x-hidden md:mb-6">
      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)] xl:items-stretch">
        <section
          aria-label="库存统计"
          className="min-w-0 overflow-hidden rounded-[28px] border border-borderSoft bg-surface p-4 shadow-sm md:p-5 xl:flex xl:flex-col"
        >
          <InventoryStatsGrid
            stats={stats}
            loading={statsLoading}
            onNavigate={onNavigateOverview}
            className="grid grid-cols-2 gap-3 xl:flex-1 xl:content-stretch xl:grid-cols-2"
            cardClassName="bg-surfaceMuted p-3 xl:flex xl:min-h-[132px] xl:flex-col xl:justify-between"
          />
        </section>

        <MobileRecentCard
          recentItems={recentItems}
          recentItemPaths={recentItemPaths}
          recentActivity={recentActivity}
          onOpenActivity={onOpenActivity}
          onOpenItem={onOpenItem}
          onOpenActivityItem={onOpenActivityItem}
        />

        <section
          aria-labelledby="recent-items-heading"
          className="hidden min-w-0 overflow-hidden rounded-[28px] border border-borderSoft bg-surface p-4 shadow-sm md:block xl:flex xl:flex-col"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 id="recent-items-heading" className="text-base font-semibold text-slate-900">最近添加</h3>
              <p className="mt-1 text-xs text-slate-600">仅保留最近 3 条，快速回到刚录入的内容。</p>
            </div>
          </div>

          <RecentItemsList
            recentItems={recentItems}
            recentItemPaths={recentItemPaths}
            onOpenItem={onOpenItem}
          />
        </section>

        <section
          aria-labelledby="recent-activity-heading"
          className="hidden min-w-0 overflow-hidden rounded-[28px] border border-borderSoft bg-surface p-4 shadow-sm md:block xl:flex xl:flex-col"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 id="recent-activity-heading" className="text-base font-semibold text-slate-900">最近操作</h3>
              <p className="mt-1 text-xs text-slate-600">仅保留最近 3 条操作，页面主体仍聚焦位置、收纳和物品。</p>
            </div>
            <button
              type="button"
              onClick={onOpenActivity}
              className="shrink-0 text-sm font-semibold text-brandStrong hover:text-teal-700"
            >
              查看全部
            </button>
          </div>
          <div className="xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
            <ActivityFeed
              logs={recentActivity}
              compact
              onOpenItem={onOpenActivityItem}
              emptyMessage="还没有操作记录。创建或修改内容后，这里会自动出现。"
            />
          </div>
        </section>
      </div>
      <section className="grid gap-3 rounded-[28px] border border-borderSoft bg-surface p-4 shadow-sm sm:grid-cols-3">
        {[
          { to: '/stocktakes', icon: ClipboardCheck, title: '待盘点位置', description: '发起或继续家庭盘点' },
          { to: '/scan/codes', icon: QrCode, title: '扫标签归位', description: '扫描 InPlace 标签整理已有库存' },
          { to: '/reminders', icon: Bell, title: '提醒中心', description: '查看保修、借还和维护' },
        ].map(({ to, icon: Icon, title, description }) => (
          <Link key={to} to={to} className="flex items-center gap-3 rounded-2xl bg-surfaceMuted p-3 transition hover:bg-brandTint">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface text-brandStrong shadow-sm"><Icon size={18} /></span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-slate-900">{title}</span>
              <span className="mt-0.5 block text-xs text-slate-500">{description}</span>
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}

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
          className="flex w-full items-center gap-3 rounded-2xl border border-borderSoft px-3 py-2.5 text-left transition-colors hover:bg-brandTint focus-visible:outline focus-visible:outline-2 focus-visible:outline-brandStrong"
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

interface MobileRecentCardProps extends RecentItemsListProps {
  recentActivity: ActivityLog[];
  onOpenActivity: () => void;
  onOpenActivityItem: (entry: ActivityLog) => void;
}

function MobileRecentCard({
  recentItems,
  recentItemPaths,
  recentActivity,
  onOpenActivity,
  onOpenItem,
  onOpenActivityItem,
}: MobileRecentCardProps) {
  const [activePanel, setActivePanel] = useState<RecentPanel>('items');
  const panelId = `home-recent-${activePanel}`;

  return (
    <section aria-labelledby="mobile-recent-heading" className="min-w-0 overflow-hidden rounded-[28px] border border-borderSoft bg-surface p-4 shadow-sm md:hidden">
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
