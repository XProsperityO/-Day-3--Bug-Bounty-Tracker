export async function retry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 250): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); } catch (err) { lastErr = err; if (i < attempts - 1) await new Promise(res => setTimeout(res, delayMs)); }
  }
  throw lastErr;
}
