import { router } from 'expo-router';
import { fireEvent, render } from '@testing-library/react-native';
import { HomeDashboard } from '../HomeDashboard';

jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  const { Pressable } = jest.requireActual('react-native');

  return {
    Link: ({ children }: { children: React.ReactNode }) => <Pressable>{children}</Pressable>,
    router: { push: jest.fn(), navigate: jest.fn() },
  };
});

jest.mock('@/shared/ui/ToastProvider', () => ({ useNotify: () => jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/shared/ui/Entrance', () => ({
  Entrance: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/providers/HouseholdProvider', () => ({
  useHousehold: () => ({
    currentHousehold: { id: 'household-1', name: '测试家庭' },
    role: 'owner',
    households: [{ id: 'household-1', name: '测试家庭', role: 'owner' }],
  }),
}));

const baseProps = {
  stats: null,
  statsLoading: false,
  recentItems: [],
  recentItemPaths: {},
  recentActivity: [],
  rootItems: [],
  allItems: [],
  categories: [],
  viewMode: 'type' as const,
  selectionMode: false,
  selectedIds: [],
  canEditInventory: true,
  onToggleSelectionMode: jest.fn(),
  onChangeViewMode: jest.fn(),
  onToggleSelected: jest.fn(),
};

describe('HomeDashboard', () => {
  it('keeps the operational shortcuts visible for editable households', () => {
    const screen = render(<HomeDashboard {...baseProps} />);

    expect(screen.getByText('扫标签归位')).toBeTruthy();
    expect(screen.getByText('盘点')).toBeTruthy();
    expect(screen.getByText('提醒')).toBeTruthy();
  });

  it('hides mutation shortcuts for viewers and during bulk selection', () => {
    const viewerScreen = render(<HomeDashboard {...baseProps} canEditInventory={false} />);
    expect(viewerScreen.queryByText('新增')).toBeNull();
    expect(viewerScreen.queryByText('盘点')).toBeNull();
    expect(viewerScreen.getByText('查看标签')).toBeTruthy();

    const selectionScreen = render(<HomeDashboard {...baseProps} selectionMode selectedIds={['item-1']} />);
    expect(selectionScreen.queryByLabelText('快捷操作')).toBeNull();
    expect(selectionScreen.getByText('已选择 1 项')).toBeTruthy();
  });
});

it('opens borrowed inventory from the matching statistic and switches recent records', () => {
  const screen = render(<HomeDashboard {...baseProps} />);
  fireEvent.press(screen.getByText('借出中'));
  expect(router.navigate).toHaveBeenCalledWith({ pathname: '/(tabs)/overview', params: { q: '', type: 'all', status: 'borrowed', locationId: '', tag: '', view: 'flat', focus: '' } });
  fireEvent.press(screen.getByRole('tab', { name: '最近操作' }));
  expect(screen.getByText('查看全部操作')).toBeTruthy();
  expect(screen.queryByText('暂无新增')).toBeNull();
});

it('opens global search for read-only households with stale filters cleared', () => {
  const screen = render(<HomeDashboard {...baseProps} canEditInventory={false} />);
  fireEvent.press(screen.getByLabelText('搜索全部物品'));
  expect(router.navigate).toHaveBeenCalledWith({ pathname: '/(tabs)/overview', params: { q: '', type: 'all', status: 'all', locationId: '', tag: '', view: 'flat', focus: 'search' } });
});
