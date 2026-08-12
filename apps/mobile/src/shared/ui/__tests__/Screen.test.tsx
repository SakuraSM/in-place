import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Screen } from '../Screen';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 36, right: 0, bottom: 18, left: 0 }),
}));

describe('Screen', () => {
  it('adds top and bottom safe-area padding to child pages', () => {
    const screen = render(<Screen><Text>内容</Text></Screen>);
    const content = screen.getByTestId('screen-content');
    const flattenedStyle = Object.assign({}, ...content.props.style.filter(Boolean));

    expect(flattenedStyle.paddingTop).toBe(54);
    expect(flattenedStyle.paddingBottom).toBe(30);
  });

  it('keeps muted pages on a clean background without decorative chrome', () => {
    const screen = render(<Screen chrome="muted"><Text>内容</Text></Screen>);

    expect(screen.queryByTestId('background-chrome')).toBeNull();
  });
});
