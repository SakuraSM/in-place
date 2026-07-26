import { useState } from 'react';
import { ArrowLeft, LockKeyhole, LogOut, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../app/providers/auth-context';
import { apiRequest } from '../../../shared/api/client';
import ConfirmDialog from '../../../shared/ui/ConfirmDialog';
import { staggerContainer, staggerItem } from '../../../shared/lib/animations';
import { PageContent, PageHeader, PageShell } from '../../../shared/ui/PageLayout';
import { SectionPanel } from '../components/ProfileUi';

export default function SecurityPage() {
  const currentPasswordId = 'current-password';
  const newPasswordId = 'new-password';
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [showLogout, setShowLogout] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const passwordValid = currentPassword.trim().length > 0 && newPassword.trim().length >= 8;

  const handlePasswordSave = async () => {
    setPasswordSaving(true);
    setPasswordError(null);
    setPasswordMessage(null);

    try {
      await apiRequest<void>('/v1/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setPasswordMessage('密码已更新');
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : '密码更新失败');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <PageShell>
      <PageHeader
        width="narrow"
        title="账号安全"
        backLink={<Link to="/profile" className="inline-flex items-center gap-1 text-sm text-slate-600 transition-colors hover:text-slate-900">
            <ArrowLeft size={15} />
            返回我的
          </Link>}
      />
      <PageContent width="narrow">
        <motion.div
          variants={staggerContainer}
          animate="animate"
        >
        <motion.div variants={staggerItem} className="mb-5 overflow-hidden rounded-3xl border border-borderSoft bg-surface shadow-sm md:mb-6">
          <div className="bg-[radial-gradient(circle_at_top_left,_rgba(248,113,113,0.12),_transparent_42%),linear-gradient(135deg,#ffffff_0%,#fff7f7_100%)] px-5 py-5 md:px-6 md:py-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-rose-100 text-rose-500">
                <Shield size={26} />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-slate-900">密码与会话</p>
                <p className="mt-2 text-sm text-slate-500">修改密码和处理当前登录会话。</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <motion.div variants={staggerItem}>
            <SectionPanel icon={<LockKeyhole size={16} />} title="修改密码">
              <div>
                <label htmlFor={currentPasswordId} className="mb-1.5 block text-xs font-medium text-slate-500">当前密码</label>
                <input
                  id={currentPasswordId}
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => {
                    setPasswordMessage(null);
                    setPasswordError(null);
                    setCurrentPassword(event.target.value);
                  }}
                  placeholder="输入当前密码"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label htmlFor={newPasswordId} className="mb-1.5 block text-xs font-medium text-slate-500">新密码</label>
                <input
                  id={newPasswordId}
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => {
                    setPasswordMessage(null);
                    setPasswordError(null);
                    setNewPassword(event.target.value);
                  }}
                  placeholder="至少 8 位"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => void handlePasswordSave()}
                  disabled={passwordSaving || !passwordValid}
                  className="inline-flex h-10 items-center rounded-xl bg-brandStrong px-4 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {passwordSaving ? '保存中...' : '修改密码'}
                </button>
              </div>
              {passwordMessage ? <p role="status" className="text-sm text-emerald-600">{passwordMessage}</p> : null}
              {passwordError ? <p role="alert" className="text-sm text-rose-600">{passwordError}</p> : null}
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
                  className="inline-flex h-11 items-center gap-3 rounded-2xl bg-rose-700 px-4 text-sm font-medium text-white transition-colors hover:bg-rose-800"
                >
                  <LogOut size={18} />
                  退出登录
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
        </motion.div>
      </PageContent>

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
    </PageShell>
  );
}
