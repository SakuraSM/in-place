import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AssetMapErrorBoundary from './AssetMapErrorBoundary';

function BrokenMap(): never {
  throw new Error('map render failed');
}

describe('AssetMapErrorBoundary', () => {
  it('reports a map rendering error to the parent fallback', () => {
    const onMapError = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <AssetMapErrorBoundary onMapError={onMapError}>
        <BrokenMap />
      </AssetMapErrorBoundary>,
    );

    expect(onMapError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });
});
