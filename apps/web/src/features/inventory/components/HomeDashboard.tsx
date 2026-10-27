import { Bell, ClipboardCheck, QrCode } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ItemStats } from '../../../legacy/database.types';
import InventoryStatsGrid from '../../../shared/ui/InventoryStatsGrid';

interface HomeDashboardProps {
  stats: ItemStats | null;
  statsLoading?: boolean;
  onNavigateOverview?: (filter?: { type?: string; status?: string }) => void;
}
const QUICK_ACTIONS = [
  { to: '/stocktakes', icon: ClipboardCheck, title: '待盘点位置', description: '发起或继续家庭盘点' },
  { to: '/scan/codes', icon: QrCode, title: '扫标签归位', description: '扫描标签整理已有库存' },
  { to: '/reminders', icon: Bell, title: '提醒中心', description: '查看保修、借还和维护' },
];

export default function HomeDashboard({ stats, statsLoading = false, onNavigateOverview }: HomeDashboardProps) {
  return <div className="mb-6 space-y-5">
    <section aria-label="库存统计" className="home-stat-strip min-w-0 overflow-hidden rounded-3xl border border-border bg-surface px-1 py-4 md:py-6">
      <InventoryStatsGrid stats={stats} loading={statsLoading} onNavigate={onNavigateOverview} showCaptions className="grid grid-cols-4" cardClassName="flex min-h-[64px] flex-col-reverse justify-center border-r border-border bg-transparent px-3 last:border-r-0 md:px-6" />
    </section>
    <section className="grid grid-cols-3 gap-3" aria-label="家庭快捷操作">
      {QUICK_ACTIONS.map(({ to, icon: Icon, title, description }) => <Link key={to} to={to} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border border-border bg-surface p-3 text-center transition-colors hover:bg-brandTint md:min-h-[60px] md:flex-row md:justify-start md:gap-3 md:text-left">
        <Icon size={21} className="shrink-0 text-brandStrong" />
        <span className="min-w-0"><span className="block text-[11px] font-medium text-ink md:text-sm">{title}</span><span className="mt-1 hidden text-xs text-muted md:block">{description}</span></span>
      </Link>)}
    </section>
  </div>;
}
