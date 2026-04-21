import type { ElementType } from 'react';
import { Bot, ChevronRight, PencilLine, Trash2 } from 'lucide-react';
import type { ActivityAction, ActivityLog } from '../../../legacy/database.types';

const ACTION_LABELS: Record<ActivityAction, { label: string; tone: string; icon: ElementType }> = {
  manual_create: {
    label: '手动录入',
    tone: 'bg-sky-50 text-sky-600',
    icon: PencilLine,
  },
  ai_scan_create: {
    label: 'AI 扫描录入',
    tone: 'bg-violet-50 text-violet-600',
    icon: Bot,
  },
  update: {
    label: '修改信息',
    tone: 'bg-amber-50 text-amber-600',
    icon: PencilLine,
  },
  delete: {
    label: '删除记录',
    tone: 'bg-rose-50 text-rose-600',
    icon: Trash2,
  },
};

const CHANGED_FIELD_LABELS: Record<string, string> = {
  parentId: '上级位置',
  type: '类型',
  name: '名称',
  description: '描述',
  category: '类别',
  price: '价格',
  quantity: '数量',
  purchaseDate: '购买日期',
  warrantyDate: '保修日期',
  status: '状态',
  images: '图片',
  tags: '标签',
  metadata: '扩展信息',
};

function formatTimeLabel(value: string) {
  const target = new Date(value).getTime();
  const diffMs = Date.now() - target;
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const formatter = new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' });

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(-diffMinutes, 'minute');
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(-diffHours, 'hour');
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) {
    return formatter.format(-diffDays, 'day');
  }

  return new Date(value).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getChangedFieldSummary(entry: ActivityLog) {
  const changedFields = Array.isArray(entry.metadata?.changed_fields)
    ? entry.metadata.changed_fields.filter((value): value is string => typeof value === 'string')
    : [];

  if (changedFields.length === 0) {
    return null;
  }

  return changedFields.map((field) => CHANGED_FIELD_LABELS[field] ?? field).join('、');
}

interface Props {
  logs: ActivityLog[];
  compact?: boolean;
  onOpenItem?: (entry: ActivityLog) => void;
  emptyMessage?: string;
}

export default function ActivityFeed({ logs, compact = false, onOpenItem, emptyMessage = '还没有操作记录' }: Props) {
  if (logs.length === 0) {
    return (
      <div className={`rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center text-sm text-slate-400 ${compact ? 'px-4 py-8' : 'px-5 py-12'}`}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-2 overflow-x-hidden">
      {logs.map((entry) => {
        const actionConfig = ACTION_LABELS[entry.action];
        const Icon = actionConfig.icon;
        const changedSummary = getChangedFieldSummary(entry);
        const itemTypeLabel = entry.item_type === 'item' ? '物品' : '收纳/位置';
        const clickable = Boolean(entry.item_id) && entry.action !== 'delete' && onOpenItem;

        const content = (
          <>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${actionConfig.tone}`}>
              <Icon size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold text-slate-900">{entry.item_name}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${actionConfig.tone}`}>
                  {actionConfig.label}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {itemTypeLabel} · {formatTimeLabel(entry.created_at)}
              </p>
              {changedSummary && (
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                  更新字段：{changedSummary}
                </p>
              )}
            </div>
            {clickable && <ChevronRight size={16} className="shrink-0 text-slate-300" />}
          </>
        );

        if (!clickable) {
          return (
            <div
              key={entry.id}
              className={`flex min-w-0 items-center gap-3 rounded-2xl border border-slate-100 bg-white ${compact ? 'px-3 py-3' : 'px-4 py-4'} shadow-sm`}
            >
              {content}
            </div>
          );
        }

        return (
          <button
            key={entry.id}
            type="button"
            onClick={() => onOpenItem?.(entry)}
            className={`flex min-w-0 w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white text-left transition-colors hover:bg-slate-50 ${compact ? 'px-3 py-3' : 'px-4 py-4'} shadow-sm`}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
