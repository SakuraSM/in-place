import { describe, expect, it } from 'vitest';
import { BoundedRateLimiter } from './bounded-rate-limit.js';

describe('bounded rate limiter', () => {
  it('blocks after the configured quota and exposes retry time', () => {
    const limiter = new BoundedRateLimiter(2, 60_000);
    expect(limiter.consume('account', 1_000).allowed).toBe(true);
    expect(limiter.consume('account', 1_000).allowed).toBe(true);
    const blocked = limiter.consume('account', 1_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(60);
  });

  it('supports reset and window expiry', () => {
    const limiter = new BoundedRateLimiter(1, 1_000);
    limiter.consume('account', 1_000);
    expect(limiter.consume('account', 1_001).allowed).toBe(false);
    limiter.reset('account');
    expect(limiter.consume('account', 1_001).allowed).toBe(true);
    expect(limiter.consume('account', 2_002).allowed).toBe(true);
  });
});
