import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Package, ChevronRight, Box, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../app/providers/AuthContext';
import { searchItemsPage, fetchAncestors } from '../../../legacy/items';
import type { Item, ItemStatus, ItemType } from '../../../legacy/database.types';
import StatusBadge from '../../../shared/ui/StatusBadge';
import { staggerContainer, staggerItem } from '../../../shared/lib/animations';
import { resolveItemDetailPath } from '../lib/detailPath';
import PaginationControls from '../components/PaginationControls';
import { useIsMobile } from '../../../shared/lib/useIsMobile';

const STATUS_FILTERS: { value: ItemStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'in_stock', label: '在库' },
  { value: 'borrowed', label: '借出' },
  { value: 'worn_out', label: '损耗' },
];

const TYPE_FILTERS: { value: ItemType | 'all'; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: '全部', icon: Archive },
  { value: 'container', label: '容器', icon: Box },
  { value: 'item', label: '物品', icon: Package },
];

interface ItemWithPath {
  item: Item;
  path: string;
}

export default function SearchPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [results, setResults] = useState<ItemWithPath[]>([]);
  const [loading, setLoading] = useState(false);
  const [paginationMeta, setPaginationMeta] = useState<{ page: number; totalPages: number; total: number; hasNextPage: boolean } | null>(null);
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ItemType | 'all'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRootRef = useRef<HTMLDivElement | null>(null);
  const activeStatusFilter: ItemStatus | undefined =
    typeFilter === 'container' || statusFilter === 'all' ? undefined : statusFilter;
  const activeTypeFilter: ItemType | undefined = typeFilter === 'all' ? undefined : typeFilter;

  const doSearch = useCallback(
    async (q: string, nextPage: number, options?: { append?: boolean }) => {
      if (!user) return;
      setLoading(true);
      try {
        const response = await searchItemsPage(q, user.id, {
          page: nextPage,
          pageSize,
          type: activeTypeFilter,
          status: activeStatusFilter,
        });
        const data = response.data;
        setPaginationMeta(response.meta);

        const withPaths = await Promise.all(
          data.map(async (item) => {
            const ancestors = await fetchAncestors(item.id);
            const path = ancestors.slice(0, -1).map((a) => a.name).join(' > ');
            return { item, path };
          })
        );
        setResults((current) => (options?.append ? [...current, ...withPaths] : withPaths));
      } finally {
        setLoading(false);
      }
    },
    [activeStatusFilter, activeTypeFilter, pageSize, user]
  );

  const loadNextPage = useCallback(() => {
    if (!isMobile || !paginationMeta?.hasNextPage || loading) {
      return;
    }

    setPage((current) => (current === paginationMeta.page ? current + 1 : current));
  }, [isMobile, loading, paginationMeta]);

  useEffect(() => {
    void doSearch(appliedQuery, page, { append: isMobile && page > 1 });
  }, [appliedQuery, doSearch, isMobile, page]);

  useEffect(() => {
    setPage(1);
    setResults([]);
  }, [pageSize, statusFilter, typeFilter]);

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

  useEffect(() => {
    if (!isMobile) {
      return;
    }

    const handleWindowScroll = () => {
      const distanceFromBottom = document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
      if (distanceFromBottom < 160) {
        loadNextPage();
      }
    };

    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleWindowScroll);
    };
  }, [isMobile, loadNextPage]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setPage(1);
    setResults([]);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setAppliedQuery(value);
    }, 400);
  };

  const handleItemClick = (item: Item) => {
    navigate(resolveItemDetailPath(item));
  };

  const FilterSection = () => (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">类型</p>
        <div className="flex flex-wrap gap-2">
          {TYPE_FILTERS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTypeFilter(value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">状态</p>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              disabled={typeFilter === 'container'}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                statusFilter === value ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <div className="md:hidden sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-100">
        <div className="px-4 pt-4 pb-3 space-y-3">
          <h1 className="text-xl font-bold text-slate-900">总览</h1>
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="在总览中搜索物品名称、描述、标签..."
              className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition text-sm"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setAppliedQuery('');
                  setPage(1);
                  setResults([]);
                  void doSearch('', 1);
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={15} />
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {TYPE_FILTERS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTypeFilter(value)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  typeFilter === value ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
            <div className="w-px bg-slate-200 shrink-0 self-stretch mx-1" />
            {STATUS_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                disabled={typeFilter === 'container'}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  statusFilter === value ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <aside className="hidden md:flex flex-col w-72 lg:w-80 border-r border-slate-100 bg-white sticky top-0 h-screen overflow-y-auto">
        <div className="px-6 pt-6 pb-4 border-b border-slate-50">
          <h1 className="text-xl font-bold text-slate-900 mb-1">总览</h1>
          <p className="mb-4 text-sm text-slate-500">查看全部内容，并附带搜索与筛选能力。</p>
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="在总览中搜索物品名称、描述、标签..."
              autoFocus
              className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition text-sm"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setAppliedQuery('');
                  setPage(1);
                  setResults([]);
                  void doSearch('', 1);
                }}
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

      <div ref={scrollRootRef} data-scroll-root className="flex min-h-full flex-1 flex-col px-4 md:px-8 py-4 md:py-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          {loading && results.length === 0 && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-12"
            >
              <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            </motion.div>
          )}

          {!loading && results.length === 0 && (
            <motion.div
              key="no-results"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
                <Package size={28} className="text-slate-300" />
              </div>
              <p className="font-semibold text-slate-700 mb-1">总览中未找到结果</p>
              <p className="text-slate-400 text-sm">尝试其他关键词或调整筛选条件</p>
            </motion.div>
          )}

          {!loading && results.length > 0 && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex min-h-full flex-col">
              <p className="text-xs text-slate-400 mb-4">
                共 {paginationMeta?.total ?? results.length} 个结果
                {appliedQuery && <span className="ml-1">· 搜索词「{appliedQuery}」</span>}
              </p>
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3"
              >
                {results.map(({ item, path }) => (
                  <motion.button
                    key={item.id}
                    variants={staggerItem}
                    onClick={() => handleItemClick(item)}
                    whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                    className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm text-left flex items-center gap-3 cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center">
                      {item.images.length > 0 ? (
                        <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
                      ) : item.type === 'container' ? (
                        <Box size={20} className="text-slate-300" />
                      ) : (
                        <Package size={20} className="text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-slate-800 text-sm truncate">{item.name}</p>
                        {item.type === 'item' && <StatusBadge status={item.status} />}
                        {item.type === 'container' && (
                          <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-600 text-[10px] font-medium">容器</span>
                        )}
                      </div>
                      {item.category && (
                        <p className="text-xs text-slate-500 truncate mb-0.5">{item.category}</p>
                      )}
                      {path && (
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <ChevronRight size={10} />
                          <span className="truncate">{path}</span>
                        </div>
                      )}
                    </div>
                    <ChevronRight size={16} className="text-slate-300 shrink-0" />
                  </motion.button>
                ))}
              </motion.div>
              {!isMobile && paginationMeta ? (
                <div className="mt-auto pt-8 lg:sticky lg:bottom-6">
                  <PaginationControls
                    page={paginationMeta.page}
                    pageSize={pageSize}
                    total={paginationMeta.total}
                    totalPages={paginationMeta.totalPages}
                    onPageChange={setPage}
                    onPageSizeChange={(nextPageSize) => {
                      setPageSize(nextPageSize);
                      setPage(1);
                    }}
                    className="mt-0 bg-white/95 backdrop-blur lg:shadow-lg"
                  />
                </div>
              ) : null}
              {isMobile && paginationMeta ? (
                <div className="pt-5 text-center text-xs text-slate-400">
                  {loading && page > 1
                    ? '正在加载更多...'
                    : paginationMeta.hasNextPage
                      ? `已加载 ${results.length} / ${paginationMeta.total}，继续上滑加载更多`
                      : `已展示全部 ${paginationMeta.total} 个结果`}
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
