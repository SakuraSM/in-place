import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useAuth } from '../../../app/providers/auth-context';
import AuthShell from '../components/AuthShell';

const REGISTER_EMAIL_ID = 'register-email';
const REGISTER_PASSWORD_ID = 'register-password';
const REGISTER_CONFIRM_PASSWORD_ID = 'register-confirm-password';
const REGISTER_PASSWORD_HELP_ID = 'register-password-help';
const REGISTER_ERROR_ID = 'register-error';
const MINIMUM_PASSWORD_LENGTH = 8;

export default function RegisterPage() {
  const { user, signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [navigate, user]);

  const validatePassword = (): string | null => {
    if (password.length < MINIMUM_PASSWORD_LENGTH) {
      return `密码至少需要 ${MINIMUM_PASSWORD_LENGTH} 位`;
    }
    if (password !== confirmPassword) {
      return '两次输入的密码不一致';
    }

    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationMessage = validatePassword();
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);
    try {
      await signUp(email, password);
      setIsSuccess(true);
      window.setTimeout(() => navigate('/', { replace: true }), 900);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : '注册失败，请稍后再试');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <main className="app-page-gutter flex min-h-dvh items-center justify-center bg-canvas py-6">
        <motion.section
          role="status"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm rounded-[28px] border border-emerald-200 bg-surface p-9 text-center shadow-card"
        >
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 size={32} />
          </span>
          <h1 className="text-xl font-bold text-slate-900">注册成功</h1>
          <p className="mt-2 text-sm text-slate-600">正在进入你的归位空间…</p>
        </motion.section>
      </main>
    );
  }

  const fieldErrorDescription = errorMessage ? REGISTER_ERROR_ID : undefined;

  return (
    <AuthShell
      title="创建账号"
      description="从第一个位置开始，逐步建立属于你的家庭物品地图。"
      footer={(
        <>
          已有账号？{' '}
          <Link to="/login" className="font-bold text-brandStrong hover:text-teal-700">
            立即登录
          </Link>
        </>
      )}
    >
      {errorMessage ? (
        <motion.div
          id={REGISTER_ERROR_ID}
          role="alert"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
        >
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          <span>{errorMessage}，请检查后重试。</span>
        </motion.div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor={REGISTER_EMAIL_ID} className="mb-1.5 block text-sm font-bold text-slate-700">
            邮箱地址
          </label>
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id={REGISTER_EMAIL_ID}
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="your@email.com"
              required
              aria-invalid={Boolean(errorMessage)}
              aria-describedby={fieldErrorDescription}
              className="w-full rounded-2xl border border-border bg-surfaceMuted py-3.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brandStrong focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
        </div>

        <div>
          <label htmlFor={REGISTER_PASSWORD_ID} className="mb-1.5 block text-sm font-bold text-slate-700">
            密码
          </label>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id={REGISTER_PASSWORD_ID}
              name="password"
              type={isPasswordVisible ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="至少 8 位"
              minLength={MINIMUM_PASSWORD_LENGTH}
              required
              aria-invalid={Boolean(errorMessage)}
              aria-describedby={`${REGISTER_PASSWORD_HELP_ID}${fieldErrorDescription ? ` ${fieldErrorDescription}` : ''}`}
              className="w-full rounded-2xl border border-border bg-surfaceMuted py-3.5 pl-10 pr-12 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brandStrong focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
            <button
              type="button"
              onClick={() => setIsPasswordVisible((current) => !current)}
              aria-label={isPasswordVisible ? '隐藏密码' : '显示密码'}
              aria-pressed={isPasswordVisible}
              className="absolute right-1.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-brandTint hover:text-brandStrong"
            >
              {isPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p id={REGISTER_PASSWORD_HELP_ID} className="mt-1.5 text-xs text-slate-500">
            使用至少 {MINIMUM_PASSWORD_LENGTH} 位密码。
          </p>
        </div>

        <div>
          <label htmlFor={REGISTER_CONFIRM_PASSWORD_ID} className="mb-1.5 block text-sm font-bold text-slate-700">
            确认密码
          </label>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id={REGISTER_CONFIRM_PASSWORD_ID}
              name="confirm-password"
              type={isPasswordVisible ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="再次输入密码"
              required
              aria-invalid={Boolean(errorMessage)}
              aria-describedby={fieldErrorDescription}
              className="w-full rounded-2xl border border-border bg-surfaceMuted py-3.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brandStrong focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-1 w-full rounded-2xl bg-brandStrong py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-teal-300"
        >
          {isSubmitting ? '注册中…' : '创建账号'}
        </button>
      </form>
    </AuthShell>
  );
}
