/**
 * Make `localStorage` survive a device where it throws.
 *
 * A phone reaches this state routinely: Safari private mode, a full quota, an
 * embedded WebView with storage disabled, a sandboxed frame. In all of them the
 * property exists but reading or writing it raises SecurityError /
 * QuotaExceededError.
 *
 * Measured consequence before this shim: the docs app rendered nothing at all —
 * `#root` stayed empty and the page was blank. Not one feature degraded; the app
 * did not boot, because a preference write inside a React render escaped as an
 * uncaught error.
 *
 * Rather than wrap the ~70 call sites, this replaces the global with a store that
 * keeps everything in memory when the real one refuses. Preferences then work for
 * the session and are simply not remembered — which is the honest behaviour for a
 * device that will not store anything.
 */

/** A localStorage-compatible store backed by a Map. */
function inMemoryStorage(): Storage {
  const map = new Map<string, string>()
  const store: Storage = {
    get length() {
      return map.size
    },
    key(index: number) {
      return [...map.keys()][index] ?? null
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null
    },
    setItem(key: string, value: string) {
      map.set(String(key), String(value))
    },
    removeItem(key: string) {
      map.delete(key)
    },
    clear() {
      map.clear()
    },
  }
  return store
}

/**
 * Probe the real storage and, if it refuses, swap in an in-memory one.
 *
 * Returns `true` when the real store is usable, `false` when the fallback was
 * installed. Safe to call twice.
 */
export function installStorageFallback(): boolean {
  const scope = globalThis as unknown as { localStorage?: Storage }
  let real: Storage | undefined
  try {
    real = scope.localStorage
    if (!real) throw new Error('no storage')
    // a write is the operation that fails, so probe one under a throwaway key
    const probe = '__genoffice_storage_probe__'
    real.setItem(probe, '1')
    real.removeItem(probe)
    return true
  } catch {
    const fallback = inMemoryStorage()
    try {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        get: () => fallback,
      })
    } catch {
      // a host that will not even let us redefine the property: nothing more to do
      return false
    }
    return false
  }
}
