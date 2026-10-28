import { ArrowLeft, CheckSquare, Plus, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Item } from '../../../legacy/database.types';
import { PageHeader } from '../../../shared/ui/PageLayout';

interface HomePageHeaderProps {
  canEditInventory?: boolean;
  currentParentId: string | null;
  breadcrumbs: Item[];
  isEmpty: boolean;
  isSelectionMode: boolean;
  onNavigateParent: () => void;
  onToggleSelectionMode: () => void;
  onCreate: () => void;
}

export default function HomePageHeader({
  canEditInventory = true,
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
      className={!currentParentId ? 'home-page-heading' : undefined}
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
      actions={<>
        <Link to="/overview" state={{ focusSearch: true }} className="hidden min-h-11 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-slate-700 md:flex"><Search size={17} />找物品</Link>
        {canEditInventory ? <>
          {!isEmpty ? (
            <button
              type="button"
              onClick={onToggleSelectionMode}
              aria-pressed={isSelectionMode}
              aria-label={isSelectionMode ? '退出批量选择' : '批量选择'}
              className={`flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition-colors ${
                isSelectionMode
                  ? 'bg-brandStrong text-white'
                  : 'bg-surfaceMuted text-slate-700 hover:bg-brandTint hover:text-brandStrong'
              }`}
            >
              {isSelectionMode ? <X size={16} /> : <CheckSquare size={16} />}
              <span className="hidden md:inline">{isSelectionMode ? '退出' : '批量'}</span>
            </button>
          ) : null}
          {!isSelectionMode ? (
            <button
              type="button"
              onClick={onCreate}
              className="hidden h-10 items-center gap-2 rounded-2xl bg-brandStrong px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brandHover md:flex"
            >
              <Plus size={17} />
              新增
            </button>
          ) : null}
        </> : null}
      </>}
    />
  );
}
