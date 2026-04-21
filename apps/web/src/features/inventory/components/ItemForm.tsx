import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, MapPin, Tag, Plus, Loader2 } from 'lucide-react';
import type { Item, ItemType, ItemStatus, Category } from '../../../legacy/database.types';
import { useAuth } from '../../../app/providers/AuthContext';
import { fetchItem, uploadImage } from '../../../legacy/items';
import { fetchCategories } from '../../../legacy/categories';
import { fetchTags } from '../../../legacy/tags';
import { CategoryIcon, getColorClasses } from '../lib/categoryPresentation';
import { isLocationItem, updateLocationMetadata } from '../lib/locationTag';
import LocationPicker from './LocationPicker';
import ModernDatePicker from '../../../shared/ui/ModernDatePicker';

interface FormData {
  type: ItemType;
  isLocation: boolean;
  name: string;
  description: string;
  category: string;
  status: ItemStatus;
  price: string;
  purchase_date: string;
  warranty_date: string;
  images: string[];
  tags: string[];
  parent_id: string | null;
  metadata: Record<string, unknown>;
}

interface Props {
  initial?: Partial<Item>;
  defaultParentId?: string | null;
  defaultType?: ItemType;
  forceType?: ItemType;
  fixedLocation?: boolean;
  submitError?: string | null;
  onSave: (data: Omit<Item, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onClose: () => void;
}

const STATUS_OPTIONS: { value: ItemStatus; label: string }[] = [
  { value: 'in_stock', label: '在库' },
  { value: 'borrowed', label: '借出' },
  { value: 'worn_out', label: '损耗' },
];

export default function ItemForm({
  initial,
  defaultParentId,
  defaultType = 'item',
  forceType,
  fixedLocation = false,
  submitError,
  onSave,
  onClose,
}: Props) {
  const { user } = useAuth();
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  const [form, setForm] = useState<FormData>({
    type: forceType ?? initial?.type ?? defaultType,
    isLocation: fixedLocation || isLocationItem(initial as Item | undefined),
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    category: initial?.category ?? '',
    status: initial?.status ?? 'in_stock',
    price: initial?.price?.toString() ?? '',
    purchase_date: initial?.purchase_date ?? '',
    warranty_date: initial?.warranty_date ?? '',
    images: initial?.images ?? [],
    tags: initial?.tags ?? [],
    parent_id: initial?.parent_id !== undefined ? initial.parent_id : defaultParentId ?? null,
    metadata: initial?.metadata ?? {},
  });
  const [tagInput, setTagInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [parentLabel, setParentLabel] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    fetchCategories(user.id, form.type).then(setCustomCategories);
  }, [user, form.type]);

