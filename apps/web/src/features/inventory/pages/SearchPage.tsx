import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, X, Package, ChevronRight, Box, Archive, MapPin, FolderTree } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Item, ItemStatus, ItemType } from '../../../legacy/database.types';
import StatusBadge from '../../../shared/ui/StatusBadge';
import { staggerContainer, staggerItem } from '../../../shared/lib/animations';
import { resolveItemDetailPath } from '../lib/detailPath';
import PaginationControls from '../components/PaginationControls';
import { useIsMobile } from '../../../shared/lib/useIsMobile';
import LocationTreePanel from '../components/LocationTreePanel';
import { useAllInventoryItems } from '../hooks/useAllInventoryItems';
import { buildItemIdMap, buildItemPath, collectDescendantIds } from '../lib/locationTree';
import { getContainerTypeLabel, isLocationItem } from '../lib/locationTag';

type TypeFilterValue = ItemType | 'all' | 'location';

const STATUS_FILTERS: { value: ItemStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'in_stock', label: '在库' },
  { value: 'borrowed', label: '借出' },
  { value: 'worn_out', label: '损耗' },
];

const TYPE_FILTERS: { value: TypeFilterValue; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: '全部', icon: Archive },
  { value: 'location', label: '位置', icon: MapPin },
  { value: 'container', label: '收纳', icon: Box },
  { value: 'item', label: '物品', icon: Package },
];

