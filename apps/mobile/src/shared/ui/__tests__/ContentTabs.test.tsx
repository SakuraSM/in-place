import { fireEvent, render } from '@testing-library/react-native';
import { ContentTabs } from '../ContentTabs';

describe('ContentTabs', () => {
  it('announces selection and changes the active tab', () => {
    const handleChange = jest.fn();
    const screen = render(
      <ContentTabs
        accessibilityLabel="分类用途"
        tabs={[
          { value: 'location', label: '位置分类', count: 2 },
          { value: 'item', label: '物品分类', count: 3 },
        ]}
        value="location"
        onChange={handleChange}
      />,
    );

    expect(screen.getByRole('tab', { name: /位置分类/ }).props.accessibilityState).toEqual({ selected: true });
    fireEvent.press(screen.getByRole('tab', { name: /物品分类/ }));
    expect(handleChange).toHaveBeenCalledWith('item');
  });
});
