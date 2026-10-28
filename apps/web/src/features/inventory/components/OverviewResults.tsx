import { ChevronRight, Home, Package, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Item } from '../../../legacy/database.types';
import StatusBadge from '../../../shared/ui/StatusBadge';
import { staggerContainer, staggerItem } from '../../../shared/lib/animations';
import { buildInventoryImageUrl } from '../lib/itemImage';
import InventoryArtwork from './InventoryArtwork';
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
    <motion.button variants={staggerItem} type="button" onClick={onOpen} whileTap={{ scale: 0.99 }} className="group min-w-0 overflow-hidden rounded-2xl border border-border bg-surface text-left transition-colors hover:border-brand/40">
      <div className="relative h-[122px] bg-surfaceMuted md:h-36">
        {item.images.length ? <img src={buildInventoryImageUrl(item.images[0], 'card')} alt="" className="h-full w-full object-cover" /> : <InventoryArtwork item={item} />}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1"><EntityBadge kind={getItemCategoryScope(item)} compact />{item.type === 'item' ? <StatusBadge status={item.status} /> : null}</div>
      </div>
      <div className="space-y-2 p-3 md:p-4">
        <p className="truncate text-sm font-semibold text-ink">{item.name}</p>
        {item.category ? <p className="truncate text-xs text-muted">{item.category}</p> : null}
        <p className="flex items-center gap-1 text-[11px] text-muted"><Home size={12} className="shrink-0" /><span className="truncate">{path || '根目录'}</span></p>
        <div className="flex items-center justify-between text-xs text-muted"><span>{item.quantity} 件</span><ChevronRight size={15} /></div>
      </div>
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
      <div role="status" className="flex min-h-64 flex-1 items-center justify-center text-sm text-slate-600">
        <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-brandStrong border-t-transparent" />
        正在加载库存…
      </div>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="flex min-h-64 flex-1 flex-col items-center justify-center rounded-3xl border border-rose-100 bg-rose-50 p-8 text-center">
        <p className="font-semibold text-rose-800">库存加载失败</p>
        <p className="mt-2 text-sm text-rose-700">请检查网络连接后重试，当前筛选条件会保留。</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-rose-700 px-4 text-sm font-semibold text-white"
        >
          <RefreshCw size={16} />
          重新加载
        </button>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="flex min-h-64 flex-1 flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surfaceMuted">
          <Package size={28} className="text-muted" />
        </div>
        <p className="font-semibold text-slate-800">当前筛选下没有结果</p>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          共 <strong className="text-slate-900">{total}</strong> 个结果
        </p>
        {isFetching ? <span role="status" className="text-xs text-slate-500">正在更新…</span> : null}
      </div>

      <motion.div
        variants={staggerContainer}
        animate="animate"
        className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4"
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
        <div className="mt-auto pt-8">
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
              className="min-h-11 rounded-xl border border-border bg-surface px-5 text-sm font-semibold text-brandStrong disabled:cursor-not-allowed disabled:opacity-50"
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
