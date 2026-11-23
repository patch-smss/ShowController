// PC-only collapsible operator settings and global hotkey recorder
export function init(container, ctx) {
  const toggleBtn = document.createElement('button');
  toggleBtn.style.cssText = 'background:#334155; font-size:12px;';
  toggleBtn.textContent = 'Operator Settings [+]';

  const box = document.createElement('div');
  box.className = 'control-box';
  box.style.display = 'none';
  box.innerHTML = `
    <label style="justify-content:space-between;">Audio Fade (ms):
      <input type="number" id="set-fade" min="0" max="10000" step="100" style="width:80px;" />
    </label>
    <label><input type="checkbox" id="set-stop-vid" /> Auto-stop music on video</label>
    <label style="justify-content:space-between;">Aspect Ratio:
      <select id="set-aspect" style="width:95px; flex:none;"><option value="16:9">16:9</option><option value="4:3">4:3</option></select>
    </label>
    <label style="justify-content:space-between;">Image Fit:
      <select id="set-fit" style="width:95px; flex:none;"><option value="contain">Contain</option><option value="cover">Cover</option></select>
    </label>
    <label><input type="checkbox" id="set-confirm" /> Confirm Clear / End Show</label>
    <label style="justify-content:space-between;">Remote PIN:
      <input type="text" id="set-pin" placeholder="None" style="width:80px; flex:none;" />
    </label>
    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:4px; margin-top:8px;">
      <button type="button" data-hk="next" style="font-size:11px; padding:5px;">Next Key</button>
      <button type="button" data-hk="prev" style="font-size:11px; padding:5px;">Prev Key</button>
      <button type="button" data-hk="blackout" style="font-size:11px; padding:5px;">Black Key</button>
    </div>
    <div id="hk-err" style="color:#f87171; font-size:11px; margin-top:4px; display:none;"></div>
    <button id="btn-save-settings" style="background:#0284c7; width:100%; margin-top:8px;">Save Settings</button>
  `;

  container.appendChild(toggleBtn);
  container.appendChild(box);

  let cfg = { fadeMs: 1500, stopAudioOnVideo: false, aspectRatio: '16:9', imageFit: 'contain', confirmPrompts: true, remotePin: '', hotkeys: { next: 34, prev: 33, blackout: 190 } };
  const errEl = box.querySelector('#hk-err');

  const showErr = (msg) => {
    errEl.textContent = msg;
    errEl.style.display = msg ? 'block' : 'none';
  };

  const hasConflict = () => {
    const { next, prev, blackout } = cfg.hotkeys;
    if (next === prev) return 'Conflict: Next Key and Prev Key cannot be the same.';
    if (next === blackout) return 'Conflict: Next Key and Black Key cannot be the same.';
    if (prev === blackout) return 'Conflict: Prev Key and Black Key cannot be the same.';
    return '';
  };

  const syncForm = () => {
    box.querySelector('#set-fade').value = cfg.fadeMs;
    box.querySelector('#set-stop-vid').checked = !!cfg.stopAudioOnVideo;
    box.querySelector('#set-aspect').value = cfg.aspectRatio;
    box.querySelector('#set-fit').value = cfg.imageFit;
    box.querySelector('#set-confirm').checked = cfg.confirmPrompts !== false;
    box.querySelector('#set-pin').value = cfg.remotePin || '';
  };

  fetch('/api/settings').then(r => r.ok ? r.json() : null).then(data => {
    if (data) { Object.assign(cfg, data); Object.assign(ctx.state.settings, cfg); syncForm(); }
  }).catch(() => {});

  toggleBtn.onclick = () => {
    const open = box.style.display === 'none';
    box.style.display = open ? 'flex' : 'none';
    box.style.flexDirection = 'column';
    toggleBtn.textContent = open ? 'Operator Settings [-]' : 'Operator Settings [+]';
  };

  box.querySelectorAll('[data-hk]').forEach(btn => {
    btn.onclick = () => {
      const slot = btn.dataset.hk;
      btn.textContent = 'Press key...';
      const handler = (e) => {
        e.preventDefault(); e.stopPropagation();
        cfg.hotkeys[slot] = e.keyCode;
        btn.textContent = `${slot.toUpperCase()}: ${e.key}`;
        showErr(hasConflict());
        window.removeEventListener('keydown', handler, true);
      };
      window.addEventListener('keydown', handler, true);
    };
  });

  box.querySelector('#btn-save-settings').onclick = async () => {
    const conflict = hasConflict();
    if (conflict) { showErr(conflict); return; }
    showErr('');
    cfg.fadeMs = parseInt(box.querySelector('#set-fade').value, 10) || 0;
    cfg.stopAudioOnVideo = box.querySelector('#set-stop-vid').checked;
    cfg.aspectRatio = box.querySelector('#set-aspect').value;
    cfg.imageFit = box.querySelector('#set-fit').value;
    cfg.confirmPrompts = box.querySelector('#set-confirm').checked;
    cfg.remotePin = box.querySelector('#set-pin').value.trim();
    Object.assign(ctx.state.settings, cfg);
    ctx.state.audioPrefs.fadeMs = cfg.fadeMs;
    const res = await ctx.actions.pptPost('/api/settings', cfg);
    if (res?.ok) {
      box.querySelector('#btn-save-settings').textContent = 'Saved!';
      setTimeout(() => { box.querySelector('#btn-save-settings').textContent = 'Save Settings'; }, 1200);
    } else {
      showErr('Save failed - check that ps/settings-api.ps1 is loaded.');
    }
  };
}
