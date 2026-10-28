import { useState } from 'react';
import { Bookmark, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { inventoryStorageKey, normalizeSavedInventoryQuery } from '@inplace/app-core';
import { useAuth } from '../../../app/providers/auth-context';
import { useHousehold } from '../../../app/providers/household-context';
import { resolveApiUrl } from '../../../shared/api/client';
import { useToast } from '../../../shared/ui/toast';

interface SavedSearch { id: string; label: string; query: string }
interface SavedOverviewSearchesProps { query: string; suggestedLabel: string }
const MAX_SAVED_SEARCHES = 10;

function loadSavedSearches(storageKey: string): SavedSearch[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? '[]');
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is SavedSearch => (
      typeof entry === 'object' && entry !== null
      && 'id' in entry && typeof entry.id === 'string'
      && 'label' in entry && typeof entry.label === 'string'
      && 'query' in entry && typeof entry.query === 'string'
    )).slice(-MAX_SAVED_SEARCHES);
  } catch { return []; }
}

export default function SavedOverviewSearches(props: SavedOverviewSearchesProps) {
  const { user } = useAuth();
  const { currentHousehold } = useHousehold();
  if (!user || !currentHousehold) return null;
  const storageKey = inventoryStorageKey({ server: new URL(resolveApiUrl(''), window.location.href).href, userId: user.id, householdId: currentHousehold.id });
  return <ScopedSavedSearches key={storageKey} {...props} storageKey={storageKey} />;
}

function ScopedSavedSearches({ query, suggestedLabel, storageKey }: SavedOverviewSearchesProps & { storageKey: string }) {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [saved, setSaved] = useState(() => loadSavedSearches(storageKey));
  const normalizedQuery = normalizeSavedInventoryQuery(query);
  const isAlreadySaved = saved.some((entry) => entry.query === normalizedQuery);

  const persist = (next: SavedSearch[]): void => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      setSaved(next);
    } catch {
      notify({ tone: 'error', title: '筛选保存失败', description: '请检查浏览器存储空间后重试。' });
    }
  };
  const saveCurrent = (): void => {
    if (!normalizedQuery || isAlreadySaved) return;
    persist([...saved, { id: window.crypto.randomUUID(), label: suggestedLabel || `筛选 ${saved.length + 1}`, query: normalizedQuery }].slice(-MAX_SAVED_SEARCHES));
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <button type="button" disabled={!normalizedQuery || isAlreadySaved} onClick={saveCurrent} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-surface px-3 text-xs font-semibold text-brandStrong shadow-sm disabled:opacity-40">
        <Bookmark size={14} />保存当前筛选
      </button>
      {saved.map((entry) => (
        <span key={entry.id} className="inline-flex min-h-11 max-w-full items-center rounded-xl border border-borderSoft bg-surface text-xs">
          <button type="button" onClick={() => navigate(`/overview?${entry.query}`)} className="min-h-11 min-w-0 break-words px-3 font-semibold text-slate-700">{entry.label}</button>
          <button type="button" aria-label={`删除保存的筛选：${entry.label}`} onClick={() => persist(saved.filter((candidate) => candidate.id !== entry.id))} className="flex h-11 w-11 shrink-0 items-center justify-center text-muted hover:text-rose-600"><X size={13} /></button>
        </span>
      ))}
      <span className="text-xs text-slate-500">筛选仅保存在当前家庭。旧版未标注家庭的筛选保留在本机，不自动载入。</span>
    </div>
  );
}
