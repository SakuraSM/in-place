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
import { createInitialItemFormData, createNextItemFormData, toItemCreateInput } from './itemFormData';
import ConfirmDialog from '../../../shared/ui/ConfirmDialog';
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
  onSave: (data: ItemCreateInput) => Promise<void | boolean>;
  onSaveAndContinue?: (data: ItemCreateInput) => Promise<boolean>;
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
  onSaveAndContinue,
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
  const [baseline, setBaseline] = useState(form);
  const [confirmClose, setConfirmClose] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const [focusName, setFocusName] = useState(0);
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
  useEffect(() => {
    if (focusName && !isSaving) document.getElementById(nameId)?.focus();
  }, [focusName, isSaving, nameId]);
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
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : '图片上传失败，请重试');
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
    const continueAdding = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'continue';
    if (!user || !form.name.trim() || busyRef.current || isUploading) return;
    busyRef.current = true;
    setIsSaving(true);
    setLocalError(null);
    try {
      const payload = toItemCreateInput(form, user.id);
      if (continueAdding && onSaveAndContinue) {
        if (await onSaveAndContinue(payload)) {
          const next = createNextItemFormData(form);
          setForm(next);
          setBaseline(next);
          setTagInput('');
          setIsAdditionalDetailsOpen(false);
          setFocusName((value) => value + 1);
        }
      } else if (await onSave(payload) !== false) setBaseline(form);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : '保存失败，输入已保留');
    } finally {
      busyRef.current = false;
      setIsSaving(false);
    }
  };

  const requestClose = () => {
    if (busyRef.current || isUploading) return;
    if (JSON.stringify(form) !== JSON.stringify(baseline) || tagInput.trim()) setConfirmClose(true);
    else onClose();
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
        submitError={localError || submitError}
        isSaving={isSaving || isUploading}
        isSubmitDisabled={isSaving || isUploading || !form.name.trim()}
        allowContinue={Boolean(onSaveAndContinue) && !initial?.id}
        shouldCloseOnEscape={!isLocationPickerOpen && !isSaving && !confirmClose}
        onClose={requestClose}
        onSubmit={handleSubmit}
      >
        <ItemFormPrimaryFields
          form={form}
          categories={categories}
          nameId={nameId}
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
          <div id={additionalDetailsId} className="space-y-5">
            <label htmlFor={descriptionId} className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">描述</span><textarea id={descriptionId} name="description" value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="添加备注或描述…" rows={2} className="w-full rounded-xl border border-border bg-surfaceMuted px-4 py-3 text-sm" /></label>
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
      {confirmClose ? <ConfirmDialog title="放弃修改？" message="尚未保存的内容将被丢弃。" confirmLabel="放弃修改" danger onConfirm={onClose} onCancel={() => setConfirmClose(false)} /> : null}
    </>
  );
}
