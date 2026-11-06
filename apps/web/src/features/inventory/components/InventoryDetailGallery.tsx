import { motion } from 'framer-motion';
import type { Item } from '../../../legacy/database.types';
import { buildInventoryImageUrl } from '../lib/itemImage';
import InventoryArtwork from './InventoryArtwork';

interface InventoryDetailGalleryProps {
  item: Item;
  activeImageIndex: number;
  onSelectImage: (index: number) => void;
}

export default function InventoryDetailGallery({ item, activeImageIndex, onSelectImage }: InventoryDetailGalleryProps) {
  const isContainer = item.type === 'container';
  const selectedImageIndex = activeImageIndex >= 0 && activeImageIndex < item.images.length ? activeImageIndex : 0;

  return (
    <div className="min-w-0 shrink-0">
      <div className="hidden lg:block">
        {item.images.length > 0 ? (
          <div className="sticky top-28">
            <div className="flex aspect-[5/4] items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-sm xl:aspect-square">
              <img src={buildInventoryImageUrl(item.images[selectedImageIndex], 'detail')} alt={item.name} className="h-full w-full object-contain object-center" />
            </div>
            {item.images.length > 1 ? (
              <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
                {item.images.map((url, index) => (
                  <motion.button
                    key={index}
                    type="button"
                    aria-label={`查看第 ${index + 1} 张图片`}
                    aria-pressed={index === selectedImageIndex}
                    onClick={() => onSelectImage(index)}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.94 }}
                    className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 bg-white transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-brandStrong ${index === selectedImageIndex ? 'border-brandStrong' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  >
                    <img src={buildInventoryImageUrl(url, 'detail-thumb')} alt="" className="h-full w-full object-cover object-center" />
                  </motion.button>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="sticky top-28 flex aspect-[5/4] items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm xl:aspect-square">
            {isContainer ? (
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 text-slate-300">
                <InventoryArtwork item={item} className="max-h-72 max-w-72" />
              </div>
            ) : <InventoryArtwork item={item} className="max-h-72 max-w-72" />}
          </div>
        )}
      </div>

      <div className="lg:hidden">
        {item.images.length > 0 ? (
          <div className={isContainer ? 'rounded-2xl border border-slate-100 bg-white p-3 shadow-sm' : 'overflow-hidden rounded-2xl bg-white'}>
            <div className={isContainer ? 'aspect-square overflow-hidden rounded-xl bg-slate-100' : 'relative aspect-square overflow-hidden'}>
              <img src={buildInventoryImageUrl(item.images[selectedImageIndex], 'detail')} alt={item.name} className="h-full w-full object-cover" />
            </div>
            {item.images.length > 1 ? (
              <div className={isContainer ? 'mt-3 flex gap-2 overflow-x-auto scrollbar-hide' : 'flex gap-2 overflow-x-auto p-3'}>
                {item.images.map((url, index) => (
                  <button
                    key={index}
                    type="button"
                    aria-label={`查看第 ${index + 1} 张图片`}
                    aria-pressed={index === selectedImageIndex}
                    onClick={() => onSelectImage(index)}
                    className={`h-14 w-14 shrink-0 overflow-hidden border-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brandStrong ${isContainer ? 'rounded-lg' : 'rounded-xl transition-all'} ${index === selectedImageIndex ? 'border-brandStrong' : `border-transparent ${isContainer ? 'opacity-60' : ''}`}`}
                  >
                    <img src={buildInventoryImageUrl(url, 'detail-thumb')} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : <div className="flex h-[230px] items-center justify-center rounded-3xl bg-canvasStrong"><InventoryArtwork item={item} className="max-h-56 max-w-56" /></div>}
      </div>
    </div>
  );
}
