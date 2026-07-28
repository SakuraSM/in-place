import type { FastifyReply } from 'fastify';

type Entry = { count: number; resetAt: number };

export class BoundedRateLimiter {
  private readonly entries = new Map<string, Entry>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly capacity = 10_000,
  ) {}

  consume(key: string, now = Date.now()) {
    this.prune(now);
    const current = this.entries.get(key);
    if (!current || current.resetAt <= now) {
      this.entries.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, retryAfterSeconds: 0 };
    }
    current.count += 1;
    this.entries.delete(key);
    this.entries.set(key, current);
    return {
      allowed: current.count <= this.max,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1_000)),
    };
  }

  reset(key: string) {
    this.entries.delete(key);
  }

  private prune(now: number) {
    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now || this.entries.size >= this.capacity) {
        this.entries.delete(key);
      }
      if (this.entries.size < this.capacity) break;
    }
  }
}

export function sendRateLimit(reply: FastifyReply, retryAfterSeconds: number) {
  return reply
    .header('Retry-After', String(retryAfterSeconds))
    .code(429)
    .send({ error: 'RATE_LIMITED', message: '请求过于频繁，请稍后重试' });
}
