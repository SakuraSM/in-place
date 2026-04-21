import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, SquarePen, Trash2, Tag, Calendar, DollarSign, ShieldCheck, MapPin, ChevronRight, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchItem, fetchAncestors, fetchChildren, updateItem, deleteItem } from '../../../legacy/items';
import type { Item } from '../../../legacy/database.types';
import StatusBadge from '../../../shared/ui/StatusBadge';
import ConfirmDialog from '../../../shared/ui/ConfirmDialog';
import ItemForm from '../components/ItemForm';
import SpatialRelationScene from '../components/SpatialRelationScene';
import { staggerContainer, staggerItem } from '../../../shared/lib/animations';
import { resolveItemDetailPath } from '../lib/detailPath';

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [ancestors, setAncestors] = useState<Item[]>([]);
  const [relationChildren, setRelationChildren] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const fetchedItem = await fetchItem(id);
      if (fetchedItem && fetchedItem.type !== 'item') {
        navigate(resolveItemDetailPath(fetchedItem), { replace: true });
        return;
      }
      const [fetchedAncestors, fetchedChildren] = await Promise.all([
        fetchAncestors(id),
        fetchedItem?.type === 'container' ? fetchChildren(fetchedItem.id, fetchedItem.user_id) : Promise.resolve([]),
      ]);
      setItem(fetchedItem);
      setAncestors(fetchedAncestors.slice(0, -1));
      setRelationChildren(fetchedChildren);
      setLoading(false);
    };
    void load();
  }, [id, navigate]);

  const handleSave = async (data: Omit<Item, 'id' | 'created_at' | 'updated_at'>) => {
    if (!item) return;
    const updated = await updateItem(item.id, data);
    setItem(updated);
    setShowEdit(false);
  };

  const handleDelete = async () => {
    if (!item) return;
    await deleteItem(item.id);
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Package size={48} className="text-slate-300 mb-3" />
        <p className="text-slate-500">找不到该物品</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-sky-500 text-sm">返回</button>
      </div>
    );
  }

  const infoCards = (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-4"
    >
      <motion.div variants={staggerItem}>
        <SpatialRelationScene
          currentItem={item}
          ancestors={ancestors}
          children={relationChildren}
          onNodeClick={(node) => {
            if (node.id !== item.id) {
              navigate(resolveItemDetailPath(node));
            }
          }}
        />
      </motion.div>

      <motion.div variants={staggerItem} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h1 className="text-xl font-bold text-slate-900 leading-tight">{item.name}</h1>
          <StatusBadge status={item.status} />
        </div>
        {item.category && (
          <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium mb-3">
            {item.category}
          </span>
        )}
        {item.description && (
          <p className="text-slate-600 text-sm leading-relaxed">{item.description}</p>
        )}
      </motion.div>

      {(item.price || item.purchase_date || item.warranty_date) && (
        <motion.div variants={staggerItem} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">购买信息</h2>
          <div className="space-y-3">
            {item.price && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <DollarSign size={14} className="text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">购买价格</p>
                  <p className="text-sm font-semibold text-slate-800">¥{item.price.toFixed(2)}</p>
                </div>
              </div>
            )}
            {item.purchase_date && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-sky-50 rounded-lg flex items-center justify-center">
                  <Calendar size={14} className="text-sky-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">购买日期</p>
                  <p className="text-sm font-semibold text-slate-800">{item.purchase_date}</p>
                </div>
              </div>
            )}
            {item.warranty_date && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                  <ShieldCheck size={14} className="text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">保修截止</p>
                  <p className="text-sm font-semibold text-slate-800">{item.warranty_date}</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {ancestors.length > 0 && (
        <motion.div variants={staggerItem} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
            <MapPin size={14} />
            所在位置
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

      {item.tags.length > 0 && (
        <motion.div variants={staggerItem} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
            <Tag size={14} />
            标签
          </h2>
          <div className="flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <motion.span
                key={tag}
                whileHover={{ scale: 1.06 }}
                className="px-3 py-1.5 bg-sky-50 text-sky-600 rounded-full text-xs font-medium cursor-default"
              >
                {tag}
              </motion.span>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div variants={staggerItem} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
          <div>
            <p className="mb-0.5">创建时间</p>
            <p className="text-slate-600 font-medium">{new Date(item.created_at).toLocaleDateString('zh-CN')}</p>
          </div>
          <div>
            <p className="mb-0.5">最后更新</p>
            <p className="text-slate-600 font-medium">{new Date(item.updated_at).toLocaleDateString('zh-CN')}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-100">
        <div className="flex items-center justify-between px-4 md:px-8 pt-4 md:pt-5 pb-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => setShowEdit(true)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-sky-50 hover:text-sky-500 transition-colors text-sm font-medium"
            >
              <SquarePen size={15} />
              <span className="hidden md:inline">编辑</span>
            </motion.button>
            <motion.button
              onClick={() => setShowDelete(true)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-500 transition-colors text-sm font-medium"
            >
              <Trash2 size={15} />
              <span className="hidden md:inline">删除</span>
            </motion.button>
          </div>
        </div>
      </div>

      <div className="mx-auto hidden w-full max-w-[1680px] md:grid md:grid-cols-[minmax(320px,420px)_minmax(0,1fr)] md:gap-8 md:px-8 md:py-6 2xl:grid-cols-[minmax(360px,480px)_minmax(0,1fr)] 2xl:gap-10">
        <div className="min-w-0 shrink-0">
          {item.images.length > 0 ? (
            <div className="sticky top-24">
              <div className="flex aspect-[5/4] items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-sm xl:aspect-square">
                <img
                  src={item.images[activeImageIdx]}
                  alt={item.name}
                  className="h-full w-full object-contain object-center"
                />
              </div>
              {item.images.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide">
                  {item.images.map((url, i) => (
                    <motion.button
                      key={i}
                      onClick={() => setActiveImageIdx(i)}
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.94 }}
                      className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 bg-white transition-all ${
                        i === activeImageIdx ? 'border-sky-500' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt="" className="h-full w-full object-cover object-center" />
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="sticky top-24 flex aspect-[5/4] items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm xl:aspect-square">
              <Package size={64} className="text-slate-200" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          {infoCards}
        </div>
      </div>

      <div className="md:hidden">
        {item.images.length > 0 && (
          <div className="bg-white">
            <div className="relative aspect-square overflow-hidden">
              <img src={item.images[activeImageIdx]} alt={item.name} className="w-full h-full object-cover" />
            </div>
            {item.images.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto">
                {item.images.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImageIdx(i)}
                    className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                      i === activeImageIdx ? 'border-sky-500' : 'border-transparent'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="px-4 py-5">
          {infoCards}
        </div>
      </div>

      {showDelete && (
        <ConfirmDialog
          title="确认删除"
          message={`确定要删除「${item.name}」吗？此操作不可撤销。`}
          confirmLabel="删除"
          danger
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}

      {showEdit && (
        <ItemForm
          initial={item}
          onSave={handleSave}
          onClose={() => setShowEdit(false)}
        />
      )}
    </div>
  );
}
