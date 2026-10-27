import { Box, Package } from 'lucide-react';
import type { Item } from '@inplace/domain';
import { CategoryIcon } from '../lib/categoryPresentation';
import { useInventoryCategory } from '../hooks/useInventoryCategory';

interface InventoryArtworkProps { item: Item; className?: string }

/** Uses the same scoped category cache for collections and detail placeholders. */
export default function InventoryArtwork({ item, className = '' }: InventoryArtworkProps) {
  const category = useInventoryCategory(item);
  const Fallback = item.type === 'item' ? Package : Box;
  return <div className={`flex h-full w-full items-center justify-center p-4 ${className}`}>
    {category ? <CategoryIcon icon={category.icon} presetKey={category.preset_key} fallback={Fallback} size={48} className="text-brandStrong" imageClassName="h-full w-full object-contain" /> : <Fallback size={40} className="text-slate-300" />}
  </div>;
}
