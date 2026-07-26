import { useCallback, useEffect, useState } from 'react';
import { Box, MapPin, Package, Pencil, Plus, Shapes, Sparkles, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Category, CategoryScope } from '../../../legacy/database.types';
import {
  applyCategoryPresets,
  deleteCategory,
  fetchCategories,
  fetchCategoryPresets,
} from '../../../legacy/categories';
import { useAuth } from '../../../app/providers/auth-context';
import { useToast } from '../../../shared/ui/toast';
import ConfirmDialog from '../../../shared/ui/ConfirmDialog';
import EmptyState from '../../../shared/ui/EmptyState';
import { staggerContainer, staggerItem } from '../../../shared/lib/animations';
import { ContentTabs } from '../../../shared/ui/ContentTabs';
import { PageContent, PageHeader, PageShell } from '../../../shared/ui/PageLayout';
import CategoryEditorDialog from '../components/CategoryEditorDialog';
import EntityBadge from '../components/EntityBadge';
import {
  CategoryIcon,
  getColorClasses,
  isCustomCategoryImageIcon,
} from '../lib/categoryPresentation';

const SCOPE_PRESENTATION = {
  location: { label: '位置分类', description: '用于公寓、房间、楼层等固定空间', icon: MapPin, tone: 'text-sky-700' },
  container: { label: '收纳分类', description: '用于柜子、抽屉、收纳箱等容器', icon: Box, tone: 'text-teal-700' },
  item: { label: '物品分类', description: '用于数码、服饰、书籍等具体物品', icon: Package, tone: 'text-amber-800' },
} satisfies Record<CategoryScope, {
  label: string;
  description: string;
  icon: typeof MapPin;
  tone: string;
}>;

