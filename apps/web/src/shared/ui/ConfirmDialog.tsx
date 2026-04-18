import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export default function ConfirmDialog({ title, message, confirmLabel = '确认', onConfirm, onCancel, danger = false }: Props) {
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
        <motion.div
          className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        />
        <motion.div
          className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
          initial={{ opacity: 0, scale: 0.88, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 8 }}
          transition={{ type: 'spring', stiffness: 380, damping: 26 }}
        >
          <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">{message}</p>
          <div className="flex gap-3">
            <motion.button
              onClick={onCancel}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-medium text-sm hover:bg-slate-200 transition-colors"
            >
              取消
            </motion.button>
            <motion.button
              onClick={onConfirm}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className={`flex-1 py-3 rounded-xl font-medium text-sm transition-colors ${
                danger
                  ? 'bg-rose-500 text-white hover:bg-rose-600'
                  : 'bg-sky-500 text-white hover:bg-sky-600'
              }`}
            >
              {confirmLabel}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
