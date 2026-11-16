import { channel } from '/js/app.js';

let isBlackout = true;
let isIntermission = false;

export function getAudioPrefs() {
  const fadeInEl = document.getElementById('chk-fade-in');
  const fadeOutEl = document.getElementById('chk-fade-out');
  return {
    fadeIn: fadeInEl ? fadeInEl.checked : true,
    fadeOut: fadeOutEl ? fadeOutEl.checked : true
  };
}

export function getEndAction() {
  const sel = document.getElementById('sel-end-action');
  return sel ? sel.value : 'stay';
}

export function setBlackout(active) {
  isBlackout = active;
  if (isBlackout) isIntermission = false;
  updateStageButtons();
  channel.postMessage({ type: 'BLACKOUT', active: isBlackout });
}

export function toggleBlackout() {
  setBlackout(!isBlackout);
}

export function setIntermission(active) {
  isIntermission = active;
  if (isIntermission) isBlackout = false;
  updateStageButtons();
  channel.postMessage({ type: 'INTERMISSION', active: isIntermission });
}

export function toggleIntermission() {
  setIntermission(!isIntermission);
}

export function stopAudioNow() {
  channel.postMessage({ type: 'STOP_AUDIO', fadeOut: getAudioPrefs().fadeOut });
}

export function triggerPanic() {
  isBlackout = true;
  isIntermission = false;
  updateStageButtons();
  channel.postMessage({ type: 'PANIC' });
}

function updateStageButtons() {
  const bBtn = document.getElementById('btn-blackout');
  if (bBtn) {
    bBtn.textContent = 'BLACKOUT: ' + (isBlackout ? 'ON (B)' : 'OFF (B)');
    bBtn.classList.toggle('active', isBlackout);
  }
  const iBtn = document.getElementById('btn-intermission');
  if (iBtn) {
    iBtn.classList.toggle('active', isIntermission);
  }
}

export function initStageModule() {
  const slot = document.getElementById('slot-stage');
  if (!slot) return;

  slot.innerHTML = `
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 6px;">
      <button id="btn-blackout" class="btn-black active">BLACKOUT: ON (B)</button>
      <button id="btn-intermission" class="btn-inter">INTERMISSION (I)</button>
    </div>

    <button id="btn-set-intermission" style="background:#334155; font-size:12px;">
      Set Intermission / Backdrop Image...
    </button>
    <input type="file" id="intermission-picker" accept="image/*" style="display:none" />

    <div class="control-box">
      <strong style="font-size:11px; color:#94a3b8; text-transform:uppercase; display:block; margin-bottom:6px;">After Last Cue (End of Show)</strong>
      <select id="sel-end-action" style="width:100%;">
        <option value="stay">Stay on Current Screen</option>
        <option value="intermission" selected>Show Intermission / Backdrop</option>
        <option value="blackout">Go to Blackout</option>
      </select>
    </div>

    <div class="control-box">
      <strong style="font-size:11px; color:#94a3b8; text-transform:uppercase;">Audio Options (1.5s Fade)</strong>
      <label><input type="checkbox" id="chk-fade-in" checked> Fade In on Start</label>
      <label><input type="checkbox" id="chk-fade-out" checked> Fade Out on Stop / Next</label>
      <button id="btn-stop-audio" style="background:#334155; width:100%; margin-top:8px;">Stop Audio Now</button>
    </div>

    <button id="btn-panic" class="btn-panic">PANIC / EMERGENCY BLACKOUT</button>
  `;

  document.getElementById('btn-blackout').onclick = toggleBlackout;
  document.getElementById('btn-intermission').onclick = toggleIntermission;
  document.getElementById('btn-stop-audio').onclick = stopAudioNow;
  document.getElementById('btn-panic').onclick = triggerPanic;

  const interPicker = document.getElementById('intermission-picker');
  document.getElementById('btn-set-intermission').onclick = () => interPicker.click();
  interPicker.onchange = () => {
    const file = interPicker.files[0];
    if (!file) return;
    const blobUrl = URL.createObjectURL(file);
    channel.postMessage({ type: 'SET_INTERMISSION_IMG', url: blobUrl });
    document.getElementById('btn-set-intermission').textContent = 'Backdrop: ' + file.name;
    interPicker.value = '';
  };

  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    if (e.key.toLowerCase() === 'b' || e.key === '.') toggleBlackout();
    if (e.key.toLowerCase() === 'i') toggleIntermission();
  });
}
