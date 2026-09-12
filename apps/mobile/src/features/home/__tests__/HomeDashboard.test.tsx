import { render } from '@testing-library/react-native';
import { HomeDashboard } from '../HomeDashboard';

jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  const { Pressable } = jest.requireActual('react-native');

  return {
    Link: ({ children }: { children: React.ReactNode }) => <Pressable>{children}</Pressable>,
    router: { push: jest.fn() },
  };
});

jest.mock('@/shared/ui/Entrance', () => ({
  Entrance: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/providers/HouseholdProvider', () => ({
  useHousehold: () => ({
    currentHousehold: { id: 'household-1', name: '测试家庭' },
    currentHouseholdRole: 'owner',
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
    expect(viewerScreen.queryByLabelText('快捷操作')).toBeNull();

    const selectionScreen = render(<HomeDashboard {...baseProps} selectionMode selectedIds={['item-1']} />);
    expect(selectionScreen.queryByLabelText('快捷操作')).toBeNull();
    expect(selectionScreen.getByText('已选择 1 项')).toBeTruthy();
  });
});
