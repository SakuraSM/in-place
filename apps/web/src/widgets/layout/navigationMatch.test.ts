import { describe, expect, it } from 'vitest';
import { isMobileNavigationPathActive, isNavigationPathActive } from './navigationMatch';

describe('isNavigationPathActive', () => {
  it('keeps mobile detail and management pages in their owning primary section', () => {
    expect(isMobileNavigationPathActive({ pathname: '/item/example', targetPath: '/overview' })).toBe(true);
    expect(isMobileNavigationPathActive({ pathname: '/locations', targetPath: '/manage' })).toBe(true);
    expect(isMobileNavigationPathActive({ pathname: '/stocktakes/example', targetPath: '/manage' })).toBe(true);
    expect(isMobileNavigationPathActive({ pathname: '/household', targetPath: '/profile' })).toBe(true);
    expect(isMobileNavigationPathActive({ pathname: '/item/example', targetPath: '/' })).toBe(false);
  });
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
