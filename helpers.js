// Returns the error code thrown by fn, or null if it did not throw.
export function codeOf(fn) {
  try {
    const out = fn();
    if (out && typeof out.then === 'function') return out.then(() => null, (e) => e.code ?? null);
    return null;
  } catch (e) {
    return e.code ?? null;
  }
}
