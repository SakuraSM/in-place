import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, ChevronRight, ExternalLink, FolderTree, MapPin, Package } from 'lucide-react';
import { INVENTORY_NODE_LABELS } from '@inplace/app-core';
import type { Item } from '@inplace/domain';
import EmptyState from '../../../shared/ui/EmptyState';
import LocationTreePanel from './LocationTreePanel';
import {
  buildChildrenMap,
  buildItemIdMap,
  buildItemLineage,
  countLocationContents,
} from '../lib/locationTree';
import { getContainerTypeLabel, isLocationItem } from '../lib/locationTag';
import { resolveItemDetailPath } from '../lib/detailPath';

interface LocationTreeViewProps {
  items: Item[];
  isLoading: boolean;
  selectedLocationId: string | null;
  onSelectLocation: (locationId: string | null) => void;
}

const LOCATION_METRIC_CONFIG = [
  { key: 'locations', label: '下级位置', icon: MapPin, tone: 'bg-sky-50 text-sky-600' },
  { key: 'containers', label: `下级${INVENTORY_NODE_LABELS.container}`, icon: Box, tone: 'bg-teal-50 text-teal-600' },
  { key: 'items', label: '下级物品', icon: Package, tone: 'bg-amber-50 text-amber-700' },
  { key: 'total', label: '内容总数', icon: FolderTree, tone: 'bg-violet-50 text-violet-600' },
] as const;

export default function LocationTreeView({
  items,
  isLoading,
  selectedLocationId,
  onSelectLocation,
}: LocationTreeViewProps) {
  const navigate = useNavigate();
  const locationItems = useMemo(() => items.filter(isLocationItem), [items]);
  const itemMap = useMemo(() => buildItemIdMap(items), [items]);
  const childrenMap = useMemo(() => buildChildrenMap(items), [items]);

  useEffect(() => {
    if (locationItems.length === 0) {
      onSelectLocation(null);
      return;
    }

    const selectedItem = selectedLocationId ? itemMap.get(selectedLocationId) : null;
    if (!selectedItem || !isLocationItem(selectedItem)) {
      onSelectLocation(locationItems[0]?.id ?? null);
    }
  }, [itemMap, locationItems, onSelectLocation, selectedLocationId]);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16" role="status" aria-label="正在加载位置">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  if (locationItems.length === 0) {
    return (
      <EmptyState
        icon={<FolderTree size={28} className="text-slate-400" />}
        title="还没有可展示的位置"
      />
    );
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
      <section className="self-start rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5 lg:sticky lg:top-28">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
            <MapPin size={18} />
          </div>
          <h2 className="font-semibold text-slate-950">空间位置</h2>
        </div>
        <LocationTreePanel
          items={items}
          selectedLocationId={selectedLocationId}
          onSelectLocation={onSelectLocation}
          allLabel="选择一个位置"
        />
      </section>

      <section className="min-w-0 space-y-4">
        {selectedLocation ? (
          <>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <span className="inline-flex self-start rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                    当前位置
                  </span>
                  <h2 className="mt-3 break-words text-2xl font-bold text-slate-950">{selectedLocation.name}</h2>
                  {selectedLocation.description ? (
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                      {selectedLocation.description}
                    </p>
                  ) : null}
                </div>

                <div className="grid w-full shrink-0 grid-cols-2 gap-2 md:flex md:w-auto md:flex-wrap">
                  <button
                    type="button"
                    onClick={() => navigate(`/overview?locationId=${selectedLocation.id}`)}
                    className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-2xl bg-brandStrong px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-brand/20 transition-colors hover:bg-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brandStrong"
                  >
                    查看位置内容
                    <ExternalLink size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(resolveItemDetailPath(selectedLocation))}
                    className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brandStrong"
                  >
                    查看详情
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {selectedLineage.length > 0 ? (
                <nav className="mt-4 flex flex-wrap items-center gap-1.5 text-xs text-slate-600" aria-label="位置路径">
                  {selectedLineage.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-1.5">
                      {index > 0 ? <ChevronRight size={12} className="text-slate-400" /> : null}
                      <span className={index === selectedLineage.length - 1 ? 'font-medium text-slate-800' : ''}>
                        {item.name}
                      </span>
                    </div>
                  ))}
                </nav>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              {LOCATION_METRIC_CONFIG.map(({ key, label, icon: Icon, tone }) => (
                <div key={key} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl ${tone}`}>
                    <Icon size={18} />
                  </div>
                  <p className="text-2xl font-bold text-slate-950">{selectedStats?.[key] ?? 0}</p>
                  <p className="mt-1 text-xs text-slate-600">{label}</p>
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="font-semibold text-slate-950">当前位置内容</h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {directChildren.length} 项
                </span>
              </div>

              {directChildren.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
                  这个位置下还没有物品或收纳。
                </div>
              ) : (
                <div className="space-y-2">
                  {directChildren.map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => navigate(resolveItemDetailPath(child))}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brandStrong"
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                        child.type === 'item'
                          ? 'bg-amber-50 text-amber-700'
                          : isLocationItem(child)
                            ? 'bg-sky-50 text-sky-600'
                            : 'bg-teal-50 text-teal-600'
                      }`}>
                        {child.type === 'item'
                          ? <Package size={18} />
                          : isLocationItem(child)
                            ? <MapPin size={18} />
                            : <Box size={18} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-950">{child.name}</p>
                        <p className="mt-1 text-xs text-slate-600">
                          {child.type === 'item' ? '物品' : getContainerTypeLabel(child)}
                          {child.category ? ` · ${child.category}` : ''}
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-slate-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
