import type { LucideIcon } from 'lucide-react';
import { Box, Eye, Move, Package, SquarePen, Trash2 } from 'lucide-react';
import type { Item } from '../../legacy/database.types';
import { getContainerTypeLabel } from '../../features/inventory/lib/locationTag';
import ResponsiveDialog from './ResponsiveDialog';

type ContextActionKey = 'view' | 'edit' | 'move' | 'delete';

interface ContextMenuProps {
  item: Item;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMove: () => void;
  onClose: () => void;
}

interface ContextAction {
  key: ContextActionKey;
  icon: LucideIcon;
  label: string;
  className: string;
}

const CONTEXT_ACTIONS: readonly ContextAction[] = [
  { key: 'view', icon: Eye, label: '查看详情', className: 'hover:bg-surfaceMuted hover:text-slate-900' },
  { key: 'edit', icon: SquarePen, label: '编辑', className: 'hover:bg-brandTint hover:text-brandStrong' },
  { key: 'move', icon: Move, label: '移动到…', className: 'hover:bg-amber-50 hover:text-amber-700' },
  { key: 'delete', icon: Trash2, label: '删除', className: 'hover:bg-rose-50 hover:text-rose-700' },
];

export default function ContextMenu({
  item,
  onView,
  onEdit,
  onDelete,
  onMove,
  onClose,
}: ContextMenuProps) {
  const actionHandlers: Record<ContextActionKey, () => void> = {
    view: onView,
    edit: onEdit,
    move: onMove,
    delete: onDelete,
  };
  const ItemIcon = item.type === 'container' ? Box : Package;
  const itemTypeLabel = item.type === 'container' ? getContainerTypeLabel(item) : '物品';

  const runAction = (actionKey: ContextActionKey) => {
    actionHandlers[actionKey]();
    onClose();
  };

  return (
    <ResponsiveDialog
      title={item.name}
      description={itemTypeLabel}
      onClose={onClose}
      size="sm"
    >
      <div className="p-4 md:p-5">
        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-surfaceMuted p-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brandTint text-brandStrong">
            <ItemIcon size={20} />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900">{item.name}</p>
            <p className="mt-0.5 text-xs text-slate-500">{itemTypeLabel}</p>
          </div>
        </div>
        <div className="space-y-2">
          {CONTEXT_ACTIONS.map(({ key, icon: Icon, label, className }) => (
            <button
              key={key}
              type="button"
              onClick={() => runAction(key)}
              className={`flex w-full items-center gap-3 rounded-2xl border border-transparent bg-surfaceMuted px-4 py-3.5 text-left text-sm font-bold text-slate-700 transition-colors ${className}`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </ResponsiveDialog>
  );
}
