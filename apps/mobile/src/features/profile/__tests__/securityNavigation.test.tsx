import { act, fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import SecurityScreen from '../../../../app/profile/security';

const mockSignOut = jest.fn(async () => undefined);

jest.mock('expo-router', () => ({ router: { replace: jest.fn(), back: jest.fn() } }));
jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({ signOut: mockSignOut, replaceSessionToken: jest.fn() }),
}));
jest.mock('@tanstack/react-query', () => ({
  useMutation: () => ({ mutateAsync: jest.fn(), isPending: false, isError: false }),
}));
jest.mock('@/shared/ui/Screen', () => ({
  Screen: ({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) => <>{children}{footer}</>,
}));
jest.mock('@/shared/ui/Entrance', () => ({
  Entrance: ({ children }: { children: React.ReactNode }) => children,
}));

it('closes the confirmation and returns to login after sign-out succeeds', async () => {
  const screen = render(<SecurityScreen />);
  fireEvent.press(screen.getByText('退出登录'));
  await act(async () => { fireEvent.press(screen.getByText('退出')); });
  expect(mockSignOut).toHaveBeenCalledTimes(1);
  expect(router.replace).toHaveBeenCalledWith('/(auth)/login');
  expect(screen.queryByText('确定要退出当前账号吗？')).toBeNull();
});
