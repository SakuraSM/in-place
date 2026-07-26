import { useEffect, useState } from 'react';
import { ClipboardCheck, MapPin, Play } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { Item, StocktakeSession } from '@inplace/domain';
import { useAuth } from '../../../app/providers/auth-context';
import { searchItems } from '../../../legacy/items';
import { useToast } from '../../../shared/ui/toast';
import { PageContent, PageHeader, PageShell } from '../../../shared/ui/PageLayout';
import { stocktakesApi } from '../api';

export default function StocktakesPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [locations, setLocations] = useState<Item[]>([]);
  const [sessions, setSessions] = useState<StocktakeSession[]>([]);
  const [locationId, setLocationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!user) return;
    void Promise.all([
      searchItems('', user.id, { type: 'container', locationOnly: true }),
      stocktakesApi.listRecent(),
    ]).then(([nextLocations, nextSessions]) => {
      setLocations(nextLocations);
      setSessions(nextSessions);
    }).catch((error) => {
      notify({ tone: 'error', title: '盘点数据加载失败', description: error instanceof Error ? error.message : undefined });
    }).finally(() => setLoading(false));
  }, [notify, user]);

  const startStocktake = async () => {
    if (!locationId) return;
    setStarting(true);
    try {
      const session = await stocktakesApi.create(locationId);
      navigate(`/stocktakes/${session.id}`);
    } catch (error) {
      notify({ tone: 'error', title: '无法发起盘点', description: error instanceof Error ? error.message : undefined });
      setStarting(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        width="standard"
        eyebrow="家庭盘点"
        title="确认每件物品都在该在的位置"
      />
      <PageContent width="standard" className="space-y-5">
        <section className="rounded-3xl border border-borderSoft bg-surface p-5 shadow-sm md:p-6">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <label>
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">选择盘点位置</span>
              <select
                value={locationId}
                onChange={(event) => setLocationId(event.target.value)}
                className="h-11 w-full rounded-2xl border border-border bg-surfaceMuted px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              >
                <option value="">选择位置</option>
                {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
              </select>
            </label>
            <button
              type="button"
              disabled={!locationId || starting}
              onClick={() => void startStocktake()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-brandStrong px-5 text-sm font-bold text-white disabled:opacity-50"
            >
              <Play size={17} />
              {starting ? '创建清单中…' : '开始盘点'}
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-500">开始时会冻结当前位置的期望清单；缺失项只会标记，不会自动删除。</p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-bold text-slate-900">最近盘点</h2>
          {loading ? <p className="text-sm text-slate-500">正在加载…</p> : null}
          {!loading && sessions.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-surfaceMuted p-8 text-center">
              <ClipboardCheck size={32} className="mx-auto text-brand" />
              <p className="mt-3 font-semibold text-slate-800">还没有盘点记录</p>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {sessions.map((session) => (
                <Link
                  key={session.id}
                  to={`/stocktakes/${session.id}`}
                  className="flex items-center gap-3 rounded-3xl border border-borderSoft bg-surface p-4 shadow-sm transition hover:border-brand/40"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700"><MapPin size={20} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-slate-900">{session.location.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{new Date(session.created_at).toLocaleString('zh-CN')}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${session.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
                    {session.status === 'completed' ? '已完成' : '进行中'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </PageContent>
    </PageShell>
  );
}
