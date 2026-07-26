import { useCallback } from 'react';
import { QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CodeScanner from '../components/CodeScanner';
import { PageContent, PageHeader, PageShell } from '../../../shared/ui/PageLayout';
import { readRecentInventoryScans } from '../lib/inventoryCode';
import { Link } from 'react-router-dom';

export default function CodeScanPage() {
  const navigate = useNavigate();
  const handleCode = useCallback((code: string) => navigate(`/s/${code}`), [navigate]);
  const recentScans = readRecentInventoryScans();

  return (
    <PageShell>
      <PageHeader
        width="narrow"
        eyebrow="扫标签归位"
        title="扫描 InPlace 标签"
        description="查看、绑定已有库存，或选择位置后连续归位"
      />
      <PageContent width="narrow">
        <section className="rounded-3xl border border-borderSoft bg-surface p-5 shadow-sm md:p-7">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brandTint text-brandStrong">
              <QrCode size={22} />
            </span>
            <div>
              <h2 className="font-bold text-slate-900">整理已有库存</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                扫物品标签进入详情；扫位置标签后可连续扫描多个物品并批量归位。
              </p>
            </div>
          </div>
          <CodeScanner onCode={handleCode} />
        </section>
        {recentScans.length > 0 ? (
          <section className="mt-5 rounded-3xl border border-borderSoft bg-surface p-5 shadow-sm">
            <h2 className="font-bold text-slate-900">最近扫描</h2>
            <div className="mt-3 divide-y divide-borderSoft">
              {recentScans.map((scan) => (
                <Link key={scan.code} to={`/s/${scan.code}`} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="font-semibold text-slate-800">{scan.name}</span>
                  <span className="text-xs text-slate-500">{new Date(scan.scannedAt).toLocaleString('zh-CN')}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </PageContent>
    </PageShell>
  );
}
