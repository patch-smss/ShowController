import { store, channel } from '/js/store.js';

let isFrozen = false;

export async function sendPptCommand(action, file = '') {
  try {
    const res = await fetch('/api/ppt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, file })
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'PowerPoint error');
    }
  } catch {
    console.warn('Bridge offline for PPT command');
  }
}

export function toggleFreeze() {
  isFrozen = !isFrozen;
  const fBtn = document.getElementById('btn-freeze');
  if (fBtn) {
    fBtn.textContent = isFrozen ? 'UNFREEZE (F)' : 'FREEZE (F)';
    fBtn.style.background = isFrozen ? '#0284c7' : '';
  }
  channel.postMessage({ type: 'FREEZE', active: isFrozen });
}

export function initPptModule() {
  const picker = document.getElementById('file-picker');
  if (picker && picker.parentElement) {
    const pptBtn = document.createElement('button');
    pptBtn.textContent = '+ PowerPoint';
    pptBtn.title = 'Select a .ppt or .pptx file placed inside your ShowController\\Media folder';
    pptBtn.style.background = '#b45309';

    const pptInput = document.createElement('input');
    pptInput.type = 'file';
    pptInput.accept = '.ppt,.pptx';
    pptInput.style.display = 'none';

    pptBtn.onclick = () => pptInput.click();
    pptInput.onchange = () => {
      for (const file of pptInput.files) {
        store.addCue(file.name, 'ppt', file.name);
      }
      pptInput.value = '';
    };

    picker.parentElement.appendChild(pptBtn);
    picker.parentElement.appendChild(pptInput);
  }

  const stageSlot = document.getElementById('slot-stage');
  if (stageSlot) {
    const freezeBtn = document.createElement('button');
    freezeBtn.id = 'btn-freeze';
    freezeBtn.textContent = 'FREEZE (F)';
    stageSlot.insertBefore(freezeBtn, stageSlot.firstChild);
    freezeBtn.onclick = toggleFreeze;
  }

  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    if (e.key.toLowerCase() === 'f') toggleFreeze();
  });
}
