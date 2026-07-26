import { describe, expect, it } from 'vitest';
import { parseInventoryCode } from './inventoryCode';

describe('parseInventoryCode', () => {
  const code = 'aBcD_1234567890-opaque';

  it('parses an opaque code and a full label URL', () => {
    expect(parseInventoryCode(code)).toBe(code);
    expect(parseInventoryCode(`https://example.test/s/${code}`)).toBe(code);
  });

  it('rejects ids, names and malformed labels', () => {
    expect(parseInventoryCode('550e8400-e29b-41d4-a716-446655440000')).toBeNull();
    expect(parseInventoryCode('/s/客厅')).toBeNull();
  });
});
