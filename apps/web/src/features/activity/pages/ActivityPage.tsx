import { useEffect, useMemo, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ActivityLog } from '../../../legacy/database.types';
import { fetchActivityLogsPage } from '../../../legacy/activity';
import { useAuth } from '../../../app/providers/auth-context';
import EmptyState from '../../../shared/ui/EmptyState';
import { PageContent, PageHeader, PageShell } from '../../../shared/ui/PageLayout';
import PaginationControls from '../../inventory/components/PaginationControls';
import ActivityFeed from '../components/ActivityFeed';
import { resolveItemDetailPath } from '../../inventory/lib/detailPath';

export default function ActivityPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [paginationMeta, setPaginationMeta] = useState<{
    page: number;
    totalPages: number;
    total: number;
    hasNextPage: boolean;
  } | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    let active = true;
    setLoading(true);

    void fetchActivityLogsPage(user.id, { page, pageSize })
      .then((response) => {
        if (!active) {
          return;
        }

        setLogs(response.data);
        setPaginationMeta(response.meta);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [page, pageSize, user]);

  const summary = useMemo(() => {
    return logs.reduce<Record<ActivityLog['action'], number>>((acc, entry) => {
      acc[entry.action] += 1;
      return acc;
    }, {
      manual_create: 0,
      ai_scan_create: 0,
      update: 0,
      delete: 0,
      move: 0,
      quantity_adjust: 0,
      code_bind: 0,
      stocktake_start: 0,
      stocktake_complete: 0,
      loan_checkout: 0,
      loan_return: 0,
    });
  }, [logs]);

  return (
    <PageShell>
      <PageHeader width="standard" title="操作记录" />

      <PageContent width="standard" className="flex flex-col">
        <div className="mb-5 grid gap-3 md:gap-4 lg:grid-cols-4 xl:mb-6 xl:gap-5">
          {[
            { label: '手动录入', value: summary.manual_create, tone: 'bg-sky-50 text-sky-500' },
            { label: 'AI 录入', value: summary.ai_scan_create, tone: 'bg-violet-50 text-violet-500' },
            { label: '库存行为', value: summary.move + summary.quantity_adjust + summary.code_bind + summary.stocktake_start + summary.stocktake_complete + summary.loan_checkout + summary.loan_return, tone: 'bg-teal-50 text-teal-600' },
            { label: '删除', value: summary.delete, tone: 'bg-rose-50 text-rose-500' },
          ].map(({ label, value, tone }) => (
            <div key={label} className="rounded-3xl border border-borderSoft bg-surface p-4 shadow-sm md:p-5">
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl ${tone}`}>
                <Clock3 size={18} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="mt-1 text-xs text-slate-600">{label}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<Clock3 size={28} className="text-slate-300" />}
            title="还没有操作记录"
          />
        ) : (
          <>
            <div className="flex-1">
              <ActivityFeed
                logs={logs}
                onOpenItem={(entry) => {
                  if (!entry.item_id) {
                    return;
                  }

                  navigate(resolveItemDetailPath({ id: entry.item_id, type: entry.item_type }));
                }}
              />
            </div>
            {paginationMeta && (
              <div className="sticky bottom-0 pt-4">
                <PaginationControls
                  page={page}
                  pageSize={pageSize}
                  total={paginationMeta.total}
                  totalPages={paginationMeta.totalPages}
                  onPageChange={setPage}
                  onPageSizeChange={(value) => {
                    setPage(1);
                    setPageSize(value);
                  }}
                  className="bg-white/95 backdrop-blur shadow-lg"
                />
              </div>
            )}
          </>
        )}
      </PageContent>
    </PageShell>
  );
}
