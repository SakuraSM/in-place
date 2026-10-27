import { Plus } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useInventoryPermissions } from '../../../shared/hooks/useInventoryPermissions';
import { CategoryIcon } from '../lib/categoryPresentation';
import { buildHomeCreateRoute } from '../lib/homeRoute';

export default function HomeWelcome() {
  const { canEditInventory } = useInventoryPermissions();
  const location = useLocation();
  return (
    <section data-home-welcome className="relative mb-5 flex min-h-[180px] items-center justify-between overflow-hidden rounded-3xl bg-canvasStrong p-5 md:min-h-[216px] md:px-9 md:py-7">
      <div className="relative z-10 max-w-[65%]">
        <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-brandStrong md:text-[10px]">A little more order</p>
        <h2 className="mt-3 text-lg font-semibold leading-relaxed tracking-tight md:text-[27px]">家里的美好，从归位开始。</h2>
        <p className="mb-4 mt-2 text-xs text-muted md:text-[13px]">记录你拥有的，找到你需要的。</p>
        {canEditInventory ? <Link to={buildHomeCreateRoute(location.pathname, location.search)} className="ui-button-primary px-3 text-xs md:px-5 md:text-sm"><Plus size={17} />记录一件物品</Link> : null}
      </div>
      <div className="pointer-events-none absolute right-1 top-4 h-28 w-28 md:static md:h-44 md:w-52"><CategoryIcon icon="Building2" presetKey="location.apartment" imageClassName="h-full w-full object-contain" /></div>
    </section>
  );
}
