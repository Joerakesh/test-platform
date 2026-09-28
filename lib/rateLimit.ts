// @ts-nocheck
const buckets = globalThis.__loginAttempts || (globalThis.__loginAttempts = new Map());

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export function checkLoginRate(key) {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry) return { allowed: true, remaining: MAX_ATTEMPTS };

  const recent = entry.filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_ATTEMPTS) {
    const retryIn = Math.ceil((WINDOW_MS - (now - recent[0])) / 1000);
    return { allowed: false, retryIn };
  }

  buckets.set(key, recent);
  return { allowed: true, remaining: MAX_ATTEMPTS - recent.length };
}

export function recordLoginFailure(key) {
  const now = Date.now();
  const recent = (buckets.get(key) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  buckets.set(key, recent);
}

export function clearLoginFailures(key) {
  buckets.delete(key);
}
