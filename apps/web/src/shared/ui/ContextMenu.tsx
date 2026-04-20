import { motion, AnimatePresence } from 'framer-motion';
import type { MouseEvent } from 'react';
import { SquarePen, Trash2, Move, X, Box, Package, Eye } from 'lucide-react';
import type { Item } from '../../legacy/database.types';
import { getContainerTypeLabel } from '../../features/inventory/lib/locationTag';

interface Props {
  item: Item;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMove: () => void;
  onClose: () => void;
}

const actions = [
  { key: 'view', icon: Eye, label: '查看详情', hoverClass: 'hover:bg-slate-100 hover:text-slate-800' },
  { key: 'edit', icon: SquarePen, label: '编辑', hoverClass: 'hover:bg-sky-50 hover:text-sky-600' },
  { key: 'move', icon: Move, label: '移动到...', hoverClass: 'hover:bg-amber-50 hover:text-amber-600' },
  { key: 'delete', icon: Trash2, label: '删除', hoverClass: 'hover:bg-rose-50 hover:text-rose-500' },
];

export default function ContextMenu({ item, onView, onEdit, onDelete, onMove, onClose }: Props) {
  const handlers: Record<string, () => void> = { view: onView, edit: onEdit, move: onMove, delete: onDelete };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
        <motion.div
          className="absolute inset-0 bg-black/25 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
        <motion.div
          onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
          className="relative w-full max-w-lg bg-white rounded-t-3xl px-4 pt-5 pb-10 shadow-2xl"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        >
          <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
          <div className="flex items-center justify-between mb-5 px-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                {item.type === 'container'
                  ? <Box size={18} className="text-slate-500" />
                  : <Package size={18} className="text-slate-500" />
                }
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">{item.name}</p>
                <p className="text-xs text-slate-400">{item.type === 'container' ? getContainerTypeLabel(item) : '物品'}</p>
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
          <div className="space-y-2">
            {actions.map(({ key, icon: Icon, label, hoverClass }, i) => (
              <motion.button
                key={key}
                onClick={() => { handlers[key](); onClose(); }}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, type: 'spring', stiffness: 400, damping: 28 }}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-slate-50 ${hoverClass} text-slate-700 transition-colors text-sm font-medium`}
              >
                <Icon size={17} />
                {label}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
