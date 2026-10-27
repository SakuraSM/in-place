import { Bell, Search, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useHousehold } from '../../app/providers/household-context';
import BrandLockup from '../../shared/ui/BrandLockup';
import HouseholdSwitcher from './HouseholdSwitcher';

/** Shared application chrome; all destinations use the existing application routes. */
export default function WorkspaceHeader() {
  const { currentHousehold } = useHousehold();
  return (
    <div className="flex min-h-[68px] shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-5 md:min-h-[78px] md:px-10">
      <div className="md:hidden"><BrandLockup size="sm" logoVariant="mark" showSubtitle={false} className="[&_[data-brand-logo]]:h-8 [&_[data-brand-logo]]:w-8 [&_[data-brand-title]]:text-[21px]" /></div>
      <p className="hidden min-w-0 truncate text-xs text-muted md:block">{currentHousehold?.name ?? '家庭空间'} <span className="px-3 text-slate-300">/</span> 家庭物品管理</p>
      <Link to="/overview" state={{ focusSearch: true }} aria-label="搜索家庭库存" className="ui-icon-button md:hidden"><Search size={20} /></Link>
      <div className="min-w-0 max-w-[180px] flex-1 md:hidden"><HouseholdSwitcher /></div>
      <div className="hidden items-center gap-5 md:flex">
        <Link to="/overview" state={{ focusSearch: true }} className="flex min-h-10 w-[248px] items-center gap-2 rounded-xl bg-canvas px-3 text-xs text-muted"><Search size={17} />搜索家庭库存</Link>
        <Link to="/reminders" aria-label="提醒中心" className="ui-icon-button"><Bell size={19} /></Link>
        <Link to="/profile" aria-label="我的账户" className="flex h-10 w-10 items-center justify-center rounded-full bg-brandTint text-brandStrong"><User size={18} /></Link>
      </div>
    </div>
  );
}
