import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Tag } from 'lucide-react';
import type { Category, Item, ItemStatus } from '../../../legacy/database.types';
import { CategoryIcon, getColorClasses } from '../lib/categoryPresentation';
import { getContainerTypeLabel, isLocationItem } from '../lib/locationTag';
import LocationPicker from './LocationPicker';

interface BulkEditPayload {
  category?: string;
  status?: ItemStatus;
  description?: string;
  parent_id?: string | null;
  tags?: string[];
}

interface Props {
  items: Item[];
  categories: Category[];
  onSave: (payload: BulkEditPayload) => Promise<void>;
  onClose: () => void;
}

const STATUS_OPTIONS: { value: ItemStatus; label: string }[] = [
  { value: 'in_stock', label: '在库' },
  { value: 'borrowed', label: '借出' },
  { value: 'worn_out', label: '损耗' },
];

export default function BulkEditSheet({ items, categories, onSave, onClose }: Props) {
  const [saving, setSaving] = useState(false);
  const [enableDescription, setEnableDescription] = useState(false);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<ItemStatus | ''>('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [enableLocation, setEnableLocation] = useState(false);
  const [parentId, setParentId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const itemType = useMemo(() => {
    if (items.length === 0) {
      return null;
    }

    const firstType = items[0].type;
    return items.every((item) => item.type === firstType) ? firstType : null;
  }, [items]);

  const availableCategories = useMemo(() => {
    if (!itemType) {
      return [];
    }

    return categories.filter((categoryItem) => categoryItem.item_type === itemType);
  }, [categories, itemType]);

  const selectedTypeLabel = useMemo(() => {
    if (itemType === 'item') {
      return '物品';
    }

    if (itemType !== 'container') {
      return '对象';
    }

    const hasLocation = items.some(isLocationItem);
    const hasStorage = items.some((item) => item.type === 'container' && !isLocationItem(item));

    if (hasLocation && hasStorage) {
      return '收纳/位置';
    }

    return getContainerTypeLabel(items[0]);
  }, [itemType, items]);

  useEffect(() => {
    setCategory('');
    setStatus('');
  }, [itemType]);

  const handleAddTag = () => {
    const nextTag = tagInput.trim();
    if (!nextTag || tags.includes(nextTag)) {
      setTagInput('');
      return;
    }

    setTags((prev) => [...prev, nextTag]);
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setTags((prev) => prev.filter((value) => value !== tag));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const payload: BulkEditPayload = {};

    if (category) {
      payload.category = category;
    }

    if (status) {
      payload.status = status;
    }

    if (enableDescription) {
      payload.description = description.trim();
    }

    if (enableLocation) {
      payload.parent_id = parentId;
    }

    if (tags.length > 0) {
      payload.tags = Array.from(new Set([...items.flatMap((item) => item.tags), ...tags]));
    }

    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        <motion.div
          className="absolute inset-0 bg-black/25 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onClose}
        />
        <motion.div
          className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        >
          <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-1" />
          <div className="flex items-center justify-between px-5 pt-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="font-semibold text-slate-900 text-lg">批量编辑</h2>
              <p className="text-xs text-slate-400 mt-1">已选择 {items.length} 个{selectedTypeLabel}</p>
            </div>
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

          <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
            {itemType ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">类别</label>
                {availableCategories.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">当前没有可选类别</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableCategories.map((categoryItem) => {
                      const colorCls = getColorClasses(categoryItem.color);
                      const selected = category === categoryItem.name;
                      return (
                        <motion.button
                          key={categoryItem.id}
                          type="button"
                          onClick={() => setCategory(selected ? '' : categoryItem.name)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                            selected
                              ? `${colorCls.bg} ${colorCls.text} border-current`
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span className="flex h-3.5 w-3.5 items-center justify-center overflow-hidden rounded-sm">
                            <CategoryIcon
                              icon={categoryItem.icon}
                              fallback={Tag}
                              size={12}
                              className={selected ? colorCls.text : 'text-slate-500'}
                              imageClassName="h-full w-full object-cover"
                            />
                          </span>
                          {categoryItem.name}
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                混合选择了收纳和物品，类别和状态不会一起批量修改。
              </div>
            )}

            {itemType === 'item' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">状态</label>
                <div className="flex gap-2">
                  {STATUS_OPTIONS.map(({ value, label }) => (
                    <motion.button
                      key={value}
                      type="button"
                      onClick={() => setStatus(status === value ? '' : value)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        status === value
                          ? value === 'in_stock' ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
                            : value === 'borrowed' ? 'bg-amber-500 text-white shadow-sm shadow-amber-200'
                            : 'bg-rose-500 text-white shadow-sm shadow-rose-200'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {label}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-700">覆盖描述</span>
                <input
                  type="checkbox"
                  checked={enableDescription}
                  onChange={(event) => setEnableDescription(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
                />
              </label>
              {enableDescription && (
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="批量覆盖描述，留空可清空描述"
                  rows={3}
                  className="mt-3 w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition text-sm resize-none"
                />
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-700">批量移动位置</span>
                <input
                  type="checkbox"
                  checked={enableLocation}
                  onChange={(event) => setEnableLocation(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
                />
              </label>
              {enableLocation && (
                <motion.button
                  type="button"
                  onClick={() => setShowLocationPicker(true)}
                  whileHover={{ borderColor: '#38bdf8' }}
                  className="mt-3 w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-left text-slate-500 transition-colors"
                >
                  {parentId ? '已选择新的上级' : '顶层位置'}
                </motion.button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                <Tag size={14} />
                追加标签
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && (event.preventDefault(), handleAddTag())}
                  placeholder="添加后会并入所有已选对象"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition text-sm"
                />
                <motion.button
                  type="button"
                  onClick={handleAddTag}
                  whileHover={{ scale: 1.08, backgroundColor: '#e0f2fe' }}
                  whileTap={{ scale: 0.92 }}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-sky-50 text-sky-500 transition-colors"
                >
                  <Tag size={16} />
                </motion.button>
              </div>
              <AnimatePresence>
                {tags.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-wrap gap-1.5 overflow-hidden"
                  >
                    {tags.map((tag) => (
                      <motion.span
                        key={tag}
                        layout
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        transition={{ type: 'spring', stiffness: 450, damping: 22 }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-50 text-sky-600 rounded-full text-xs font-medium"
                      >
                        {tag}
                        <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-sky-800">
                          <X size={11} />
                        </button>
                      </motion.span>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="pb-4">
              <motion.button
                type="submit"
                disabled={saving}
                whileHover={{ scale: saving ? 1 : 1.01 }}
                whileTap={{ scale: saving ? 1 : 0.98 }}
                className="w-full py-4 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white font-semibold rounded-2xl transition-all text-sm shadow-sm shadow-sky-200"
              >
                {saving ? '保存中...' : '批量保存'}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>

      {showLocationPicker && (
        <LocationPicker
          value={parentId}
          onChange={(id) => setParentId(id)}
          onClose={() => setShowLocationPicker(false)}
        />
      )}
    </>
  );
}
