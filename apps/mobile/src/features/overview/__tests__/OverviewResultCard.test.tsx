import { fireEvent, render } from '@testing-library/react-native';
import { Image } from 'react-native';
import type { Category, Item } from '@inplace/domain';
import { OverviewResultCard } from '../OverviewResultCard';
import { OverviewResultArtwork } from '../OverviewResultArtwork';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/providers/AuthProvider', () => ({ useAuth: () => ({ session: { token: 'local-test-token' } }) }));
jest.mock('@/shared/api/mobileClient', () => ({ getMobileApiBaseUrl: () => 'https://inventory.example.com/api' }));
jest.mock('@/shared/ui/CategoryArtwork', () => {
  const { Text: MockText } = jest.requireActual<typeof import('react-native')>('react-native');
  return { CategoryArtwork: () => <MockText>分类插画</MockText> };
});
jest.mock('@/features/inventory/mobileInventoryFormat', () => ({
  resolveInventoryImageUri: (url?: string) => url ?? null,
}));

const category: Category = {
  id: 'digital', user_id: 'ui-owner', household_id: 'ui-household', item_type: 'item',
  name: '数码电子', scope: 'item', icon: 'MonitorSmartphone', preset_key: 'item.digital',
  color: 'sky', created_at: '2026-10-27T00:00:00Z',
};
const item: Item = {
  id: 'camera', user_id: 'ui-owner', household_id: 'ui-household', parent_id: null,
  name: '旅行相机', type: 'item', description: '', category: '数码电子', price: null,
  images: ['https://example.invalid/photo.jpg'], quantity: 0, status: 'in_stock',
  tracking_mode: 'quantity', minimum_quantity: null, expiry_date: null, purchase_date: null,
  warranty_date: null, tags: [], metadata: {}, created_at: '2026-10-27T00:00:00Z',
  updated_at: '2026-10-27T00:00:00Z',
};

it('falls back to the category artwork after a photo fails to load', () => {
  const screen = render(<OverviewResultCard item={item} category={category} path="书房" selected={false} />);
  fireEvent(screen.UNSAFE_getByType(Image), 'error', { nativeEvent: { error: 'image unavailable' } });
  expect(screen.getByText('分类插画')).toBeTruthy();
  expect(screen.UNSAFE_queryByType(Image)).toBeNull();
  expect(screen.getByText('0 件')).toBeTruthy();
});

it('retries a replacement photo after the previous URL failed', () => {
  const screen = render(<OverviewResultCard item={item} category={category} path="书房" selected={false} />);
  fireEvent(screen.UNSAFE_getByType(Image), 'error', { nativeEvent: { error: 'image unavailable' } });
  screen.rerender(<OverviewResultCard item={{ ...item, images: ['https://example.invalid/replacement.jpg'] }} category={category} path="书房" selected={false} />);
  expect(screen.UNSAFE_getByType(Image).props.source.uri).toBe('https://example.invalid/replacement.jpg');
});

it('keeps uncategorized records visible when their photo also fails', () => {
  const screen = render(<OverviewResultCard item={{ ...item, category: '' }} path="" selected={false} />);
  fireEvent(screen.UNSAFE_getByType(Image), 'error', { nativeEvent: { error: 'image unavailable' } });
  expect(screen.UNSAFE_queryByType(Image)).toBeNull();
  expect(screen.getByText('未分类')).toBeTruthy();
  expect(screen.getByText('根目录')).toBeTruthy();
});

it('uses the same photo failure fallback in the hierarchy list', () => {
  const screen = render(<OverviewResultArtwork item={item} category={category} presentation="row" />);
  fireEvent(screen.UNSAFE_getByType(Image), 'error', { nativeEvent: { error: 'image unavailable' } });
  expect(screen.getByText('分类插画')).toBeTruthy();
});
