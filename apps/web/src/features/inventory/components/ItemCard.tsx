import { Package, MoreHorizontal, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useRef, type MouseEvent } from 'react';
import StatusBadge from '../../../shared/ui/StatusBadge';
import type { Item, Category } from '../../../legacy/database.types';
import { CategoryIcon, getColorClasses, isCustomCategoryImageIcon } from '../lib/categoryPresentation';
import { staggerItem } from '../../../shared/lib/animations';
import { buildInventoryImageUrl } from '../lib/itemImage';
import EntityBadge from './EntityBadge';

interface Props {
  item: Item;
  category?: Category;
  shouldShowCategory?: boolean;
  onClick: () => void;
  onLongPress: () => void;
  selectionMode?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}

export default function ItemCard({
  item,
  category,
  shouldShowCategory = true,
  onClick,
  onLongPress,
  selectionMode = false,
  selected = false,
  onSelect,
}: Props) {
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
      className="group relative"
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      <motion.button
        type="button"
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
        role={selectionMode ? 'checkbox' : undefined}
        aria-checked={selectionMode ? selected : undefined}
        aria-label={selectionMode ? `${selected ? '取消选择' : '选择'}${item.name}` : `打开${item.name}`}
        className={`w-full cursor-pointer overflow-hidden rounded-2xl border bg-surface text-left shadow-sm ${
          selected ? 'border-brand ring-2 ring-brand/20' : 'border-borderSoft'
        }`}
      >
        <div className="relative aspect-square overflow-hidden bg-slate-50 lg:aspect-[4/3]">
          {item.images.length > 0 ? (
              <motion.img
              src={buildInventoryImageUrl(item.images[0], 'card')}
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
          <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
            <EntityBadge kind="item" compact />
            <StatusBadge status={item.status} />
          </div>
          {selectionMode && (
            <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-white/95 shadow-sm">
              {selected && <Check size={14} className="text-brandStrong" />}
            </div>
          )}
        </div>
        <div className="p-3">
          <p className="font-semibold text-slate-800 text-sm leading-tight truncate mb-0.5">{item.name}</p>
          {item.category && shouldShowCategory ? (
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
              <p className="text-xs text-slate-600 truncate">{item.category}</p>
            </div>
          ) : null}
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
          type="button"
          onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); onLongPress(); }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.15 }}
          aria-label={`打开${item.name}的更多操作`}
          className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-white/95 text-slate-500 opacity-100 shadow-sm backdrop-blur-sm transition-[opacity,color,background-color] hover:bg-brandTint hover:text-brandStrong focus:opacity-100 md:opacity-0 md:group-hover:opacity-100"
          title="更多操作"
        >
          <MoreHorizontal size={14} />
        </motion.button>
      )}
    </motion.div>
  );
}
