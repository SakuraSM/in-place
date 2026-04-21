import { ArrowRight, Box, Clock3, FolderTree, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ActivityLog, Item, ItemStats } from '../../../legacy/database.types';
import { getContainerTypeLabel } from '../lib/locationTag';
import ActivityFeed from '../../activity/components/ActivityFeed';

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
  const statCards = [
    { label: '总计', value: statsLoading ? '-' : stats?.total ?? 0, icon: FolderTree, tone: 'bg-sky-50 text-sky-500', filter: {} },
    { label: '物品', value: statsLoading ? '-' : stats?.items ?? 0, icon: Package, tone: 'bg-amber-50 text-amber-500', filter: { type: 'item' } },
    { label: '收纳', value: statsLoading ? '-' : stats?.containers ?? 0, icon: Box, tone: 'bg-teal-50 text-teal-500', filter: { type: 'container' } },
    { label: '借出中', value: statsLoading ? '-' : stats?.borrowed ?? 0, icon: Clock3, tone: 'bg-rose-50 text-rose-500', filter: { status: 'borrowed' } },
  ];

  return (
    <div className="mb-5 min-w-0 space-y-3 overflow-x-hidden md:mb-6">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="min-w-0 overflow-hidden rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm md:p-5"
      >
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {statCards.map(({ label, value, icon: Icon, tone, filter }) => (
            <button
              key={label}
              type="button"
              onClick={() => onNavigateOverview?.(filter)}
              className={`rounded-3xl border border-slate-100 bg-slate-50/70 p-4 text-left transition-colors ${onNavigateOverview ? 'cursor-pointer hover:bg-slate-100/80' : 'cursor-default'}`}
            >
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl ${tone}`}>
                <Icon size={18} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="mt-1 text-xs text-slate-400">{label}</p>
            </button>
          ))}
        </div>
      </motion.section>

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.05 }}
          className="min-w-0 overflow-hidden rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-slate-900">最近添加</h3>
              <p className="mt-1 text-xs text-slate-400">仅保留最近 3 条，快速回到刚录入的内容。</p>
            </div>
          </div>

          {recentItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
              还没有新增内容，点右下角按钮开始整理吧。
            </div>
          ) : (
            <div className="space-y-2">
              {recentItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpenItem(item)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${
                    item.type === 'item' ? 'bg-amber-50 text-amber-500' : 'bg-sky-50 text-sky-500'
                  }`}>
                    {item.type === 'item' ? <Package size={16} /> : <Box size={16} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {item.type === 'item' ? '物品' : getContainerTypeLabel(item)} · {formatRecentTime(item.created_at)}
                    </p>
                    <p className="mt-1 truncate text-[11px] text-slate-400">
                      {recentItemPaths[item.id] || '顶层'}
                    </p>
                  </div>
                  <ArrowRight size={14} className="shrink-0 text-slate-300" />
                </button>
              ))}
            </div>
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.1 }}
          className="min-w-0 overflow-hidden rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-slate-900">最近操作</h3>
              <p className="mt-1 text-xs text-slate-400">仅保留最近 3 条操作，页面主体仍聚焦收纳和物品。</p>
            </div>
            <button
              type="button"
              onClick={onOpenActivity}
              className="shrink-0 text-sm font-medium text-sky-500"
            >
              查看全部
            </button>
          </div>
          <ActivityFeed
            logs={recentActivity}
            compact
            onOpenItem={onOpenActivityItem}
            emptyMessage="还没有操作记录。创建或修改内容后，这里会自动出现。"
          />
        </motion.section>
      </div>
    </div>
  );
}
