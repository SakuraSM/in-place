import type { CategoryPresetArtworkKey } from '@inplace/ui/category-artwork';
import locationApartment from '@inplace/ui/category-artwork-assets/location-apartment.webp';
import locationRoom from '@inplace/ui/category-artwork-assets/location-room.webp';
import locationFloor from '@inplace/ui/category-artwork-assets/location-floor.webp';
import locationOutdoor from '@inplace/ui/category-artwork-assets/location-outdoor.webp';
import locationGarage from '@inplace/ui/category-artwork-assets/location-garage.webp';
import containerCabinet from '@inplace/ui/category-artwork-assets/container-cabinet.webp';
import containerDrawer from '@inplace/ui/category-artwork-assets/container-drawer.webp';
import containerBox from '@inplace/ui/category-artwork-assets/container-box.webp';
import containerShelf from '@inplace/ui/category-artwork-assets/container-shelf.webp';
import containerFridge from '@inplace/ui/category-artwork-assets/container-fridge.webp';
import containerBag from '@inplace/ui/category-artwork-assets/container-bag.webp';
import itemDigital from '@inplace/ui/category-artwork-assets/item-digital.webp';
import itemClothing from '@inplace/ui/category-artwork-assets/item-clothing.webp';
import itemBooks from '@inplace/ui/category-artwork-assets/item-books.webp';
import itemKitchen from '@inplace/ui/category-artwork-assets/item-kitchen.webp';
import itemAppliances from '@inplace/ui/category-artwork-assets/item-appliances.webp';
import itemTools from '@inplace/ui/category-artwork-assets/item-tools.webp';
import itemCleaning from '@inplace/ui/category-artwork-assets/item-cleaning.webp';
import itemHealth from '@inplace/ui/category-artwork-assets/item-health.webp';
import itemToys from '@inplace/ui/category-artwork-assets/item-toys.webp';
import itemValuables from '@inplace/ui/category-artwork-assets/item-valuables.webp';

export const CATEGORY_ARTWORK_ASSETS: Record<CategoryPresetArtworkKey, string> = {
  'location.apartment': locationApartment,
  'location.room': locationRoom,
  'location.floor': locationFloor,
  'location.outdoor': locationOutdoor,
  'location.garage': locationGarage,
  'container.cabinet': containerCabinet,
  'container.drawer': containerDrawer,
  'container.box': containerBox,
  'container.shelf': containerShelf,
  'container.fridge': containerFridge,
  'container.bag': containerBag,
  'item.digital': itemDigital,
  'item.clothing': itemClothing,
  'item.books': itemBooks,
  'item.kitchen': itemKitchen,
  'item.appliances': itemAppliances,
  'item.tools': itemTools,
  'item.cleaning': itemCleaning,
  'item.health': itemHealth,
  'item.toys': itemToys,
  'item.valuables': itemValuables,
};
