import { render } from '@testing-library/react-native';
import { Image } from 'react-native';
import { CATEGORY_PRESET_ARTWORK } from '@inplace/ui/category-artwork';
import { CategoryArtwork, CATEGORY_ARTWORK_SOURCES } from '../CategoryArtwork';

describe('CategoryArtwork', () => {
  it('has a bundled source for every preset', () => {
    expect(Object.keys(CATEGORY_ARTWORK_SOURCES)).toEqual(Object.keys(CATEGORY_PRESET_ARTWORK));
  });

  it('renders a bundled preset image when the legacy icon is unchanged', () => {
    const view = render(
      <CategoryArtwork presetKey="container.box" icon="Box" color="teal" />,
    );
    expect(view.UNSAFE_getByType(Image).props.resizeMode).toBe('contain');
  });

  it('keeps a custom image override', () => {
    const view = render(
      <CategoryArtwork
        presetKey="container.box"
        icon="https://example.test/custom.png"
        color="teal"
      />,
    );
    const image = view.UNSAFE_getByType(Image);
    expect(image.props.resizeMode).toBe('cover');
    expect(image.props.source).toEqual({ uri: 'https://example.test/custom.png' });
  });
});