  useEffect(() => {
    if (!user) return;
    fetchTags(user.id).then((tags) => setAvailableTags(
      tags
        .map((tag) => tag.name)
        .sort((left, right) => left.localeCompare(right, 'zh-CN')),
    ));
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    const loadParentLabel = async () => {
      if (!form.parent_id) {
        setParentLabel(null);
        return;
      }

      try {
        const parentItem = await fetchItem(form.parent_id);
        if (!cancelled) {
          setParentLabel(parentItem?.name ?? form.parent_id);
        }
      } catch {
        if (!cancelled) {
          setParentLabel(form.parent_id);
        }
      }
    };

    void loadParentLabel();

    return () => {
      cancelled = true;
    };
  }, [form.parent_id]);

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !user) return;
    setUploading(true);
    try {
      const urls = await Promise.all(files.map((f) => uploadImage(f, user.id)));
      update('images', [...form.images, ...urls]);
    } finally {
      setUploading(false);
    }
  };

  const addTag = () => {
    const tag = tagInput.trim();
    const normalizedTag = tag.toLocaleLowerCase('zh-CN');
    const matchedTag = availableTags.find((value) => value.toLocaleLowerCase('zh-CN') === normalizedTag);
    const resolvedTag = matchedTag ?? tag;
    const normalizedResolvedTag = resolvedTag.toLocaleLowerCase('zh-CN');
    const hasDuplicateTag = form.tags.some((value) => value.toLocaleLowerCase('zh-CN') === normalizedResolvedTag);
    if (resolvedTag && !hasDuplicateTag) {
      update('tags', [...form.tags, resolvedTag]);
    }
    setTagInput('');
  };

  const toggleExistingTag = (tag: string) => {
    if (form.tags.includes(tag)) {
      removeTag(tag);
      return;
    }

    update('tags', [...form.tags, tag]);
  };

  const removeTag = (tag: string) => {
    update('tags', form.tags.filter((t) => t !== tag));
  };

  const removeImage = (url: string) => {
    update('images', form.images.filter((i) => i !== url));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        user_id: user.id,
        parent_id: form.parent_id,
        type: form.type,
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        status: form.status,
        price: form.price ? parseFloat(form.price) : null,
        purchase_date: form.purchase_date || null,
        warranty_date: form.warranty_date || null,
        images: form.images,
        tags: form.tags,
        metadata: updateLocationMetadata(form.metadata, form.type === 'container' && form.isLocation),
      });
    } finally {
      setSaving(false);
    }
  };

  const containerLabel = form.type === 'container'
    ? (form.isLocation ? '位置' : '收纳')
    : '物品';
  const normalizedTagInput = useMemo(
    () => tagInput.trim().toLocaleLowerCase('zh-CN'),
    [tagInput],
  );
  const suggestedTags = useMemo(() => availableTags.filter((tag) => {
    if (form.tags.includes(tag)) {
      return false;
    }

    if (!normalizedTagInput) {
      return true;
    }

    return tag.toLocaleLowerCase('zh-CN').includes(normalizedTagInput);
  }), [availableTags, form.tags, normalizedTagInput]);
  const hasExactSuggestedTag = suggestedTags.some((tag) => tag.toLocaleLowerCase('zh-CN') === normalizedTagInput);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:px-6 md:py-8">
        <motion.div
          className="absolute inset-0 bg-black/25 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onClose}
        />
        <motion.div
          className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden bg-white shadow-2xl rounded-t-3xl md:max-h-[88vh] md:max-w-3xl md:rounded-3xl"
          initial={{ y: 24, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        >
          <div className="mx-auto mb-1 mt-3 h-1 w-10 rounded-full bg-slate-200 md:hidden" />
          <div className="flex items-center justify-between px-5 pt-3 pb-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 text-lg">
              {initial?.id ? '编辑' : '新增'}{containerLabel}
            </h2>
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

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {!initial?.id && !forceType && (
              <div className="relative flex p-1 bg-slate-100 rounded-xl">
                {(['item', 'container'] as ItemType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => update('type', t)}
                    className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors relative z-10"
                  >
                    {form.type === t && (
                      <motion.div
                        layoutId="item-form-type-pill"
                        className="absolute inset-0 bg-white rounded-lg shadow-sm"
                        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                      />
                    )}
                    <span className={`relative ${form.type === t ? 'text-slate-900' : 'text-slate-500'}`}>
                      {t === 'item' ? '物品' : '收纳'}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {form.type === 'container' && !fixedLocation && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">标记为位置</label>
                <button
                  type="button"
                  onClick={() => update('isLocation', !form.isLocation)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                    form.isLocation
                      ? 'border-sky-200 bg-sky-50'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                  }`}
                  aria-pressed={form.isLocation}
                >
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${form.isLocation ? 'text-sky-700' : 'text-slate-700'}`}>
                      作为位置使用
                    </p>
                    <p className={`mt-0.5 text-xs ${form.isLocation ? 'text-sky-600' : 'text-slate-400'}`}>
                      开启后可作为空间节点承载下级内容
                    </p>
                  </div>
                  <span
                    className={`relative ml-4 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
                      form.isLocation ? 'bg-sky-500' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                        form.isLocation ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </span>
                </button>
              </div>
            )}

            {form.type === 'container' && fixedLocation && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">位置类型</label>
                <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3">
                  <p className="text-sm font-medium text-sky-700">当前位置将直接作为「位置」创建</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">名称 *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder={form.type === 'container'
                  ? (form.isLocation ? '如：卧室、客厅、阳台...' : '如：透明收纳箱、床头柜抽屉...')
                  : '如：蓝色羽绒服...'}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">描述</label>
              <textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="添加备注或描述..."
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition text-sm resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">类别</label>
              {customCategories.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">暂无自定义类别，请前往「类别管理」添加</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {customCategories.map((cat) => {
                    const colorCls = getColorClasses(cat.color);
                    const isSelected = form.category === cat.name;
                    return (
                      <motion.button
                        key={cat.id}
                        type="button"
                        onClick={() => update('category', isSelected ? '' : cat.name)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                          isSelected
                            ? `${colorCls.bg} ${colorCls.text} border-current`
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className="flex h-3.5 w-3.5 items-center justify-center overflow-hidden rounded-sm">
                          <CategoryIcon
                            icon={cat.icon}
                            fallback={Tag}
                            size={12}
                            className={isSelected ? colorCls.text : 'text-slate-500'}
                            imageClassName="h-full w-full object-cover"
                          />
                        </span>
                        {cat.name}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>

            {form.type === 'item' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">状态</label>
                  <div className="flex gap-2">
                    {STATUS_OPTIONS.map(({ value, label }) => (
                      <motion.button
                        key={value}
                        type="button"
                        onClick={() => update('status', value)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.96 }}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                          form.status === value
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">购买价格</label>
                    <input
                      type="number"
                      value={form.price}
                      onChange={(e) => update('price', e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">购买日期</label>
                    <ModernDatePicker
                      value={form.purchase_date}
                      onChange={(value) => update('purchase_date', value)}
                      placeholder="选择购买日期"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">保修截止日期</label>
                  <ModernDatePicker
                    value={form.warranty_date}
                    onChange={(value) => update('warranty_date', value)}
                    placeholder="选择保修截止日期"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                <MapPin size={14} />
                放置位置
              </label>
              <motion.button
                type="button"
                onClick={() => setShowLocationPicker(true)}
                whileHover={{ borderColor: '#38bdf8' }}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-left text-slate-500 transition-colors"
              >
                {form.parent_id
                  ? `已选择上级 (${parentLabel ?? '加载中...'})`
                  : '顶层位置'}
              </motion.button>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                <Tag size={14} />
                标签
              </label>
              {availableTags.length > 0 && (
                <div className="mb-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-slate-400">从标签库选择</p>
                    <span className="text-[11px] text-slate-400">
                      {suggestedTags.length} / {availableTags.length}
                    </span>
                  </div>
                  {suggestedTags.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50 p-2">
                      <div className="flex flex-wrap gap-2">
                        {suggestedTags.map((tag) => (
                          <motion.button
                            key={tag}
                            type="button"
                            onClick={() => toggleExistingTag(tag)}
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                              form.tags.includes(tag)
                                ? 'bg-sky-500 text-white'
                                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {tag}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-400">
                      当前筛选下没有可选标签，回车可直接新建。
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="搜索已有标签，或输入新标签后按回车"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition text-sm"
                />
                <motion.button
                  type="button"
                  onClick={addTag}
                  whileHover={{ scale: 1.08, backgroundColor: '#e0f2fe' }}
                  whileTap={{ scale: 0.92 }}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-sky-50 text-sky-500 transition-colors"
                >
                  <Plus size={16} />
                </motion.button>
              </div>
              {normalizedTagInput && !hasExactSuggestedTag && (
                <p className="mb-2 text-xs text-slate-400">
                  未找到完全匹配的标签，继续回车可新建「{tagInput.trim()}」。
                </p>
              )}
              <AnimatePresence>
                {form.tags.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-wrap gap-1.5 overflow-hidden"
                  >
                    {form.tags.map((tag) => (
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
                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-sky-800">
                          <X size={11} />
                        </button>
                      </motion.span>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {submitError ? (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                {submitError}
              </div>
            ) : null}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                <Camera size={14} />
                图片
              </label>
              <div className="flex gap-2 flex-wrap">
                <AnimatePresence>
                  {form.images.map((url, i) => (
                    <motion.div
                      key={url}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                      className="relative w-20 h-20 rounded-xl overflow-hidden"
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(url)}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                      >
                        <X size={10} className="text-white" />
                      </button>
                      <span className="sr-only">image {i + 1}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <motion.button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  whileHover={{ borderColor: '#38bdf8', color: '#0ea5e9' }}
                  whileTap={{ scale: 0.95 }}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 text-slate-400 transition-colors"
                >
                  {uploading ? <Loader2 size={18} className="animate-spin" /> : <><Camera size={18} /><span className="text-[10px]">添加</span></>}
                </motion.button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>
            </div>

            <div className="border-t border-slate-100 bg-white px-5 py-4">
              <motion.button
                type="submit"
                disabled={saving || !form.name.trim()}
                whileHover={{ scale: saving ? 1 : 1.01 }}
                whileTap={{ scale: saving ? 1 : 0.98 }}
                className="w-full py-4 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white font-semibold rounded-2xl transition-all text-sm shadow-sm shadow-sky-200"
              >
                {saving ? '保存中...' : '保存'}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>

      {showLocationPicker && (
        <LocationPicker
          value={form.parent_id}
          excludeId={initial?.id}
          onChange={(id) => update('parent_id', id)}
          onClose={() => setShowLocationPicker(false)}
        />
      )}
    </>
  );
}
