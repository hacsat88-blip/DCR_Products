export interface RateLimiterOptions {
  minIntervalMs?: number;
  maxPerWindow?: number;
  windowMs?: number;
}

export interface RateLimiter {
  schedule<T>(task: () => Promise<T>): Promise<T>;
}

export function createRateLimiter(opts: RateLimiterOptions = {}): RateLimiter {
  const minIntervalMs = opts.minIntervalMs ?? 0;
  const maxPerWindow = opts.maxPerWindow ?? Infinity;
  const windowMs = opts.windowMs ?? 0;

  const queue: Array<() => void> = [];
  const recentStarts: number[] = [];
  let lastStart = 0;
  let running = false;

  const pump = async () => {
    if (running) return;
    running = true;
    try {
      while (queue.length > 0) {
        const now = Date.now();
        const sinceLast = now - lastStart;
        let wait = sinceLast < minIntervalMs ? minIntervalMs - sinceLast : 0;

        if (Number.isFinite(maxPerWindow) && windowMs > 0) {
          while (recentStarts.length > 0 && recentStarts[0] <= now - windowMs) {
            recentStarts.shift();
          }
          if (recentStarts.length >= maxPerWindow) {
            const earliest = recentStarts[0];
            const windowWait = earliest + windowMs - now;
            if (windowWait > wait) wait = windowWait;
          }
        }

        if (wait > 0) {
          await new Promise((r) => setTimeout(r, wait));
          continue;
        }

        const next = queue.shift();
        if (!next) break;
        lastStart = Date.now();
        recentStarts.push(lastStart);
        next();
      }
    } finally {
      running = false;
    }
  };

  return {
    schedule<T>(task: () => Promise<T>): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        queue.push(() => {
          task().then(resolve, reject);
        });
        void pump();
      });
    },
  };
}
