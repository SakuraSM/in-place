import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Package, ArrowLeft, LayoutGrid, FolderTree, Box, CheckSquare, SquarePen, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../app/providers/AuthContext';
import { fetchAncestors, fetchChildren, createItem, updateItem, deleteItem, updateItemsBatch, deleteItemsBatch, fetchItemStats } from '../../../legacy/items';
import { fetchActivityLogsPage } from '../../../legacy/activity';
import { fetchCategories } from '../../../legacy/categories';
import type { Item, Category } from '../../../legacy/database.types';
import { CategoryIcon, getColorClasses } from '../lib/categoryPresentation';
import BrandLockup from '../../../shared/ui/BrandLockup';
import ContainerCard from '../components/ContainerCard';
import ItemCard from '../components/ItemCard';
import Breadcrumb from '../components/Breadcrumb';
import ContextMenu from '../../../shared/ui/ContextMenu';
import ConfirmDialog from '../../../shared/ui/ConfirmDialog';
import ItemForm from '../components/ItemForm';
import MoveItemSheet from '../components/MoveItemSheet';
import BulkEditSheet from '../components/BulkEditSheet';
import HomeDashboard from '../components/HomeDashboard';
import { useAllInventoryItems } from '../hooks/useAllInventoryItems';
import { SkeletonList } from '../../../shared/ui/SkeletonCard';
import { staggerContainer } from '../../../shared/lib/animations';
import { resolveItemDetailPath } from '../lib/detailPath';

