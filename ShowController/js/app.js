import { store, channel } from '/js/store.js';
import { initMediaModule } from '/js/media.js';

let stageMod = null;
let pptMod = null;
let projectorWin = null;
const webTabs = new Map();

export function closeWebWindow() {
  channel.postMessage({ type: 'FOCUS_PROJECTOR_TAB' });
}

function buildDirectUrl(cue) {
  if (cue.kind === 'youtube') {
    const match = cue.src.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([^&?#/]+)/);
    const vidId = match ? match.at(1) : null;

    if (vidId && (cue.end || cue.loop)) {
      let params = 'autoplay=1&rel=0';
      if (cue.start) params += `&start=${parseInt(cue.start, 10)}`;
      if (cue.end) params += `&end=${parseInt(cue.end, 10)}`;
      if (cue.loop) params += `&loop=1&playlist=${vidId}`;
      return `https://youtube.com{vidId}?${params}`;
    }

    let url = cue.src;
    if (cue.start) {
      const sep = url.includes('?') ? '&' : '?';
      url += `${sep}t=${parseInt(cue.start, 10)}s`;
    }
    return url;
  }
  return cue.src;
}

async function ensureProjectorOpen() {
  if (!projectorWin || projectorWin.closed) {
    await openProjector();
    await new Promise(r => setTimeout(r, 600));
  }
}

export function preloadWebCue(index) {
  const cue = store.cues[index];
  if (!cue || (cue.kind !== 'youtube' && cue.kind !== 'canva')) return;

  // Open synchronously inside the click gesture so Edge never blocks Canva/YouTube
  const tab = window.open(buildDirectUrl(cue), 'tab_' + cue.id);
  if (tab) webTabs.set(cue.id, tab);

  // Ensure projector is open and return focus to it without blocking the popup gesture
  ensureProjectorOpen().then(() => {
    setTimeout(() => {
      if (projectorWin && !projectorWin.closed) projectorWin.focus();
    }, 300);
  });
}

export async function triggerCue(index) {
  if (index < 0 || index >= store.cues.length) return;
  const cue = store.cues[index];
  store.setActive(cue.id);

  if (stageMod) stageMod.setIntermission(false);

  if (cue.kind === 'ppt') {
    if (stageMod) stageMod.setBlackout(true);
    channel.postMessage({ type: 'CUE', cue });
    if (pptMod) pptMod.sendPptCommand('launch_ppt', cue.src);
    return;
  }

  if (pptMod) pptMod.sendPptCommand('kill_ppt');

  if (cue.kind === 'youtube' || cue.kind === 'canva') {
    let tab = webTabs.get(cue.id);
    if (tab && !tab.closed) {
      tab.focus();
    } else {
      tab = window.open(buildDirectUrl(cue), 'tab_' + cue.id);
      if (tab) webTabs.set(cue.id, tab);
    }
    return;
  }

  await ensureProjectorOpen();

  if (stageMod && ['image', 'video', 'pdf'].includes(cue.kind)) {
    stageMod.setBlackout(false);
  }

  const audioPrefs = stageMod ? stageMod.getAudioPrefs() : { fadeIn: true, fadeOut: true };
  channel.postMessage({
    type: 'CUE',
    cue,
    ...audioPrefs
  });
}

export function nextCue() {
  if (store.isAtEnd) return;
  const idx = store.getActiveIndex();

  if (idx + 1 < store.cues.length) {
    triggerCue(idx + 1);
  } else if (store.cues.length > 0) {
    if (pptMod) pptMod.sendPptCommand('kill_ppt');
    store.isAtEnd = true;

    const endAction = stageMod ? stageMod.getEndAction() : 'stay';
    if (endAction === 'intermission' && stageMod) {
      stageMod.setIntermission(true);
      document.getElementById('now-title').textContent = 'Intermission / Backdrop';
    } else if (endAction === 'blackout' && stageMod) {
      stageMod.setBlackout(true);
      document.getElementById('now-title').textContent = 'Blackout';
    }
  }
}

export function prevCue() {
  const idx = store.getActiveIndex();
  if (store.isAtEnd && idx >= 0) {
    triggerCue(idx);
    return;
  }
  if (idx - 1 >= 0) {
    triggerCue(idx - 1);
  }
}

export async function openProjector() {
  if (projectorWin && !projectorWin.closed) {
    projectorWin.focus();
    return;
  }
  let s = { x: 80, y: 80, w: 1024, h: 600 };
  try {
    const res = await fetch('/api/screens');
    s = await res.json();
  } catch {}
  const features = `left=${s.x},top=${s.y},width=${s.w},height=${s.h}`;
  projectorWin = window.open('/projector.html', 'StageProjector', features);
}

export async function endShow() {
  if (!confirm('End show, close all windows, and restore mirrored display?')) return;
  if (pptMod) pptMod.sendPptCommand('kill_ppt');

  webTabs.forEach(tab => {
    try { if (tab && !tab.closed) tab.close(); } catch {}
  });
  webTabs.clear();

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

// 1. Wire Core Controls
store.onTrigger = triggerCue;
store.onPreload = preloadWebCue;
store.initPersistence();
initMediaModule();

document.getElementById('btn-next').onclick = nextCue;
document.getElementById('btn-prev').onclick = prevCue;
document.getElementById('btn-open-proj').onclick = openProjector;
document.getElementById('btn-end-show').onclick = endShow;

// 2. Load Phase 2, 3 & 4 Modules Safely
(async () => {
  try {
    stageMod = await import('/js/stage.js');
    stageMod.initStageModule();
    stageMod.setCloseWebHandler(closeWebWindow);
  } catch (err) { console.error('Stage module error:', err); }

  try {
    const embedsMod = await import('/js/embeds.js');
    embedsMod.initEmbedsModule();
  } catch (err) { console.error('Embeds module error:', err); }

  try {
    pptMod = await import('/js/ppt.js');
    pptMod.initPptModule();
  } catch (err) { console.error('PPT module error:', err); }

  try {
    const remoteMod = await import('/js/remote.js');
    remoteMod.initRemoteModule({
      triggerCue,
      nextCue,
      prevCue,
      closeWebWindow,
      openProjector,
      toggleBlackout: () => stageMod && stageMod.toggleBlackout(),
      toggleIntermission: () => stageMod && stageMod.toggleIntermission(),
      stopAudioNow: () => stageMod && stageMod.stopAudioNow(),
      triggerPanic: () => { if (pptMod) pptMod.sendPptCommand('kill_ppt'); if (stageMod) stageMod.triggerPanic(); },
      toggleFreeze: () => pptMod && pptMod.toggleFreeze()
    });
  } catch (err) { console.error('Remote module error:', err); }
})();

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
  if (e.key.toLowerCase() === 'p') {
    e.preventDefault();
    openProjector();
  }
});

channel.addEventListener('message', (e) => {
  if (e.data?.type === 'MEDIA_ENDED') {
    document.getElementById('now-title').textContent = '— (Finished)';
  }
});

setInterval(async () => {
  try {
    const res = await fetch('/api/screens');
    if (!res.ok) throw new Error();
  } catch {
    channel.postMessage({ type: 'SHUTDOWN' });
    window.close();
  }
}, 1500);
