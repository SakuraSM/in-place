import { useRef, useState } from 'react';
import { ArrowLeft, Download, HardDriveDownload, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { apiRequest, getStoredAuthToken, resolveApiUrl } from '../../../shared/api/client';
import ConfirmDialog from '../../../shared/ui/ConfirmDialog';
import { staggerContainer, staggerItem } from '../../../shared/lib/animations';
import { APP_PAGE_CONTENT, APP_PAGE_HEADER, APP_PAGE_HEADER_STACK } from '../../../shared/ui/pageHeader';
import { SectionPanel } from '../components/ProfileUi';

export default function DataManagementPage() {
  const [exportingFormat, setExportingFormat] = useState<'json' | 'csv' | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importPayload, setImportPayload] = useState<Record<string, unknown> | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const handleExport = async (format: 'json' | 'csv') => {
    setExportingFormat(format);
    setExportError(null);
    setExportMessage(null);

    try {
      const token = await getStoredAuthToken();
      const response = await fetch(resolveApiUrl(`/v1/items/export?format=${format}`), {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!response.ok) {
        let message = '导出失败';
        try {
          const payload = await response.json() as { message?: string };
          message = payload.message ?? message;
        } catch {
          const text = await response.text();
          message = text || message;
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      const fileName = contentDisposition?.match(/filename="([^"]+)"/)?.[1] ?? `inplace-inventory.${format}`;
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
      setExportMessage(format === 'json' ? 'JSON 备份已开始下载' : 'CSV 导出已开始下载');
    } catch (error) {
      setExportError(error instanceof Error ? error.message : '导出失败');
    } finally {
      setExportingFormat(null);
    }
  };

  const handleImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setImportError(null);
    setImportMessage(null);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Record<string, unknown>;
      setImportPayload(parsed);
      setImportFileName(file.name);
    } catch {
      setImportPayload(null);
      setImportFileName('');
      setImportError('文件无法解析，请选择归位导出的 JSON 备份');
    } finally {
      event.target.value = '';
    }
  };

  const handleImportConfirm = async () => {
    if (!importPayload) {
      return;
    }

    setImporting(true);
    setImportError(null);
    setImportMessage(null);

    try {
      await apiRequest<{ data: { categories: number; tags: number; items: number } }>('/v1/items/import', {
        method: 'POST',
        body: JSON.stringify(importPayload),
      });
      setImportPayload(null);
      setImportFileName('');
      setImportMessage('JSON 备份已导入');
    } catch (error) {
      setImportError(error instanceof Error ? error.message : '导入失败');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className={APP_PAGE_HEADER}>
        <div className={`${APP_PAGE_HEADER_STACK} gap-2`}>
          <Link to="/profile" className="inline-flex items-center gap-1 text-sm text-slate-400 transition-colors hover:text-slate-600">
            <ArrowLeft size={15} />
            返回我的
          </Link>
          <h1 className="mt-2 text-xl font-bold text-slate-900">数据管理</h1>
        </div>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className={`mx-auto w-full max-w-5xl ${APP_PAGE_CONTENT}`}
      >
        <motion.div variants={staggerItem} className="mb-4 overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
          <div className="bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_42%),linear-gradient(135deg,#ffffff_0%,#f7fbff_100%)] px-5 py-5 md:px-6 md:py-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-sky-100 text-sky-600">
                <HardDriveDownload size={26} />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-slate-900">备份与恢复</p>
                <p className="mt-2 text-sm text-slate-500">集中管理当前账号的数据导出与 JSON 备份导入。</p>
                <p className="mt-1 text-xs text-slate-400">导入会覆盖当前账号下的物品、分类、标签和备份附带的图片引用。</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <motion.div variants={staggerItem}>
            <SectionPanel
              icon={<Download size={16} />}
              title="数据导出"
              description="按用途选择完整备份或表格导出。"
            >
              <div className="grid gap-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-800">JSON 完整备份</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">包含结构化数据和应用内上传图片，适合迁移和完整恢复。</p>
                  <button
                    onClick={() => void handleExport('json')}
                    disabled={exportingFormat !== null}
                    className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-sky-500 px-4 text-sm font-medium text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-sky-300"
                  >
                    <Download size={15} />
                    {exportingFormat === 'json' ? '导出中...' : '导出 JSON'}
                  </button>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-800">CSV 表格导出</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">适合在 Excel、Numbers 或 BI 工具里筛选、统计和二次分析。</p>
                  <button
                    onClick={() => void handleExport('csv')}
                    disabled={exportingFormat !== null}
                    className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <Download size={15} />
                    {exportingFormat === 'csv' ? '导出中...' : '导出 CSV'}
                  </button>
                </div>
              </div>
              {exportMessage ? <p className="text-sm text-emerald-500">{exportMessage}</p> : null}
              {exportError ? <p className="text-sm text-rose-500">{exportError}</p> : null}
            </SectionPanel>
          </motion.div>

          <motion.div variants={staggerItem}>
            <SectionPanel
              icon={<Upload size={16} />}
              title="JSON 备份导入"
              description="恢复备份前请确认当前账号数据可以被覆盖。"
            >
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800">选择备份文件</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">只支持归位导出的 JSON 备份文件。</p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <input
                    ref={importInputRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={(event) => void handleImportFileChange(event)}
                    className="hidden"
                  />
                  <button
                    onClick={() => importInputRef.current?.click()}
                    disabled={importing}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    <Upload size={15} />
                    选择 JSON 文件
                  </button>
                  {importFileName ? <span className="text-sm text-slate-500">{importFileName}</span> : null}
                </div>
              </div>
              {importMessage ? <p className="text-sm text-emerald-500">{importMessage}</p> : null}
              {importError ? <p className="text-sm text-rose-500">{importError}</p> : null}
            </SectionPanel>
          </motion.div>
        </div>
      </motion.div>

      {importPayload ? (
        <ConfirmDialog
          title="导入 JSON 备份"
          message={`确定导入「${importFileName}」吗？这会覆盖当前账号下的物品、分类、标签和图片引用。`}
          confirmLabel={importing ? '导入中...' : '确认导入'}
          danger
          onConfirm={handleImportConfirm}
          onCancel={() => {
            if (importing) {
              return;
            }
            setImportPayload(null);
            setImportFileName('');
          }}
        />
      ) : null}
    </div>
  );
}
