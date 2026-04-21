import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Box, ChevronRight, ExternalLink, FolderTree, MapPin, Package, Plus } from 'lucide-react';
import EmptyState from '../../../shared/ui/EmptyState';
import { useAuth } from '../../../app/providers/AuthContext';
import { createItem } from '../../../legacy/items';
import type { Item } from '../../../legacy/database.types';
import { useAllInventoryItems } from '../hooks/useAllInventoryItems';
import LocationTreePanel from '../components/LocationTreePanel';
import ItemForm from '../components/ItemForm';
import { APP_PAGE_HEADER, APP_PAGE_HEADER_ROW } from '../../../shared/ui/pageHeader';
import {
  buildChildrenMap,
  buildItemIdMap,
  buildItemLineage,
  countLocationContents,
} from '../lib/locationTree';
import { getContainerTypeLabel, isLocationItem } from '../lib/locationTag';
import { resolveItemDetailPath } from '../lib/detailPath';

export default function LocationTreePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: items = [], isLoading } = useAllInventoryItems();
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const locationItems = useMemo(
    () => items.filter(isLocationItem),
    [items],
  );
  const itemMap = useMemo(() => buildItemIdMap(items), [items]);
  const childrenMap = useMemo(() => buildChildrenMap(items), [items]);

  useEffect(() => {
    if (locationItems.length === 0) {
      setSelectedLocationId(null);
      return;
    }

    if (!selectedLocationId || !itemMap.has(selectedLocationId) || !isLocationItem(itemMap.get(selectedLocationId))) {
      setSelectedLocationId(locationItems[0]?.id ?? null);
    }
  }, [itemMap, locationItems, selectedLocationId]);

  const selectedLocation = selectedLocationId ? itemMap.get(selectedLocationId) ?? null : null;
  const selectedLineage = useMemo(
    () => (selectedLocation ? buildItemLineage(selectedLocation.id, itemMap) : []),
    [itemMap, selectedLocation],
  );
  const selectedStats = useMemo(
    () => (selectedLocation ? countLocationContents(items, selectedLocation.id) : null),
    [items, selectedLocation],
  );
  const directChildren = useMemo(
    () => (selectedLocation ? childrenMap.get(selectedLocation.id) ?? [] : []),
    [childrenMap, selectedLocation],
  );

  const handleCreateLocation = async (data: Omit<Item, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setCreateError(null);
      const created = await createItem(data);
      setShowCreateForm(false);
      setSelectedLocationId(created.id);
      await queryClient.invalidateQueries({ queryKey: ['inventory', 'all-items', user?.id] });
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : '新增位置失败，请稍后再试');
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 md:h-full md:min-h-0">
      <div className={APP_PAGE_HEADER}>
        <div className={`${APP_PAGE_HEADER_ROW} justify-between gap-3`}>
          <h1 className="text-xl font-bold text-slate-900">位置树</h1>
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-2xl bg-sky-500 px-4 text-sm font-medium text-white shadow-sm shadow-sky-200 transition-colors hover:bg-sky-600"
          >
            <Plus size={16} />
            新增位置
          </button>
        </div>
      </div>

      <div className="mx-auto flex min-h-0 w-full max-w-[1480px] flex-1 flex-col px-4 py-5 md:overflow-y-auto md:px-8 md:py-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
          </div>
        ) : locationItems.length === 0 ? (
          <EmptyState
            icon={<FolderTree size={28} className="text-slate-300" />}
            title="还没有可展示的位置"
          />
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
            <section className="self-start rounded-3xl border border-slate-100 bg-white p-4 shadow-sm md:p-5 lg:sticky lg:top-0 lg:max-h-[calc(100vh-132px)] lg:overflow-y-auto">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-500">
                  <MapPin size={18} />
                </div>
                <h2 className="font-semibold text-slate-900">位置导航</h2>
              </div>
              <LocationTreePanel
                items={items}
                selectedLocationId={selectedLocationId}
                onSelectLocation={setSelectedLocationId}
                allLabel="选择一个位置"
              />
            </section>

            <section className="min-w-0 space-y-4">
              {selectedLocation ? (
                <>
                  <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <span className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-600">
                          当前位置
                        </span>
                        <h2 className="mt-3 text-2xl font-bold text-slate-900">{selectedLocation.name}</h2>
                        {selectedLocation.description && (
                          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
                            {selectedLocation.description}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/overview?locationId=${selectedLocation.id}`)}
                          className="inline-flex items-center gap-1.5 rounded-2xl bg-sky-500 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-sky-200 transition-colors hover:bg-sky-600"
                        >
                          查看位置内容
                          <ExternalLink size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(resolveItemDetailPath(selectedLocation))}
                          className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                        >
                          查看详情
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>

                    {selectedLineage.length > 0 && (
                      <div className="mt-4 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                        {selectedLineage.map((item, index) => (
                          <div key={item.id} className="flex items-center gap-1.5">
                            {index > 0 && <ChevronRight size={12} className="text-slate-300" />}
                            <span className={index === selectedLineage.length - 1 ? 'font-medium text-slate-700' : ''}>
                              {item.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {[
                      { label: '下级位置', value: selectedStats?.locations ?? 0, icon: MapPin, tone: 'bg-sky-50 text-sky-500' },
                      { label: '下级收纳', value: selectedStats?.containers ?? 0, icon: Box, tone: 'bg-teal-50 text-teal-500' },
                      { label: '下级物品', value: selectedStats?.items ?? 0, icon: Package, tone: 'bg-amber-50 text-amber-500' },
                      { label: '内容总数', value: selectedStats?.total ?? 0, icon: FolderTree, tone: 'bg-violet-50 text-violet-500' },
                    ].map(({ label, value, icon: Icon, tone }) => (
                      <div key={label} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                        <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl ${tone}`}>
                          <Icon size={18} />
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{value}</p>
                        <p className="mt-1 text-xs text-slate-400">{label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-slate-900">直接内容</h3>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                        {directChildren.length} 项
                      </span>
                    </div>

                    {directChildren.length === 0 ? (
                      <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                        这个位置下还没有直接内容。
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {directChildren.map((child) => (
                          <button
                            key={child.id}
                            type="button"
                            onClick={() => navigate(resolveItemDetailPath(child))}
                            className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                          >
                            <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                              child.type === 'item' ? 'bg-amber-50 text-amber-500' : isLocationItem(child) ? 'bg-sky-50 text-sky-500' : 'bg-teal-50 text-teal-500'
                            }`}>
                              {child.type === 'item' ? <Package size={18} /> : isLocationItem(child) ? <MapPin size={18} /> : <Box size={18} />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-slate-900">{child.name}</p>
                              <p className="mt-1 text-xs text-slate-400">
                                {child.type === 'item' ? '物品' : getContainerTypeLabel(child)}
                                {child.category ? ` · ${child.category}` : ''}
                              </p>
                            </div>
                            <ChevronRight size={16} className="text-slate-300" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </section>
          </div>
        )}
      </div>
      {showCreateForm && (
        <ItemForm
          defaultParentId={selectedLocationId}
          forceType="container"
          fixedLocation
          submitError={createError}
          onSave={handleCreateLocation}
          onClose={() => {
            setShowCreateForm(false);
            setCreateError(null);
          }}
        />
      )}
    </div>
  );
}
