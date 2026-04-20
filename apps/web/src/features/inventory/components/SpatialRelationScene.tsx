import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box, ChevronDown, ChevronRight, GripVertical, Image as ImageIcon, Layers3, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Item } from '../../../legacy/database.types';

interface Props {
  currentItem: Item;
  ancestors: Item[];
  children: Item[];
  onNodeClick?: (item: Item) => void;
}

function ItemVisual({
  item,
  size = 'md',
}: {
  item: Item;
  size?: 'sm' | 'md' | 'lg';
}) {
  const isContainer = item.type === 'container';
  const Icon = isContainer ? Box : Package;
  const classes =
    size === 'lg'
      ? 'h-24 w-24 rounded-[28px]'
      : size === 'sm'
      ? 'h-12 w-12 rounded-2xl'
      : 'h-16 w-16 rounded-3xl';

  if (item.images[0]) {
    return (
      <div className={`overflow-hidden bg-white ring-1 ring-slate-200/75 ${classes}`}>
        <img src={item.images[0]} alt={item.name} className="h-full w-full object-cover object-center" />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center ${classes} ${
        isContainer ? 'bg-slate-900 text-white' : 'bg-amber-100 text-amber-700'
      }`}
    >
      <Icon size={size === 'lg' ? 32 : size === 'sm' ? 18 : 24} />
    </div>
  );
}

function PathStrip({
  lineage,
  onNodeClick,
}: {
  lineage: Item[];
  onNodeClick?: (item: Item) => void;
}) {
  return (
    <div className="rounded-[22px] border border-white/80 bg-white/85 px-3 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        {lineage.map((item, index) => {
          const active = index === lineage.length - 1;

          return (
            <div key={item.id} className="flex items-center gap-2">
              {index > 0 && <ChevronRight size={14} className="text-slate-300" />}
              <button
                type="button"
                onClick={() => onNodeClick?.(item)}
                className={`relative max-w-[180px] truncate whitespace-nowrap rounded-full px-2.5 py-1 text-xs transition-all ${
                  active
                    ? 'bg-sky-100 font-semibold text-sky-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {item.name}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RelationshipLine({
  label,
}: {
  label: string;
}) {
  return (
    <div className="flex items-center justify-center py-0.5">
      <div className="flex w-full max-w-[720px] items-center gap-2.5">
        <div className="relative h-px flex-1 border-t border-dashed border-sky-200/90">
          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-sky-200 shadow-[0_0_0_4px_rgba(255,255,255,0.7)]" />
        </div>
        <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-medium text-sky-700 shadow-sm">
          {label}
        </span>
        <div className="relative h-px flex-1 border-t border-dashed border-sky-200/90">
          <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-sky-200 shadow-[0_0_0_4px_rgba(255,255,255,0.7)]" />
        </div>
      </div>
    </div>
  );
}

function SortableChildCard({
  item,
  onNodeClick,
}: {
  item: Item;
  onNodeClick?: (item: Item) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? 'z-20' : ''}`}
    >
      <motion.div
        layout
        whileHover={{ y: -3, scale: 1.005 }}
        className={`overflow-hidden rounded-[20px] border border-white/80 bg-white/96 shadow-sm ${
          isDragging ? 'opacity-85 shadow-lg' : ''
        }`}
      >
        <button
          type="button"
          onClick={() => onNodeClick?.(item)}
          className="block w-full p-3 text-left"
        >
          <div className="mb-3 overflow-hidden rounded-[18px] bg-slate-100">
            {item.images[0] ? (
              <img
                src={item.images[0]}
                alt={item.name}
                className="aspect-[4/3] w-full object-cover object-center"
              />
            ) : (
              <div className="flex aspect-[4/3] w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(191,219,254,0.7),transparent_50%),linear-gradient(180deg,#f8fafc,#e2e8f0)]">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                    item.type === 'container'
                      ? 'bg-slate-900 text-white'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {item.type === 'container' ? <Box size={22} /> : <Package size={22} />}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
              <p className="truncate mt-0.5 text-[11px] text-slate-400">
                {item.type === 'container' ? '位置节点' : '物品节点'}
              </p>
            </div>
            <span
              className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium ${
                item.type === 'container'
                  ? 'bg-slate-100 text-slate-600'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              {item.type === 'container' ? '位置' : '物品'}
            </span>
          </div>

          {(item.category || item.tags.length > 0) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.category && (
                <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                  <ImageIcon size={11} />
                  <span className="max-w-[100px] truncate">{item.category}</span>
                </span>
              )}
              {item.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="max-w-[92px] truncate whitespace-nowrap rounded-full bg-sky-50 px-2 py-0.5 text-[10px] text-sky-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </button>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400">
          <span className="min-w-0 truncate whitespace-nowrap">拖拽调整当前视图顺序</span>
          <button
            type="button"
            className="inline-flex shrink-0 cursor-grab items-center gap-1 whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-slate-500 active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={12} />
            排列
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function MobileChildList({
  children,
  onNodeClick,
}: {
  children: Item[];
  onNodeClick?: (item: Item) => void;
}) {
  return (
    <div className="space-y-2 md:hidden">
      {children.map((child) => (
        <button
          key={child.id}
          type="button"
          onClick={() => onNodeClick?.(child)}
          className="flex w-full items-center gap-3 rounded-2xl border border-white/75 bg-white/88 p-3 text-left shadow-sm"
        >
          <ItemVisual item={child} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{child.name}</p>
            <p className="truncate mt-1 text-[11px] text-slate-400">
              {child.type === 'container' ? '位置节点' : '物品节点'}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

export default function SpatialRelationScene({ currentItem, ancestors, children, onNodeClick }: Props) {
  const lineage = useMemo(() => [...ancestors, currentItem], [ancestors, currentItem]);
  const [orderedChildren, setOrderedChildren] = useState(children);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showChildrenPanel, setShowChildrenPanel] = useState(false);
  const showChildrenSection = currentItem.type === 'container';
  const isContainer = currentItem.type === 'container';

  useEffect(() => {
    setOrderedChildren(children);
  }, [children]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setOrderedChildren((current) => {
      const oldIndex = current.findIndex((item) => item.id === active.id);
      const newIndex = current.findIndex((item) => item.id === over.id);

      if (oldIndex < 0 || newIndex < 0) {
        return current;
      }

      return arrayMove(current, oldIndex, newIndex);
    });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.06 }}
      className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.18),transparent_32%),linear-gradient(180deg,#f8fbff_0%,#f2f7ff_42%,#f8fafc_100%)] p-4 shadow-[0_14px_36px_rgba(15,23,42,0.05)]"
    >
      {isContainer ? (
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div className="min-w-0">
            <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-slate-500 shadow-sm">
              <Layers3 size={12} />
              空间视图
            </div>
            <h2 className="text-sm font-semibold text-slate-900">查看位置路径与直接下级</h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full bg-white/85 px-2.5 py-1 text-[11px] text-slate-500 shadow-sm">
              {orderedChildren.length} 个子节点
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-500">
              {isExpanded ? '收起' : '展开'}
              <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </span>
          </div>
        </button>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-slate-500 shadow-sm">
              <Layers3 size={12} />
              空间视图
            </div>
            <h2 className="text-sm font-semibold text-slate-900">包含路径</h2>
          </div>
        </div>
      )}

      <div className="mt-3">
        <PathStrip lineage={lineage} onNodeClick={onNodeClick} />
      </div>

      {isContainer && isExpanded ? (
      <div className="mt-3 space-y-2.5">
        {showChildrenSection ? (
          <>
            <button
              type="button"
              onClick={() => setShowChildrenPanel((current) => !current)}
              className="flex w-full items-center justify-between rounded-[22px] border border-white/80 bg-white/78 px-4 py-3 text-left shadow-sm transition-colors hover:bg-white"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">直接子节点</p>
              </div>
              <span className="ml-4 inline-flex shrink-0 items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] text-slate-500">
                <span className="whitespace-nowrap">{showChildrenPanel ? '收起' : '展开'}</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform ${showChildrenPanel ? 'rotate-180' : ''}`}
                />
              </span>
            </button>

            {showChildrenPanel && (
              <>
                <RelationshipLine label={`直接包含 ${orderedChildren.length} 个子节点`} />
                <div className="relative rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.94))] p-4 shadow-[0_16px_42px_rgba(15,23,42,0.06)]">
                  <div className="pointer-events-none absolute inset-x-16 -bottom-5 h-8 rounded-full bg-slate-200/40 blur-2xl" />
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">直接子节点</p>
                  </div>

                  {orderedChildren.length > 0 ? (
                    <>
                      <div className="hidden md:block">
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                          <SortableContext items={orderedChildren.map((item) => item.id)} strategy={rectSortingStrategy}>
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                              {orderedChildren.map((child) => (
                                <SortableChildCard key={child.id} item={child} onNodeClick={onNodeClick} />
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      </div>

                      <MobileChildList children={orderedChildren} onNodeClick={onNodeClick} />
                    </>
                  ) : (
                    <div className="rounded-[26px] border border-dashed border-slate-200 bg-white/70 px-4 py-12 text-center">
                      <p className="text-sm font-semibold text-slate-600">当前节点暂无直接子节点</p>
                      <p className="mt-1 text-xs text-slate-400">
                        等后续添加新的位置或物品后，这里会展示直接归属到 {currentItem.name} 的内容。
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        ) : null}
      </div>
      ) : null}
    </motion.section>
  );
}
