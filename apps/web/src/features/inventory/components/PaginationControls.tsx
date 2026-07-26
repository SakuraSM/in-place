import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

interface PaginationControlsProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  className?: string;
}

const PAGE_SIZE_OPTIONS = [12, 24, 48, 96];

function buildPageItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pageSet = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const pages = Array.from(pageSet)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);

  const items: Array<number | 'ellipsis'> = [];
  for (const page of pages) {
    const previous = items[items.length - 1];
    if (typeof previous === 'number' && page - previous > 1) {
      items.push('ellipsis');
    }
    items.push(page);
  }

  return items;
}

export default function PaginationControls({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
  className,
}: PaginationControlsProps) {
  const [jumpPage, setJumpPage] = useState(String(page));

  useEffect(() => {
    setJumpPage(String(page));
  }, [page]);

  const pageItems = buildPageItems(page, totalPages);

  return (
    <nav
      aria-label="库存分页"
      className={`mt-6 flex flex-col gap-3 rounded-2xl border border-borderSoft bg-surface p-4 shadow-sm md:flex-row md:items-center md:justify-between ${className ?? ''}`}
    >
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <span>共 {total} 项</span>
        <span className="hidden md:inline text-slate-300">|</span>
        <label className="flex items-center gap-2">
          <span>每页</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="rounded-lg border border-border bg-surfaceMuted px-2.5 py-1.5 text-sm text-slate-700 focus:border-brandStrong focus:outline-none focus:ring-2 focus:ring-brand/20"
          >
            {PAGE_SIZE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <span className="hidden md:inline text-slate-300">|</span>
        <span>第 {page} / {totalPages} 页</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="inline-flex h-10 items-center gap-1 rounded-xl border border-border bg-surface px-3 text-sm text-slate-600 transition-colors hover:bg-brandTint disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={16} />
          上一页
        </button>

        <div className="hidden items-center gap-2 md:flex">
          {pageItems.map((item, index) => {
            if (item === 'ellipsis') {
              return (
                <span key={`ellipsis-${index}`} className="inline-flex h-10 w-10 items-center justify-center text-slate-300">
                  <MoreHorizontal size={16} />
                </span>
              );
            }

            const isActive = item === page;
            return (
              <button
                type="button"
                key={item}
                onClick={() => onPageChange(item)}
                className={`inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm transition-colors ${
                  isActive
                    ? 'bg-brandStrong text-white shadow-sm shadow-teal-100'
                    : 'border border-border bg-surface text-slate-600 hover:bg-brandTint'
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            aria-label="跳转到页码"
            min={1}
            max={totalPages}
            value={jumpPage}
            onChange={(event) => setJumpPage(event.target.value)}
            className="h-10 w-16 rounded-xl border border-border bg-surfaceMuted px-3 text-center text-sm text-slate-700 focus:border-brandStrong focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          <button
            type="button"
            onClick={() => {
              const nextPage = Number(jumpPage);
              if (!Number.isFinite(nextPage)) {
                return;
              }
              onPageChange(Math.min(totalPages, Math.max(1, nextPage)));
            }}
            className="inline-flex h-10 items-center rounded-xl border border-border bg-surface px-3 text-sm text-slate-600 transition-colors hover:bg-brandTint"
          >
            跳转
          </button>
        </div>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="inline-flex h-10 items-center gap-1 rounded-xl border border-border bg-surface px-3 text-sm text-slate-600 transition-colors hover:bg-brandTint disabled:cursor-not-allowed disabled:opacity-40"
        >
          下一页
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
}
