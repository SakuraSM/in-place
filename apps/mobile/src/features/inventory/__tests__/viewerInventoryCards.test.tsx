import { render } from '@testing-library/react-native';
import type { Item } from '@inplace/domain';
import { MobileAttachmentsCard } from '../MobileAttachmentsCard';
import { MobileLifecycleCard } from '../MobileLifecycleCard';

const queryResult = { data: [], isLoading: false, error: null };

jest.mock('@tanstack/react-query', () => ({
  useQuery: () => queryResult,
  useMutation: () => ({ mutate: jest.fn(), isPending: false, error: null }),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
jest.mock('@/providers/HouseholdProvider', () => ({
  useHousehold: () => ({ currentHouseholdId: 'household-viewer' }),
}));
jest.mock('@/shared/ui/ToastProvider', () => ({
  useNotify: () => jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const item = {
  id: 'item-1',
  type: 'item',
  quantity: 2,
  tracking_mode: 'unique',
} as Item;

describe('viewer inventory cards', () => {
  it('keeps attachments readable without upload or delete actions', () => {
    const screen = render(<MobileAttachmentsCard itemId={item.id} canEdit={false} />);

    expect(screen.queryByLabelText('上传凭证或附件')).toBeNull();
    expect(screen.getByText(/文件仅登录后可访问/)).toBeTruthy();
  });

  it('keeps lifecycle data visible without mutation actions', () => {
    const screen = render(<MobileLifecycleCard item={item} canEdit={false} />);

    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.queryByLabelText('减少库存')).toBeNull();
    expect(screen.queryByText('新增借出')).toBeNull();
  });
});
