import { describe, expect, it } from 'vitest';
import { isNavigationPathActive } from './navigationMatch';

describe('isNavigationPathActive', () => {
  it('does not activate AI scan on the code-scanning route', () => {
    expect(isNavigationPathActive({
      pathname: '/scan/codes',
      targetPath: '/scan',
      mode: 'exact',
    })).toBe(false);
  });

  it('keeps section routes active for their nested pages', () => {
    expect(isNavigationPathActive({
      pathname: '/stocktakes/session-id',
      targetPath: '/stocktakes',
    })).toBe(true);
  });

  it('requires an exact match for the home route', () => {
    expect(isNavigationPathActive({
      pathname: '/overview',
      targetPath: '/',
    })).toBe(false);
  });
});
