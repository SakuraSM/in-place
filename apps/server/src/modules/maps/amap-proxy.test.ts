import { describe, expect, it } from 'vitest';
import { buildAmapUpstreamUrl } from './amap-proxy.js';

describe('AMap proxy URL validation', () => {
  it('routes Web Service API requests to the fixed REST origin', () => {
    const url = buildAmapUpstreamUrl({
      path: 'v3/geocode/regeo',
      queryString: 'location=116.3%2C39.9&key=public-key&jscode=attacker-code',
      apiKey: 'server-public-key',
      securityCode: 'server-security-code',
    });

    expect(url.origin).toBe('https://restapi.amap.com');
    expect(url.pathname).toBe('/v3/geocode/regeo');
    expect(url.searchParams.get('key')).toBe('server-public-key');
    expect(url.searchParams.get('jscode')).toBe('server-security-code');
    expect(url.searchParams.get('location')).toBe('116.3,39.9');
  });

  it('routes custom map style requests to the fixed Web API origin', () => {
    const url = buildAmapUpstreamUrl({
      path: 'v4/map/styles',
      queryString: 'styleid=example',
      apiKey: 'server-public-key',
      securityCode: 'server-security-code',
    });

    expect(url.origin).toBe('https://webapi.amap.com');
  });

  it('rejects traversal and unsupported proxy paths', () => {
    expect(() => buildAmapUpstreamUrl({
      path: 'v3/../internal',
      queryString: '',
      apiKey: 'server-public-key',
      securityCode: 'server-security-code',
    })).toThrow('INVALID_AMAP_PROXY_PATH');
    expect(() => buildAmapUpstreamUrl({
      path: 'v5/private',
      queryString: '',
      apiKey: 'server-public-key',
      securityCode: 'server-security-code',
    })).toThrow('INVALID_AMAP_PROXY_PATH');
  });
});
