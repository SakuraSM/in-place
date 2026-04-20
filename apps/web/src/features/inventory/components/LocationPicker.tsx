import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Home, Box, Check, X } from 'lucide-react';
import { fetchChildren } from '../../../legacy/items';
import type { Item } from '../../../legacy/database.types';
import { useAuth } from '../../../app/providers/AuthContext';

interface Props {
  value: string | null;
  excludeId?: string;
  onChange: (id: string | null) => void;
  onClose: () => void;
}

export default function LocationPicker({ value, excludeId, onChange, onClose }: Props) {
  const { user } = useAuth();
  const [currentParent, setCurrentParent] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Item[]>([]);
  const [containers, setContainers] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchChildren(currentParent, user.id)
      .then((items) => setContainers(items.filter((i) => i.type === 'container' && i.id !== excludeId)))
      .finally(() => setLoading(false));
  }, [currentParent, excludeId, user]);

  const handleSelect = (id: string | null) => {
    onChange(id);
    onClose();
  };

  const handleDrillDown = async (container: Item) => {
    setBreadcrumbs((prev) => [...prev, container]);
    setCurrentParent(container.id);
  };

  const handleBreadcrumbNav = (idx: number) => {
    if (idx < 0) {
      setBreadcrumbs([]);
      setCurrentParent(null);
    } else {
      const crumb = breadcrumbs[idx];
      setBreadcrumbs((prev) => prev.slice(0, idx + 1));
      setCurrentParent(crumb.id);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-end justify-center">
        <motion.div
          className="absolute inset-0 bg-black/25 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
        <motion.div
          className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl max-h-[70vh] flex flex-col"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        >
          <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-2" />
          <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-semibold text-slate-900">选择位置</h3>
              <div className="flex items-center gap-1 mt-1 overflow-x-auto scrollbar-hide">
                <motion.button
                  onClick={() => handleBreadcrumbNav(-1)}
                  whileHover={{ scale: 1.15 }}
                  className="shrink-0 text-sky-500"
                >
                  <Home size={12} />
                </motion.button>
                {breadcrumbs.map((b, i) => (
                  <div key={b.id} className="flex items-center gap-1 shrink-0">
                    <ChevronRight size={10} className="text-slate-300" />
                    <button
                      onClick={() => handleBreadcrumbNav(i)}
                      className="text-xs text-slate-500 hover:text-sky-500 transition-colors"
                    >
                      {b.name}
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.08, rotate: 90 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500"
            >
              <X size={16} />
            </motion.button>
          </div>

          <div className="overflow-y-auto flex-1 p-4 space-y-2">
            <motion.button
              onClick={() => handleSelect(currentParent)}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border transition-colors ${
                value === currentParent
                  ? 'bg-sky-50 border-sky-200 text-sky-700'
                  : 'bg-slate-50 border-transparent text-slate-700 hover:bg-sky-50'
              }`}
            >
              <Home size={16} className="text-slate-400" />
              <span className="flex-1 text-left">
                {currentParent === null ? '顶层位置' : '当前位置'}
              </span>
              {value === currentParent && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 22 }}>
                  <Check size={15} className="text-sky-500" />
                </motion.div>
              )}
            </motion.button>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : containers.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-6">暂无下级位置</p>
            ) : (
              containers.map((container, i) => (
                <motion.div
                  key={container.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-2"
                >
                  <motion.button
                    onClick={() => handleSelect(container.id)}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border transition-colors ${
                      value === container.id
                        ? 'bg-sky-50 border-sky-200 text-sky-700'
                        : 'bg-slate-50 border-transparent text-slate-700 hover:bg-sky-50'
                    }`}
                  >
                    <Box size={16} className="text-slate-400 shrink-0" />
                    <span className="flex-1 text-left truncate">{container.name}</span>
                    {value === container.id && <Check size={15} className="text-sky-500" />}
                  </motion.button>
                  <motion.button
                    onClick={() => handleDrillDown(container)}
                    whileHover={{ scale: 1.1, backgroundColor: '#e2e8f0' }}
                    whileTap={{ scale: 0.92 }}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 transition-colors shrink-0"
                  >
                    <ChevronRight size={16} />
                  </motion.button>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
