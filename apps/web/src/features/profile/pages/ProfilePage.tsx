import { useEffect, useState } from 'react';
import { LogOut, Box, User, NotebookPen, Mail, Settings2, Shield, Sparkles, HardDriveDownload } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../app/providers/AuthContext';
import { apiRequest } from '../../../shared/api/client';
import ConfirmDialog from '../../../shared/ui/ConfirmDialog';
import { staggerContainer, staggerItem } from '../../../shared/lib/animations';
import { APP_PAGE_CONTENT, APP_PAGE_HEADER, APP_PAGE_HEADER_STACK } from '../../../shared/ui/pageHeader';
import { fetchItemStats } from '../../../legacy/items';
import type { ItemStats } from '@inplace/domain';
import { QuickLinkCard, SectionPanel } from '../components/ProfileUi';
import InventoryStatsGrid from '../../../shared/ui/InventoryStatsGrid';

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

  const handleNavigateOverview = (filter?: { type?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filter?.type) params.set('type', filter.type);
    if (filter?.status) params.set('status', filter.status);
    navigate(`/overview${params.toString() ? `?${params.toString()}` : ''}`);
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

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-slate-50 md:h-full md:min-h-0">
      <div className={APP_PAGE_HEADER}>
        <div className={APP_PAGE_HEADER_STACK}>
          <h1 className="text-xl font-bold text-slate-900">我的</h1>
        </div>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className={`flex w-full flex-1 flex-col overflow-y-auto ${APP_PAGE_CONTENT}`}
      >
        <div className="grid gap-4 xl:grid-cols-2">
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

            <motion.div variants={staggerItem}>
              <InventoryStatsGrid stats={stats} loading={loading} onNavigate={handleNavigateOverview} />
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
                <QuickLinkCard
                  to="/profile/data"
                  icon={<HardDriveDownload size={20} />}
                  title="数据管理"
                  description="集中处理 JSON 备份导出、CSV 导出和 JSON 导入恢复。"
                  tone="bg-sky-50 text-sky-500"
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

    </div>
  );
}
