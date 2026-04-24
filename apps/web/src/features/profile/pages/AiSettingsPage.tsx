import { useEffect, useState } from 'react';
import { ArrowLeft, Bot, KeyRound, Link as LinkIcon, RotateCcw, Save, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../app/providers/AuthContext';
import { staggerContainer, staggerItem } from '../../../shared/lib/animations';
import { fetchAiSettings, resetAiSettings, updateAiSettings, type AiSettings } from '../../../legacy/ai-settings';
import { APP_PAGE_CONTENT, APP_PAGE_HEADER, APP_PAGE_HEADER_STACK } from '../../../shared/ui/pageHeader';
import { SectionPanel } from '../components/ProfileUi';

const DEFAULT_AI_SETTINGS: AiSettings = {
  baseUrl: '',
  model: '',
  hasStoredApiKey: false,
  enabled: false,
  source: 'env',
};

export default function AiSettingsPage() {
  const { user } = useAuth();
  const [aiSettings, setAiSettings] = useState<AiSettings>(DEFAULT_AI_SETTINGS);
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiLoading, setAiLoading] = useState(true);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiSaved, setAiSaved] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    const loadAiSettings = async () => {
      setAiLoading(true);
      setAiError(null);

      try {
        const data = await fetchAiSettings();
        setAiSettings(data);
      } catch (error) {
        setAiError(error instanceof Error ? error.message : 'AI 配置加载失败');
      } finally {
        setAiLoading(false);
      }
    };

    void loadAiSettings();
  }, [user]);

  const handleAiSave = async () => {
    setAiSaving(true);
    setAiError(null);

    try {
      const nextSettings = await updateAiSettings({
        baseUrl: aiSettings.baseUrl,
        model: aiSettings.model,
        ...(aiApiKey.trim() ? { apiKey: aiApiKey.trim() } : {}),
      });
      setAiSettings(nextSettings);
      setAiApiKey('');
      setAiSaved(true);
      window.setTimeout(() => setAiSaved(false), 2000);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'AI 配置保存失败');
    } finally {
      setAiSaving(false);
    }
  };

  const handleAiReset = async () => {
    setAiSaving(true);
    setAiError(null);

    try {
      await resetAiSettings();
      const nextSettings = await fetchAiSettings();
      setAiSettings(nextSettings);
      setAiApiKey('');
      setAiSaved(false);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'AI 配置恢复默认失败');
    } finally {
      setAiSaving(false);
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
          <h1 className="mt-2 text-xl font-bold text-slate-900">AI 配置</h1>
        </div>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className={`mx-auto w-full max-w-5xl ${APP_PAGE_CONTENT}`}
      >
        <motion.div variants={staggerItem} className="mb-4 overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
          <div className="bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.16),_transparent_42%),linear-gradient(135deg,#ffffff_0%,#fffaf0_100%)] px-5 py-5 md:px-6 md:py-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-amber-100 text-amber-600">
                <Sparkles size={26} />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-slate-900">识别服务</p>
                <p className="mt-2 text-sm text-slate-500">
                  {aiLoading
                    ? '正在读取服务端配置...'
                    : aiSettings.hasStoredApiKey
                      ? '当前账号已保存专属密钥'
                      : aiSettings.enabled
                        ? '当前使用系统默认配置'
                        : '当前未配置可用密钥'}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  当前来源：{aiSettings.source === 'user' ? '账号配置' : '系统默认'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={staggerItem}>
          <SectionPanel icon={<Bot size={16} />} title="配置项">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <KeyRound size={13} />
                API Key
              </label>
              <input
                type="password"
                value={aiApiKey}
                onChange={(event) => setAiApiKey(event.target.value)}
                placeholder={aiSettings.hasStoredApiKey ? '留空则保持当前服务端密钥' : '输入后会加密保存到服务端'}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <LinkIcon size={13} />
                  Base URL
                </label>
                <input
                  type="text"
                  value={aiSettings.baseUrl}
                  onChange={(event) => setAiSettings((current) => ({ ...current, baseUrl: event.target.value }))}
                  placeholder="例如：https://api.openai.com/v1"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <Bot size={13} />
                  模型
                </label>
                <input
                  type="text"
                  value={aiSettings.model}
                  onChange={(event) => setAiSettings((current) => ({ ...current, model: event.target.value }))}
                  placeholder="例如：gpt-4o / gpt-5.4"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => void handleAiSave()}
                disabled={aiSaving || aiLoading}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-sky-500 px-4 text-sm font-medium text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-sky-300"
              >
                <Save size={15} />
                {aiSaving ? '保存中...' : '保存配置'}
              </button>
              <button
                onClick={() => void handleAiReset()}
                disabled={aiSaving || aiLoading}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                <RotateCcw size={15} />
                恢复默认
              </button>
            </div>
            {aiSaved ? <p className="text-sm text-emerald-500">已保存</p> : null}
            {aiError ? <p className="text-sm text-rose-500">{aiError}</p> : null}
          </SectionPanel>
        </motion.div>
      </motion.div>
    </div>
  );
}
