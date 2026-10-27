import { render, within } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Screen } from '../Screen';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.requireActual<typeof import('react-native')>('react-native').View,
  useSafeAreaInsets: () => ({ top: 36, right: 0, bottom: 18, left: 0 }),
}));

describe('Screen', () => {
  it('keeps the top safe area outside scrolling content', () => {
    const screen = render(<Screen scroll><Text>内容</Text></Screen>);
    const contentStyle = Object.assign({}, ...screen.getByTestId('screen-scroll').props.contentContainerStyle.filter(Boolean));

    expect(screen.getByTestId('screen-safe-area').props.style.paddingTop).toBe(36);
    expect(contentStyle.paddingTop).toBe(26);
    expect(contentStyle.paddingBottom).toBe(38);
  });

  it('retains the total top and bottom spacing on non-scrolling pages', () => {
    const screen = render(<Screen><Text>内容</Text></Screen>);
    const content = screen.getByTestId('screen-content');
    const flattenedStyle = Object.assign({}, ...content.props.style.filter(Boolean));

    expect(screen.getByTestId('screen-safe-area').props.style.paddingTop + flattenedStyle.paddingTop).toBe(62);
    expect(flattenedStyle.paddingBottom).toBe(38);
  });

  it('leaves immersive screens without a fixed top inset', () => {
    const screen = render(<Screen safeAreaTop="immersive"><Text>内容</Text></Screen>);
    expect(screen.getByTestId('screen-safe-area').props.style.paddingTop).toBe(0);
  });

  it('keeps muted pages on a clean background without decorative chrome', () => {
    const screen = render(<Screen chrome="muted"><Text>内容</Text></Screen>);

    expect(screen.queryByTestId('background-chrome')).toBeNull();
  });

  it('keeps the form action outside the scrolling content and above the bottom safe area', () => {
    const screen = render(<Screen scroll footer={<Text>保存资料</Text>}><Text>表单内容</Text></Screen>);
    expect(within(screen.getByTestId('screen-scroll')).queryByText('保存资料')).toBeNull();
    expect(screen.getByTestId('screen-footer').props.style.paddingBottom).toBe(18);
    expect(screen.getByText('保存资料')).toBeTruthy();
  });
});
