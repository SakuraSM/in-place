import { useRef, useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Shapes, X, Check, ChevronDown, Upload, ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../app/providers/AuthContext';
import { fetchCategories, createCategory, updateCategory, deleteCategory } from '../../../legacy/categories';
import { uploadImage } from '../../../legacy/items';
import type { Category, ItemType } from '../../../legacy/database.types';
import ConfirmDialog from '../../../shared/ui/ConfirmDialog';
import { staggerContainer, staggerItem } from '../../../shared/lib/animations';
import { CategoryIcon, COLOR_OPTIONS, ICON_OPTIONS, getCategoryIconLabel, getColorClasses, isCustomCategoryImageIcon } from '../lib/categoryPresentation';
import EmptyState from '../../../shared/ui/EmptyState';

interface CategoryFormProps {
  initial?: Partial<Category>;
  itemType: ItemType;
  userId: string;
  onSave: (cat: Category) => void;
  onClose: () => void;
}

function CategoryForm({ initial, itemType, userId, onSave, onClose }: CategoryFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? 'FolderTree');
  const [color, setColor] = useState(initial?.color ?? 'sky');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const iconInputRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (initial?.id) {
        const updated = await updateCategory(initial.id, { name: name.trim(), icon, color });
        onSave(updated);
      } else {
        const created = await createCategory({ user_id: userId, item_type: itemType, name: name.trim(), icon, color });
        onSave(created);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const colorCls = getColorClasses(color);

  const handleIconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploadingIcon(true);
    setError(null);
    try {
      const uploadedUrl = await uploadImage(file, userId);
      setIcon(uploadedUrl);
      setShowIconPicker(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '图标上传失败，请重试');
    } finally {
      setUploadingIcon(false);
      event.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <motion.div
        className="absolute inset-0 bg-black/25 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="relative w-full max-w-md rounded-t-3xl bg-white p-5 pb-8 shadow-2xl"
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
      >
        <div className="mx-auto mb-1 mt-3 h-1 w-10 rounded-full bg-slate-200" />
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-slate-900">{initial?.id ? '编辑类别' : '新增类别'}</h3>
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.08, rotate: 90 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500"
          >
            <X size={16} />
          </motion.button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl ${colorCls.bg} ${isCustomCategoryImageIcon(icon) ? '' : colorCls.text}`}>
              <CategoryIcon
                icon={icon}
                fallback={Shapes}
                size={26}
                className={colorCls.text}
                imageClassName="h-full w-full object-cover"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">名称</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="分类名称..."
                required
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">颜色</label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setColor(c.key)}
                  className={`w-8 h-8 rounded-full ${c.bg} ${c.text} flex items-center justify-center transition-all ${color === c.key ? `ring-2 ring-offset-2 ${c.ring} scale-110` : 'hover:scale-105'}`}
                >
                  {color === c.key && <Check size={14} />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">分类图标</label>
            <div className="mb-2 flex items-center gap-2">
              <input
                ref={iconInputRef}
                type="file"
                accept="image/*"
                onChange={(event) => void handleIconUpload(event)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => iconInputRef.current?.click()}
                disabled={uploadingIcon}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:border-sky-400 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                <Upload size={14} />
                {uploadingIcon ? '上传中...' : '上传自定义图片'}
              </button>
              {isCustomCategoryImageIcon(icon) ? (
                <button
                  type="button"
                  onClick={() => setIcon('FolderTree')}
                  className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200"
                >
                  <ImageIcon size={13} />
                  恢复内置图标
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setShowIconPicker(!showIconPicker)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 hover:border-sky-400 transition-colors w-full"
            >
              <div className={`flex h-6 w-6 items-center justify-center overflow-hidden rounded-lg ${isCustomCategoryImageIcon(icon) ? 'bg-white ring-1 ring-slate-200' : `${colorCls.bg} ${colorCls.text}`}`}>
                <CategoryIcon
                  icon={icon}
                  fallback={Shapes}
                  size={16}
                  className={colorCls.text}
                  imageClassName="h-full w-full object-cover"
                />
              </div>
              <span className="flex-1 text-left">{getCategoryIconLabel(icon)}</span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${showIconPicker ? 'rotate-180' : ''}`} />
            </button>
            {showIconPicker && (
              <div className="mt-2 grid max-h-56 grid-cols-5 gap-2 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3 md:grid-cols-6">
                {ICON_OPTIONS.map(({ key, label }) => {
                  return (
                    <button
                      key={key}
                      type="button"
                      title={label}
                      onClick={() => { setIcon(key); setShowIconPicker(false); }}
                      className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all ${icon === key ? `${colorCls.bg} ${colorCls.text}` : 'text-slate-500 hover:bg-slate-200'}`}
                    >
                      <CategoryIcon icon={key} fallback={Shapes} size={18} className={icon === key ? colorCls.text : 'text-slate-500'} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-rose-500 bg-rose-50 rounded-xl px-3 py-2">{error}</p>
          )}
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full py-3.5 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white font-semibold rounded-2xl transition-all text-sm"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function CategoryItem({ cat, onEdit, onDelete }: { cat: Category; onEdit: () => void; onDelete: () => void }) {
  const colorCls = getColorClasses(cat.color);
  return (
    <div className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-3.5 hover:shadow-md transition-shadow">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl ${colorCls.bg} ${isCustomCategoryImageIcon(cat.icon) ? '' : colorCls.text}`}>
        <CategoryIcon
          icon={cat.icon}
          fallback={Shapes}
          size={20}
          className={colorCls.text}
          imageClassName="h-full w-full object-cover"
        />
      </div>
      <span className="flex-1 font-medium text-slate-800 text-sm">{cat.name}</span>
      <button
        onClick={onEdit}
        className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-sky-500 hover:bg-sky-50 transition-colors"
      >
        <Pencil size={15} />
      </button>
      <button
        onClick={onDelete}
        className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

export default function CategoriesPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ItemType>('container');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const all = await fetchCategories(user.id);
      setCategories(all);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user]);

  const filtered = categories.filter((c) => c.item_type === activeTab);

  const handleSave = (cat: Category) => {
    setCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === cat.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = cat;
        return next;
      }
      return [...prev, cat];
    });
    setShowForm(false);
    setEditTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteCategory(deleteTarget.id);
    setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-100">
        <div className="px-4 md:px-8 pt-4 md:pt-6 pb-3">
          <h1 className="text-xl font-bold text-slate-900 mb-3">分类管理</h1>
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit relative">
            {([['container', '容器分类'], ['item', '物品分类']] as [ItemType, string][]).map(([type, label]) => (
              <motion.button
                key={type}
                onClick={() => setActiveTab(type)}
                whileTap={{ scale: 0.94 }}
                className="relative px-4 py-1.5 rounded-lg text-sm font-medium z-10"
              >
                {activeTab === type && (
                  <motion.div
                    layoutId="categories-tab-pill"
                    className="absolute inset-0 bg-white rounded-lg shadow-sm"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className={`relative z-10 transition-colors ${activeTab === type ? 'text-slate-900' : 'text-slate-500'}`}>
                  {label}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-4 space-y-2.5">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12 text-slate-400 text-sm"
            >
              加载中...
            </motion.div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Shapes size={28} className="text-slate-300" />}
              title={`暂无${activeTab === 'container' ? '容器' : '物品'}分类`}
              description="点击 + 按钮创建第一个分类"
              iconMotion={{
                animate: { rotate: [0, -8, 8, 0] },
                transition: { repeat: Infinity, duration: 3, ease: 'easeInOut' },
              }}
            />
          ) : (
            <motion.div
              key={activeTab}
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              exit={{ opacity: 0 }}
              className="space-y-2.5"
            >
              {filtered.map((cat) => (
                <motion.div key={cat.id} variants={staggerItem}>
                  <CategoryItem
                    cat={cat}
                    onEdit={() => { setEditTarget(cat); setShowForm(true); }}
                    onDelete={() => setDeleteTarget(cat)}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.button
        onClick={() => { setEditTarget(null); setShowForm(true); }}
        whileHover={{ scale: 1.08, boxShadow: '0 12px 32px rgba(14,165,233,0.35)' }}
        whileTap={{ scale: 0.92, rotate: 45 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="fixed bottom-24 md:bottom-8 right-4 md:right-8 w-14 h-14 bg-sky-500 text-white rounded-full shadow-lg shadow-sky-200 flex items-center justify-center z-30"
      >
        <Plus size={24} />
      </motion.button>

      <AnimatePresence>
        {showForm && user ? (
          <CategoryForm
            initial={editTarget ?? undefined}
            itemType={activeTab}
            userId={user.id}
            onSave={handleSave}
            onClose={() => { setShowForm(false); setEditTarget(null); }}
          />
        ) : null}
      </AnimatePresence>

      {deleteTarget && (
        <ConfirmDialog
          title="删除类别"
          message={`确定要删除「${deleteTarget.name}」类别吗？已使用该类别的物品不会受影响。`}
          confirmLabel="删除"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
