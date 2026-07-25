import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../app/providers/auth-context';
import AuthShell from '../components/AuthShell';

const LOGIN_EMAIL_ID = 'login-email';
const LOGIN_PASSWORD_ID = 'login-password';
const LOGIN_ERROR_ID = 'login-error';

export default function LoginPage() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [navigate, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '登录失败，请检查邮箱和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="登录账号"
      description="继续整理你的物品、位置和收纳记录。"
      footer={(
        <>
          还没有账号？{' '}
          <Link to="/register" className="font-bold text-brandStrong hover:text-teal-700">
            立即注册
          </Link>
        </>
      )}
    >
      {error ? (
        <motion.div
          id={LOGIN_ERROR_ID}
          role="alert"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
        >
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          <span>{error}，请检查后重试。</span>
        </motion.div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor={LOGIN_EMAIL_ID} className="mb-1.5 block text-sm font-bold text-slate-700">
                邮箱地址
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id={LOGIN_EMAIL_ID}
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? LOGIN_ERROR_ID : undefined}
                  className="w-full rounded-2xl border border-border bg-surfaceMuted py-3.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brandStrong focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>
            </div>

            <div>
              <label htmlFor={LOGIN_PASSWORD_ID} className="mb-1.5 block text-sm font-bold text-slate-700">
                密码
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id={LOGIN_PASSWORD_ID}
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入密码"
                  required
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? LOGIN_ERROR_ID : undefined}
                  className="w-full rounded-2xl border border-border bg-surfaceMuted py-3.5 pl-10 pr-12 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brandStrong focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  aria-pressed={showPassword}
                  className="absolute right-2.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-brandTint hover:text-brandStrong"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="mt-1 w-full rounded-2xl bg-brandStrong py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-teal-300"
              >
                {loading ? '登录中...' : '登录'}
              </button>
            </div>
          </form>
    </AuthShell>
  );
}
