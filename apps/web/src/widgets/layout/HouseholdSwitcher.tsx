import { ChevronDown, Home, Users } from 'lucide-react';
import { useHousehold } from '../../app/providers/household-context';

export default function HouseholdSwitcher({ compact = false }: { compact?: boolean }) {
  const { households, currentHousehold, loading, switchHousehold } = useHousehold();

  if (compact) {
    return (
      <div
        className="flex h-11 w-full items-center justify-center rounded-2xl bg-surfaceMuted text-brandStrong"
        title={currentHousehold?.name ?? '家庭空间'}
        aria-label={`当前家庭空间：${currentHousehold?.name ?? '加载中'}`}
      >
        {currentHousehold?.is_personal ? <Home size={18} /> : <Users size={18} />}
      </div>
    );
  }

  return (
    <label className="relative block">
      <span className="sr-only">切换家庭空间</span>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brandStrong">
        {currentHousehold?.is_personal ? <Home size={16} /> : <Users size={16} />}
      </span>
      <select
        value={currentHousehold?.id ?? ''}
        disabled={loading || households.length === 0}
        onChange={(event) => void switchHousehold(event.target.value)}
        className="h-11 w-full appearance-none rounded-2xl border border-borderSoft bg-surfaceMuted py-2 pl-10 pr-9 text-sm font-semibold text-slate-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
      >
        {households.map((household) => (
          <option key={household.id} value={household.id}>
            {household.name}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
      />
    </label>
  );
}
