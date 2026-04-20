import { ChevronRight, Box, MoreHorizontal, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useRef, type MouseEvent } from 'react';
import type { Item, Category } from '../../../legacy/database.types';
import { CategoryIcon, getColorClasses, isCustomCategoryImageIcon } from '../lib/categoryPresentation';
import { staggerItem } from '../../../shared/lib/animations';

const FALLBACK_COLORS = [
  { bg: 'bg-sky-50', text: 'text-sky-500' },
  { bg: 'bg-teal-50', text: 'text-teal-500' },
  { bg: 'bg-amber-50', text: 'text-amber-500' },
  { bg: 'bg-rose-50', text: 'text-rose-500' },
  { bg: 'bg-emerald-50', text: 'text-emerald-500' },
];

function fallbackColorClasses(id: string) {
  return FALLBACK_COLORS[id.charCodeAt(0) % FALLBACK_COLORS.length];
}

interface Props {
  item: Item;
  childCount?: number;
  category?: Category;
  onClick: () => void;
  onLongPress: () => void;
  selectionMode?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}

export default function ContainerCard({ item, childCount, category, onClick, onLongPress, selectionMode = false, selected = false, onSelect }: Props) {
  const [hovered, setHovered] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      if (selectionMode) {
        (onSelect ?? onClick)();
        return;
      }

      onLongPress();
    }, 500);
  };
  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  let iconElement: React.ReactNode;
  let bgCls: string;
  let textCls: string;

  if (category) {
    const colorCls = getColorClasses(category.color);
    bgCls = colorCls.bg;
    textCls = colorCls.text;
    iconElement = (
      <CategoryIcon
        icon={category.icon}
        fallback={Box}
        size={22}
        className={colorCls.text}
        imageClassName="h-full w-full object-cover"
      />
    );
  } else {
    const fallback = fallbackColorClasses(item.id);
    bgCls = fallback.bg;
    textCls = fallback.text;
    iconElement = <Box size={22} />;
  }

  return (
    <motion.div
      variants={staggerItem}
      className="relative"
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      <motion.button
        onClick={selectionMode ? (onSelect ?? onClick) : onClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e: MouseEvent<HTMLButtonElement>) => {
          e.preventDefault();
          if (selectionMode) {
            (onSelect ?? onClick)();
            return;
          }
          onLongPress();
        }}
        animate={{ y: hovered ? -3 : 0, boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)' }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        className={`w-full bg-white rounded-2xl p-4 border shadow-sm text-left cursor-pointer ${
          selected ? 'border-sky-300 ring-2 ring-sky-100' : 'border-slate-100'
        }`}
      >
        <div className="relative aspect-square rounded-2xl bg-slate-50 overflow-hidden mb-3">
          {item.images.length > 0 ? (
            <motion.img
              src={item.images[0]}
              alt={item.name}
              className="w-full h-full object-cover"
              animate={{ scale: hovered ? 1.07 : 1 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${bgCls} ${category && isCustomCategoryImageIcon(category.icon) ? 'p-0' : ''}`}>
              <motion.div
                className={`${textCls} ${category && isCustomCategoryImageIcon(category.icon) ? 'h-full w-full' : ''}`}
                animate={{ rotate: hovered ? 6 : 0, scale: hovered ? 1.08 : 1 }}
                transition={{ type: 'spring', stiffness: 350, damping: 18 }}
              >
                {iconElement}
              </motion.div>
            </div>
          )}

          {selectionMode && (
            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/95 border border-slate-200 flex items-center justify-center shadow-sm">
              {selected && <Check size={14} className="text-sky-500" />}
            </div>
          )}
        </div>
        <p className="font-semibold text-slate-800 text-sm leading-tight truncate mb-1">{item.name}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {childCount !== undefined ? `${childCount} 项` : (category?.name ?? '位置')}
          </span>
          {selectionMode ? (
            <span className="text-xs text-sky-500 font-medium">已选中</span>
          ) : (
            <ChevronRight size={14} className={`transition-colors ${hovered ? 'text-sky-400' : 'text-slate-300'}`} />
          )}
        </div>
      </motion.button>
      {!selectionMode && (
        <motion.button
          onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); onLongPress(); }}
          animate={{ opacity: hovered ? 1 : 0, scale: hovered ? 1 : 0.8 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.15 }}
          className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-white/90 backdrop-blur-sm border border-slate-100 shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white z-10"
          title="更多操作"
        >
          <MoreHorizontal size={14} />
        </motion.button>
      )}
    </motion.div>
  );
}
