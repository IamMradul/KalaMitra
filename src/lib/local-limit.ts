interface RateLimitState {
  count: number;
  lastReset: number;
}

const memoryStore = new Map<string, RateLimitState>();

// Optional: Basic cleanup to prevent memory leaks over time
setInterval(() => {
  const now = Date.now();
  for (const [key, state] of memoryStore.entries()) {
    // If it's been idle for more than 1 hour, remove it
    if (now - state.lastReset > 3600000) {
      memoryStore.delete(key);
    }
  }
}, 300000); // Run every 5 minutes

/**
 * A simple in-memory rate limiter for local fallback or development.
 * Note: This only works per-server-instance (local RAM).
 */
export function localRateLimit(key: string, limit: number, windowMs: number): { success: boolean, remaining: number } {
  const now = Date.now();
  const state = memoryStore.get(key) || { count: 0, lastReset: now };

  if (now - state.lastReset > windowMs) {
    state.count = 0;
    state.lastReset = now;
  }

  if (state.count >= limit) {
    return { success: false, remaining: 0 };
  }

  state.count++;
  memoryStore.set(key, state);

  return { success: true, remaining: limit - state.count };
}
