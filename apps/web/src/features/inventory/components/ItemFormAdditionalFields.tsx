import { AnimatePresence, motion } from 'framer-motion';
import { Camera, Loader2, Plus, Tag, X } from 'lucide-react';
import type { ChangeEvent, RefObject } from 'react';
import ModernDatePicker from '../../../shared/ui/ModernDatePicker';
import { buildInventoryImageUrl } from '../lib/itemImage';
import type { ItemFormData, UpdateItemFormField } from './itemFormTypes';

interface ItemFormAdditionalFieldsProps {
  form: ItemFormData;
  availableTags: string[];
  suggestedTags: string[];
  tagInput: string;
  normalizedTagInput: string;
  hasExactSuggestedTag: boolean;
  isUploading: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onUpdate: UpdateItemFormField;
  onTagInputChange: (value: string) => void;
  onAddTag: () => void;
  onToggleTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onRemoveImage: (url: string) => void;
  onImageUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export default function ItemFormAdditionalFields({
  form,
  availableTags,
  suggestedTags,
  tagInput,
  normalizedTagInput,
  hasExactSuggestedTag,
  isUploading,
  fileInputRef,
  onUpdate,
  onTagInputChange,
  onAddTag,
  onToggleTag,
  onRemoveTag,
  onRemoveImage,
  onImageUpload,
}: ItemFormAdditionalFieldsProps) {
  return (
    <div className="space-y-5 rounded-2xl border border-borderSoft bg-surfaceMuted/60 p-3 md:p-4">
      {form.type === 'item' ? <ItemLifecycleFields form={form} onUpdate={onUpdate} /> : null}
      <TagFields
        form={form}
        availableTags={availableTags}
        suggestedTags={suggestedTags}
        tagInput={tagInput}
        normalizedTagInput={normalizedTagInput}
        hasExactSuggestedTag={hasExactSuggestedTag}
        onTagInputChange={onTagInputChange}
        onAddTag={onAddTag}
        onToggleTag={onToggleTag}
        onRemoveTag={onRemoveTag}
      />
      <ImageFields
        form={form}
        isUploading={isUploading}
        fileInputRef={fileInputRef}
        onRemoveImage={onRemoveImage}
        onImageUpload={onImageUpload}
      />
    </div>
  );
}

function ItemLifecycleFields({ form, onUpdate }: Pick<ItemFormAdditionalFieldsProps, 'form' | 'onUpdate'>) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">购买价格</span>
          <input type="number" value={form.price} onChange={(event) => onUpdate('price', event.target.value)} placeholder="0.00" min="0" step="0.01" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand" />
        </label>
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">购买日期</p>
          <ModernDatePicker value={form.purchase_date} onChange={(value) => onUpdate('purchase_date', value)} placeholder="选择购买日期" ariaLabel="购买日期" />
        </div>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-700">库存追踪方式</legend>
        <div className="grid grid-cols-3 gap-2">
          {([
            ['unique', '单件'],
            ['quantity', '数量'],
            ['consumable', '消耗品'],
          ] as const).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={form.tracking_mode === value} onClick={() => onUpdate('tracking_mode', value)} className={`rounded-xl px-2 py-2.5 text-xs font-semibold ${form.tracking_mode === value ? 'bg-brandStrong text-white' : 'bg-white text-slate-600'}`}>
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      {form.tracking_mode !== 'unique' ? (
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">当前数量</span>
            <input type="number" min={0} value={form.quantity} onChange={(event) => onUpdate('quantity', Math.max(0, Number(event.target.value)))} className="w-full rounded-xl border border-border bg-white px-3 py-3 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">最低库存</span>
            <input type="number" min={0} value={form.minimum_quantity} onChange={(event) => onUpdate('minimum_quantity', event.target.value)} placeholder="不提醒" className="w-full rounded-xl border border-border bg-white px-3 py-3 text-sm" />
          </label>
        </div>
      ) : null}

      {form.tracking_mode === 'consumable' ? (
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">最近有效期</p>
          <ModernDatePicker value={form.expiry_date} onChange={(value) => onUpdate('expiry_date', value)} placeholder="选择最近有效期" ariaLabel="最近有效期" />
        </div>
      ) : null}

      <div>
        <p className="mb-1.5 text-sm font-medium text-slate-700">保修截止日期</p>
        <ModernDatePicker value={form.warranty_date} onChange={(value) => onUpdate('warranty_date', value)} placeholder="选择保修截止日期" ariaLabel="保修截止日期" />
      </div>
    </>
  );
}

