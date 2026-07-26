import { describe, expect, it } from 'vitest';
import { householdRoleMeetsMinimum } from './household-access.js';

describe('household role permissions', () => {
  it('keeps viewers read-only and allows editors to maintain inventory', () => {
    expect(householdRoleMeetsMinimum('viewer', 'viewer')).toBe(true);
    expect(householdRoleMeetsMinimum('viewer', 'editor')).toBe(false);
    expect(householdRoleMeetsMinimum('editor', 'editor')).toBe(true);
  });

  it('reserves owner operations for owners', () => {
    expect(householdRoleMeetsMinimum('editor', 'owner')).toBe(false);
    expect(householdRoleMeetsMinimum('owner', 'owner')).toBe(true);
  });
});