type ViewMode = 'type' | 'category';
const DEFAULT_VIEW_MODE: ViewMode = 'category';

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [breadcrumbs, setBreadcrumbs] = useState<Item[]>([]);
  const [children, setChildren] = useState<Item[]>([]);
  const [childCounts, setChildCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);

  const [contextItem, setContextItem] = useState<Item | null>(null);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const [moveTarget, setMoveTarget] = useState<Item | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkDeletePending, setBulkDeletePending] = useState(false);

  const currentParentId = searchParams.get('parentId');
  const viewMode: ViewMode = searchParams.get('view') === 'type' ? 'type' : DEFAULT_VIEW_MODE;
  const isRootLevel = !currentParentId;
  const showRootDashboard = isRootLevel && !selectionMode;
  const { data: allInventoryItems = [] } = useAllInventoryItems(showRootDashboard);
  const recentItems = useMemo(
    () => [...allInventoryItems]
      .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
      .slice(0, 6),
    [allInventoryItems],
  );

  const { data: rootStats, isLoading: statsLoading } = useQuery({
    queryKey: ['home', 'stats', user?.id],
    enabled: Boolean(user?.id) && showRootDashboard,
    queryFn: () => fetchItemStats(user!.id),
    staleTime: 1000 * 60,
  });

  const { data: recentActivity = [] } = useQuery({
    queryKey: ['home', 'recent-activity', user?.id],
    enabled: Boolean(user?.id) && showRootDashboard,
    queryFn: async () => {
      const response = await fetchActivityLogsPage(user!.id, { pageSize: 6 });
      return response.data;
    },
    staleTime: 1000 * 30,
  });

  const updateHomeRoute = useCallback((updates: {
    parentId?: string | null;
    view?: ViewMode;
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

  const loadChildren = useCallback(async (parentId: string | null) => {
    if (!user) return;
    setLoading(true);
    try {
      const items = await fetchChildren(parentId, user.id);
      setChildren(items);
      const counts: Record<string, number> = {};
      await Promise.all(
        items
          .filter((i) => i.type === 'container')
          .map(async (container) => {
            const sub = await fetchChildren(container.id, user.id);
            counts[container.id] = sub.length;
          })
      );
      setChildCounts(counts);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadChildren(currentParentId);
  }, [currentParentId, loadChildren]);

  useEffect(() => {
    let active = true;

    if (!user) return;

    if (!currentParentId) {
      setBreadcrumbs([]);
      return;
    }

    void fetchAncestors(currentParentId).then((items) => {
      if (!active) return;
      setBreadcrumbs(items);
    });

    return () => {
      active = false;
    };
  }, [currentParentId, user]);

  useEffect(() => {
    if (!user) return;
    fetchCategories(user.id).then(setCategories);
  }, [user]);

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
    if (editItem) {
      await updateItem(editItem.id, data);
    } else {
      await createItem(data);
    }
    setShowForm(false);
    setEditItem(null);
    await loadChildren(currentParentId);
    invalidateDashboard();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteItem(deleteTarget.id);
    setDeleteTarget(null);
    await loadChildren(currentParentId);
    invalidateDashboard();
  };

  const handleMove = async (newParentId: string | null) => {
    if (!moveTarget) return;
    await updateItem(moveTarget.id, { parent_id: newParentId });
    setMoveTarget(null);
    await loadChildren(currentParentId);
    invalidateDashboard();
  };

  const toggleSelection = (itemId: string) => {
    setSelectedIds((prev) => (
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    ));
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds([]);
  };

  const selectedItems = children.filter((item) => selectedIds.includes(item.id));
  const allSelected = children.length > 0 && selectedIds.length === children.length;

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(children.map((item) => item.id));
  };

  const handleBulkSave = async (payload: Partial<Item>) => {
    await updateItemsBatch(selectedIds, payload);
    setShowBulkEdit(false);
    exitSelectionMode();
    await loadChildren(currentParentId);
    invalidateDashboard();
  };

  const handleBulkDelete = async () => {
    await deleteItemsBatch(selectedIds);
    setBulkDeletePending(false);
    exitSelectionMode();
    await loadChildren(currentParentId);
    invalidateDashboard();
  };

  const containers = children.filter((i) => i.type === 'container');
  const items = children.filter((i) => i.type === 'item');

  const containerCategories = categories.filter((c) => c.item_type === 'container');
  const itemCategories = categories.filter((c) => c.item_type === 'item');

  const getContainersByCategory = (catName: string) =>
    containers.filter((c) => c.category === catName);
  const getItemsByCategory = (catName: string) =>
    items.filter((i) => i.category === catName);

  const uncategorizedContainers = containers.filter(
    (c) => !containerCategories.some((cat) => cat.name === c.category)
  );
  const uncategorizedItems = items.filter(
    (i) => !itemCategories.some((cat) => cat.name === i.category)
  );

  const isEmpty = children.length === 0;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 md:h-full md:min-h-0">
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-100">
        <div className="px-4 md:px-8 pt-3 md:pt-6 pb-2 md:pb-3">
          <div
            className={`mb-2 ${isRootLevel ? 'flex items-center gap-3' : 'flex items-center gap-3'}`}
          >
            {currentParentId && (
              <button
                onClick={() => {
                  const parent = breadcrumbs[breadcrumbs.length - 2] ?? null;
                  handleBreadcrumbNav(parent?.id ?? null);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors shrink-0"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div className="flex-1 min-w-0">
              {isRootLevel ? (
                <BrandLockup
                  size="xs"
                  tagline="INPLACE"
                  logoVariant="mark"
                  showTagline={false}
                  showSubtitle={false}
                  framelessLogo
                  className="px-0 py-1 md:hidden"
                />
              ) : (
                <h1 className="text-lg font-bold text-slate-900 truncate">
                  {breadcrumbs[breadcrumbs.length - 1]?.name}
                </h1>
              )}
            </div>
            {!isEmpty && (
              <div className={`flex items-center gap-2 shrink-0 ${isRootLevel ? 'justify-end md:justify-start' : ''}`}>
                <motion.button
                  onClick={() => selectionMode ? exitSelectionMode() : setSelectionMode(true)}
                  whileTap={{ scale: 0.92 }}
                  className={`flex shrink-0 items-center gap-1.5 px-3 h-10 rounded-xl text-sm font-medium transition-colors ${
                    selectionMode
                      ? 'bg-sky-500 text-white shadow-sm shadow-sky-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {selectionMode ? <X size={15} /> : <CheckSquare size={15} />}
                  {selectionMode ? '退出' : '批量'}
                </motion.button>
                <div className="flex shrink-0 gap-1 p-1 bg-slate-100 rounded-xl relative">
                  {(['type', 'category'] as ViewMode[]).map((mode) => (
                    <motion.button
                      key={mode}
                      onClick={() => updateHomeRoute({ view: mode, replace: true })}
                      title={mode === 'type' ? '按类型视图' : '按类别视图'}
                      whileTap={{ scale: 0.9 }}
                      className="relative w-8 h-8 flex items-center justify-center rounded-lg z-10"
                    >
                      {viewMode === mode && (
                        <motion.div
                          layoutId="home-view-pill"
                          className="absolute inset-0 bg-white rounded-lg shadow-sm"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className={`relative z-10 transition-colors ${viewMode === mode ? 'text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>
                        {mode === 'type' ? <LayoutGrid size={15} /> : <FolderTree size={15} />}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {breadcrumbs.length > 0 && (
            <Breadcrumb
              items={breadcrumbs.map((b) => ({ id: b.id, name: b.name }))}
              onNavigate={handleBreadcrumbNav}
            />
          )}
          {selectionMode && !isEmpty && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">批量操作已开启</p>
                <p className="text-xs text-slate-500 mt-0.5">已选 {selectedIds.length} / {children.length} 项</p>
              </div>
              <button
                onClick={handleToggleSelectAll}
                className="px-3 py-2 rounded-xl bg-white text-slate-600 text-sm font-medium border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                {allSelected ? '取消全选' : '全选'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div data-scroll-root className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex min-h-full flex-1 flex-col px-4 py-4 md:min-h-full md:px-8 md:py-6">
          {showRootDashboard && (
            <HomeDashboard
              stats={rootStats ?? null}
              recentItems={recentItems}
              recentActivity={recentActivity}
              statsLoading={statsLoading}
              onCreate={() => { setEditItem(null); setShowForm(true); }}
              onOpenScan={() => navigate('/scan')}
              onOpenActivity={() => navigate('/activity')}
              onOpenItem={(item) => navigate(resolveItemDetailPath(item))}
              onOpenActivityItem={(entry) => {
                if (!entry.item_id || entry.action === 'delete') {
                  navigate('/activity');
                  return;
                }

                navigate(resolveItemDetailPath({ id: entry.item_id, type: entry.item_type }));
              }}
              onNavigateOverview={(filter) => {
                const params = new URLSearchParams();
                if (filter?.type) params.set('type', filter.type);
                if (filter?.status) params.set('status', filter.status);
                navigate(`/overview${params.toString() ? `?${params.toString()}` : ''}`);
              }}
            />
          )}

          {loading ? (
            <SkeletonList />
          ) : isEmpty ? (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24, delay: 0.1 }}
              className={`flex flex-col items-center justify-center text-center ${showRootDashboard ? 'rounded-[28px] border border-dashed border-slate-200 bg-white py-14' : 'py-20'}`}
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100"
              >
                <Package size={36} className="text-slate-300" />
              </motion.div>
              <h3 className="mb-1 font-semibold text-slate-700">暂时空空如也</h3>
              <p className="text-sm text-slate-400">点击 + 按钮添加收纳、位置或物品</p>
            </motion.div>
          ) : (
            <motion.div
              key={viewMode}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-full flex-col flex-1"
            >
              <AnimatePresence mode="wait">
                {viewMode === 'type' ? (
                  <motion.div
                    key="type-view"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-6"
                  >
                    {containers.length > 0 && (
                      <section>
                        <motion.h2
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.05 }}
                          className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400"
                        >
                          收纳 ({containers.length})
                        </motion.h2>
                        <motion.div
                          variants={staggerContainer}
                          initial="initial"
                          animate="animate"
                          className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                        >
                          {containers.map((container) => (
                            <ContainerCard
                              key={container.id}
                              item={container}
                              childCount={childCounts[container.id]}
                              category={categories.find((c) => c.name === container.category && c.item_type === 'container')}
                              onClick={() => handleContainerClick(container)}
                              onLongPress={() => setContextItem(container)}
                              selectionMode={selectionMode}
                              selected={selectedIds.includes(container.id)}
                              onSelect={() => toggleSelection(container.id)}
                            />
                          ))}
                        </motion.div>
                      </section>
                    )}

                    {items.length > 0 && (
                      <section>
                        <motion.h2
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.08 }}
                          className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400"
                        >
                          物品 ({items.length})
                        </motion.h2>
                        <motion.div
                          variants={staggerContainer}
                          initial="initial"
                          animate="animate"
                          className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                        >
                          {items.map((item) => (
                            <ItemCard
                              key={item.id}
                              item={item}
                              category={categories.find((c) => c.name === item.category && c.item_type === 'item')}
                              onClick={() => navigate(resolveItemDetailPath(item))}
                              onLongPress={() => setContextItem(item)}
                              selectionMode={selectionMode}
                              selected={selectedIds.includes(item.id)}
                              onSelect={() => toggleSelection(item.id)}
                            />
                          ))}
                        </motion.div>
                      </section>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="category-view"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-6"
                  >
                    {containerCategories
                      .filter((cat) => getContainersByCategory(cat.name).length > 0)
                      .map((cat) => {
                        const colorCls = getColorClasses(cat.color);
                        return (
                          <section key={cat.id}>
                            <motion.div
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="mb-3 flex items-center gap-2"
                            >
                              <div className={`flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-md ${colorCls.bg} ${colorCls.text}`}>
                                <CategoryIcon
                                  icon={cat.icon}
                                  fallback={Box}
                                  size={12}
                                  className={colorCls.text}
                                  imageClassName="h-full w-full object-cover"
                                />
                              </div>
                              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                {cat.name} ({getContainersByCategory(cat.name).length})
                              </h2>
                            </motion.div>
                            <motion.div
                              variants={staggerContainer}
                              initial="initial"
                              animate="animate"
                              className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                            >
                              {getContainersByCategory(cat.name).map((container) => (
                                <ContainerCard
                                  key={container.id}
                                  item={container}
                                  childCount={childCounts[container.id]}
                                  category={cat}
                                  onClick={() => handleContainerClick(container)}
                                  onLongPress={() => setContextItem(container)}
                                  selectionMode={selectionMode}
                                  selected={selectedIds.includes(container.id)}
                                  onSelect={() => toggleSelection(container.id)}
                                />
                              ))}
                            </motion.div>
                          </section>
                        );
                      })}

                    {uncategorizedContainers.length > 0 && (
                      <section>
                        <motion.h2
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400"
                        >
                          其他收纳 ({uncategorizedContainers.length})
                        </motion.h2>
                        <motion.div
                          variants={staggerContainer}
                          initial="initial"
                          animate="animate"
                          className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                        >
                          {uncategorizedContainers.map((container) => (
                            <ContainerCard
                              key={container.id}
                              item={container}
                              childCount={childCounts[container.id]}
                              onClick={() => handleContainerClick(container)}
                              onLongPress={() => setContextItem(container)}
                              selectionMode={selectionMode}
                              selected={selectedIds.includes(container.id)}
                              onSelect={() => toggleSelection(container.id)}
                            />
                          ))}
                        </motion.div>
                      </section>
                    )}

                    {itemCategories
                      .filter((cat) => getItemsByCategory(cat.name).length > 0)
                      .map((cat) => {
                        const colorCls = getColorClasses(cat.color);
                        return (
                          <section key={cat.id}>
                            <motion.div
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="mb-3 flex items-center gap-2"
                            >
                              <div className={`flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-md ${colorCls.bg} ${colorCls.text}`}>
                                <CategoryIcon
                                  icon={cat.icon}
                                  fallback={Box}
                                  size={12}
                                  className={colorCls.text}
                                  imageClassName="h-full w-full object-cover"
                                />
                              </div>
                              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                {cat.name} ({getItemsByCategory(cat.name).length})
                              </h2>
                            </motion.div>
                            <motion.div
                              variants={staggerContainer}
                              initial="initial"
                              animate="animate"
                              className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                            >
                              {getItemsByCategory(cat.name).map((item) => (
                                <ItemCard
                                  key={item.id}
                                  item={item}
                                  category={cat}
                                  onClick={() => navigate(resolveItemDetailPath(item))}
                                  onLongPress={() => setContextItem(item)}
                                  selectionMode={selectionMode}
                                  selected={selectedIds.includes(item.id)}
                                  onSelect={() => toggleSelection(item.id)}
                                />
                              ))}
                            </motion.div>
                          </section>
                        );
                      })}

                    {uncategorizedItems.length > 0 && (
                      <section>
                        <motion.h2
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400"
                        >
                          其他物品 ({uncategorizedItems.length})
                        </motion.h2>
                        <motion.div
                          variants={staggerContainer}
                          initial="initial"
                          animate="animate"
                          className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                        >
                          {uncategorizedItems.map((item) => (
                            <ItemCard
                              key={item.id}
                              item={item}
                              onClick={() => navigate(resolveItemDetailPath(item))}
                              onLongPress={() => setContextItem(item)}
                              selectionMode={selectionMode}
                              selected={selectedIds.includes(item.id)}
                              onSelect={() => toggleSelection(item.id)}
                            />
                          ))}
                        </motion.div>
                      </section>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

            </motion.div>
          )}
        </div>
      </div>

      {!selectionMode && (
        <motion.button
          onClick={() => { setEditItem(null); setShowForm(true); }}
          whileHover={{ scale: 1.08, boxShadow: '0 12px 32px rgba(14,165,233,0.35)' }}
          whileTap={{ scale: 0.92, rotate: 45 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-sky-500 text-white shadow-lg shadow-sky-200 md:bottom-8 md:right-8"
        >
          <Plus size={24} />
        </motion.button>
      )}

      {selectionMode && selectedIds.length > 0 && (
        <div className="fixed bottom-24 left-4 right-4 z-40 md:bottom-8 md:left-auto md:right-8 md:top-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="ml-auto w-full md:w-[360px] rounded-3xl border border-slate-200 bg-white/95 backdrop-blur-xl shadow-2xl p-3"
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <div>
                <p className="text-sm font-semibold text-slate-900">已选择 {selectedIds.length} 项</p>
                <p className="text-xs text-slate-400 mt-0.5">可以统一编辑通用信息或批量删除</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowBulkEdit(true)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-sky-500 text-white py-3 text-sm font-medium shadow-sm shadow-sky-200 hover:bg-sky-600 transition-colors"
              >
                <SquarePen size={15} />
                批量编辑
              </button>
              <button
                onClick={() => setBulkDeletePending(true)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-rose-50 text-rose-600 py-3 text-sm font-medium border border-rose-100 hover:bg-rose-100 transition-colors"
              >
                <Trash2 size={15} />
                批量删除
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {contextItem && (
        <ContextMenu
          item={contextItem}
          onView={() => {
            navigate(resolveItemDetailPath(contextItem));
            setContextItem(null);
          }}
          onEdit={() => { setEditItem(contextItem); setShowForm(true); setContextItem(null); }}
          onDelete={() => { setDeleteTarget(contextItem); setContextItem(null); }}
          onMove={() => { setMoveTarget(contextItem); setContextItem(null); }}
          onClose={() => setContextItem(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="确认删除"
          message={`确定要删除「${deleteTarget.name}」吗？此操作不可撤销。${deleteTarget.type === 'container' ? '该节点下的所有内容也会一起删除。' : ''}`}
          confirmLabel="删除"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {bulkDeletePending && (
        <ConfirmDialog
          title="确认批量删除"
          message={`确定要删除选中的 ${selectedIds.length} 项吗？此操作不可撤销，若包含收纳或位置会同时删除其下内容。`}
          confirmLabel="批量删除"
          danger
          onConfirm={handleBulkDelete}
          onCancel={() => setBulkDeletePending(false)}
        />
      )}

      {moveTarget && (
        <MoveItemSheet
          currentParentId={moveTarget.parent_id}
          onMove={handleMove}
          onClose={() => setMoveTarget(null)}
        />
      )}

      {showForm && (
        <ItemForm
          initial={editItem ?? undefined}
          defaultParentId={currentParentId}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditItem(null); }}
        />
      )}

      {showBulkEdit && (
        <BulkEditSheet
          items={selectedItems}
          categories={categories}
          onSave={handleBulkSave}
          onClose={() => setShowBulkEdit(false)}
        />
      )}
    </div>
  );
}
