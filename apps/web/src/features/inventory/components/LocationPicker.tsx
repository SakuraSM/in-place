import { useState, useId, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Home, Box, Check, X } from 'lucide-react';
import { INVENTORY_NODE_LABELS, buildLocationCandidates, filterLocationCandidates } from '@inplace/app-core';
import { useAllInventoryItems } from '../hooks/useAllInventoryItems';
import type { Item } from '../../../legacy/database.types';
import { isLocationItem } from '../lib/locationTag';
import EntityBadge from './EntityBadge';
import { useDialogFocus } from '../../../shared/ui/useDialogFocus';

interface Props {
  value: string | null;
  excludeId?: string;
  excludedIds?: string[];
  onChange: (id: string | null) => void | Promise<void | boolean>;
  onClose: () => void;
}

export default function LocationPicker({ value, excludeId, excludedIds = [], onChange, onClose }: Props) {
  const [currentParent, setCurrentParent] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Item[]>([]);
  const [query, setQuery] = useState('');
  const [selecting, setSelecting] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const requestClose = () => { if (!busyRef.current) onClose(); };
  const inventory = useAllInventoryItems();
  const candidates = buildLocationCandidates(inventory.data ?? [], excludeId ? [excludeId, ...excludedIds] : excludedIds);
  const searching = Boolean(query.trim());
  const visible = searching ? filterLocationCandidates(candidates, query) : candidates.filter(({ item }) => item.parent_id === currentParent);
  const titleId = useId();
  const dialogRef = useDialogFocus({ onClose: requestClose });

  const handleSelect = async (id: string | null) => {
    if (busyRef.current || (id && !candidates.some(({ item }) => item.id === id))) return;
    busyRef.current = true;
    setSelecting(true);
    setSelectionError(null);
    try { if (await onChange(id) !== false) onClose(); }
    catch (error) { setSelectionError(error instanceof Error ? error.message : '选择失败，请重试'); }
    finally { busyRef.current = false; setSelecting(false); }
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
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center md:px-6 md:py-8">
        <motion.div
          className="absolute inset-0 bg-black/25 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={requestClose}
        />
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="relative flex max-h-[70vh] w-full max-w-lg flex-col overflow-hidden bg-white shadow-2xl rounded-t-3xl md:max-h-[78vh] md:max-w-2xl md:rounded-3xl"
          initial={{ y: 24, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 24, opacity: 0, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        >
          <div className="mx-auto mb-2 mt-3 h-1 w-10 rounded-full bg-slate-200 md:hidden" />
          <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-slate-100">
            <div>
              <h3 id={titleId} className="font-semibold text-slate-900">选择{INVENTORY_NODE_LABELS.storageLocation}</h3>
              <div className="flex items-center gap-1 mt-1 overflow-x-auto scrollbar-hide">
                <motion.button
                  type="button"
                  onClick={() => handleBreadcrumbNav(-1)}
                  aria-label="返回位置根目录"
                  whileHover={{ scale: 1.15 }}
                  className="shrink-0 text-sky-500"
                >
                  <Home size={12} />
                </motion.button>
                {breadcrumbs.map((b, i) => (
                  <div key={b.id} className="flex items-center gap-1 shrink-0">
                    <ChevronRight size={10} className="text-slate-300" />
                    <button
                      type="button"
                      onClick={() => handleBreadcrumbNav(i)}
                      aria-label={`返回到${b.name}`}
                      className="text-xs text-slate-500 hover:text-sky-500 transition-colors"
                    >
                      {b.name}
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <motion.button
              type="button"
              onClick={requestClose}
              aria-label="关闭位置选择"
              whileHover={{ scale: 1.08, rotate: 90 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500"
            >
              <X size={16} />
            </motion.button>
          </div>

          <div className="px-4 pt-3"><input type="search" aria-label="搜索收纳位置" placeholder="搜索位置名称或路径" value={query} onChange={(event) => setQuery(event.target.value)} className="ui-field h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" /></div>

          <div className="overflow-y-auto flex-1 p-4 space-y-2">
            {selectionError ? <p role="alert" className="text-sm text-red-700">{selectionError}</p> : null}
            {selecting ? <p role="status" className="text-sm text-slate-600">正在保存位置…</p> : null}
            <motion.button
              type="button"
              disabled={selecting}
              onClick={() => void handleSelect(currentParent)}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border transition-colors ${
                value === currentParent
                  ? 'bg-sky-50 border-sky-200 text-sky-700'
                  : 'bg-slate-50 border-transparent text-slate-700 hover:bg-sky-50'
              }`}
            >
              <Home size={16} className="text-muted" />
              <span className="flex-1 text-left">
                {currentParent === null ? `不设置${INVENTORY_NODE_LABELS.storageLocation}` : '放在当前位置'}
              </span>
              {value === currentParent && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 22 }}>
                  <Check size={15} className="text-sky-500" />
                </motion.div>
              )}
            </motion.button>

            {inventory.isError ? <div role="alert" className="p-4 text-sm text-red-700">位置加载失败。<button type="button" onClick={() => void inventory.refetch()} className="underline">重试</button></div> : inventory.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : visible.length === 0 ? (
              <p className="text-center text-muted text-sm py-6">{searching ? '没有匹配的位置，试试上级位置名称' : '暂无下级位置或收纳'}</p>
            ) : (
              visible.map(({ item: container, path }, i) => (
                <motion.div
                  key={container.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-2"
                >
                  <motion.button
                    type="button"
                    disabled={selecting}
                    onClick={() => void handleSelect(container.id)}
                    aria-label={`选择${container.name}`}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border transition-colors ${
                      value === container.id
                        ? 'bg-sky-50 border-sky-200 text-sky-700'
                        : 'bg-slate-50 border-transparent text-slate-700 hover:bg-sky-50'
                    }`}
                  >
                    <Box size={16} className="text-muted shrink-0" />
                    <span className="min-w-0 flex-1 text-left"><span className="block truncate">{container.name}</span>{searching ? <span className="mt-1 block text-xs font-normal text-slate-500">{path}</span> : null}</span>
                    <EntityBadge kind={isLocationItem(container) ? 'location' : 'container'} compact />
                    {value === container.id && <Check size={15} className="text-sky-500" />}
                  </motion.button>
                  {!searching ? <motion.button
                    type="button"
                    disabled={selecting}
                    onClick={() => handleDrillDown(container)}
                    aria-label={`查看${container.name}的下级位置`}
                    whileHover={{ scale: 1.1, backgroundColor: '#e2e8f0' }}
                    whileTap={{ scale: 0.92 }}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-muted transition-colors shrink-0"
                  >
                    <ChevronRight size={16} />
                  </motion.button> : null}
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
    </div>
  );
}
