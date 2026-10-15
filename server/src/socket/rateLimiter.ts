// Simple token-bucket rate limiter keyed by (socketId, event).
// A missing bucket is treated as full.

interface Bucket {
  tokens: number;
  lastRefill: number;
}

interface Config {
  capacity: number;
  refillPerMs: number; // tokens added per millisecond
}

const DEFAULT: Config = { capacity: 10, refillPerMs: 10 / 1000 }; // 10/sec
const CHAT: Config = { capacity: 5, refillPerMs: 1 / 500 }; // 1 per 500ms, burst 5

const CONFIGS: Record<string, Config> = {
  'c.chatSend': CHAT,
};

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  take(socketId: string, event: string): boolean {
    const cfg = CONFIGS[event] ?? DEFAULT;
    const key = `${socketId}:${event}`;
    const now = Date.now();
    const existing = this.buckets.get(key);
    const bucket: Bucket = existing ?? { tokens: cfg.capacity, lastRefill: now };
    const elapsed = now - bucket.lastRefill;
    bucket.tokens = Math.min(cfg.capacity, bucket.tokens + elapsed * cfg.refillPerMs);
    bucket.lastRefill = now;
    if (bucket.tokens < 1) {
      this.buckets.set(key, bucket);
      return false;
    }
    bucket.tokens -= 1;
    this.buckets.set(key, bucket);
    return true;
  }

  drop(socketId: string): void {
    for (const key of this.buckets.keys()) {
      if (key.startsWith(`${socketId}:`)) this.buckets.delete(key);
    }
  }
}
