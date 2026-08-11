import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { ChevronDown } from 'lucide-react';
import { INVENTORY_NODE_LABELS } from '@inplace/app-core';
import type { ItemCreateInput } from '@inplace/domain';
import type { Category, Item, ItemType } from '../../../legacy/database.types';
import { useAuth } from '../../../app/providers/auth-context';
import { fetchCategories } from '../../../legacy/categories';
import { fetchItem, uploadImage } from '../../../legacy/items';
import { fetchTags } from '../../../legacy/tags';
import { getFormCategoryScope } from '../lib/categoryScope';
import { createInitialItemFormData, toItemCreateInput } from './itemFormData';
import ItemFormAdditionalFields from './ItemFormAdditionalFields';
import ItemFormDialog from './ItemFormDialog';
import ItemFormPrimaryFields from './ItemFormPrimaryFields';
import type { ItemFormData, UpdateItemFormField } from './itemFormTypes';
import LocationPicker from './LocationPicker';

interface ItemFormProps {
  initial?: Partial<Item>;
  defaultParentId?: string | null;
  defaultType?: ItemType;
  forceType?: ItemType;
  fixedLocation?: boolean;
  submitError?: string | null;
  onSave: (data: ItemCreateInput) => Promise<void>;
  onClose: () => void;
}

