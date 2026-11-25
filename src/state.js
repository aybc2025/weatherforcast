// Single source of truth. `event` carries a monotonic nonce so observers can tell a new
// event from a re-render (animation layer reads it; logic never depends on it).
let nonce = 0;
const subs = new Set();
const s = { place: null, data: null, air: null, savedAt: 0, status: 'idle', offline: false, event: { kind: null, nonce: 0 } };
export const get = () => s;
export const subscribe = fn => { subs.add(fn); return () => subs.delete(fn); };
export function set(patch, kind) {
  Object.assign(s, patch);
  if (kind) s.event = { kind, nonce: ++nonce };
  subs.forEach(fn => fn(s));
}
