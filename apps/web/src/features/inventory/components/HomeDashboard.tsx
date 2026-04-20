import { ArrowRight, Bot, Box, Clock3, FolderTree, Package, Plus, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ActivityLog, Item, ItemStats } from '../../../legacy/database.types';
import { getContainerTypeLabel } from '../lib/locationTag';
import ActivityFeed from '../../activity/components/ActivityFeed';

interface Props {
  stats: ItemStats | null;
  recentItems: Item[];
  recentActivity: ActivityLog[];
  statsLoading?: boolean;
  onCreate: () => void;
  onOpenScan: () => void;
  onOpenActivity: () => void;
  onOpenItem: (item: Item) => void;
  onOpenActivityItem: (entry: ActivityLog) => void;
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
  recentActivity,
  statsLoading = false,
  onCreate,
  onOpenScan,
  onOpenActivity,
  onOpenItem,
  onOpenActivityItem,
}: Props) {
  const statCards = [
    { label: '总计', value: statsLoading ? '-' : stats?.total ?? 0, icon: FolderTree, tone: 'bg-sky-50 text-sky-500' },
    { label: '物品', value: statsLoading ? '-' : stats?.items ?? 0, icon: Package, tone: 'bg-amber-50 text-amber-500' },
    { label: '收纳', value: statsLoading ? '-' : stats?.containers ?? 0, icon: Box, tone: 'bg-teal-50 text-teal-500' },
    { label: '借出中', value: statsLoading ? '-' : stats?.borrowed ?? 0, icon: Clock3, tone: 'bg-rose-50 text-rose-500' },
  ];

  return (
    <div className="mb-6 space-y-4 md:mb-8">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="overflow-hidden rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm md:p-6"
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.7fr)]">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-600">
              <Sparkles size={14} />
              更高效地整理你的收纳空间
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-[30px]">
              首页现在会展示最近添加和最近操作，方便你快速回到刚整理过的内容。
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              继续新增物品、收纳或位置，或直接查看 AI 扫描与操作记录，减少来回切换页面的成本。
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onCreate}
                className="inline-flex items-center gap-2 rounded-2xl bg-sky-500 px-4 py-3 text-sm font-medium text-white shadow-sm shadow-sky-200 transition-colors hover:bg-sky-600"
              >
                <Plus size={16} />
                立即新增
              </button>
              <button
                type="button"
                onClick={onOpenScan}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                <Bot size={16} />
                打开 AI 扫描
              </button>
              <button
                type="button"
                onClick={onOpenActivity}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                <Clock3 size={16} />
                查看操作记录
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {statCards.map(({ label, value, icon: Icon, tone }) => (
              <div key={label} className="rounded-3xl border border-slate-100 bg-slate-50/70 p-4">
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl ${tone}`}>
                  <Icon size={18} />
                </div>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
                <p className="mt-1 text-xs text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      <div className="grid gap-4 xl:grid-cols-2">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.05 }}
          className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">最近添加</h3>
              <p className="mt-1 text-xs text-slate-400">快速回到刚录入的物品、收纳和位置。</p>
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
                  className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                    item.type === 'item' ? 'bg-amber-50 text-amber-500' : 'bg-sky-50 text-sky-500'
                  }`}>
                    {item.type === 'item' ? <Package size={18} /> : <Box size={18} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {item.type === 'item' ? '物品' : getContainerTypeLabel(item)} · {formatRecentTime(item.created_at)}
                    </p>
                  </div>
                  <ArrowRight size={16} className="shrink-0 text-slate-300" />
                </button>
              ))}
            </div>
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.1 }}
          className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">最近操作</h3>
              <p className="mt-1 text-xs text-slate-400">包含 AI 扫描录入、手动录入、修改和删除行为。</p>
            </div>
            <button
              type="button"
              onClick={onOpenActivity}
              className="text-sm font-medium text-sky-500"
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
