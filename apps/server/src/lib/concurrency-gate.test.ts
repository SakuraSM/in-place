import { describe, expect, it } from 'vitest';
import { ConcurrencyGate } from './concurrency-gate.js';

describe('ConcurrencyGate', () => {
  it('bounds global and per-key work and releases exactly once', () => {
    const gate = new ConcurrencyGate(2, 1);
    const releaseA = gate.tryAcquire('a');
    const releaseB = gate.tryAcquire('b');
    expect(releaseA).not.toBeNull();
    expect(releaseB).not.toBeNull();
    expect(gate.tryAcquire('a')).toBeNull();
    expect(gate.tryAcquire('c')).toBeNull();
    releaseA?.();
    releaseA?.();
    expect(gate.tryAcquire('c')).not.toBeNull();
  });
});
