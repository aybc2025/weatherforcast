export const readStr = k => { try { return localStorage.getItem(k); } catch { return null; } };
export const writeStr = (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable or full */ } };
export const removeKey = k => { try { localStorage.removeItem(k); } catch { /* ignore */ } };
export const readJson = (k, fallback = null) => { try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } };
export const writeJson = (k, v) => writeStr(k, JSON.stringify(v));
