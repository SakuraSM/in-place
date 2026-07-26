import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, SquarePen, Trash2, Tag, MapPin, ChevronRight, Box, Package2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchItem, fetchAncestors, fetchChildren, updateItem, deleteItem } from '../../../legacy/items';
import type { Item } from '../../../legacy/database.types';
import type { ItemCreateInput } from '@inplace/domain';
import ConfirmDialog from '../../../shared/ui/ConfirmDialog';
import { PageContent, PageHeader, PageShell } from '../../../shared/ui/PageLayout';
import ItemForm from '../components/ItemForm';
import SpatialRelationScene from '../components/SpatialRelationScene';
import { staggerContainer, staggerItem } from '../../../shared/lib/animations';
import { resolveItemDetailPath } from '../lib/detailPath';
import { getContainerTypeLabel, isLocationItem } from '../lib/locationTag';
import { buildInventoryImageUrl } from '../lib/itemImage';
import EntityBadge from '../components/EntityBadge';

export default function ContainerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [container, setContainer] = useState<Item | null>(null);
  const [ancestors, setAncestors] = useState<Item[]>([]);
  const [children, setChildren] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const fetchedItem = await fetchItem(id);
      if (!fetchedItem) {
        setContainer(null);
        setAncestors([]);
        setChildren([]);
        setLoading(false);
        return;
      }

      if (fetchedItem.type !== 'container') {
        navigate(resolveItemDetailPath(fetchedItem), { replace: true });
        return;
      }

      const [fetchedAncestors, fetchedChildren] = await Promise.all([
        fetchAncestors(id),
        fetchChildren(fetchedItem.id, fetchedItem.user_id),
      ]);
      setContainer(fetchedItem);
      setAncestors(fetchedAncestors.slice(0, -1));
      setChildren(fetchedChildren);
      setLoading(false);
    };
    void load();
  }, [id, navigate]);

  const handleSave = async (data: ItemCreateInput) => {
    if (!container) return;
    const updated = await updateItem(container.id, data);
    setContainer(updated);
    setShowEdit(false);
  };

  const handleDelete = async () => {
    if (!container) return;
    await deleteItem(container.id);
    navigate(-1);
  };

  if (loading) {
    return (
      <PageShell>
        <PageContent width="wide" className="flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brandStrong border-t-transparent" />
        </PageContent>
      </PageShell>
    );
  }

  if (!container) {
    return (
      <PageShell>
        <PageContent width="wide" className="flex flex-col items-center justify-center">
          <Box size={48} className="mb-3 text-slate-300" />
          <p className="text-slate-500">找不到该位置或收纳</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-sm font-semibold text-brandStrong">返回</button>
        </PageContent>
      </PageShell>
    );
  }

  const containerLabel = getContainerTypeLabel(container);

  const infoCards = (
    <motion.div
      variants={staggerContainer}
      animate="animate"
      className="space-y-4"
    >
      <motion.div variants={staggerItem}>
        <SpatialRelationScene
          currentItem={container}
          ancestors={ancestors}
          children={children}
          onNodeClick={(node) => {
            if (node.id !== container.id) {
              navigate(resolveItemDetailPath(node));
            }
          }}
        />
      </motion.div>

      <motion.div variants={staggerItem} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <EntityBadge kind={isLocationItem(container) ? 'location' : 'container'} compact className="mb-2" />
            <h2 className="text-xl font-bold leading-tight text-slate-900">{container.name}</h2>
          </div>
        </div>
        {container.category && (
          <span className="mb-3 inline-block rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
            类别 · {container.category}
          </span>
        )}
        {container.description && (
          <p className="text-slate-600 text-sm leading-relaxed">{container.description}</p>
        )}
      </motion.div>

      <motion.div variants={staggerItem} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">{containerLabel}信息</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-600">直接包含</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{children.length}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-600">{containerLabel}层级</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{ancestors.length + 1}</p>
          </div>
        </div>
      </motion.div>

      {ancestors.length > 0 && (
        <motion.div variants={staggerItem} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
            <MapPin size={14} />
            收纳位置
          </h2>
          <div className="flex items-center gap-1 flex-wrap">
            {ancestors.map((a, i) => (
              <div key={a.id} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={12} className="text-slate-300" />}
                <span className="text-sm text-slate-600">{a.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {container.tags.length > 0 && (
        <motion.div variants={staggerItem} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
            <Tag size={14} />
            标签
          </h2>
          <div className="flex flex-wrap gap-2">
            {container.tags.map((tag) => (
              <motion.span
                key={tag}
                whileHover={{ scale: 1.06 }}
                className="px-3 py-1.5 bg-brandTint text-brandStrong rounded-full text-xs font-medium cursor-default"
              >
                {tag}
              </motion.span>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div variants={staggerItem} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
          <div>
            <p className="mb-0.5">创建时间</p>
            <p className="text-slate-600 font-medium">{new Date(container.created_at).toLocaleDateString('zh-CN')}</p>
          </div>
          <div>
            <p className="mb-0.5">最后更新</p>
            <p className="text-slate-600 font-medium">{new Date(container.updated_at).toLocaleDateString('zh-CN')}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );

  return (
    <PageShell>
      <PageHeader
        width="wide"
        title={container.name}
        titleSize="detail"
        eyebrow={`${containerLabel}详情`}
        backLink={(
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="返回上一级"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        actions={(
          <>
            <motion.button
              type="button"
              onClick={() => setShowEdit(true)}
              aria-label={`编辑${containerLabel}：${container.name}`}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surfaceMuted text-slate-600 hover:bg-brandTint hover:text-brandStrong transition-colors text-sm font-medium"
            >
              <SquarePen size={15} />
              <span className="hidden md:inline">编辑</span>
            </motion.button>
            <motion.button
              type="button"
              onClick={() => setShowDelete(true)}
              aria-label={`删除${containerLabel}：${container.name}`}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-500 transition-colors text-sm font-medium"
            >
              <Trash2 size={15} />
              <span className="hidden md:inline">删除</span>
            </motion.button>
          </>
        )}
      />

      <PageContent width="wide">
        <div className="hidden lg:grid lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)] lg:gap-8 2xl:grid-cols-[minmax(360px,480px)_minmax(0,1fr)] 2xl:gap-10">
          <div className="min-w-0 shrink-0">
            {container.images.length > 0 ? (
              <div className="sticky top-28">
                <div className="flex aspect-[5/4] items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-sm xl:aspect-square">
                  <img
                    src={buildInventoryImageUrl(container.images[activeImageIdx], 'detail')}
                    alt={container.name}
                    className="h-full w-full object-contain object-center"
                  />
                </div>
                {container.images.length > 1 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
                    {container.images.map((url, i) => (
                      <motion.button
                        key={i}
                        onClick={() => setActiveImageIdx(i)}
                        whileHover={{ scale: 1.06 }}
                        whileTap={{ scale: 0.94 }}
                        className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 bg-white transition-all ${
                          i === activeImageIdx ? 'border-brandStrong' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={buildInventoryImageUrl(url, 'detail-thumb')} alt="" className="h-full w-full object-cover object-center" />
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="sticky top-28 flex aspect-[5/4] items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm xl:aspect-square">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 text-slate-300">
                  <Package2 size={34} />
                </div>
              </div>
            )}
          </div>
          <div className="min-w-0">{infoCards}</div>
        </div>

        <div className="space-y-4 lg:hidden">
          {container.images.length > 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
              <div className="aspect-square overflow-hidden rounded-xl bg-slate-100">
                <img src={buildInventoryImageUrl(container.images[activeImageIdx], 'detail')} alt={container.name} className="h-full w-full object-cover" />
              </div>
              {container.images.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
                  {container.images.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImageIdx(i)}
                      className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${
                        i === activeImageIdx ? 'border-brandStrong' : 'border-transparent opacity-60'
                      }`}
                    >
                      <img src={buildInventoryImageUrl(url, 'detail-thumb')} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}
          {infoCards}
        </div>
      </PageContent>

      {showEdit && (
        <ItemForm
          initial={container}
          defaultParentId={container.parent_id}
          onSave={handleSave}
          onClose={() => setShowEdit(false)}
        />
      )}

      {showDelete && (
        <ConfirmDialog
          title={`确认删除${containerLabel}`}
          message={`确定要删除「${container.name}」吗？该${containerLabel}下的所有内容也会一起删除。`}
          confirmLabel="删除"
          danger
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </PageShell>
  );
}
