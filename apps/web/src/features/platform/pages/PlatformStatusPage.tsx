import { useEffect, useState, type ReactNode } from 'react';
import { Database, Globe, Server, RefreshCcw, AlertTriangle } from 'lucide-react';

type HealthResponse = {
  status: string;
  database: string | null;
  now: string | null;
};

type LoadState =
  | { kind: 'loading' }
  | { kind: 'success'; data: HealthResponse }
  | { kind: 'error'; message: string };

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

export default function PlatformStatusPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  async function loadHealth() {
    setState({ kind: 'loading' });

    try {
      const response = await fetch(`${apiBaseUrl}/v1/health`);
      if (!response.ok) {
        throw new Error(`API health check failed with status ${response.status}`);
      }

      const data = (await response.json()) as HealthResponse;
      setState({ kind: 'success', data });
    } catch (error) {
      setState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  useEffect(() => {
    void loadHealth();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-5xl px-6 py-16 md:px-10">
        <div className="mb-10 flex items-center gap-3">
          <div className="rounded-2xl bg-emerald-500/15 p-3 text-emerald-300">
            <Globe size={28} />
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-emerald-300/80">
              归位平台
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-white md:text-4xl">
              Docker Compose deployment is online
            </h1>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[1.3fr_0.9fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <p className="text-sm leading-7 text-slate-300">
              The current web container is running in platform mode. This mode is used when the
              legacy Supabase-based frontend flow is not configured. It keeps the deployment
              verifiable while the application is being migrated to the API + PostgreSQL stack.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <StatusCard
                icon={<Globe size={18} />}
                title="Frontend"
                value="Healthy"
                tone="emerald"
                description="Served by Nginx in the web container."
              />
              <StatusCard
                icon={<Server size={18} />}
                title="API"
                value={state.kind === 'error' ? 'Unavailable' : state.kind === 'loading' ? 'Checking' : 'Healthy'}
                tone={state.kind === 'error' ? 'rose' : state.kind === 'loading' ? 'amber' : 'emerald'}
                description="Checked through the compose network via /api."
              />
              <StatusCard
                icon={<Database size={18} />}
                title="Database"
                value={state.kind === 'success' && state.data.database ? state.data.database : state.kind === 'loading' ? 'Checking' : 'Unknown'}
                tone={state.kind === 'success' ? 'emerald' : state.kind === 'loading' ? 'amber' : 'slate'}
                description="Backed by PostgreSQL and validated by the API health route."
              />
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900/60 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-medium text-white">API health check</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Request target: <code className="rounded bg-white/5 px-1.5 py-0.5 text-slate-200">{apiBaseUrl}/v1/health</code>
                  </p>
                </div>
                <button
                  onClick={() => void loadHealth()}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10"
                >
                  <RefreshCcw size={16} />
                  Retry
                </button>
              </div>

              <div className="mt-4">
                {state.kind === 'loading' && (
                  <p className="text-sm text-amber-200">Checking API and database connectivity...</p>
                )}

                {state.kind === 'success' && (
                  <pre className="overflow-x-auto rounded-2xl bg-black/30 p-4 text-sm text-emerald-200">
{JSON.stringify(state.data, null, 2)}
                  </pre>
                )}

                {state.kind === 'error' && (
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-100">
                    <div className="flex items-center gap-2 font-medium">
                      <AlertTriangle size={16} />
                      Health check failed
                    </div>
                    <p className="mt-2 text-rose-100/90">{state.message}</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <aside className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h2 className="text-xl font-medium text-white">Next migration steps</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
              <li>Move legacy frontend data access from Supabase SDK calls to API clients.</li>
              <li>Introduce inventory and category endpoints in the Fastify application.</li>
              <li>Wire frontend authentication and CRUD flows to the new API boundary.</li>
              <li>Keep PostgreSQL schema changes versioned under <code className="rounded bg-white/5 px-1.5 py-0.5">packages/db</code>.</li>
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}

function StatusCard({
  icon,
  title,
  value,
  description,
  tone,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  description: string;
  tone: 'emerald' | 'amber' | 'rose' | 'slate';
}) {
  const toneClass = {
    emerald: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
    amber: 'border-amber-400/20 bg-amber-400/10 text-amber-100',
    rose: 'border-rose-400/20 bg-rose-400/10 text-rose-100',
    slate: 'border-slate-400/20 bg-slate-400/10 text-slate-100',
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        <span>{title}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="mt-2 text-sm opacity-80">{description}</p>
    </div>
  );
}
