import { describe, expect, it } from 'vitest';
import {
  parseMobileMapToNativeMessage,
  parseNativeToMobileMapMessage,
  serializeNativeToMobileMapMessage,
} from '@inplace/app-core';

const point = {
  id: 'location-1',
  name: '客厅',
  category: '房间',
  presetKey: 'location.room',
  icon: 'DoorOpen',
  color: 'teal',
  longitude: 120.1,
  latitude: 30.2,
  assetCount: 3,
};

describe('mobile map bridge', () => {
  it('accepts minimal native point messages', () => {
    expect(parseNativeToMobileMapMessage({
      type: 'initialize',
      points: [point],
      selectedPointIds: ['location-1'],
    })).toEqual({ type: 'initialize', points: [point], selectedPointIds: ['location-1'] });
  });

  it('rejects malformed or secret-bearing point payloads', () => {
    expect(parseNativeToMobileMapMessage({
      type: 'update-points',
      points: [{ ...point, longitude: '120.1' }],
    })).toBeNull();
    expect(parseNativeToMobileMapMessage({ type: 'initialize', points: [point], selectedPointIds: [], token: 'secret' })).toBeNull();
  });

  it('validates map coordinate results', () => {
    expect(parseMobileMapToNativeMessage({
      type: 'choose-coordinate',
      coordinate: { longitude: 120.1, latitude: 30.2, address: '测试地址' },
    })).toEqual({
      type: 'choose-coordinate',
      coordinate: { longitude: 120.1, latitude: 30.2, address: '测试地址' },
    });
    expect(parseMobileMapToNativeMessage({
      type: 'choose-coordinate',
      coordinate: { longitude: null, latitude: 30.2, address: '' },
    })).toBeNull();
  });

  it('escapes script-like content when serializing injected messages', () => {
    expect(serializeNativeToMobileMapMessage({
      type: 'set-coordinate-mode',
      targetId: 'x',
      targetName: '</script>\u2028next',
    })).not.toContain('</script>');
    expect(serializeNativeToMobileMapMessage({
      type: 'set-coordinate-mode',
      targetId: 'x',
      targetName: '\u2029',
    })).not.toContain('\u2029');
  });
});
