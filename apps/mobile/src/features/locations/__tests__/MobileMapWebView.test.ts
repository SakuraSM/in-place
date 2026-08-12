import { isAllowedMobileMapNavigation } from '../mobileMapSecurity';

describe('isAllowedMobileMapNavigation', () => {
  it('allows only the configured map origin', () => {
    expect(isAllowedMobileMapNavigation('http://localhost:5173/mobile-map', 'http://localhost:5173')).toBe(true);
    expect(isAllowedMobileMapNavigation('http://localhost:5173/anything', 'http://localhost:5173')).toBe(false);
    expect(isAllowedMobileMapNavigation('https://evil.example/mobile-map', 'http://localhost:5173')).toBe(false);
    expect(isAllowedMobileMapNavigation('javascript:alert(1)', 'http://localhost:5173')).toBe(false);
  });
});
