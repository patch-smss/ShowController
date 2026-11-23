import { store, channel } from '/js/store.js';
import { playAudioCue, stopAudio } from '/js/audio-engine.js';

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

async function pptPost(endpoint, body = {}) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

export async function triggerCue(index) {
  if (index < 0 || index >= store.cues.length) return;
  const cue = store.cues[index];
  ctx.state.finishedText = null;
  store.setActive(cue.id);
  ctx.emit('CUE_TRIGGER', { cue, index });

  if (cue.kind === 'audio') {
    playAudioCue(cue, ctx.state.audioPrefs, () => {
      ctx.state.finishedText = '-- (Finished)';
      ctx.emit('STORE_UPDATED');
    });
    return;
  }

  if (cue.kind === 'youtube' || cue.kind === 'canva') return;

  if (['ppt', 'image', 'video'].includes(cue.kind)) {
    if (!cue.startSlide) {
      const ins = await pptPost('/api/ppt/insert', { file: cue.src, kind: cue.kind });
      if (ins.ok) {
        cue.startSlide = ins.startSlide;
        cue.endSlide = ins.endSlide;
      }
    }
    if (cue.startSlide) {
      ctx.emit('SET_BLACKOUT', { active: false });
      await pptPost('/api/ppt/nav', { action: 'goto', slide: cue.startSlide });
    }
  }
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
  await pptPost('/api/ppt/init');
}

export async function endShow() {
  if (!confirm('End show, close all windows, and restore mirrored display?')) return;
  stopAudio(false);
  ctx.emit('END_SHOW');
  const tempFiles = store.cues.filter(c => c.tempFile).map(c => c.src);
  if (tempFiles.length > 0) {
    try { await pptPost('/api/cleanup-temp', { files: tempFiles }); } catch {}
  }
  fetch('/api/shutdown').catch(() => {});
}

ctx.actions = {
  triggerCue,
  nextCue,
  prevCue,
  openProjector,
  endShow,
  pptPost,
  stopAudio,
  ensureProjectorOpen: openProjector,
  getProjectorWin: () => null,
  closeWebWindow: () => fetch('/api/focus-browser').catch(() => {}),
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

ctx.on('STOP_AUDIO', () => stopAudio(ctx.state.audioPrefs.fadeOut));
ctx.on('PANIC', () => stopAudio(false));

setInterval(async () => {
  try { if (!(await fetch('/api/screens')).ok) throw new Error(); }
  catch { window.close(); }
}, 1500);
