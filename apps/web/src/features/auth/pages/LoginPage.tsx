import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../app/providers/AuthContext';
import { staggerContainer, staggerItem, logoFloat } from '../../../shared/lib/animations';
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
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-slate-50 flex flex-col items-center justify-center px-6">
      <motion.div
        className="w-full max-w-sm"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        >
          <motion.div variants={staggerItem} className="text-center mb-10">
            <motion.div variants={logoFloat}>
              <img
                src="/branding/inplace-logo-full.png"
                alt="归位"
                className="mx-auto block h-20 w-auto max-w-full object-contain md:h-24"
              />
            </motion.div>
          </motion.div>

        <motion.div variants={staggerItem} className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">登录账号</h2>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 rounded-xl p-3 mb-5 text-sm overflow-hidden"
              >
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            <motion.div variants={staggerItem}>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">邮箱地址</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition text-sm"
                />
              </div>
            </motion.div>

            <motion.div variants={staggerItem}>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">密码</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入密码"
                  required
                  className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition text-sm"
                />
                <motion.button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </motion.button>
              </div>
            </motion.div>

            <motion.div variants={staggerItem}>
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.01 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                className="w-full py-3.5 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white font-semibold rounded-xl transition-all duration-200 text-sm mt-2 shadow-sm shadow-sky-200"
              >
                {loading ? '登录中...' : '登录'}
              </motion.button>
            </motion.div>
          </form>
        </motion.div>

        <motion.p variants={staggerItem} className="text-center text-sm text-slate-500 mt-6">
          还没有账号?{' '}
          <Link to="/register" className="text-sky-500 font-medium hover:text-sky-600">
            立即注册
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
