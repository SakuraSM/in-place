import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../app/providers/auth-context';
import { createItem, updateItem, deleteItem, updateItemsBatch, deleteItemsBatch } from '../../../legacy/items';
import type { Item } from '../../../legacy/database.types';
import { resolveItemDetailPath } from '../lib/detailPath';
import { HOME_CREATE_PARAM, HOME_CREATE_VALUE } from '../lib/homeRoute';
import { type HomeViewMode } from '../components/HomeInventorySections';
import { useToast } from '../../../shared/ui/toast';
import HomePageHeader from '../components/HomePageHeader';
import { toggleSelectAllIds, toggleSelectionId } from '../lib/selectionState';
import { useHomeInventoryData } from '../hooks/useHomeInventoryData';
import { useHomeDashboardData } from '../hooks/useHomeDashboardData';
import HomePageContent from '../components/HomePageContent';
import HomePageOverlays from '../components/HomePageOverlays';

const DEFAULT_VIEW_MODE: HomeViewMode = 'category';

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [contextItem, setContextItem] = useState<Item | null>(null);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const [moveTarget, setMoveTarget] = useState<Item | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkDeletePending, setBulkDeletePending] = useState(false);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);
  const [isBulkDeleteSubmitting, setIsBulkDeleteSubmitting] = useState(false);
  const [formSubmitError, setFormSubmitError] = useState<string | null>(null);

  const currentParentId = searchParams.get('parentId');
  const viewMode: HomeViewMode = searchParams.get('view') === 'type' ? 'type' : DEFAULT_VIEW_MODE;
  const isRootLevel = !currentParentId;
  const showRootDashboard = isRootLevel && !selectionMode;
  const {
    breadcrumbs,
    children,
    childCounts,
    categories,
    loading,
    loadChildren,
  } = useHomeInventoryData(user?.id ?? null, currentParentId);
  const {
    recentItems,
    recentItemPaths,
    rootStats,
    statsLoading,
    recentActivity,
  } = useHomeDashboardData(user?.id ?? null, showRootDashboard);

  useEffect(() => {
    if (searchParams.get(HOME_CREATE_PARAM) !== HOME_CREATE_VALUE) {
      return;
    }

    setEditItem(null);
    setFormSubmitError(null);
    setShowForm(true);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete(HOME_CREATE_PARAM);
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setEditItem, setSearchParams, setShowForm]);

  const updateHomeRoute = useCallback((updates: {
    parentId?: string | null;
    view?: HomeViewMode;
    replace?: boolean;
  }) => {
    const nextParams = new URLSearchParams(searchParams);

    if (updates.parentId !== undefined) {
      if (updates.parentId) {
        nextParams.set('parentId', updates.parentId);
      } else {
        nextParams.delete('parentId');
      }
    }

    if (updates.view !== undefined) {
      if (updates.view !== DEFAULT_VIEW_MODE) {
        nextParams.set('view', updates.view);
      } else {
        nextParams.delete('view');
      }
    }

    setSearchParams(nextParams, { replace: updates.replace ?? true });
  }, [searchParams, setSearchParams]);

  const handleContainerClick = async (item: Item) => {
    updateHomeRoute({
      parentId: item.id,
      replace: false,
    });
  };

  const handleBreadcrumbNav = async (id: string | null) => {
    updateHomeRoute({
      parentId: id,
      replace: false,
    });
  };

  const invalidateDashboard = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['inventory', 'all-items', user?.id] });
    void queryClient.invalidateQueries({ queryKey: ['home', 'stats', user?.id] });
    void queryClient.invalidateQueries({ queryKey: ['home', 'recent-activity', user?.id] });
  }, [queryClient, user?.id]);

  const handleSave = async (data: Omit<Item, 'id' | 'created_at' | 'updated_at'>) => {
    const isEditing = Boolean(editItem);
    setFormSubmitError(null);
    try {
      if (editItem) {
        await updateItem(editItem.id, data);
      } else {
        await createItem(data);
      }
      setShowForm(false);
      setEditItem(null);
      await loadChildren(currentParentId);
      invalidateDashboard();
      notify({
        tone: 'success',
        title: isEditing ? '修改已保存' : '已添加到归位',
        description: data.name,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '保存失败，请稍后重试';
      setFormSubmitError(message);
      notify({ tone: 'error', title: '保存失败', description: message });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleteSubmitting(true);
    try {
      const deletedItemName = deleteTarget.name;
      await deleteItem(deleteTarget.id);
      setDeleteTarget(null);
      await loadChildren(currentParentId);
      invalidateDashboard();
      notify({ tone: 'success', title: '删除完成', description: deletedItemName });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '删除失败，请稍后重试';
      notify({ tone: 'error', title: '删除失败', description: message });
    } finally {
      setIsDeleteSubmitting(false);
    }
  };

  const handleMove = async (newParentId: string | null) => {
    if (!moveTarget) return;
    try {
      const movedItemName = moveTarget.name;
      await updateItem(moveTarget.id, { parent_id: newParentId });
      setMoveTarget(null);
      await loadChildren(currentParentId);
      invalidateDashboard();
      notify({ tone: 'success', title: '移动完成', description: movedItemName });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '移动失败，请稍后重试';
      notify({ tone: 'error', title: '移动失败', description: message });
    }
  };

  const toggleSelection = (itemId: string) => {
    setSelectedIds((previousIds) => toggleSelectionId(previousIds, itemId));
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds([]);
  };

  const selectedItems = children.filter((item) => selectedIds.includes(item.id));
  const allSelected = children.length > 0 && selectedIds.length === children.length;

  const handleToggleSelectAll = () => {
    setSelectedIds((previousIds) => toggleSelectAllIds(
      previousIds,
      children.map((item) => item.id),
    ));
  };

  const handleBulkSave = async (payload: Partial<Item>) => {
    try {
      const updatedCount = selectedIds.length;
      await updateItemsBatch(selectedIds, payload);
      setShowBulkEdit(false);
      exitSelectionMode();
      await loadChildren(currentParentId);
      invalidateDashboard();
      notify({
        tone: 'success',
        title: '批量修改完成',
        description: `已更新 ${updatedCount} 项`,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '批量修改失败，请稍后重试';
      notify({ tone: 'error', title: '批量修改失败', description: message });
    }
  };

  const handleBulkDelete = async () => {
    setIsBulkDeleteSubmitting(true);
    try {
      const deletedCount = selectedIds.length;
      await deleteItemsBatch(selectedIds);
      setBulkDeletePending(false);
      exitSelectionMode();
      await loadChildren(currentParentId);
      invalidateDashboard();
      notify({
        tone: 'success',
        title: '批量删除完成',
        description: `已删除 ${deletedCount} 项`,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '批量删除失败，请稍后重试';
      notify({ tone: 'error', title: '批量删除失败', description: message });
    } finally {
      setIsBulkDeleteSubmitting(false);
    }
  };

  const isEmpty = children.length === 0;
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-canvas md:h-full md:min-h-0">
      <HomePageHeader
        currentParentId={currentParentId}
        breadcrumbs={breadcrumbs}
        isRootLevel={isRootLevel}
        isEmpty={isEmpty}
        isSelectionMode={selectionMode}
        selectedCount={selectedIds.length}
        totalCount={children.length}
        isAllSelected={allSelected}
        viewMode={viewMode}
        onNavigateParent={() => {
          const parent = breadcrumbs[breadcrumbs.length - 2] ?? null;
          handleBreadcrumbNav(parent?.id ?? null);
        }}
        onNavigateBreadcrumb={handleBreadcrumbNav}
        onToggleSelectionMode={() => {
          if (selectionMode) {
            exitSelectionMode();
          } else {
            setSelectionMode(true);
          }
        }}
        onToggleSelectAll={handleToggleSelectAll}
        onViewModeChange={(nextViewMode) => updateHomeRoute({
          view: nextViewMode,
          replace: true,
        })}
        onCreate={() => {
          setEditItem(null);
          setFormSubmitError(null);
          setShowForm(true);
        }}
      />

      <HomePageContent
        showDashboard={showRootDashboard}
        stats={rootStats ?? null}
        recentItems={recentItems}
        recentItemPaths={recentItemPaths}
        recentActivity={recentActivity}
        statsLoading={statsLoading}
        loading={loading}
        items={children}
        categories={categories}
        childCounts={childCounts}
        viewMode={viewMode}
        selectionMode={selectionMode}
        selectedIds={selectedIdSet}
        onOpenActivity={() => navigate('/activity')}
        onOpenItem={(item) => navigate(resolveItemDetailPath(item))}
        onOpenActivityItem={(entry) => {
          if (!entry.item_id || entry.action === 'delete') {
            navigate('/activity');
          } else {
            navigate(resolveItemDetailPath({ id: entry.item_id, type: entry.item_type }));
          }
        }}
        onNavigateOverview={(filter) => {
          const params = new URLSearchParams();
          if (filter?.type) params.set('type', filter.type);
          if (filter?.status) params.set('status', filter.status);
          navigate(`/overview${params.toString() ? `?${params.toString()}` : ''}`);
        }}
        onOpenContainer={handleContainerClick}
        onOpenContext={setContextItem}
        onToggleSelection={toggleSelection}
      />

      <HomePageOverlays
        selectionMode={selectionMode}
        selectedItems={selectedItems}
        categories={categories}
        contextItem={contextItem}
        deleteTarget={deleteTarget}
        moveTarget={moveTarget}
        editItem={editItem}
        currentParentId={currentParentId}
        selectedCount={selectedIds.length}
        showForm={showForm}
        showBulkEdit={showBulkEdit}
        bulkDeletePending={bulkDeletePending}
        isDeleteSubmitting={isDeleteSubmitting}
        isBulkDeleteSubmitting={isBulkDeleteSubmitting}
        formSubmitError={formSubmitError}
        onCreate={() => {
          setEditItem(null);
          setFormSubmitError(null);
          setShowForm(true);
        }}
        onBulkEditOpen={() => setShowBulkEdit(true)}
        onBulkDeleteOpen={() => setBulkDeletePending(true)}
        onContextView={() => {
          if (contextItem) navigate(resolveItemDetailPath(contextItem));
          setContextItem(null);
        }}
        onContextEdit={() => {
          setEditItem(contextItem);
          setFormSubmitError(null);
          setShowForm(true);
          setContextItem(null);
        }}
        onContextDelete={() => {
          setDeleteTarget(contextItem);
          setContextItem(null);
        }}
        onContextMove={() => {
          setMoveTarget(contextItem);
          setContextItem(null);
        }}
        onContextClose={() => setContextItem(null)}
        onDeleteConfirm={handleDelete}
        onDeleteCancel={() => setDeleteTarget(null)}
        onBulkDeleteConfirm={handleBulkDelete}
        onBulkDeleteCancel={() => setBulkDeletePending(false)}
        onMove={handleMove}
        onMoveClose={() => setMoveTarget(null)}
        onSave={handleSave}
        onFormClose={() => {
          setShowForm(false);
          setEditItem(null);
          setFormSubmitError(null);
        }}
        onBulkSave={handleBulkSave}
        onBulkEditClose={() => setShowBulkEdit(false)}
      />
    </div>
  );
}
