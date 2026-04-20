import { useEffect, useRef, useState } from 'react';
import { LogOut, Package, Box, User, ChevronRight, ShieldCheck, NotebookPen, Download, Mail, Settings2, Shield, Sparkles, Upload, MapPinned } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../app/providers/AuthContext';
import { apiRequest, getStoredAuthToken, resolveApiUrl } from '../../../shared/api/client';
import ConfirmDialog from '../../../shared/ui/ConfirmDialog';
import { staggerContainer, staggerItem } from '../../../shared/lib/animations';
import { fetchItemStats } from '../../../legacy/items';
import type { ItemStats } from '@inplace/domain';
import { QuickLinkCard, SectionPanel } from '../components/ProfileUi';

export default function ProfilePage() {
  const { user, signOut, setCurrentUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ItemStats>({ total: 0, containers: 0, items: 0, borrowed: 0 });
  const [showLogout, setShowLogout] = useState(false);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [exportingFormat, setExportingFormat] = useState<'json' | 'csv' | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importPayload, setImportPayload] = useState<Record<string, unknown> | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDisplayName(user?.displayName ?? '');
  }, [user?.displayName]);

  useEffect(() => {
    if (!user) return;
    void refreshStats();
  }, [user]);

  const refreshStats = async () => {
    if (!user) {
      return;
    }

    try {
      const data = await fetchItemStats(user.id);
      setStats(data);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const fallbackDisplayName = user?.email?.split('@')[0] ?? '用户';
  const resolvedDisplayName = user?.displayName?.trim() || fallbackDisplayName;
  const profileChanged = displayName.trim() !== (user?.displayName ?? '').trim();

  const handleProfileSave = async () => {
    setProfileSaving(true);
    setProfileError(null);
    setProfileMessage(null);

    try {
      const response = await apiRequest<{ user: typeof user }>('/v1/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ displayName: displayName.trim() }),
      });
      setCurrentUser(response.user);
      setProfileMessage('昵称已保存');
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : '昵称保存失败');
    } finally {
      setProfileSaving(false);
    }
  };

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
      setLoading(true);
      await refreshStats();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : '导入失败');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-100">
        <div className="px-4 pb-3 pt-4 md:px-8 md:pt-6">
          <h1 className="text-xl font-bold text-slate-900">我的</h1>
        </div>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="mx-auto w-full max-w-[1560px] px-4 py-5 md:px-8 md:py-6"
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(380px,0.82fr)_minmax(760px,1.18fr)] 2xl:grid-cols-[minmax(420px,0.8fr)_minmax(820px,1.2fr)]">
          <div className="space-y-4 xl:sticky xl:top-28 xl:self-start">
            <motion.div
              variants={staggerItem}
              className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm"
            >
              <div className="bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.14),_transparent_44%),linear-gradient(135deg,#ffffff_0%,#f8fbff_100%)] px-5 py-5 md:px-6 md:py-6">
                <div className="flex items-start gap-4">
                  <motion.div
                    whileHover={{ scale: 1.08, rotate: 6 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-sky-100"
                  >
                    <User size={28} className="text-sky-500" />
                  </motion.div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-xl font-bold text-slate-900">{resolvedDisplayName}</p>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-600">
                        账号正常
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                      <Mail size={14} />
                      <span className="truncate">{user?.email}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">个人资料</span>
                  <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-600">数据备份</span>
                  <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-600">AI 配置</span>
                </div>
              </div>
            </motion.div>

            <motion.div variants={staggerItem} className="grid grid-cols-2 gap-3">
              {[
                { label: '总物品', value: loading ? '-' : stats.items, icon: Package, color: 'bg-sky-50 text-sky-500' },
                { label: '收纳数', value: loading ? '-' : stats.containers, icon: Box, color: 'bg-teal-50 text-teal-500' },
                { label: '借出中', value: loading ? '-' : stats.borrowed, icon: ChevronRight, color: 'bg-amber-50 text-amber-500' },
                { label: '总计', value: loading ? '-' : stats.total, icon: ShieldCheck, color: 'bg-emerald-50 text-emerald-500' },
              ].map(({ label, value, icon: Icon, color }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 12, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 340, damping: 24, delay: 0.1 + i * 0.05 }}
                  whileHover={{ y: -2, boxShadow: '0 6px 18px rgba(0,0,0,0.07)' }}
                  className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm"
                >
                  <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mb-2`}>
                    <Icon size={18} />
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                </motion.div>
              ))}
            </motion.div>

            <motion.div variants={staggerItem} className="space-y-3">
              <div className="px-1">
                <p className="text-sm font-semibold text-slate-700">快捷入口</p>
              </div>
              <div className="grid gap-3">
                <QuickLinkCard
                  to="/tags"
                  icon={<NotebookPen size={20} />}
                  title="标签管理"
                  description="维护统一标签库，减少重复命名，方便搜索和批量整理。"
                  tone="bg-amber-50 text-amber-500"
                />
                <QuickLinkCard
                  to="/locations"
                  icon={<MapPinned size={20} />}
                  title="位置树"
                  description="查看所有已标记位置的层级，并快速进入对应位置内容。"
                  tone="bg-sky-50 text-sky-500"
                />
                <QuickLinkCard
                  to="/categories"
                  icon={<Box size={20} />}
                  title="分类管理"
                  description="统一收纳和物品分类结构，让首页和总览都更清晰。"
                  tone="bg-sky-50 text-sky-500"
                />
                <QuickLinkCard
                  to="/profile/ai"
                  icon={<Sparkles size={20} />}
                  title="AI 配置"
                  description="管理识别模型、服务地址和账号专属密钥。"
                  tone="bg-amber-50 text-amber-500"
                />
                <QuickLinkCard
                  to="/profile/security"
                  icon={<Shield size={20} />}
                  title="账号安全"
                  description="修改密码并管理当前账号会话。"
                  tone="bg-rose-50 text-rose-500"
                />
              </div>
            </motion.div>
          </div>

          <div className="space-y-4">
            <motion.div variants={staggerItem}>
              <SectionPanel
                icon={<Settings2 size={16} />}
                title="资料设置"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-end">
                  <div className="min-w-0 flex-1">
                    <label className="mb-1.5 block text-xs font-medium text-slate-500">昵称</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(event) => {
                        setProfileMessage(null);
                        setProfileError(null);
                        setDisplayName(event.target.value);
                      }}
                      placeholder="输入昵称"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <button
                    onClick={() => void handleProfileSave()}
                    disabled={profileSaving || !profileChanged}
                    className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-sky-500 px-4 text-sm font-medium text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-sky-300"
                  >
                    {profileSaving ? '保存中...' : '保存昵称'}
                  </button>
                </div>
                {profileMessage ? <p className="text-sm text-emerald-500">{profileMessage}</p> : null}
                {profileError ? <p className="text-sm text-rose-500">{profileError}</p> : null}
              </SectionPanel>
            </motion.div>

            <motion.div variants={staggerItem}>
              <SectionPanel
                icon={<Download size={16} />}
                title="数据导出"
              >
                <div className="grid gap-3 lg:grid-cols-2">
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
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-800">JSON 备份导入</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">导入会覆盖当前账号下的物品、分类、标签和备份内附带的图片。</p>
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
                {exportMessage ? <p className="text-sm text-emerald-500">{exportMessage}</p> : null}
                {exportError ? <p className="text-sm text-rose-500">{exportError}</p> : null}
                {importMessage ? <p className="text-sm text-emerald-500">{importMessage}</p> : null}
                {importError ? <p className="text-sm text-rose-500">{importError}</p> : null}
              </SectionPanel>
            </motion.div>
            <motion.div variants={staggerItem}>
              <div className="overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-sm">
                <div className="border-b border-rose-50 px-5 py-4 md:px-6">
                  <p className="text-sm font-semibold text-rose-600">退出登录</p>
                </div>
                <div className="px-5 py-4 md:px-6 md:py-5">
                  <motion.button
                    onClick={() => setShowLogout(true)}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className="inline-flex h-11 items-center gap-3 rounded-2xl bg-rose-500 px-4 text-sm font-medium text-white transition-colors hover:bg-rose-600"
                  >
                    <LogOut size={18} />
                    退出登录
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <motion.p variants={staggerItem} className="text-center text-xs text-slate-300 py-2">归位 v0.1.0</motion.p>
      </motion.div>

      {showLogout && (
        <ConfirmDialog
          title="退出登录"
          message="确定要退出当前账号吗？"
          confirmLabel="退出"
          danger
          onConfirm={handleLogout}
          onCancel={() => setShowLogout(false)}
        />
      )}

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
