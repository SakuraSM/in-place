import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../app/providers/auth-context';
import type { Item } from '../../../legacy/database.types';
import { searchItemsPage } from '../../../legacy/items';
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue';
import { useIsMobile } from '../../../shared/lib/useIsMobile';
import ResponsiveDialog from '../../../shared/ui/ResponsiveDialog';
import { APP_PAGE_CONTENT } from '../../../shared/ui/pageHeader';
import OverviewFilters from '../components/OverviewFilters';
import OverviewResults from '../components/OverviewResults';
import OverviewActiveFilters from '../components/OverviewActiveFilters';
import {
  OverviewMobileHeader,
  OverviewSearchField,
} from '../components/OverviewSearchHeader';
import { useAllInventoryItems } from '../hooks/useAllInventoryItems';
import { resolveItemDetailPath } from '../lib/detailPath';
import { buildItemIdMap, buildItemPath } from '../lib/locationTree';
import { isLocationItem } from '../lib/locationTag';
import {
  countActiveOverviewFilters,
  parseOverviewSearchParams,
  serializeOverviewSearchState,
  type OverviewSearchState,
  type OverviewStatusFilter,
  type OverviewTypeFilter,
} from '../lib/overviewSearchParams';

export default function SearchPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseOverviewSearchParams(searchParams), [searchParams]);
  const [queryInput, setQueryInput] = useState(filters.q);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [mobileResults, setMobileResults] = useState<Item[]>([]);
  const skipNextDebouncedWrite = useRef(false);
  const previousUrlQuery = useRef(filters.q);
  const debouncedQuery = useDebouncedValue(queryInput, 300);
  const { data: allItems = [], isLoading: isInventoryLoading } = useAllInventoryItems();

  useEffect(() => {
    const canonicalParams = serializeOverviewSearchState(filters);
    if (canonicalParams.toString() !== searchParams.toString()) {
      setSearchParams(canonicalParams, { replace: true });
    }
  }, [filters, searchParams, setSearchParams]);

  const updateFilters = useCallback((
    patch: Partial<OverviewSearchState>,
    options: { replace?: boolean; resetPage?: boolean } = {},
  ) => {
    const nextState: OverviewSearchState = {
      ...filters,
      ...patch,
      page: options.resetPage === false ? (patch.page ?? filters.page) : 1,
    };
    setSearchParams(serializeOverviewSearchState(nextState), {
      replace: options.replace ?? true,
    });
  }, [filters, setSearchParams]);

  useEffect(() => {
    if (previousUrlQuery.current === filters.q) {
      return;
    }
    previousUrlQuery.current = filters.q;
    skipNextDebouncedWrite.current = true;
    setQueryInput(filters.q);
  }, [filters.q]);

  useEffect(() => {
    if (skipNextDebouncedWrite.current) {
      skipNextDebouncedWrite.current = false;
      return;
    }
    if (debouncedQuery !== queryInput || debouncedQuery.trim() === filters.q) {
      return;
    }
    updateFilters({ q: debouncedQuery.trim() });
  }, [debouncedQuery, filters.q, queryInput, updateFilters]);

  const itemMap = useMemo(() => buildItemIdMap(allItems), [allItems]);
  const selectedLocation = filters.locationId ? itemMap.get(filters.locationId) ?? null : null;
  const availableTags = useMemo(
    () => Array.from(new Set(allItems.flatMap((item) => item.tags)))
      .sort((left, right) => left.localeCompare(right, 'zh-CN')),
    [allItems],
  );
  const tagCounts = useMemo(() => allItems.reduce<Record<string, number>>((counts, item) => {
    item.tags.forEach((tag) => {
      counts[tag] = (counts[tag] ?? 0) + 1;
    });
    return counts;
  }, {}), [allItems]);

  useEffect(() => {
    if (!filters.locationId || isInventoryLoading) {
      return;
    }
    const location = itemMap.get(filters.locationId);
    if (!location || !isLocationItem(location)) {
      updateFilters({ locationId: null });
    }
  }, [filters.locationId, isInventoryLoading, itemMap, updateFilters]);

  const effectiveType = filters.type === 'location'
    ? 'container'
    : filters.type === 'all' ? undefined : filters.type;
  const effectiveStatus = filters.type === 'location' || filters.type === 'container'
    ? undefined
    : filters.status === 'all' ? undefined : filters.status;
  const filterKey = [
    filters.q,
    filters.type,
    filters.status,
    filters.locationId ?? '',
    filters.tags.join('\u0000'),
    filters.pageSize,
  ].join('\u0001');
  const previousFilterKey = useRef(filterKey);

  const {
    data: searchResponse,
    isLoading: isSearchLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: [
      'inventory',
      'overview-search',
      user?.id,
      filterKey,
      filters.page,
    ],
    enabled: Boolean(user?.id),
    placeholderData: (previous) => previous,
    queryFn: () => searchItemsPage(filters.q, user!.id, {
      page: filters.page,
      pageSize: filters.pageSize,
      type: effectiveType,
      status: effectiveStatus,
      locationId: filters.locationId,
      locationOnly: filters.type === 'location',
      tags: filters.tags,
    }),
  });

  useEffect(() => {
    if (!isMobile || !searchResponse) {
      return;
    }
    const filtersChanged = previousFilterKey.current !== filterKey;
    previousFilterKey.current = filterKey;
    setMobileResults((current) => {
      if (filters.page === 1 || filtersChanged) {
        return searchResponse.data;
      }
      const resultMap = new Map(current.map((item) => [item.id, item]));
      searchResponse.data.forEach((item) => resultMap.set(item.id, item));
      return Array.from(resultMap.values());
    });
  }, [filterKey, filters.page, isMobile, searchResponse]);

  const pagination = searchResponse?.meta ?? {
    page: filters.page,
    pageSize: filters.pageSize,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
  };

  useEffect(() => {
    if (!isSearchLoading && filters.page > pagination.totalPages) {
      updateFilters(
        { page: pagination.totalPages },
        { replace: true, resetPage: false },
      );
    }
  }, [filters.page, isSearchLoading, pagination.totalPages, updateFilters]);

  const displayedResults = useMemo(
    () => (isMobile ? mobileResults : searchResponse?.data ?? [])
      .map((item) => ({ item, path: buildItemPath(item, itemMap) })),
    [isMobile, itemMap, mobileResults, searchResponse?.data],
  );

  const handleTypeChange = (type: OverviewTypeFilter) => {
    updateFilters({
      type,
      status: type === 'location' || type === 'container' ? 'all' : filters.status,
    });
  };
  const handleStatusChange = (status: OverviewStatusFilter) => updateFilters({ status });
  const handleTagToggle = (tag: string) => updateFilters({
    tags: filters.tags.includes(tag)
      ? filters.tags.filter((value) => value !== tag)
      : [...filters.tags, tag],
  });
  const handleLocationChange = (locationId: string | null) => updateFilters({ locationId });
  const activeFilterCount = countActiveOverviewFilters(filters);

  const filterControls = (
    <OverviewFilters
      type={filters.type}
      status={filters.status}
      selectedTags={filters.tags}
      selectedLocationId={filters.locationId}
      availableTags={availableTags}
      tagCounts={tagCounts}
      allItems={allItems}
      onTypeChange={handleTypeChange}
      onStatusChange={handleStatusChange}
      onTagToggle={handleTagToggle}
      onTagsClear={() => updateFilters({ tags: [] })}
      onLocationChange={handleLocationChange}
    />
  );

  return (
    <div className="flex min-h-screen flex-col bg-canvas md:flex-row">
      <OverviewMobileHeader
        query={queryInput}
        activeFilterCount={activeFilterCount}
        onQueryChange={setQueryInput}
        onOpenFilters={() => setShowMobileFilters(true)}
      />

      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 overflow-y-auto border-r border-borderSoft bg-surface md:block lg:w-80">
        <div className="sticky top-0 z-10 border-b border-borderSoft bg-surface px-6 pb-5 pt-6">
          <h1 className="text-xl font-bold text-slate-900">总览</h1>
          <p className="mb-4 mt-1 text-sm text-slate-600">跨位置查找并筛选全部库存。</p>
          <OverviewSearchField value={queryInput} onChange={setQueryInput} autoFocus />
        </div>
        <div className="px-6 py-5">{filterControls}</div>
      </aside>

      <div data-scroll-root className={`min-w-0 flex-1 overflow-y-auto ${APP_PAGE_CONTENT}`}>
        {activeFilterCount > 0 ? (
          <OverviewActiveFilters
            filters={filters}
            selectedLocation={selectedLocation}
            onQueryClear={() => setQueryInput('')}
            onTypeChange={handleTypeChange}
            onStatusChange={handleStatusChange}
            onLocationClear={() => handleLocationChange(null)}
            onTagToggle={handleTagToggle}
            onClearAll={() => {
              setQueryInput('');
              updateFilters({
                q: '',
                type: 'all',
                status: 'all',
                locationId: null,
                tags: [],
              });
            }}
          />
        ) : null}

        <OverviewResults
          results={displayedResults}
          total={pagination.total}
          page={filters.page}
          pageSize={filters.pageSize}
          totalPages={pagination.totalPages}
          hasNextPage={pagination.hasNextPage}
          isMobile={isMobile}
          isInitialLoading={isInventoryLoading || (isSearchLoading && !searchResponse)}
          isFetching={isFetching}
          isError={isError}
          emptyDescription={selectedLocation
            ? `试试其他关键词，或切换位置「${selectedLocation.name}」。`
            : '试试其他关键词或调整筛选条件。'}
          onOpenItem={(item) => navigate(resolveItemDetailPath(item))}
          onRetry={() => void refetch()}
          onPageChange={(page) => updateFilters({ page }, { replace: false, resetPage: false })}
          onPageSizeChange={(pageSize) => updateFilters({ pageSize })}
          onLoadMore={() => {
            if (!isFetching && pagination.hasNextPage) {
              updateFilters(
                { page: filters.page + 1 },
                { replace: false, resetPage: false },
              );
            }
          }}
        />
      </div>

      {showMobileFilters ? (
        <ResponsiveDialog
          title="筛选库存"
          description={activeFilterCount > 0 ? `已启用 ${activeFilterCount} 项筛选` : '按类型、状态、标签和位置缩小范围。'}
          onClose={() => setShowMobileFilters(false)}
        >
          <div className="px-5 py-5">{filterControls}</div>
          <div className="sticky bottom-0 border-t border-borderSoft bg-surface px-5 py-4">
            <button
              type="button"
              onClick={() => setShowMobileFilters(false)}
              className="min-h-12 w-full rounded-2xl bg-brandStrong px-4 text-sm font-bold text-white"
            >
              查看 {pagination.total} 个结果
            </button>
          </div>
        </ResponsiveDialog>
      ) : null}
    </div>
  );
}
