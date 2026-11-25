import { toast } from './ui/toast.js';

let installEvent = null;
const installListeners = new Set();
export const canInstall = () => !!installEvent;
export const onInstallChange = fn => installListeners.add(fn);
export async function promptInstall() {
  if (!installEvent) return;
  installEvent.prompt();
  await installEvent.userChoice;
  installEvent = null;
  installListeners.forEach(fn => fn());
}
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvent = e; installListeners.forEach(fn => fn()); });
window.addEventListener('appinstalled', () => { installEvent = null; installListeners.forEach(fn => fn()); });

export async function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register('./sw.js');
    const offer = worker => toast('גרסה חדשה זמינה', { action: 'רענון', onAction: () => worker.postMessage('SKIP_WAITING') });
    if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w); });
    });
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloading) { reloading = true; location.reload(); } });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
  } catch (e) { console.warn('[sw]', e); }
}
