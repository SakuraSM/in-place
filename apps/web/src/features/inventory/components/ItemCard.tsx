import { Package, MoreHorizontal, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useRef } from 'react';
import StatusBadge from '../../../shared/ui/StatusBadge';
import type { Item, Category } from '../../../legacy/database.types';
import { CategoryIcon, getColorClasses, isCustomCategoryImageIcon } from '../lib/categoryPresentation';
import { staggerItem } from '../../../shared/lib/animations';

interface Props {
  item: Item;
  category?: Category;
  onClick: () => void;
  onLongPress: () => void;
  selectionMode?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}

export default function ItemCard({ item, category, onClick, onLongPress, selectionMode = false, selected = false, onSelect }: Props) {
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
        onContextMenu={(e) => {
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
        className={`w-full bg-white rounded-2xl border shadow-sm text-left overflow-hidden cursor-pointer ${
          selected ? 'border-sky-300 ring-2 ring-sky-100' : 'border-slate-100'
        }`}
      >
        <div className="relative aspect-square bg-slate-50 overflow-hidden">
          {item.images.length > 0 ? (
            <motion.img
              src={item.images[0]}
              alt={item.name}
              className="w-full h-full object-cover"
              animate={{ scale: hovered ? 1.07 : 1 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            />
          ) : category ? (
            (() => {
              const colorCls = getColorClasses(category.color);
              return (
                <div className={`w-full h-full flex items-center justify-center ${colorCls.bg} ${isCustomCategoryImageIcon(category.icon) ? 'p-0' : ''}`}>
                  <motion.div
                    className={isCustomCategoryImageIcon(category.icon) ? 'h-full w-full' : ''}
                    animate={{ scale: hovered ? 1.15 : 1, rotate: hovered ? 8 : 0 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 18 }}
                  >
                    <CategoryIcon
                      icon={category.icon}
                      fallback={Package}
                      size={36}
                      className={colorCls.text}
                      imageClassName="h-full w-full object-cover"
                    />
                  </motion.div>
                </div>
              );
            })()
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package size={32} className="text-slate-200" />
            </div>
          )}
          <div className="absolute top-2 left-2">
            <StatusBadge status={item.status} />
          </div>
          {selectionMode && (
            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/95 border border-slate-200 flex items-center justify-center shadow-sm">
              {selected && <Check size={14} className="text-sky-500" />}
            </div>
          )}
        </div>
        <div className="p-3">
          <p className="font-semibold text-slate-800 text-sm leading-tight truncate mb-0.5">{item.name}</p>
          {item.category && (
            <div className="flex items-center gap-1">
              {category && (() => {
                const colorCls = getColorClasses(category.color);
                return (
                  <span className="flex h-3.5 w-3.5 items-center justify-center overflow-hidden rounded-sm">
                    <CategoryIcon
                      icon={category.icon}
                      fallback={Package}
                      size={11}
                      className={colorCls.text}
                      imageClassName="h-full w-full object-cover"
                    />
                  </span>
                );
              })()}
              <p className="text-xs text-slate-400 truncate">{item.category}</p>
            </div>
          )}
          {item.tags.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {item.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </motion.button>
      {!selectionMode && (
        <motion.button
          onClick={(e) => { e.stopPropagation(); onLongPress(); }}
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
