import { ChevronRight, FolderTree, MapPin } from 'lucide-react';
import { useMemo } from 'react';
import type { Item } from '../../../legacy/database.types';
import { buildLocationTree, type LocationTreeNode } from '../lib/locationTree';

interface Props {
  items: Item[];
  selectedLocationId: string | null;
  onSelectLocation: (locationId: string | null) => void;
  allLabel?: string;
  emptyLabel?: string;
}

const INDENT_PER_LEVEL = 18;
const BASE_PADDING_LEFT = 12;

function TreeNodeButton({
  node,
  depth,
  selectedLocationId,
  onSelectLocation,
}: {
  node: LocationTreeNode;
  depth: number;
  selectedLocationId: string | null;
  onSelectLocation: (locationId: string) => void;
}) {
  const isSelected = selectedLocationId === node.item.id;

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelectLocation(node.item.id)}
        className={`flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-sm transition-colors ${
          isSelected
            ? 'bg-sky-50 text-sky-700'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
        style={{ paddingLeft: `${depth * INDENT_PER_LEVEL + BASE_PADDING_LEFT}px` }}
      >
        <MapPin size={14} className={isSelected ? 'text-sky-500' : 'text-slate-300'} />
        <span className="min-w-0 flex-1 truncate font-medium">{node.item.name}</span>
        {node.children.length > 0 && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] ${isSelected ? 'bg-white text-sky-600' : 'bg-slate-100 text-slate-500'}`}>
            {node.children.length}
          </span>
        )}
      </button>
      {node.children.length > 0 && (
        <div className="space-y-1">
          {node.children.map((child) => (
            <TreeNodeButton
              key={child.item.id}
              node={child}
              depth={depth + 1}
              selectedLocationId={selectedLocationId}
              onSelectLocation={onSelectLocation}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function LocationTreePanel({
  items,
  selectedLocationId,
  onSelectLocation,
  allLabel = '全部内容',
  emptyLabel = '还没有标记为位置的节点',
}: Props) {
  const tree = useMemo(() => buildLocationTree(items), [items]);

  if (tree.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
        <FolderTree size={18} className="mx-auto mb-2 text-slate-300" />
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => onSelectLocation(null)}
        className={`flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-sm transition-colors ${
          selectedLocationId === null
            ? 'bg-sky-50 text-sky-700'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
      >
        <FolderTree size={14} className={selectedLocationId === null ? 'text-sky-500' : 'text-slate-300'} />
        <span className="flex-1 font-medium">{allLabel}</span>
        <ChevronRight size={14} className={selectedLocationId === null ? 'text-sky-400' : 'text-slate-300'} />
      </button>

      {tree.map((node) => (
        <TreeNodeButton
          key={node.item.id}
          node={node}
          depth={0}
          selectedLocationId={selectedLocationId}
          onSelectLocation={(locationId) => onSelectLocation(locationId)}
        />
      ))}
    </div>
  );
}
