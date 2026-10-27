import type { ChangeEvent } from 'react';
import type { HomeViewMode } from './HomeInventorySections';

interface HomeGroupingSelectProps { value: HomeViewMode; onChange: (value: HomeViewMode) => void }

export default function HomeGroupingSelect({ value, onChange }: HomeGroupingSelectProps) {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    const next = event.target.value;
    if (next === 'type' || next === 'category') onChange(next);
  };
  return <label className="ml-auto md:hidden"><span className="sr-only">首页分组方式</span><select value={value} onChange={handleChange} className="min-h-11 rounded-xl border border-border bg-surface px-2 text-xs text-brandStrong"><option value="type">按类型</option><option value="category">按分类</option></select></label>;
}
