import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, StickyNote, Pencil, Trash2, X } from 'lucide-react';
import { useAuth } from '../../../app/providers/AuthContext';
import type { Database, TagEntity } from '../../../legacy/database.types';
import { createTag, deleteTag, fetchTagsPage, updateTag } from '../../../legacy/tags';
import ConfirmDialog from '../../../shared/ui/ConfirmDialog';
import EmptyState from '../../../shared/ui/EmptyState';
import PaginationControls from '../../inventory/components/PaginationControls';
import { useIsMobile } from '../../../shared/lib/useIsMobile';

const TAG_COLORS = [
  { key: 'sky', bg: 'bg-sky-50', ring: 'ring-sky-200', text: 'text-sky-700' },
  { key: 'teal', bg: 'bg-teal-50', ring: 'ring-teal-200', text: 'text-teal-700' },
  { key: 'emerald', bg: 'bg-emerald-50', ring: 'ring-emerald-200', text: 'text-emerald-700' },
  { key: 'amber', bg: 'bg-amber-50', ring: 'ring-amber-200', text: 'text-amber-700' },
  { key: 'rose', bg: 'bg-rose-50', ring: 'ring-rose-200', text: 'text-rose-700' },
  { key: 'violet', bg: 'bg-violet-50', ring: 'ring-violet-200', text: 'text-violet-700' },
  { key: 'orange', bg: 'bg-orange-50', ring: 'ring-orange-200', text: 'text-orange-700' },
  { key: 'slate', bg: 'bg-slate-100', ring: 'ring-slate-200', text: 'text-slate-700' },
] as const;

type TagPayload = Database['public']['Tables']['tags']['Insert'];

