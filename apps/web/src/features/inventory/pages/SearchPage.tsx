import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, X, Package, ChevronRight, Box, Archive, MapPin, FolderTree, Tags, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ItemStatus, ItemType } from '../../../legacy/database.types';
import StatusBadge from '../../../shared/ui/StatusBadge';
import { staggerContainer, staggerItem } from '../../../shared/lib/animations';
import { APP_PAGE_CONTENT, APP_PAGE_HEADER, APP_PAGE_HEADER_STACK } from '../../../shared/ui/pageHeader';
import { resolveItemDetailPath } from '../lib/detailPath';
import PaginationControls from '../components/PaginationControls';
import { useIsMobile } from '../../../shared/lib/useIsMobile';
import LocationTreePanel from '../components/LocationTreePanel';
import { useAllInventoryItems } from '../hooks/useAllInventoryItems';
import { buildItemIdMap, buildItemPath } from '../lib/locationTree';
import { getContainerTypeLabel, isLocationItem } from '../lib/locationTag';
import { searchItemsPage } from '../../../legacy/items';
import { useAuth } from '../../../app/providers/AuthContext';
import { buildInventoryImageUrl } from '../lib/itemImage';

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

const VALID_TYPE_VALUES = TYPE_FILTERS.map((f) => f.value);
const VALID_STATUS_VALUES = STATUS_FILTERS.map((f) => f.value);

