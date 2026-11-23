import { store, channel } from '/js/store.js';

let projectorWin = null;
const listeners = new Map();

const ctx = {
  store,
  channel,
  state: {
    blackout: true,
    intermission: false,
    endAction: 'intermission',
    audioPrefs: { fadeIn: true, fadeOut: true },
    finishedText: null
  },
  on(event, fn) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
  },
  emit(event, payload = {}) {
    listeners.get(event)?.forEach(fn => {
      try { fn(payload); } catch (err) { console.error(`Plugin error [${event}]:`, err); }
    });
  },
  actions: {}
};

store.onChange = () => ctx.emit('STORE_UPDATED');

async function ensureProjectorOpen() {
  if (!projectorWin || projectorWin.closed) {
    await openProjector();
    await new Promise(r => setTimeout(r, 600));
  }
}

export async function triggerCue(index) {
  if (index < 0 || index >= store.cues.length) return;
  const cue = store.cues[index];
  ctx.state.finishedText = null;
  store.setActive(cue.id);
  ctx.emit('CUE_TRIGGER', { cue, index });

  if (cue.kind === 'ppt') {
    ctx.emit('SET_BLACKOUT', { active: true });
    channel.postMessage({ type: 'CUE', cue });
    return;
  }
  if (cue.kind === 'youtube' || cue.kind === 'canva') return;

  await ensureProjectorOpen();
  if (['image', 'video', 'pdf'].includes(cue.kind)) {
    ctx.emit('SET_BLACKOUT', { active: false });
  }
  channel.postMessage({ type: 'CUE', cue, ...ctx.state.audioPrefs });
}

export function nextCue() {
  if (store.isAtEnd) return;
  const idx = store.getActiveIndex();
  if (idx + 1 < store.cues.length) {
    triggerCue(idx + 1);
  } else if (store.cues.length > 0) {
    store.isAtEnd = true;
    ctx.emit('SHOW_ENDED', { endAction: ctx.state.endAction });
  }
}

export function prevCue() {
  const idx = store.getActiveIndex();
  if (store.isAtEnd && idx >= 0) return triggerCue(idx);
  if (idx - 1 >= 0) triggerCue(idx - 1);
}

export async function openProjector() {
  if (projectorWin && !projectorWin.closed) { projectorWin.focus(); return; }
  let s = { x: 80, y: 80, w: 1024, h: 600 };
  try { s = await (await fetch('/api/screens')).json(); } catch {}
  projectorWin = window.open('/projector.html', 'StageProjector', `left=${s.x},top=${s.y},width=${s.w},height=${s.h}`);
}

export async function endShow() {
  if (!confirm('End show, close all windows, and restore mirrored display?')) return;
  ctx.emit('END_SHOW');
  const tempPpts = store.cues.filter(c => c.kind === 'ppt' && c.tempPpt).map(c => c.src);
  if (tempPpts.length > 0) {
    try {
      await fetch('/api/cleanup-temp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: tempPpts })
      });
    } catch {}
  }
  channel.postMessage({ type: 'SHUTDOWN' });
  fetch('/api/shutdown').catch(() => {});
}

ctx.actions = {
  triggerCue,
  nextCue,
  prevCue,
  openProjector,
  ensureProjectorOpen,
  endShow,
  getProjectorWin: () => projectorWin,
  closeWebWindow: () => channel.postMessage({ type: 'FOCUS_PROJECTOR_TAB' }),
  preloadCue: (index) => {
    const cue = store.cues[index];
    if (cue) ctx.emit('CUE_PRELOAD', { cue, index });
  }
};

(async () => {
  try {
    const manifest = await (await fetch('/api/plugins')).json();
    for (const [zoneId, urls] of Object.entries(manifest)) {
      const container = document.getElementById(zoneId);
      if (!container) continue;
      for (const url of urls) {
        try {
          const mod = await import(url);
          if (typeof mod.init === 'function') await mod.init(container, ctx);
        } catch (err) { console.error(`Failed loading plugin ${url}:`, err); }
      }
    }
    ctx.emit('STORE_UPDATED');
  } catch (err) { console.error('Plugin manifest error:', err); }
})();

channel.addEventListener('message', (e) => {
  if (e.data?.type === 'MEDIA_ENDED') {
    ctx.state.finishedText = '-- (Finished)';
    ctx.emit('STORE_UPDATED');
  }
});

setInterval(async () => {
  try { if (!(await fetch('/api/screens')).ok) throw new Error(); }
  catch { channel.postMessage({ type: 'SHUTDOWN' }); window.close(); }
}, 1500);
