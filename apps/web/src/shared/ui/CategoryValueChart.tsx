import { buildCategoryValueBars, type CategoryValueEntry } from '@inplace/ui';

interface CategoryValueChartProps { entries: readonly CategoryValueEntry[] }

export default function CategoryValueChart({ entries }: CategoryValueChartProps) {
  if (!entries.length) return <p className="py-4 text-sm text-muted">暂无价值数据</p>;
  return <div className="space-y-5" role="list" aria-label="分类价值">
    {buildCategoryValueBars(entries).map(entry => <div key={entry.category} role="listitem" aria-label={`${entry.category}，¥${entry.value.toFixed(2)}`}>
      <div className="mb-2 flex items-center justify-between gap-4 text-sm"><span>{entry.category}</span><span className="font-medium tabular-nums">¥{entry.value.toFixed(2)}</span></div>
      <div className="h-3 overflow-hidden rounded bg-surfaceMuted" aria-hidden="true"><div className="h-full rounded bg-brandStrong" style={{ width: `${entry.percentage}%` }} /></div>
    </div>)}
  </div>;
}