type TagFieldsProps = Pick<ItemFormAdditionalFieldsProps,
  'form' | 'availableTags' | 'suggestedTags' | 'tagInput' | 'normalizedTagInput' | 'hasExactSuggestedTag' | 'onTagInputChange' | 'onAddTag' | 'onToggleTag' | 'onRemoveTag'>;

function TagFields({ form, availableTags, suggestedTags, tagInput, normalizedTagInput, hasExactSuggestedTag, onTagInputChange, onAddTag, onToggleTag, onRemoveTag }: TagFieldsProps) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700"><Tag size={14} aria-hidden="true" />标签</p>
      {availableTags.length > 0 ? (
        <div className="mb-3">
          <div className="mb-2 flex items-center justify-between gap-2 text-xs text-slate-500"><span>从标签库选择</span><span>{suggestedTags.length} / {availableTags.length}</span></div>
          {suggestedTags.length > 0 ? (
            <div className="max-h-40 overflow-y-auto rounded-2xl border border-slate-100 bg-white p-2">
              <div className="flex flex-wrap gap-2">
                {suggestedTags.map((tag) => (
                  <button key={tag} type="button" onClick={() => onToggleTag(tag)} className={`rounded-full px-3 py-1.5 text-xs font-medium ${form.tags.includes(tag) ? 'bg-brandStrong text-white' : 'bg-surfaceMuted text-slate-600 ring-1 ring-slate-200'}`}>{tag}</button>
                ))}
              </div>
            </div>
          ) : <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-4 text-xs text-slate-500">当前筛选下没有可选标签，回车可直接新建。</p>}
        </div>
      ) : null}
      <div className="mb-2 flex gap-2">
        <input type="text" value={tagInput} onChange={(event) => onTagInputChange(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && (event.preventDefault(), onAddTag())} placeholder="搜索已有标签，或输入新标签后按回车" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand" />
        <button type="button" onClick={onAddTag} aria-label="添加标签" className="flex h-10 w-10 items-center justify-center rounded-xl bg-brandTint text-brandStrong"><Plus size={16} aria-hidden="true" /></button>
      </div>
      {normalizedTagInput && !hasExactSuggestedTag ? <p className="mb-2 text-xs text-slate-500">未找到完全匹配的标签，继续回车可新建「{tagInput.trim()}」。</p> : null}
      <div className="flex flex-wrap gap-1.5">
        {form.tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
            {tag}<button type="button" onClick={() => onRemoveTag(tag)} aria-label={`移除标签：${tag}`}><X size={11} /></button>
          </span>
        ))}
      </div>
    </div>
  );
}

function ImageFields({ form, isUploading, fileInputRef, onRemoveImage, onImageUpload }: Pick<ItemFormAdditionalFieldsProps, 'form' | 'isUploading' | 'fileInputRef' | 'onRemoveImage' | 'onImageUpload'>) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700"><Camera size={14} aria-hidden="true" />图片</p>
      <div className="flex flex-wrap gap-2">
        <AnimatePresence>
          {form.images.map((url, index) => (
            <motion.div key={url} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="relative h-20 w-20 overflow-hidden rounded-xl">
              <img src={buildInventoryImageUrl(url, 'detail-thumb')} alt="" className="h-full w-full object-cover" />
              <button type="button" onClick={() => onRemoveImage(url)} aria-label={`移除图片 ${index + 1}`} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60"><X size={10} className="text-white" /></button>
            </motion.div>
          ))}
        </AnimatePresence>
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 text-slate-500">
          {isUploading ? <Loader2 size={18} className="animate-spin" /> : <><Camera size={18} aria-hidden="true" /><span className="text-[11px]">添加</span></>}
        </button>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => void onImageUpload(event)} />
    </div>
  );
}
