import { store } from '/js/store.js';
import { initMediaModule } from '/js/media.js';

export const channel = new BroadcastChannel('show_controller_bus');

export function triggerCue(index) {
  if (index < 0 || index >= store.cues.length) return;
  const cue = store.cues[index];
  store.setActive(cue.id);
  channel.postMessage({ type: 'CUE', cue });
}

export function nextCue() {
  const idx = store.getActiveIndex();
  if (idx + 1 < store.cues.length) triggerCue(idx + 1);
}

export function prevCue() {
  const idx = store.getActiveIndex();
  if (idx - 1 >= 0) triggerCue(idx - 1);
}

export async function openProjector() {
  let s = { x: 80, y: 80, w: 1024, h: 600 };
  try {
    const res = await fetch('/api/screens');
    s = await res.json();
  } catch {}
  const features = `left=${s.x},top=${s.y},width=${s.w},height=${s.h},menubar=no,toolbar=no,location=no,status=no`;
  window.open('/projector.html', 'StageProjector', features);
}

export function endShow() {
  if (!confirm('End show, close all windows, and restore mirrored display?')) return;
  channel.postMessage({ type: 'SHUTDOWN' });
  fetch('/api/shutdown').catch(() => {});
}

// Initialize modules
store.onTrigger = triggerCue;
store.initPersistence();
initMediaModule();

// Wire stage navigation & exit buttons
document.getElementById('btn-next').onclick = nextCue;
document.getElementById('btn-prev').onclick = prevCue;
document.getElementById('btn-open-proj').onclick = openProjector;
document.getElementById('btn-end-show').onclick = endShow;

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
  if (['ArrowRight', 'PageDown', ' '].includes(e.key)) {
    e.preventDefault();
    if (document.activeElement) document.activeElement.blur();
    nextCue();
  }
  if (['ArrowLeft', 'PageUp'].includes(e.key)) {
    e.preventDefault();
    prevCue();
  }
});

// Listen for media completion from projector
channel.onmessage = (e) => {
  if (e.data?.type === 'MEDIA_ENDED') {
    document.getElementById('now-title').textContent = '— (Finished)';
  }
};

// Auto-close if Stop_Show.bat stops the server externally
setInterval(async () => {
  try {
    const res = await fetch('/api/screens');
    if (!res.ok) throw new Error();
  } catch {
    channel.postMessage({ type: 'SHUTDOWN' });
    window.close();
  }
}, 1500);
