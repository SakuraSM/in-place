import { useState } from 'react';
import { Bookmark, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SavedSearch {
  id: string;
  label: string;
  query: string;
}

const STORAGE_KEY = 'inplace.saved-overview-searches';

function loadSavedSearches() {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is SavedSearch => (
      typeof entry === 'object' && entry !== null
      && 'id' in entry && typeof entry.id === 'string'
      && 'label' in entry && typeof entry.label === 'string'
      && 'query' in entry && typeof entry.query === 'string'
    ));
  } catch {
    return [];
  }
}

export default function SavedOverviewSearches({
  query,
  suggestedLabel,
}: {
  query: string;
  suggestedLabel: string;
}) {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(loadSavedSearches);

  const persist = (next: SavedSearch[]) => {
    setSaved(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const saveCurrent = () => {
    if (!query || saved.some((entry) => entry.query === query)) return;
    persist([...saved, {
      id: window.crypto.randomUUID(),
      label: suggestedLabel || `筛选 ${saved.length + 1}`,
      query,
    }].slice(-8));
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <button type="button" disabled={!query || saved.some((entry) => entry.query === query)} onClick={saveCurrent} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-surface px-3 text-xs font-bold text-brandStrong shadow-sm disabled:opacity-40">
        <Bookmark size={14} />保存当前筛选
      </button>
      {saved.map((entry) => (
        <span key={entry.id} className="inline-flex h-9 items-center rounded-xl border border-borderSoft bg-surface text-xs">
          <button type="button" onClick={() => navigate(`/overview?${entry.query}`)} className="h-full px-3 font-semibold text-slate-700">{entry.label}</button>
          <button type="button" aria-label={`删除保存的筛选：${entry.label}`} onClick={() => persist(saved.filter((candidate) => candidate.id !== entry.id))} className="flex h-9 w-9 items-center justify-center text-slate-400 hover:text-rose-600"><X size={13} /></button>
        </span>
      ))}
    </div>
  );
}
