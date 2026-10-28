import { fireEvent, render } from '@testing-library/react-native';
import { McpCredentialForm } from '../McpCredentialForm';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

it('requires an explicit switch to authorize imports', () => {
  const onCreate = jest.fn().mockResolvedValue(undefined);
  const screen = render(<McpCredentialForm canImport isBusy={false} onCreate={onCreate} />);
  fireEvent.changeText(screen.getByLabelText('凭证名称'), 'Native Agent');
  fireEvent.press(screen.getByText('创建凭证'));
  expect(onCreate).toHaveBeenLastCalledWith({ name: 'Native Agent', expiresInDays: 90, scopes: ['inventory:read'] });
  fireEvent(screen.getByLabelText('允许批量新增'), 'valueChange', true);
  fireEvent.press(screen.getByText('创建凭证'));
  expect(onCreate).toHaveBeenLastCalledWith({ name: 'Native Agent', expiresInDays: 90, scopes: ['inventory:read', 'inventory:import'] });
});

it('never grants import access to a viewer', () => {
  const onCreate = jest.fn().mockResolvedValue(undefined);
  const screen = render(<McpCredentialForm canImport={false} isBusy={false} onCreate={onCreate} />);
  fireEvent.changeText(screen.getByLabelText('凭证名称'), 'Read Agent');
  fireEvent(screen.getByLabelText('允许批量新增'), 'valueChange', true);
  fireEvent.press(screen.getByText('创建凭证'));
  expect(onCreate).toHaveBeenCalledWith({ name: 'Read Agent', expiresInDays: 90, scopes: ['inventory:read'] });
});