function TagEditor({
  initial,
  userId,
  onSave,
  onClose,
}: {
  initial?: TagEntity | null;
  userId: string;
  onSave: (tag: TagEntity) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [color, setColor] = useState(initial?.color ?? 'sky');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (initial?.id) {
        const updated = await updateTag(initial.id, {
          name: name.trim(),
          description: description.trim(),
          color,
        });
        onSave(updated);
      } else {
        const created = await createTag({
          user_id: userId,
          name: name.trim(),
          description: description.trim(),
          color,
        } as TagPayload);
        onSave(created);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存标签失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <motion.div
        className="absolute inset-0 bg-black/25 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="relative w-full max-w-lg rounded-t-3xl bg-white p-5 pb-8 shadow-2xl"
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
      >
        <div className="mx-auto mb-1 mt-3 h-1 w-10 rounded-full bg-slate-200" />
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">{initial ? '编辑标签' : '新增标签'}</h3>
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.08, rotate: 90 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
          >
            <X size={16} />
          </motion.button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">标签名称</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="例如：常用、易碎、待整理"
              maxLength={80}
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">标签说明</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="可选，描述这个标签的使用场景..."
              rows={4}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-slate-500">颜色</label>
            <div className="flex flex-wrap gap-2">
              {TAG_COLORS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setColor(option.key)}
                  className={`h-8 w-8 rounded-full ${option.bg} ring-2 transition-transform ${color === option.key ? `${option.ring} scale-110` : 'ring-transparent'}`}
                />
              ))}
            </div>
          </div>

          {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-500">{error}</p> : null}

          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full rounded-2xl bg-sky-500 py-3.5 text-sm font-semibold text-white transition-all hover:bg-sky-600 disabled:bg-sky-300"
          >
            {saving ? '保存中...' : '保存标签'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function colorClasses(color: string) {
  return TAG_COLORS.find((item) => item.key === color) ?? TAG_COLORS[0];
}

export default function TagsPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [tags, setTags] = useState<TagEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [reloadKey, setReloadKey] = useState(0);
  const [paginationMeta, setPaginationMeta] = useState<{
    page: number;
    pageSize: number;
    totalPages: number;
    total: number;
    hasNextPage: boolean;
  } | null>(null);
  const [editingTag, setEditingTag] = useState<TagEntity | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TagEntity | null>(null);
  const scrollRootRef = useRef<HTMLDivElement | null>(null);

  const loadTags = useCallback(async () => {
    if (!user) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetchTagsPage(user.id, { page, pageSize });
      setTags((current) => (isMobile && page > 1 ? [...current, ...response.data] : response.data));
      setPaginationMeta(response.meta);
    } finally {
      setLoading(false);
    }
  }, [isMobile, page, pageSize, user]);

  useEffect(() => {
    void loadTags();
  }, [loadTags, reloadKey]);

  useEffect(() => {
    setPage(1);
    setTags([]);
  }, [isMobile, pageSize]);

  const loadNextPage = useCallback(() => {
    if (!isMobile || !paginationMeta?.hasNextPage || loading) {
      return;
    }

    setPage((current) => (current === paginationMeta.page ? current + 1 : current));
  }, [isMobile, loading, paginationMeta]);

  useEffect(() => {
    if (!isMobile) {
      return;
    }

    const scrollRoot = scrollRootRef.current;
    if (!scrollRoot) {
      return;
    }

    const handleScroll = () => {
      const distanceFromBottom = scrollRoot.scrollHeight - scrollRoot.scrollTop - scrollRoot.clientHeight;
      if (distanceFromBottom < 160) {
        loadNextPage();
      }
    };

    scrollRoot.addEventListener('scroll', handleScroll);
    return () => {
      scrollRoot.removeEventListener('scroll', handleScroll);
    };
  }, [isMobile, loadNextPage]);

  useEffect(() => {
    if (!isMobile) {
      return;
    }

    const handleWindowScroll = () => {
      const distanceFromBottom = document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
      if (distanceFromBottom < 160) {
        loadNextPage();
      }
    };

    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleWindowScroll);
    };
  }, [isMobile, loadNextPage]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 md:h-full md:min-h-0">
      <div className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur-xl">
        <div className="px-4 pb-3 pt-4 md:px-8 md:pt-6">
          <h1 className="text-xl font-bold text-slate-900">标签管理</h1>
        </div>
      </div>

      <div
        ref={scrollRootRef}
        data-scroll-root
        className="flex min-h-0 flex-1 flex-col px-4 py-4 md:overflow-y-auto md:px-8 md:py-6 md:pb-32"
      >
        {loading && tags.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">加载中...</div>
        ) : tags.length === 0 ? (
          <EmptyState
            icon={<StickyNote size={28} className="text-slate-300" />}
            title="还没有标签"
          />
        ) : (
          <div className="flex min-h-full flex-1 flex-col">
            <p className="mb-4 text-xs text-slate-400">
              共 {paginationMeta?.total ?? tags.length} 个标签
            </p>
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 2xl:grid-cols-3">
            {tags.map((tag) => {
              const color = colorClasses(tag.color);

              return (
                <motion.div
                  key={tag.id}
                  layout
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`h-3 w-3 shrink-0 rounded-full ${color.bg} ring-2 ${color.ring}`} />
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <h2 className="truncate text-sm font-semibold text-slate-900">{tag.name}</h2>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {tag.description || '暂无说明'}
                        </p>
                        <p className="mt-2 text-[11px] text-slate-400 md:hidden">
                          更新于{' '}
                          {new Date(tag.updated_at).toLocaleString('zh-CN', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <p className="hidden text-xs text-slate-400 md:block">
                        {new Date(tag.updated_at).toLocaleString('zh-CN', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <button
                        onClick={() => {
                          setEditingTag(tag);
                          setShowEditor(true);
                        }}
                        className="inline-flex h-8 items-center gap-1 rounded-xl bg-slate-50 px-2.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200 transition-colors hover:bg-slate-100 whitespace-nowrap"
                      >
                        <Pencil size={13} />
                        编辑
                      </button>
                      <button
                        onClick={() => setDeleteTarget(tag)}
                        className="inline-flex h-8 items-center gap-1 rounded-xl bg-rose-50 px-2.5 text-xs font-medium text-rose-500 ring-1 ring-rose-100 transition-colors hover:bg-rose-100 whitespace-nowrap"
                      >
                        <Trash2 size={13} />
                        删除
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            </div>
          </div>
        )}

        {isMobile && paginationMeta ? (
          <div className="pt-5 text-center text-xs text-slate-400">
            {loading && page > 1
              ? '正在加载更多标签...'
              : paginationMeta.hasNextPage
                ? `已加载 ${tags.length} / ${paginationMeta.total}，继续上滑加载更多`
                : `已展示全部 ${paginationMeta.total} 个标签`}
          </div>
        ) : null}
      </div>

      <motion.button
        onClick={() => {
          setEditingTag(null);
          setShowEditor(true);
        }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-sky-500 text-white shadow-lg shadow-sky-200 md:bottom-28 md:right-8"
      >
        <Plus size={24} />
      </motion.button>

      {!isMobile && paginationMeta && paginationMeta.total > 0 ? (
        <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-20 hidden md:block md:left-64 lg:left-72">
          <div className="pointer-events-auto px-8 pb-6">
            <PaginationControls
              page={paginationMeta.page}
              pageSize={pageSize}
              total={paginationMeta.total}
              totalPages={paginationMeta.totalPages}
              onPageChange={setPage}
              onPageSizeChange={(nextPageSize) => {
                setPageSize(nextPageSize);
                setPage(1);
              }}
              className="mt-0 bg-white/95 backdrop-blur shadow-lg"
            />
          </div>
        </div>
      ) : null}

      <AnimatePresence>
        {showEditor && user ? (
          <TagEditor
            initial={editingTag}
            userId={user.id}
            onSave={(tag) => {
              const existed = tags.some((item) => item.id === tag.id);
              if (!existed && page !== 1) {
                setPage(1);
              } else {
                if (isMobile && page === 1) {
                  setTags((current) => [tag, ...current.filter((item) => item.id !== tag.id)]);
                }
                setReloadKey((current) => current + 1);
              }
              setShowEditor(false);
              setEditingTag(null);
            }}
            onClose={() => {
              setShowEditor(false);
              setEditingTag(null);
            }}
          />
        ) : null}
      </AnimatePresence>

      {deleteTarget ? (
        <ConfirmDialog
          title="删除标签"
          message={`确定要删除「${deleteTarget.name}」吗？所有物品上的这个标签都会被同步移除。`}
          confirmLabel="删除"
          danger
          onConfirm={async () => {
            await deleteTag(deleteTarget.id);
            const remainingOnPage = tags.filter((item) => item.id !== deleteTarget.id);
            if (remainingOnPage.length === 0 && page > 1) {
              setPage((current) => Math.max(1, current - 1));
            } else {
              setReloadKey((current) => current + 1);
            }
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      ) : null}
    </div>
  );
}
