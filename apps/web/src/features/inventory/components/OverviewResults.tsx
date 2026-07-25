import { Box, ChevronRight, Home, MapPin, Package, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Item } from '../../../legacy/database.types';
import StatusBadge from '../../../shared/ui/StatusBadge';
import { staggerContainer, staggerItem } from '../../../shared/lib/animations';
import { buildInventoryImageUrl } from '../lib/itemImage';
import { isLocationItem } from '../lib/locationTag';
import PaginationControls from './PaginationControls';
import EntityBadge from './EntityBadge';
import { getItemCategoryScope } from '../lib/categoryScope';

export interface OverviewResult {
  item: Item;
  path: string;
}

interface OverviewResultsProps {
  results: OverviewResult[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  isMobile: boolean;
  isInitialLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  emptyDescription: string;
  onOpenItem: (item: Item) => void;
  onRetry: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onLoadMore: () => void;
}

function ResultCard({ result, onOpen }: { result: OverviewResult; onOpen: () => void }) {
  const { item, path } = result;

  return (
    <motion.button
      variants={staggerItem}
      type="button"
      onClick={onOpen}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      className="flex min-h-24 cursor-pointer items-center gap-3 rounded-2xl border border-borderSoft bg-surface p-4 text-left shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surfaceMuted">
        {item.images.length > 0 ? (
          <img src={buildInventoryImageUrl(item.images[0], 'icon')} alt="" className="h-full w-full object-cover" />
        ) : item.type === 'item' ? (
          <Package size={20} className="text-slate-400" />
        ) : isLocationItem(item) ? (
          <MapPin size={20} className="text-brandStrong" />
        ) : (
          <Box size={20} className="text-slate-400" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <p className="truncate text-sm font-bold text-slate-900">{item.name}</p>
          <EntityBadge kind={getItemCategoryScope(item)} compact />
        </div>
        <div className="mb-1 flex items-center gap-2">
          {item.category ? <p className="truncate text-xs text-violet-700">类别 · {item.category}</p> : null}
          {item.type === 'item' ? <StatusBadge status={item.status} /> : null}
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Home size={11} className="shrink-0" />
          {path ? <ChevronRight size={10} /> : null}
          <span className="truncate">{path || '根目录'}</span>
        </div>
      </div>
      <ChevronRight size={16} className="shrink-0 text-slate-400" />
    </motion.button>
  );
}

export default function OverviewResults({
  results,
  total,
  page,
  pageSize,
  totalPages,
  hasNextPage,
  isMobile,
  isInitialLoading,
  isFetching,
  isError,
  emptyDescription,
  onOpenItem,
  onRetry,
  onPageChange,
  onPageSizeChange,
  onLoadMore,
}: OverviewResultsProps) {
  if (isInitialLoading) {
    return (
      <div role="status" className="flex min-h-64 items-center justify-center text-sm text-slate-600">
        <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-brandStrong border-t-transparent" />
        正在加载库存…
      </div>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-rose-100 bg-rose-50 p-8 text-center">
        <p className="font-bold text-rose-800">总览加载失败</p>
        <p className="mt-2 text-sm text-rose-700">请检查网络连接后重试，当前筛选条件会保留。</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-rose-700 px-4 text-sm font-bold text-white"
        >
          <RefreshCw size={16} />
          重新加载
        </button>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surfaceMuted">
          <Package size={28} className="text-slate-400" />
        </div>
        <p className="font-bold text-slate-800">当前筛选下没有结果</p>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          共 <strong className="text-slate-900">{total}</strong> 个结果
        </p>
        {isFetching ? <span role="status" className="text-xs text-slate-500">正在更新…</span> : null}
      </div>

      <motion.div
        variants={staggerContainer}
        animate="animate"
        className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3"
      >
        {results.map((result) => (
          <ResultCard
            key={result.item.id}
            result={result}
            onOpen={() => onOpenItem(result.item)}
          />
        ))}
      </motion.div>

      {!isMobile ? (
        <div className="mt-auto pt-8 lg:sticky lg:bottom-6">
          <PaginationControls
            page={page}
            pageSize={pageSize}
            total={total}
            totalPages={totalPages}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            className="mt-0 border-borderSoft bg-surface/95 backdrop-blur lg:shadow-lg"
          />
        </div>
      ) : (
        <div className="pt-6 text-center">
          {hasNextPage ? (
            <button
              type="button"
              onClick={onLoadMore}
              disabled={isFetching}
              className="min-h-11 rounded-xl border border-border bg-surface px-5 text-sm font-bold text-brandStrong disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isFetching ? '加载中…' : `加载更多（已展示 ${results.length} / ${total}）`}
            </button>
          ) : (
            <p className="text-xs text-slate-500">已展示全部 {total} 个结果</p>
          )}
        </div>
      )}
    </div>
  );
}
