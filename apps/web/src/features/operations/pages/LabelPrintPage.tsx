import { useEffect, useState } from 'react';
import { Printer, QrCode, Tags } from 'lucide-react';
import QRCode from 'qrcode';
import type { InventoryCode } from '@inplace/domain';
import { codesApi } from '../api';
import { buildInventoryCodeUrl } from '../lib/inventoryCode';
import { useToast } from '../../../shared/ui/toast';
import { PageContent, PageHeader, PageShell } from '../../../shared/ui/PageLayout';

interface PrintableCode {
  record: InventoryCode;
  imageUrl: string;
}

export default function LabelPrintPage() {
  const { notify } = useToast();
  const [count, setCount] = useState(30);
  const [layout, setLayout] = useState<'a4' | 'thermal'>('a4');
  const [codes, setCodes] = useState<PrintableCode[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.printLayout = layout;
    return () => {
      delete document.documentElement.dataset.printLayout;
    };
  }, [layout]);

  const createLabels = async () => {
    setLoading(true);
    try {
      const records = await codesApi.createBatch(count);
      const printable = await Promise.all(records.map(async (record) => ({
        record,
        imageUrl: await QRCode.toDataURL(buildInventoryCodeUrl(record.code), {
          width: 240,
          margin: 1,
          errorCorrectionLevel: 'M',
          color: { dark: '#0f172a', light: '#ffffff' },
        }),
      })));
      setCodes(printable);
      notify({ tone: 'success', title: `已生成 ${printable.length} 枚未绑定标签` });
    } catch (error) {
      notify({
        tone: 'error',
        title: '标签生成失败',
        description: error instanceof Error ? error.message : '请稍后重试',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell>
      <PageHeader width="standard" eyebrow="预印标签" title="二维码标签打印" titleSize="detail" className="print:hidden" />
      <PageContent width="standard" className="space-y-5 print:p-0">
        <section className="rounded-3xl border border-borderSoft bg-surface p-5 shadow-sm print:hidden">
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
            <label>
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">标签数量</span>
              <input
                type="number"
                min={1}
                max={100}
                value={count}
                onChange={(event) => setCount(Number(event.target.value))}
                className="h-11 w-full rounded-2xl border border-border bg-surfaceMuted px-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </label>
            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold text-slate-700">纸张模板</legend>
              <div className="flex rounded-2xl bg-surfaceMuted p-1">
                {(['a4', 'thermal'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={layout === value}
                    onClick={() => setLayout(value)}
                    className={`h-9 flex-1 rounded-xl px-3 text-sm font-semibold ${layout === value ? 'bg-surface text-brandStrong shadow-sm' : 'text-slate-600'}`}
                  >
                    {value === 'a4' ? 'A4 标签纸' : '50×30mm'}
                  </button>
                ))}
              </div>
            </fieldset>
            <button
              type="button"
              disabled={loading || count < 1 || count > 100}
              onClick={() => void createLabels()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-brandStrong px-5 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              <Tags size={18} />
              {loading ? '生成中…' : '生成'}
            </button>
            <button
              type="button"
              disabled={codes.length === 0}
              onClick={() => window.print()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-bold text-white disabled:opacity-50"
            >
              <Printer size={18} />
              打印
            </button>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            标签仅包含随机标识，不含物品名称、账号或数据库 ID；打印后可在整理现场扫码绑定。
          </p>
        </section>

        {codes.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-surfaceMuted text-center print:hidden">
            <QrCode size={36} className="text-brand" />
            <p className="mt-3 font-semibold text-slate-800">设置数量后生成一批标签</p>
            <p className="mt-1 text-sm text-slate-500">未绑定标签可以稍后分配给位置、收纳或物品。</p>
          </div>
        ) : (
          <div className={`label-print-grid ${layout === 'thermal' ? 'label-print-grid--thermal' : 'label-print-grid--a4'}`}>
            {codes.map(({ record, imageUrl }, index) => (
              <article key={record.id} className="label-print-item">
                <img src={imageUrl} alt="" className="label-print-qr" />
                <div className="min-w-0">
                  <p className="label-print-brand">归位</p>
                  <p className="label-print-help">扫码绑定 · 找到 · 归位</p>
                  <p className="label-print-code">#{String(index + 1).padStart(2, '0')} · {record.code.slice(0, 7)}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </PageContent>
    </PageShell>
  );
}
