import { ArrowLeft, CheckSquare, Plus, X } from 'lucide-react';
import type { Item } from '../../../legacy/database.types';
import { PageHeader } from '../../../shared/ui/PageLayout';

interface HomePageHeaderProps {
  currentParentId: string | null;
  breadcrumbs: Item[];
  isEmpty: boolean;
  isSelectionMode: boolean;
  onNavigateParent: () => void;
  onToggleSelectionMode: () => void;
  onCreate: () => void;
}

export default function HomePageHeader({
  currentParentId,
  breadcrumbs,
  isEmpty,
  isSelectionMode,
  onNavigateParent,
  onToggleSelectionMode,
  onCreate,
}: HomePageHeaderProps) {
  return (
    <PageHeader
      width="wide"
      title={currentParentId
        ? breadcrumbs[breadcrumbs.length - 1]?.name ?? '库存内容'
        : '物品首页'}
      description={currentParentId ? '查看并整理当前位置下的收纳与物品。' : '快速查看、整理和新增家中物品。'}
      backLink={currentParentId ? (
        <button
          type="button"
          onClick={onNavigateParent}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-brandTint hover:text-brandStrong"
        >
          <ArrowLeft size={17} />
          返回上一级
        </button>
      ) : undefined}
      actions={(
        <>
          {!isEmpty ? (
            <button
              type="button"
              onClick={onToggleSelectionMode}
              aria-pressed={isSelectionMode}
              className={`flex h-10 items-center gap-1.5 rounded-2xl px-3 text-sm font-bold transition-colors ${
                isSelectionMode
                  ? 'bg-brandStrong text-white'
                  : 'bg-surfaceMuted text-slate-700 hover:bg-brandTint hover:text-brandStrong'
              }`}
            >
              {isSelectionMode ? <X size={16} /> : <CheckSquare size={16} />}
              {isSelectionMode ? '退出' : '批量'}
            </button>
          ) : null}
          {!isSelectionMode ? (
            <button
              type="button"
              onClick={onCreate}
              className="hidden h-10 items-center gap-2 rounded-2xl bg-brandStrong px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-700 md:flex"
            >
              <Plus size={17} />
              新增
            </button>
          ) : null}
        </>
      )}
    />
  );
}