interface ItemWithPath {
  item: Item;
  path: string;
}

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const { data: allItems = [], isLoading } = useAllInventoryItems();

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilterValue>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [showLocationSheet, setShowLocationSheet] = useState(false);
  const scrollRootRef = useRef<HTMLDivElement | null>(null);

  const selectedLocationId = searchParams.get('locationId');
  const itemMap = useMemo(() => buildItemIdMap(allItems), [allItems]);
  const selectedLocation = selectedLocationId ? itemMap.get(selectedLocationId) ?? null : null;

  useEffect(() => {
    if (!selectedLocationId) {
      return;
    }

    const selectedItem = itemMap.get(selectedLocationId);
    if (selectedItem && isLocationItem(selectedItem)) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete('locationId');
    setSearchParams(nextSearchParams, { replace: true });
  }, [itemMap, searchParams, selectedLocationId, setSearchParams]);

  const descendantIds = useMemo(
    () => (selectedLocationId ? collectDescendantIds(allItems, selectedLocationId) : null),
    [allItems, selectedLocationId],
  );

  const itemsWithPaths = useMemo<ItemWithPath[]>(() => {
    return allItems.map((item) => ({
      item,
      path: buildItemPath(item, itemMap),
    }));
  }, [allItems, itemMap]);

  const normalizedQuery = query.trim().toLocaleLowerCase('zh-CN');

  const filteredResults = useMemo(() => {
    return itemsWithPaths.filter(({ item }) => {
      if (descendantIds && !descendantIds.has(item.id)) {
        return false;
      }

      if (typeFilter === 'location' && !isLocationItem(item)) {
        return false;
      }

      if (typeFilter === 'container' && (item.type !== 'container' || isLocationItem(item))) {
        return false;
      }

      if (typeFilter === 'item' && item.type !== 'item') {
        return false;
      }

      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        item.name,
        item.description,
        item.category,
        ...item.tags,
      ].some((field) => field.toLocaleLowerCase('zh-CN').includes(normalizedQuery));
    });
  }, [descendantIds, itemsWithPaths, normalizedQuery, statusFilter, typeFilter]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, typeFilter, pageSize, selectedLocationId]);

  const total = filteredResults.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const displayedResults = useMemo(
    () => (
      isMobile
        ? filteredResults.slice(0, page * pageSize)
        : filteredResults.slice((page - 1) * pageSize, page * pageSize)
    ),
    [filteredResults, isMobile, page, pageSize],
  );

  const paginationMeta = {
    page,
    totalPages,
    total,
    hasNextPage: page < totalPages,
  };

  const handleSelectLocation = (locationId: string | null) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    if (locationId) {
      nextSearchParams.set('locationId', locationId);
    } else {
      nextSearchParams.delete('locationId');
    }
    setSearchParams(nextSearchParams, { replace: true });
    setShowLocationSheet(false);
  };

  const loadNextPage = useCallback(() => {
    if (!isMobile || !paginationMeta.hasNextPage || isLoading) {
      return;
    }

    setPage((current) => current + 1);
  }, [isLoading, isMobile, paginationMeta.hasNextPage]);

  useEffect(() => {
    if (!isMobile) {
      return;
    }

    const scrollRoot = scrollRootRef.current;
    if (!scrollRoot) {
      return;
    }

    const handleScroll = () => {
      const distanceFromBottom = scrollRoot.scrollHeight - scrollRoot.scrollTop - scrollRoot.clientHeight;
      if (distanceFromBottom < 160) {
        loadNextPage();
      }
    };

    scrollRoot.addEventListener('scroll', handleScroll);
    return () => {
      scrollRoot.removeEventListener('scroll', handleScroll);
    };
  }, [isMobile, loadNextPage]);

  const FilterSection = () => (
    <div className="space-y-5">
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">类型</p>
        <div className="flex flex-wrap gap-2">
          {TYPE_FILTERS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTypeFilter(value)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                typeFilter === value ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">状态</p>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              disabled={typeFilter === 'location' || typeFilter === 'container'}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                statusFilter === value ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">位置树</p>
          {selectedLocation && (
            <button
              type="button"
              onClick={() => handleSelectLocation(null)}
              className="text-xs font-medium text-sky-500"
            >
              清空
            </button>
          )}
        </div>

        <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-3">
          <LocationTreePanel
            items={allItems}
            selectedLocationId={selectedLocationId}
            onSelectLocation={handleSelectLocation}
            allLabel="全部位置"
            emptyLabel="先把收纳标记为位置，才能使用位置树筛选。"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 md:flex-row">
      <div className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur-xl md:hidden">
        <div className="space-y-3 px-4 pb-3 pt-4">
          <h1 className="text-xl font-bold text-slate-900">总览</h1>
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索收纳、位置、物品名称、描述或标签..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={15} />
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {TYPE_FILTERS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTypeFilter(value)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  typeFilter === value ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowLocationSheet(true)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedLocation ? 'bg-sky-50 text-sky-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FolderTree size={12} />
              {selectedLocation?.name ?? '位置树'}
            </button>
            <div className="mx-1 w-px shrink-0 self-stretch bg-slate-200" />
            {STATUS_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                disabled={typeFilter === 'location' || typeFilter === 'container'}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  statusFilter === value ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <aside className="sticky top-0 hidden h-screen w-72 overflow-y-auto border-r border-slate-100 bg-white md:flex md:flex-col lg:w-80">
        <div className="border-b border-slate-50 px-6 pb-4 pt-6">
          <h1 className="mb-1 text-xl font-bold text-slate-900">总览</h1>
          <p className="mb-4 text-sm text-slate-500">查看全部收纳、位置与物品，并通过位置树缩小范围。</p>
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索收纳、位置、物品名称、描述或标签..."
              autoFocus
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        <div className="px-6 py-5">
          <FilterSection />
        </div>
      </aside>

      <div
        ref={scrollRootRef}
        data-scroll-root
        className="flex min-h-full flex-1 flex-col overflow-y-auto px-4 py-4 md:px-8 md:py-6"
      >
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-12"
            >
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
            </motion.div>
          ) : total === 0 ? (
            <motion.div
              key="no-results"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <Package size={28} className="text-slate-300" />
              </div>
              <p className="mb-1 font-semibold text-slate-700">当前筛选下没有结果</p>
              <p className="text-sm text-slate-400">
                {selectedLocation ? `试试其他关键词，或切换位置「${selectedLocation.name}」。` : '试试其他关键词或调整筛选条件。'}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-full flex-col"
            >
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span>共 {total} 个结果</span>
                {query && <span>· 搜索词「{query.trim()}」</span>}
                {selectedLocation && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-sky-600">
                    <MapPin size={11} />
                    位置「{selectedLocation.name}」
                  </span>
                )}
              </div>

              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3"
              >
                {displayedResults.map(({ item, path }) => (
                  <motion.button
                    key={item.id}
                    variants={staggerItem}
                    type="button"
                    onClick={() => navigate(resolveItemDetailPath(item))}
                    whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                    className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                      {item.images.length > 0 ? (
                        <img src={item.images[0]} alt={item.name} className="h-full w-full object-cover" />
                      ) : item.type === 'item' ? (
                        <Package size={20} className="text-slate-300" />
                      ) : isLocationItem(item) ? (
                        <MapPin size={20} className="text-sky-400" />
                      ) : (
                        <Box size={20} className="text-slate-300" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-800">{item.name}</p>
                        {item.type === 'item' ? (
                          <StatusBadge status={item.status} />
                        ) : (
                          <span className="shrink-0 rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-600">
                            {getContainerTypeLabel(item)}
                          </span>
                        )}
                      </div>
                      {item.category && (
                        <p className="mb-0.5 truncate text-xs text-slate-500">{item.category}</p>
                      )}
                      {path && (
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <ChevronRight size={10} />
                          <span className="truncate">{path}</span>
                        </div>
                      )}
                    </div>
                    <ChevronRight size={16} className="shrink-0 text-slate-300" />
                  </motion.button>
                ))}
              </motion.div>

              {!isMobile ? (
                <div className="pt-8 lg:sticky lg:bottom-6">
                  <PaginationControls
                    page={page}
                    pageSize={pageSize}
                    total={total}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    onPageSizeChange={(nextPageSize) => {
                      setPageSize(nextPageSize);
                      setPage(1);
                    }}
                    className="mt-0 bg-white/95 backdrop-blur lg:shadow-lg"
                  />
                </div>
              ) : (
                <div className="pt-5 text-center text-xs text-slate-400">
                  {paginationMeta.hasNextPage
                    ? `已加载 ${displayedResults.length} / ${total}，继续上滑加载更多`
                    : `已展示全部 ${total} 个结果`}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showLocationSheet && (
          <div className="fixed inset-0 z-50 flex items-end justify-center md:hidden">
            <motion.div
              className="absolute inset-0 bg-black/25 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLocationSheet(false)}
            />
            <motion.div
              className="relative flex max-h-[75vh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            >
              <div className="mx-auto mb-2 mt-3 h-1 w-10 rounded-full bg-slate-200" />
              <div className="flex items-center justify-between border-b border-slate-100 px-5 pb-4 pt-2">
                <div>
                  <h2 className="font-semibold text-slate-900">位置树筛选</h2>
                  <p className="mt-1 text-xs text-slate-400">选择一个位置后，总览只显示该位置下的内容。</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLocationSheet(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="overflow-y-auto p-4">
                <LocationTreePanel
                  items={allItems}
                  selectedLocationId={selectedLocationId}
                  onSelectLocation={handleSelectLocation}
                  allLabel="全部位置"
                  emptyLabel="先把收纳标记为位置，才能使用位置树筛选。"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