export default function ItemForm({
  initial,
  defaultParentId,
  defaultType = 'item',
  forceType,
  fixedLocation = false,
  submitError,
  onSave,
  onClose,
}: ItemFormProps) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [form, setForm] = useState<ItemFormData>(() => createInitialItemFormData({
    initial,
    defaultParentId,
    defaultType,
    forceType,
    fixedLocation,
  }));
  const [tagInput, setTagInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [isAdditionalDetailsOpen, setIsAdditionalDetailsOpen] = useState(Boolean(initial?.id));
  const [parentLabel, setParentLabel] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const nameId = useId();
  const descriptionId = useId();
  const additionalDetailsId = useId();
  const categoryScope = getFormCategoryScope(form.type, form.isLocation);

  useEffect(() => {
    if (!user) return;
    void fetchCategories(user.id, categoryScope).then(setCategories);
  }, [categoryScope, user]);

  useEffect(() => {
    if (!user) return;
    void fetchTags(user.id).then((tags) => setAvailableTags(
      tags.map((tag) => tag.name).sort((left, right) => left.localeCompare(right, 'zh-CN')),
    ));
  }, [user]);

  useEffect(() => {
    let isCancelled = false;
    if (!form.parent_id) {
      setParentLabel(null);
      return undefined;
    }

    void fetchItem(form.parent_id)
      .then((parentItem) => {
        if (!isCancelled) setParentLabel(parentItem?.name ?? form.parent_id);
      })
      .catch(() => {
        if (!isCancelled) setParentLabel(form.parent_id);
      });

    return () => {
      isCancelled = true;
    };
  }, [form.parent_id]);

  const update: UpdateItemFormField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const normalizedTagInput = useMemo(
    () => tagInput.trim().toLocaleLowerCase('zh-CN'),
    [tagInput],
  );
  const suggestedTags = useMemo(() => availableTags.filter((tag) => {
    if (form.tags.includes(tag)) return false;
    return !normalizedTagInput || tag.toLocaleLowerCase('zh-CN').includes(normalizedTagInput);
  }), [availableTags, form.tags, normalizedTagInput]);
  const hasExactSuggestedTag = suggestedTags.some(
    (tag) => tag.toLocaleLowerCase('zh-CN') === normalizedTagInput,
  );

  const handleChangeType = (type: ItemType): void => {
    setForm((current) => ({
      ...current,
      type,
      isLocation: type === 'container' ? current.isLocation : false,
      category: '',
    }));
  };

  const handleToggleLocation = (): void => {
    setForm((current) => ({
      ...current,
      isLocation: !current.isLocation,
      category: '',
    }));
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0 || !user) return;
    setIsUploading(true);
    try {
      const uploadedImages = await Promise.all(files.map((file) => uploadImage(file, user.id)));
      setForm((current) => ({ ...current, images: [...current.images, ...uploadedImages] }));
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddTag = (): void => {
    const trimmedTag = tagInput.trim();
    const matchedTag = availableTags.find(
      (tag) => tag.toLocaleLowerCase('zh-CN') === trimmedTag.toLocaleLowerCase('zh-CN'),
    );
    const resolvedTag = matchedTag ?? trimmedTag;
    if (resolvedTag && !form.tags.some((tag) => tag.toLocaleLowerCase('zh-CN') === resolvedTag.toLocaleLowerCase('zh-CN'))) {
      update('tags', [...form.tags, resolvedTag]);
    }
    setTagInput('');
  };

  const handleToggleTag = (tag: string): void => {
    update('tags', form.tags.includes(tag) ? form.tags.filter((itemTag) => itemTag !== tag) : [...form.tags, tag]);
  };

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!user || !form.name.trim()) return;
    setIsSaving(true);
    try {
      await onSave(toItemCreateInput(form, user.id));
    } finally {
      setIsSaving(false);
    }
  };

  const nodeLabel = form.type === 'container'
    ? (form.isLocation ? INVENTORY_NODE_LABELS.location : INVENTORY_NODE_LABELS.container)
    : INVENTORY_NODE_LABELS.item;
  const dialogTitle = `${initial?.id ? '编辑' : '新增'}${nodeLabel}`;

  return (
    <>
      <ItemFormDialog
        title={dialogTitle}
        titleId={titleId}
        submitError={submitError}
        isSaving={isSaving}
        isSubmitDisabled={isSaving || !form.name.trim()}
        shouldCloseOnEscape={!isLocationPickerOpen && !isSaving}
        onClose={onClose}
        onSubmit={handleSubmit}
      >
        <ItemFormPrimaryFields
          form={form}
          categories={categories}
          nameId={nameId}
          descriptionId={descriptionId}
          parentLabel={parentLabel}
          forceType={forceType}
          fixedLocation={fixedLocation}
          onUpdate={update}
          onChangeType={handleChangeType}
          onToggleLocation={handleToggleLocation}
          onOpenLocationPicker={() => setIsLocationPickerOpen(true)}
        />

        <button
          type="button"
          aria-expanded={isAdditionalDetailsOpen}
          aria-controls={additionalDetailsId}
          onClick={() => setIsAdditionalDetailsOpen((isOpen) => !isOpen)}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-surfaceMuted px-4 py-3 text-left transition hover:border-brand/30 hover:bg-brandTint focus-visible:outline focus-visible:outline-2 focus-visible:outline-brandStrong"
        >
          <span><span className="block text-sm font-bold text-slate-900">更多信息</span><span className="mt-0.5 block text-xs text-slate-500">价格、日期、库存追踪、标签和图片均可稍后补充</span></span>
          <ChevronDown size={18} className={`shrink-0 text-slate-500 transition-transform ${isAdditionalDetailsOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>

        {isAdditionalDetailsOpen ? (
          <div id={additionalDetailsId}>
            <ItemFormAdditionalFields
              form={form}
              availableTags={availableTags}
              suggestedTags={suggestedTags}
              tagInput={tagInput}
              normalizedTagInput={normalizedTagInput}
              hasExactSuggestedTag={hasExactSuggestedTag}
              isUploading={isUploading}
              fileInputRef={fileInputRef}
              onUpdate={update}
              onTagInputChange={setTagInput}
              onAddTag={handleAddTag}
              onToggleTag={handleToggleTag}
              onRemoveTag={(tag) => update('tags', form.tags.filter((itemTag) => itemTag !== tag))}
              onRemoveImage={(url) => update('images', form.images.filter((imageUrl) => imageUrl !== url))}
              onImageUpload={handleImageUpload}
            />
          </div>
        ) : null}
      </ItemFormDialog>

      {isLocationPickerOpen ? (
        <LocationPicker
          value={form.parent_id}
          excludeId={initial?.id}
          onChange={(id) => update('parent_id', id)}
          onClose={() => setIsLocationPickerOpen(false)}
        />
      ) : null}
    </>
  );
}
