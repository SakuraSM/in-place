import { motion } from 'framer-motion';
import { Calendar, DollarSign, ShieldCheck } from 'lucide-react';
import type { Item } from '../../../legacy/database.types';
import { staggerItem } from '../../../shared/lib/animations';

const CURRENCY_DECIMAL_PLACES = 2;

interface ItemPurchaseInfoProps {
  item: Pick<Item, 'price' | 'purchase_date' | 'warranty_date'>;
}

export default function ItemPurchaseInfo({ item }: ItemPurchaseInfoProps) {
  if (!(item.price || item.purchase_date || item.warranty_date)) return null;

  return (
    <motion.div variants={staggerItem} className="ui-panel">
      <h2 className="text-sm font-semibold text-slate-700 mb-3">购买信息</h2>
      <div className="space-y-3">
        {item.price && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
              <DollarSign size={14} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted">购买价格</p>
              <p className="text-sm font-semibold text-slate-800">¥{item.price.toFixed(CURRENCY_DECIMAL_PLACES)}</p>
            </div>
          </div>
        )}
        {item.purchase_date && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brandTint rounded-lg flex items-center justify-center">
              <Calendar size={14} className="text-brandStrong" />
            </div>
            <div>
              <p className="text-xs text-muted">购买日期</p>
              <p className="text-sm font-semibold text-slate-800">{item.purchase_date}</p>
            </div>
          </div>
        )}
        {item.warranty_date && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
              <ShieldCheck size={14} className="text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted">保修截止</p>
              <p className="text-sm font-semibold text-slate-800">{item.warranty_date}</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