export default function SearchPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const { data: allItems = [], isLoading } = useAllInventoryItems();
  const tagPopoverRef = useRef<HTMLDivElement | null>(null);

  const [query, setQuery] = useState('');

  const typeParam = searchParams.get('type') as TypeFilterValue | null;
  const statusParam = searchParams.get('status') as ItemStatus | 'all' | null;
  const tagParams = searchParams.getAll('tag');

  const statusFilter: ItemStatus | 'all' =
    statusParam && (VALID_STATUS_VALUES as string[]).includes(statusParam) ? statusParam : 'all';
  const typeFilter: TypeFilterValue =
    typeParam && (VALID_TYPE_VALUES as string[]).includes(typeParam) ? typeParam : 'all';
  const selectedTags = tagParams;
  const selectedTagsKey = tagParams.join('\u0000');
  const [tagQuery, setTagQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [showLocationSheet, setShowLocationSheet] = useState(false);
  const [showTagSheet, setShowTagSheet] = useState(false);
  const [showTagPopover, setShowTagPopover] = useState(false);
  const scrollRootRef = useRef<HTMLDivElement | null>(null);

  const selectedLocationId = searchParams.get('locationId');
  const itemMap = useMemo(() => buildItemIdMap(allItems), [allItems]);
  const selectedLocation = selectedLocationId ? itemMap.get(selectedLocationId) ?? null : null;
  const availableTags = useMemo(
    () => Array.from(new Set(allItems.flatMap((item) => item.tags)))
      .sort((left, right) => left.localeCompare(right, 'zh-CN')),
    [allItems],
  );
  const tagCounts = useMemo(
    () => allItems.reduce<Record<string, number>>((acc, item) => {
      for (const tag of item.tags) {
        acc[tag] = (acc[tag] ?? 0) + 1;
      }
      return acc;
    }, {}),
    [allItems],
  );
  const normalizedTagQuery = tagQuery.trim().toLocaleLowerCase('zh-CN');
  const filteredAvailableTags = useMemo(
    () => availableTags.filter((tag) => tag.toLocaleLowerCase('zh-CN').includes(normalizedTagQuery)),
    [availableTags, normalizedTagQuery],
  );

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

  const normalizedQuery = query.trim().toLocaleLowerCase('zh-CN');

  useEffect(() => {
    setPage(1);
  }, [query, selectedTagsKey, statusFilter, typeFilter, pageSize, selectedLocationId]);

  useEffect(() => {
    if (!showTagPopover) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!tagPopoverRef.current?.contains(event.target as Node)) {
        setShowTagPopover(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [showTagPopover]);

  const updateSearchFilters = useCallback((
    updater: (nextSearchParams: URLSearchParams) => void,
    options?: { replace?: boolean; resetPage?: boolean },
  ) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    updater(nextSearchParams);

    if (nextSearchParams.toString() === searchParams.toString()) {
      return;
    }

    if (options?.resetPage ?? true) {
      setPage(1);
    }

    setSearchParams(nextSearchParams, { replace: options?.replace ?? true });
  }, [searchParams, setSearchParams]);

  const handleTypeFilterChange = useCallback((value: TypeFilterValue) => {
    updateSearchFilters((nextSearchParams) => {
      if (value === 'all') {
        nextSearchParams.delete('type');
      } else {
        nextSearchParams.set('type', value);
      }

      if (value === 'location' || value === 'container') {
        nextSearchParams.delete('status');
      }
    });
  }, [updateSearchFilters]);

  const handleStatusFilterChange = useCallback((value: ItemStatus | 'all') => {
    updateSearchFilters((nextSearchParams) => {
      if (value === 'all') {
        nextSearchParams.delete('status');
      } else {
        nextSearchParams.set('status', value);
      }
    });
  }, [updateSearchFilters]);

  const effectiveTypeFilter = typeFilter === 'location' ? 'container' : typeFilter === 'all' ? undefined : typeFilter;
  const effectiveStatusFilter = typeFilter === 'location' || typeFilter === 'container' ? undefined : statusFilter === 'all' ? undefined : statusFilter;

  const { data: searchResponse, isLoading: isSearchLoading } = useQuery({
    queryKey: ['inventory', 'overview-search', user?.id, normalizedQuery, effectiveTypeFilter, effectiveStatusFilter, selectedLocationId, selectedTagsKey, page, pageSize, typeFilter],
    enabled: Boolean(user?.id),
    placeholderData: (previous) => previous,
    queryFn: async () => searchItemsPage(normalizedQuery, user!.id, {
      page,
      pageSize,
      type: effectiveTypeFilter,
      status: effectiveStatusFilter,
      locationId: selectedLocationId,
      locationOnly: typeFilter === 'location',
      tags: selectedTags,
    }),
  });

  const displayedResults = useMemo(
    () => (searchResponse?.data ?? []).map((item) => ({
      item,
      path: buildItemPath(item, itemMap),
    })),
    [searchResponse?.data, typeFilter],
  );
  const total = searchResponse?.meta.total ?? 0;
  const totalPages = searchResponse?.meta.totalPages ?? 1;
  const paginationMeta = searchResponse?.meta ?? {
    page,
    pageSize,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
  };

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handleSelectLocation = (locationId: string | null) => {
    updateSearchFilters((nextSearchParams) => {
      if (locationId) {
        nextSearchParams.set('locationId', locationId);
      } else {
        nextSearchParams.delete('locationId');
      }
    });
    setShowLocationSheet(false);
  };

  const toggleTag = (tag: string) => {
    updateSearchFilters((nextSearchParams) => {
      const nextTags = selectedTags.includes(tag)
        ? selectedTags.filter((value) => value !== tag)
        : [...selectedTags, tag];

      nextSearchParams.delete('tag');
      nextTags.forEach((value) => nextSearchParams.append('tag', value));
    });
  };

  const clearTags = () => {
    updateSearchFilters((nextSearchParams) => {
      nextSearchParams.delete('tag');
    });
    setTagQuery('');
  };

  const loadNextPage = useCallback(() => {
    if (!isMobile || !paginationMeta.hasNextPage || isSearchLoading) {
      return;
    }

    setPage((current) => current + 1);
  }, [isMobile, isSearchLoading, paginationMeta.hasNextPage]);

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
              onClick={() => handleTypeFilterChange(value)}
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
              onClick={() => handleStatusFilterChange(value)}
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
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">标签</p>
          {selectedTags.length > 0 && (
            <button
              type="button"
              onClick={clearTags}
              className="text-xs font-medium text-sky-500"
            >
              清空
            </button>
          )}
        </div>
        {availableTags.length === 0 ? (
          <p className="text-xs text-slate-400">还没有可筛选的标签</p>
        ) : (
          <div ref={tagPopoverRef} className="relative">
            <button
              type="button"
              onClick={() => setShowTagPopover((current) => !current)}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition-colors ${
                selectedTags.length > 0
                  ? 'border-sky-200 bg-sky-50 text-sky-700'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
              }`}
            >
              <span className="truncate">
                {selectedTags.length > 0 ? `已选 ${selectedTags.length} 个标签` : '点击选择标签'}
              </span>
              <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[11px] text-slate-500">
                {availableTags.length}
              </span>
            </button>

            {showTagPopover && (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={tagQuery}
                    onChange={(event) => setTagQuery(event.target.value)}
                    placeholder="搜索标签"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  {tagQuery && (
                    <button
                      type="button"
                      onClick={() => setTagQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="max-h-64 space-y-1 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/70 p-2">
                  <button
                    type="button"
                    onClick={clearTags}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                      selectedTags.length === 0 ? 'bg-sky-500 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span>全部标签</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] ${selectedTags.length === 0 ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {availableTags.length}
                    </span>
                  </button>
                  {filteredAvailableTags.length === 0 ? (
                    <div className="px-3 py-8 text-center text-xs text-slate-400">没有匹配的标签</div>
                  ) : (
                    filteredAvailableTags.map((tag) => {
                      const active = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                            active ? 'bg-sky-500 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          <span className="truncate">{tag}</span>
                          <span className={`ml-3 shrink-0 rounded-full px-2 py-0.5 text-[11px] ${active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>
                            {tagCounts[tag] ?? 0}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}
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
            emptyLabel="还没有位置"
          />
        </div>
        </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 md:flex-row">
      <div className={`${APP_PAGE_HEADER} md:hidden`}>
        <div className={`${APP_PAGE_HEADER_STACK} space-y-3`}>
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
          <div className="space-y-2">
            <div role="group" aria-label="按类型筛选" className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-medium text-slate-400">类型</span>
              {TYPE_FILTERS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleTypeFilterChange(value)}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    typeFilter === value ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Icon size={12} />
                  {label}
                </button>
              ))}
            </div>
            <div role="group" aria-label="按状态筛选" className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-medium text-slate-400">状态</span>
              {STATUS_FILTERS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleStatusFilterChange(value)}
                  disabled={typeFilter === 'location' || typeFilter === 'container'}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    statusFilter === value ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div role="group" aria-label="按范围筛选" className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-medium text-slate-400">范围</span>
              <button
                type="button"
                onClick={() => setShowLocationSheet(true)}
                title={selectedLocation?.name ?? '位置树'}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedLocation ? 'bg-sky-50 text-sky-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <FolderTree size={12} />
                <span className="max-w-[8rem] truncate">{selectedLocation?.name ?? '位置树'}</span>
              </button>
              {availableTags.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowTagSheet(true)}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    selectedTags.length > 0 ? 'bg-sky-50 text-sky-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Tags size={12} />
                  {selectedTags.length > 0 ? `标签 · ${selectedTags.length}` : '标签筛选'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <aside className="sticky top-0 hidden h-screen w-72 overflow-y-auto border-r border-slate-100 bg-white md:flex md:flex-col lg:w-80">
        <div className="border-b border-slate-50 px-6 pb-4 pt-6">
          <h1 className="mb-4 text-xl font-bold text-slate-900">总览</h1>
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
        className={`flex min-h-full flex-1 flex-col overflow-y-auto ${APP_PAGE_CONTENT}`}
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
                {selectedTags.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-sky-600">
                    <Tags size={11} />
                    标签 {selectedTags.length} 项
                  </span>
                )}
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
                        <img src={buildInventoryImageUrl(item.images[0], 'icon')} alt={item.name} className="h-full w-full object-cover" />
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
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        {path ? (
                          <>
                            <Home size={11} className="shrink-0" />
                            <ChevronRight size={10} />
                            <span className="truncate">{path}</span>
                          </>
                        ) : (
                          <>
                            <Home size={11} className="shrink-0" />
                            <span className="truncate">根目录</span>
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={16} className="shrink-0 text-slate-300" />
                  </motion.button>
                ))}
              </motion.div>

              {!isMobile ? (
                <div className="mt-auto pt-8 lg:sticky lg:bottom-6">
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
        {showTagSheet && (
          <div className="fixed inset-0 z-50 flex items-end justify-center md:hidden">
            <motion.div
              className="absolute inset-0 bg-black/25 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTagSheet(false)}
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
                <h2 className="font-semibold text-slate-900">标签筛选</h2>
                <button
                  type="button"
                  onClick={() => setShowTagSheet(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      value={tagQuery}
                      onChange={(event) => setTagQuery(event.target.value)}
                      placeholder="搜索标签"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    {tagQuery && (
                      <button
                        type="button"
                        onClick={() => setTagQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                        onClick={() => {
                          clearTags();
                          setShowTagSheet(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition-colors ${
                        selectedTags.length === 0 ? 'bg-sky-500 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>全部标签</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] ${selectedTags.length === 0 ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        {availableTags.length}
                      </span>
                    </button>
                    {filteredAvailableTags.length === 0 ? (
                      <div className="px-3 py-10 text-center text-sm text-slate-400">没有匹配的标签</div>
                    ) : (
                      filteredAvailableTags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition-colors ${
                            selectedTags.includes(tag) ? 'bg-sky-500 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="truncate">{tag}</span>
                          <span className={`ml-3 shrink-0 rounded-full px-2 py-0.5 text-[11px] ${selectedTags.includes(tag) ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>
                            {tagCounts[tag] ?? 0}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
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
                <h2 className="font-semibold text-slate-900">位置树筛选</h2>
                <button
                  type="button"
                  onClick={() => setShowLocationSheet(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <LocationTreePanel
                  items={allItems}
                  selectedLocationId={selectedLocationId}
                  onSelectLocation={handleSelectLocation}
                  allLabel="全部位置"
                  emptyLabel="还没有位置"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
