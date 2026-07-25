import { useRef, useState } from 'react';
import { Check, ChevronDown, ImageIcon, Shapes, Upload } from 'lucide-react';
import type { Category, CategoryScope } from '../../../legacy/database.types';
import { createCategory, updateCategory } from '../../../legacy/categories';
import { uploadImage } from '../../../legacy/items';
import ResponsiveDialog from '../../../shared/ui/ResponsiveDialog';
import {
  CategoryIcon,
  COLOR_OPTIONS,
  ICON_OPTIONS,
  getCategoryIconLabel,
  getColorClasses,
  isCustomCategoryImageIcon,
} from '../lib/categoryPresentation';

interface CategoryEditorDialogProps {
  initial?: Partial<Category>;
  scope: CategoryScope;
  scopeLabel: string;
  userId: string;
  onSave: (category: Category) => void;
  onClose: () => void;
}

function getDefaultAppearance(scope: CategoryScope) {
  if (scope === 'location') return { icon: 'Home', color: 'sky' };
  if (scope === 'container') return { icon: 'Box', color: 'teal' };
  return { icon: 'PackageSearch', color: 'amber' };
}

export default function CategoryEditorDialog({
  initial,
  scope,
  scopeLabel,
  userId,
  onSave,
  onClose,
}: CategoryEditorDialogProps) {
  const defaults = getDefaultAppearance(scope);
  const formId = 'category-editor-form';
  const [name, setName] = useState(initial?.name ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? defaults.icon);
  const [color, setColor] = useState(initial?.color ?? defaults.color);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const iconInputRef = useRef<HTMLInputElement | null>(null);
  const colorClasses = getColorClasses(color);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const saved = initial?.id
        ? await updateCategory(initial.id, { name: name.trim(), icon, color })
        : await createCategory({ user_id: userId, scope, name: name.trim(), icon, color });
      onSave(saved);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleIconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingIcon(true);
    setError(null);
    try {
      setIcon(await uploadImage(file, userId));
      setShowIconPicker(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '图标上传失败，请重试');
    } finally {
      setUploadingIcon(false);
      event.target.value = '';
    }
  };

  return (
    <ResponsiveDialog
      title={initial?.id ? '编辑分类' : '新增分类'}
      description={`为${scopeLabel.replace('分类', '')}设置易识别的名称、颜色和图标。`}
      onClose={onClose}
      closeLabel="关闭分类表单"
      size="sm"
      footer={(
        <button
          type="submit"
          form={formId}
          disabled={saving || !name.trim()}
          className="w-full cursor-pointer rounded-2xl bg-brandStrong py-3.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? '保存中…' : '保存分类'}
        </button>
      )}
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-5 px-5 py-5 md:px-6">
        <div className="flex items-center gap-4">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl ${colorClasses.bg}`}>
            <CategoryIcon
              icon={icon}
              fallback={Shapes}
              size={26}
              className={colorClasses.text}
              imageClassName="h-full w-full object-cover"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="category-name" className="mb-1 block text-xs font-medium text-slate-600">名称</label>
            <input
              id="category-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="分类名称…"
              required
              autoFocus
              className="w-full rounded-xl border border-border bg-surfaceMuted px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
            />
          </div>
        </div>

        <fieldset>
          <legend className="mb-2 text-xs font-medium text-slate-600">颜色</legend>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setColor(option.key)}
                aria-label={`选择${option.label}色`}
                aria-pressed={color === option.key}
                className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full ${option.bg} ${option.text} ${
                  color === option.key ? `ring-2 ring-offset-2 ${option.ring}` : ''
                }`}
              >
                {color === option.key ? <Check size={14} /> : null}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-xs font-medium text-slate-600">分类图标</legend>
          <input
            ref={iconInputRef}
            type="file"
            accept="image/*"
            onChange={(event) => void handleIconUpload(event)}
            className="hidden"
          />
          <div className="mb-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => iconInputRef.current?.click()}
              disabled={uploadingIcon}
              className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm text-slate-700 hover:border-brand disabled:cursor-not-allowed"
            >
              <Upload size={14} />
              {uploadingIcon ? '上传中…' : '上传自定义图片'}
            </button>
            {isCustomCategoryImageIcon(icon) ? (
              <button
                type="button"
                onClick={() => setIcon(defaults.icon)}
                className="inline-flex min-h-10 cursor-pointer items-center gap-1 rounded-xl bg-surfaceMuted px-3 text-xs font-medium text-slate-700"
              >
                <ImageIcon size={13} />
                恢复内置图标
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setShowIconPicker((visible) => !visible)}
            aria-expanded={showIconPicker}
            className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-xl border border-border bg-surfaceMuted px-3 text-sm text-slate-700 hover:border-brand"
          >
            <CategoryIcon icon={icon} fallback={Shapes} size={16} className={colorClasses.text} />
            <span className="flex-1 text-left">{getCategoryIconLabel(icon)}</span>
            <ChevronDown size={14} className={showIconPicker ? 'rotate-180' : ''} />
          </button>
          {showIconPicker ? (
            <div className="mt-2 grid max-h-56 grid-cols-5 gap-2 overflow-y-auto rounded-xl border border-borderSoft bg-surfaceMuted p-3 md:grid-cols-6">
              {ICON_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  title={option.label}
                  aria-label={`选择${option.label}图标`}
                  aria-pressed={icon === option.key}
                  onClick={() => {
                    setIcon(option.key);
                    setShowIconPicker(false);
                  }}
                  className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl ${
                    icon === option.key ? `${colorClasses.bg} ${colorClasses.text}` : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  <CategoryIcon icon={option.key} fallback={Shapes} size={18} />
                </button>
              ))}
            </div>
          ) : null}
        </fieldset>

        {error ? <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      </form>
    </ResponsiveDialog>
  );
}
