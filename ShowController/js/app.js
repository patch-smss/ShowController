import { store, channel } from '/js/store.js';
import { initMediaModule } from '/js/media.js';

let stageMod = null;
let pptMod = null;
let projectorWin = null;

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

const preloadedIds = new Set();

export async function preloadWebCue(index) {
  const cue = store.cues[index];
  if (!cue || (cue.kind !== 'youtube' && cue.kind !== 'canva')) return;
  await ensureProjectorOpen();

  // Mark as pre-loaded and open ONCE in standard Edge window
  preloadedIds.add(cue.id);
  window.open(buildDirectUrl(cue), '_blank');

  setTimeout(() => {
    if (projectorWin && !projectorWin.closed) projectorWin.focus();
  }, 400);
}




export async function triggerCue(index) {
  if (index < 0 || index >= store.cues.length) return;
  const cue = store.cues[index];
  store.setActive(cue.id);

  if (stageMod) stageMod.setIntermission(false);

  // PowerPoint Cue
  if (cue.kind === 'ppt') {
    if (stageMod) stageMod.setBlackout(true);
    channel.postMessage({ type: 'CUE', cue });
    if (pptMod) pptMod.sendPptCommand('launch_ppt', cue.src);
    return;
  }

  if (pptMod) pptMod.sendPptCommand('kill_ppt');
  await ensureProjectorOpen();

  // YouTube or Canva Cue -> Never opens a duplicate tab if already pre-loaded!
  if (cue.kind === 'youtube' || cue.kind === 'canva') {
    if (preloadedIds.has(cue.id)) {
      // Bring the existing Edge window with your pre-loaded tab to the front via Windows OS!
      fetch('/api/focus-browser').catch(() => {});
    } else {
      preloadedIds.add(cue.id);
      window.open(buildDirectUrl(cue), '_blank');
    }
    return;
  }

  // Local Image, Video, or Audio Cue -> Switches back to Tab 1 (Projector Output)
  if (stageMod && (cue.kind === 'image' || cue.kind === 'video')) {
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
  // Standard window features (keeps browser tab bar enabled on Monitor 2!)
  const features = `left=${s.x},top=${s.y},width=${s.w},height=${s.h}`;
  projectorWin = window.open('/projector.html', 'StageProjector', features);
}

export function endShow() {
  if (!confirm('End show, close all windows, and restore mirrored display?')) return;
  closeWebWindow();
  if (pptMod) pptMod.sendPptCommand('kill_ppt');
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

// 2. Load Phase 2 & 3 Modules Safely
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
})();

// 3. Media End Listener
channel.addEventListener('message', (e) => {
  if (e.data?.type === 'MEDIA_ENDED') {
    document.getElementById('now-title').textContent = '— (Finished)';
  }
});

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