function CategoryListItem({
  category,
  onEdit,
  onDelete,
}: {
  category: Category;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const colorClasses = getColorClasses(category.color);
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-borderSoft bg-surface p-3.5 shadow-sm transition-shadow hover:shadow-md">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl ${colorClasses.bg}`}>
        <CategoryIcon
          icon={category.icon}
          fallback={Shapes}
          size={20}
          className={colorClasses.text}
          imageClassName="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{category.name}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {isCustomCategoryImageIcon(category.icon) ? '自定义图标' : category.preset_key ? '常用预设' : '自定义分类'}
        </p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        aria-label={`编辑分类：${category.name}`}
        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-brandTint hover:text-brandStrong"
      >
        <Pencil size={15} />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`删除分类：${category.name}`}
        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-700"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

export default function CategoriesPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const [activeScope, setActiveScope] = useState<CategoryScope>('location');
  const [categories, setCategories] = useState<Category[]>([]);
  const [presetSummary, setPresetSummary] = useState({ total: 21, missingCount: 0, dismissedCount: 0 });
  const [loading, setLoading] = useState(true);
  const [applyingPresets, setApplyingPresets] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [all, summary] = await Promise.all([
        fetchCategories(user.id),
        fetchCategoryPresets(),
      ]);
      setCategories(all);
      setPresetSummary(summary);
    } catch (error) {
      notify({
        tone: 'error',
        title: '分类加载失败',
        description: error instanceof Error ? error.message : '请稍后重试。',
      });
    } finally {
      setLoading(false);
    }
  }, [notify, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleApplyPresets = async () => {
    setApplyingPresets(true);
    try {
      const result = await applyCategoryPresets();
      setCategories(result.data);
      setPresetSummary((current) => ({ ...current, missingCount: 0 }));
      notify({
        tone: 'success',
        title: '常用分类已补充',
        description: result.addedCount > 0 ? `新增 ${result.addedCount} 个分类。` : '当前分类已经齐全。',
      });
    } catch (error) {
      notify({ tone: 'error', title: '补充分类失败', description: error instanceof Error ? error.message : '请稍后重试。' });
    } finally {
      setApplyingPresets(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCategory(deleteTarget.id);
      notify({ tone: 'success', title: '分类已删除', description: deleteTarget.name });
      setDeleteTarget(null);
      await load();
    } catch (error) {
      notify({ tone: 'error', title: '删除分类失败', description: error instanceof Error ? error.message : '请稍后重试。' });
    }
  };

  const filteredCategories = categories.filter((category) => category.scope === activeScope);
  const activePresentation = SCOPE_PRESENTATION[activeScope];
  const scopeTabOptions = (Object.entries(SCOPE_PRESENTATION) as [
    CategoryScope,
    typeof activePresentation,
  ][]).map(([scope, presentation]) => ({
    value: scope,
    label: presentation.label,
    icon: presentation.icon,
    count: categories.filter((category) => category.scope === scope).length,
  }));

  return (
    <PageShell>
      <PageHeader width="standard" title="分类管理" />

      <PageContent width="standard" className="space-y-5">
        <ContentTabs
          label="分类范围"
          options={scopeTabOptions}
          value={activeScope}
          onChange={setActiveScope}
          panelId="category-scope-panel"
          className="w-fit"
        />

        <div
          id="category-scope-panel"
          role="tabpanel"
          aria-label={activePresentation.label}
          className="space-y-5"
        >
        <section className="rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-4 shadow-sm md:flex md:items-center md:justify-between md:gap-5 md:p-5">
          <div className="flex min-w-0 gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <Sparkles size={20} />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold text-slate-900">常用分类预设</h2>
                <EntityBadge kind="category" compact />
              </div>
              <p className="mt-1 text-sm leading-5 text-slate-600">
                {presetSummary.missingCount > 0
                  ? `还有 ${presetSummary.missingCount} 个推荐分类可补充，已有和主动移除的分类不会重复创建。`
                  : `已配置常用分类${presetSummary.dismissedCount > 0 ? `，并保留 ${presetSummary.dismissedCount} 个主动移除记录` : ''}。`}
              </p>
            </div>
          </div>
          {presetSummary.missingCount > 0 ? (
            <button
              type="button"
              onClick={() => void handleApplyPresets()}
              disabled={applyingPresets}
              className="mt-4 inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-violet-700 px-4 text-sm font-bold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60 md:mt-0 md:w-auto"
            >
              {applyingPresets ? '补充中…' : `一键补充 ${presetSummary.missingCount} 个`}
            </button>
          ) : null}
        </section>

        <section className="rounded-2xl border border-borderSoft bg-surfaceMuted px-4 py-3">
          <div className="flex items-center gap-2">
            <EntityBadge kind={activeScope} />
            <p className={`text-sm font-semibold ${activePresentation.tone}`}>{activePresentation.description}</p>
          </div>
        </section>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500" role="status">加载中…</div>
        ) : filteredCategories.length === 0 ? (
          <EmptyState icon={<Shapes size={28} className="text-slate-400" />} title={`暂无${activePresentation.label}`} />
        ) : (
          <motion.div key={activeScope} variants={staggerContainer} animate="animate" className="space-y-2.5">
            {filteredCategories.map((category) => (
              <motion.div key={category.id} variants={staggerItem}>
                <CategoryListItem
                  category={category}
                  onEdit={() => {
                    setEditTarget(category);
                    setShowEditor(true);
                  }}
                  onDelete={() => setDeleteTarget(category)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
        </div>
      </PageContent>

      <button
        type="button"
        onClick={() => {
          setEditTarget(null);
          setShowEditor(true);
        }}
        aria-label={`新增${activePresentation.label}`}
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-brandStrong text-white shadow-lg shadow-brand/20 transition-colors hover:bg-teal-700 md:bottom-8 md:right-8"
      >
        <Plus size={24} />
      </button>

      {showEditor && user ? (
        <CategoryEditorDialog
          initial={editTarget ?? undefined}
          scope={activeScope}
          scopeLabel={activePresentation.label}
          userId={user.id}
          onSave={(saved) => {
            setCategories((current) => {
              const index = current.findIndex((category) => category.id === saved.id);
              if (index < 0) return [...current, saved];
              return current.map((category) => category.id === saved.id ? saved : category);
            });
            setShowEditor(false);
            setEditTarget(null);
            notify({ tone: 'success', title: editTarget ? '分类已更新' : '分类已创建', description: saved.name });
          }}
          onClose={() => {
            setShowEditor(false);
            setEditTarget(null);
          }}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          title="删除类别"
          message={`确定要删除「${deleteTarget.name}」类别吗？已使用该类别的库存记录不会受影响。`}
          confirmLabel="删除"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      ) : null}
    </PageShell>
  );
}
