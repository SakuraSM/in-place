import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Bell,
  ChevronRight,
  ClipboardCheck,
  Copy,
  FolderOpen,
  History,
  MapPinned,
  Printer,
  QrCode,
  Tags,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../app/providers/auth-context';
import { fetchCategories } from '../../../legacy/categories';
import { fetchTags } from '../../../legacy/tags';
import { PageContent, PageHeader, PageShell } from '../../../shared/ui/PageLayout';

interface ManageLink {
  title: string;
  description: string;
  to: string;
  icon: LucideIcon;
  tone: string;
  metric?: number;
}

interface ManageSectionProps {
  title: string;
  description: string;
  links: ManageLink[];
}

const OPERATION_LINKS: ManageLink[] = [
  { title: '家庭盘点', description: '按位置核对库存差异', to: '/stocktakes', icon: ClipboardCheck, tone: 'bg-violet-50 text-violet-700' },
  { title: '提醒中心', description: '处理保修、借用和维护提醒', to: '/reminders', icon: Bell, tone: 'bg-amber-50 text-amber-800' },
  { title: '库存报告', description: '查看价值、补货和到期清单', to: '/reports', icon: BarChart3, tone: 'bg-sky-50 text-sky-700' },
  { title: '重复项', description: '识别需要合并的库存记录', to: '/duplicates', icon: Copy, tone: 'bg-rose-50 text-rose-700' },
  { title: '标签打印', description: '生成库存二维码标签', to: '/labels', icon: Printer, tone: 'bg-teal-50 text-teal-700' },
  { title: '扫标签归位', description: '扫描标签快速确认或移动库存', to: '/scan/codes', icon: QrCode, tone: 'bg-emerald-50 text-emerald-700' },
];

export default function ManagePage() {
  const { user } = useAuth();
  const categoriesQuery = useQuery({
    queryKey: ['manage', 'categories', user?.id],
    queryFn: () => fetchCategories(user!.id),
    enabled: Boolean(user?.id),
  });
  const tagsQuery = useQuery({
    queryKey: ['manage', 'tags', user?.id],
    queryFn: () => fetchTags(user!.id),
    enabled: Boolean(user?.id),
  });
  const managementLinks: ManageLink[] = [
    { title: '位置与地图', description: '管理空间层级和地理资产分布', to: '/locations?view=map', icon: MapPinned, tone: 'bg-brandTint text-brandStrong' },
    { title: '分类管理', description: '维护位置、收纳和物品分类', to: '/categories', icon: FolderOpen, tone: 'bg-violet-50 text-violet-700', metric: categoriesQuery.data?.length },
    { title: '标签管理', description: '维护搜索和筛选使用的标签', to: '/tags', icon: Tags, tone: 'bg-sky-50 text-sky-700', metric: tagsQuery.data?.length },
    { title: '操作记录', description: '查看录入、修改和移动记录', to: '/activity', icon: History, tone: 'bg-slate-100 text-slate-700' },
  ];

  return (
    <PageShell>
      <PageHeader
        title="管理中心"
        description="集中处理位置、分类、盘点和库存工具。"
      />
      <PageContent className="space-y-5">
        <ManageSection
          title="基础管理"
          description="维护库存结构和整理规则"
          links={managementLinks}
        />
        <ManageSection
          title="库存工具"
          description="完成盘点、提醒、报告和标签任务"
          links={OPERATION_LINKS}
        />
      </PageContent>
    </PageShell>
  );
}

function ManageSection({ title, description, links }: ManageSectionProps) {
  return (
    <section aria-labelledby={`manage-${title}`} className="rounded-3xl border border-borderSoft bg-surface p-4 shadow-sm md:p-5">
      <div className="mb-3">
        <h2 id={`manage-${title}`} className="text-base font-bold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {links.map(({ title: linkTitle, description: linkDescription, to, icon: Icon, tone, metric }) => (
          <Link
            key={to}
            to={to}
            className="group flex min-h-20 items-center gap-3 rounded-2xl border border-borderSoft bg-surfaceMuted p-3 transition hover:border-brand/30 hover:bg-brandTint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brandStrong"
          >
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
              <Icon size={20} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate text-sm font-bold text-slate-950">{linkTitle}</span>
                {metric !== undefined ? (
                  <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-bold tabular-nums text-slate-500">{metric}</span>
                ) : null}
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-600">{linkDescription}</span>
            </span>
            <ChevronRight size={17} className="shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}
