import { lazy, Suspense, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MapPinned, Plus, Rows3 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import type { ItemCreateInput } from '@inplace/domain';
import { useAuth } from '../../../app/providers/auth-context';
import { useHousehold } from '../../../app/providers/household-context';
import { createItem } from '../../../legacy/items';
import { PageContent, PageHeader, PageShell } from '../../../shared/ui/PageLayout';
import AssetMapErrorBoundary from '../components/AssetMapErrorBoundary';
import ItemForm from '../components/ItemForm';
import LocationTreeView from '../components/LocationTreeView';
import { useAllInventoryItems } from '../hooks/useAllInventoryItems';

const AssetMapView = lazy(() => import('../components/AssetMapView'));

type LocationPageView = 'tree' | 'map';

function resolveLocationPageView(searchParams: URLSearchParams): LocationPageView {
  return searchParams.get('view') === 'map' ? 'map' : 'tree';
}

export default function LocationTreePage() {
  const { user } = useAuth();
  const { currentHousehold } = useHousehold();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: items = [], isLoading } = useAllInventoryItems();
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [mapErrorMessage, setMapErrorMessage] = useState<string | null>(null);
  const currentView = resolveLocationPageView(searchParams);

  const handleChangeView = useCallback((view: LocationPageView): void => {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('view', view);
    setSearchParams(nextSearchParams);
    if (view === 'map') {
      setMapErrorMessage(null);
    }
  }, [searchParams, setSearchParams]);

  const handleOpenCreateLocation = useCallback((parentId: string | null): void => {
    setCreateParentId(parentId);
    setCreateError(null);
    setIsCreateFormOpen(true);
  }, []);

  const handleCloseCreateLocation = useCallback((): void => {
    setIsCreateFormOpen(false);
    setCreateError(null);
  }, []);

  const handleCreateLocation = useCallback(async (data: ItemCreateInput): Promise<void> => {
    try {
      setCreateError(null);
      const created = await createItem(data);
      setIsCreateFormOpen(false);
      setSelectedLocationId(created.id);
      await queryClient.invalidateQueries({
        queryKey: ['inventory', 'all-items', user?.id, currentHousehold?.id],
      });
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : '新增位置失败，请稍后再试');
    }
  }, [currentHousehold?.id, queryClient, user?.id]);

  const handleMapError = useCallback((): void => {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('view', 'tree');
    setMapErrorMessage('资产地图暂时无法显示，已切换回位置树。刷新页面后可再次尝试。');
    setSearchParams(nextSearchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  return (
    <PageShell>
      <PageHeader
        width="wide"
        title="空间位置"
        description="用位置树管理层级，或切换到地图查看家庭资产分布。"
        actions={(
          <>
            <div
              className="inline-flex rounded-2xl border border-slate-300 bg-white p-1 shadow-sm"
              role="tablist"
              aria-label="空间位置视图"
            >
              <ViewTab
                label="位置树"
                icon={Rows3}
                isActive={currentView === 'tree'}
                onSelect={() => handleChangeView('tree')}
              />
              <ViewTab
                label="资产地图"
                icon={MapPinned}
                isActive={currentView === 'map'}
                onSelect={() => handleChangeView('map')}
              />
            </div>
            <button
              type="button"
              onClick={() => handleOpenCreateLocation(currentView === 'tree' ? selectedLocationId : null)}
              className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-2xl bg-brandStrong px-4 text-sm font-medium text-white shadow-sm shadow-brand/20 transition-colors hover:bg-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brandStrong"
            >
              <Plus size={16} aria-hidden="true" />
              新增位置
            </button>
          </>
        )}
      />

      <PageContent width="wide" className="flex flex-col">
        {mapErrorMessage ? (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
            {mapErrorMessage}
          </div>
        ) : null}

        {currentView === 'tree' ? (
          <LocationTreeView
            items={items}
            isLoading={isLoading}
            selectedLocationId={selectedLocationId}
            onSelectLocation={setSelectedLocationId}
          />
        ) : (
          <AssetMapErrorBoundary onMapError={handleMapError}>
            <Suspense fallback={<MapLoadingState />}>
              {isLoading ? (
                <MapLoadingState />
              ) : (
                <AssetMapView
                  householdId={currentHousehold?.id ?? null}
                  canEdit={currentHousehold?.role !== 'viewer'}
                  items={items}
                  onRequestCreateLocation={() => handleOpenCreateLocation(null)}
                />
              )}
            </Suspense>
          </AssetMapErrorBoundary>
        )}
      </PageContent>

      {isCreateFormOpen ? (
        <ItemForm
          defaultParentId={createParentId}
          forceType="container"
          fixedLocation
          submitError={createError}
          onSave={handleCreateLocation}
          onClose={handleCloseCreateLocation}
        />
      ) : null}
    </PageShell>
  );
}

interface ViewTabProps {
  label: string;
  icon: typeof Rows3;
  isActive: boolean;
  onSelect: () => void;
}

function ViewTab({
  label,
  icon: Icon,
  isActive,
  onSelect,
}: ViewTabProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={onSelect}
      className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brandStrong ${
        isActive
          ? 'bg-brandTint text-brandStrong'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icon size={14} aria-hidden="true" />
      {label}
    </button>
  );
}

function MapLoadingState() {
  return (
    <div className="flex min-h-[460px] items-center justify-center rounded-3xl border border-slate-200 bg-white" role="status">
      <div className="text-center">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        <p className="mt-3 text-sm font-medium text-slate-600">正在绘制资产地图...</p>
      </div>
    </div>
  );
}
