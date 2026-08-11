import { motion } from 'framer-motion';
import { MapPin, Shapes } from 'lucide-react';
import { INVENTORY_NODE_LABELS, ITEM_TYPE_PRESENTATION } from '@inplace/app-core';
import type { Category, ItemStatus, ItemType } from '../../../legacy/database.types';
import { CategoryIcon, getColorClasses } from '../lib/categoryPresentation';
import type { ItemFormData, UpdateItemFormField } from './itemFormTypes';

interface ItemFormPrimaryFieldsProps {
  form: ItemFormData;
  categories: Category[];
  nameId: string;
  descriptionId: string;
  parentLabel: string | null;
  forceType?: ItemType;
  fixedLocation: boolean;
  onUpdate: UpdateItemFormField;
  onChangeType: (type: ItemType) => void;
  onToggleLocation: () => void;
  onOpenLocationPicker: () => void;
}

const STATUS_OPTIONS: Array<{ value: ItemStatus; label: string }> = [
  { value: 'in_stock', label: '在库' },
  { value: 'borrowed', label: '借出' },
  { value: 'worn_out', label: '损耗' },
];

export default function ItemFormPrimaryFields({
  form,
  categories,
  nameId,
  descriptionId,
  parentLabel,
  forceType,
  fixedLocation,
  onUpdate,
  onChangeType,
  onToggleLocation,
  onOpenLocationPicker,
}: ItemFormPrimaryFieldsProps) {
  return (
    <>
      {!forceType ? (
        <div className="relative flex rounded-xl bg-slate-100 p-1">
          {(['item', 'container'] as ItemType[]).map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={form.type === type}
              onClick={() => onChangeType(type)}
              className="relative z-10 flex-1 rounded-lg py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brandStrong"
            >
              {form.type === type ? (
                <motion.div
                  layoutId="item-form-type-pill"
                  className="absolute inset-0 rounded-lg bg-white shadow-sm"
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                />
              ) : null}
              <span className={`relative ${form.type === type ? 'text-slate-900' : 'text-slate-500'}`}>
                {ITEM_TYPE_PRESENTATION[type].label}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {form.type === 'container' && !fixedLocation ? (
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">空间属性</p>
          <button
            type="button"
            onClick={onToggleLocation}
            className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${form.isLocation ? 'border-sky-200 bg-sky-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}
            aria-pressed={form.isLocation}
          >
            <span className="min-w-0">
              <span className={`block text-sm font-medium ${form.isLocation ? 'text-sky-700' : 'text-slate-700'}`}>这是一个位置</span>
              <span className={`mt-0.5 block text-xs ${form.isLocation ? 'text-sky-600' : 'text-slate-500'}`}>适合卧室、客厅、仓库等固定区域</span>
            </span>
            <span className={`relative ml-4 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${form.isLocation ? 'bg-sky-500' : 'bg-slate-300'}`} aria-hidden="true">
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${form.isLocation ? 'translate-x-6' : 'translate-x-1'}`} />
            </span>
          </button>
        </div>
      ) : null}

      {form.type === 'container' && fixedLocation ? (
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">位置类型</p>
          <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3">
            <p className="text-sm font-medium text-sky-700">当前位置将直接作为「位置」创建</p>
          </div>
        </div>
      ) : null}

      <label htmlFor={nameId} className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">名称 *</span>
        <input
          id={nameId}
          name="name"
          type="text"
          value={form.name}
          onChange={(event) => onUpdate('name', event.target.value)}
          placeholder={form.type === 'container' ? (form.isLocation ? '如：卧室、客厅、仓库...' : '如：透明收纳箱、床头柜抽屉、柜子...') : '如：蓝色羽绒服...'}
          required
          className="w-full rounded-xl border border-border bg-surfaceMuted px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </label>

      <label htmlFor={descriptionId} className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">描述</span>
        <textarea
          id={descriptionId}
          name="description"
          value={form.description}
          onChange={(event) => onUpdate('description', event.target.value)}
          placeholder="添加备注或描述..."
          rows={2}
          className="w-full resize-none rounded-xl border border-border bg-surfaceMuted px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </label>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-700">类别</legend>
        {categories.length === 0 ? (
          <p className="py-2 text-xs text-slate-500">暂无分类，请前往「分类管理」添加</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const colorClasses = getColorClasses(category.color);
              const isSelected = form.category === category.name;
              return (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onUpdate('category', isSelected ? '' : category.name)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brandStrong ${isSelected ? `${colorClasses.bg} ${colorClasses.text} border-current` : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                >
                  <span className="flex h-3.5 w-3.5 items-center justify-center overflow-hidden rounded-sm">
                    <CategoryIcon icon={category.icon} presetKey={category.preset_key} fallback={Shapes} size={12} className={isSelected ? colorClasses.text : 'text-slate-500'} imageClassName="h-full w-full object-cover" />
                  </span>
                  {category.name}
                </button>
              );
            })}
          </div>
        )}
      </fieldset>

      {form.type === 'item' ? (
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700">状态</legend>
          <div className="flex gap-2">
            {STATUS_OPTIONS.map(({ value, label }) => (
              <button key={value} type="button" aria-pressed={form.status === value} onClick={() => onUpdate('status', value)} className={`flex-1 rounded-xl py-2.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brandStrong ${resolveStatusClassName(value, form.status)}`}>
                {label}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700"><MapPin size={14} aria-hidden="true" />{INVENTORY_NODE_LABELS.storageLocation}</p>
        <button type="button" onClick={onOpenLocationPicker} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm text-slate-600 transition hover:border-brand/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brandStrong">
          {form.parent_id ? `已选择上级 (${parentLabel ?? '加载中...'})` : `未选择${INVENTORY_NODE_LABELS.storageLocation}`}
        </button>
      </div>
    </>
  );
}

function resolveStatusClassName(status: ItemStatus, currentStatus: ItemStatus): string {
  if (status !== currentStatus) return 'bg-slate-100 text-slate-600 hover:bg-slate-200';
  if (status === 'in_stock') return 'bg-emerald-700 text-white';
  if (status === 'borrowed') return 'bg-amber-700 text-white';
  return 'bg-rose-700 text-white';
}
