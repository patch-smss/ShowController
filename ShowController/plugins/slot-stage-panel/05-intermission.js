export function init(container, ctx) {
  const interBtn = document.createElement('button');
  interBtn.id = 'btn-intermission';
  interBtn.className = 'btn-inter';
  interBtn.textContent = 'INTERMISSION (I)';

  const bgBtn = document.createElement('button');
  bgBtn.id = 'btn-set-intermission';
  bgBtn.style.cssText = 'background:#334155; font-size:12px;';
  bgBtn.textContent = 'Set Intermission / Backdrop Image...';

  const picker = document.createElement('input');
  picker.type = 'file';
  picker.accept = 'image/*';
  picker.style.display = 'none';

  const syncButton = () => {
    interBtn.classList.toggle('active', ctx.state.intermission);
  };

  const setIntermission = (active) => {
    ctx.state.intermission = active;
    if (active) {
      ctx.state.blackout = false;
      ctx.emit('SYNC_STAGE_BUTTONS');
    }
    syncButton();
    ctx.channel.postMessage({ type: 'INTERMISSION', active });
  };

  interBtn.onclick = () => setIntermission(!ctx.state.intermission);
  bgBtn.onclick = () => picker.click();
  picker.onchange = () => {
    const file = picker.files.item(0);
    if (!file) return;
    ctx.channel.postMessage({ type: 'SET_INTERMISSION_IMG', url: URL.createObjectURL(file) });
    bgBtn.textContent = 'Backdrop: ' + file.name;
    picker.value = '';
  };

  container.appendChild(interBtn);
  container.appendChild(bgBtn);
  container.appendChild(picker);

  ctx.on('CUE_TRIGGER', () => setIntermission(false));
  ctx.on('TOGGLE_INTERMISSION', () => setIntermission(!ctx.state.intermission));
  ctx.on('SYNC_STAGE_BUTTONS', syncButton);
  ctx.on('SHOW_ENDED', ({ endAction }) => {
    if (endAction === 'intermission') setIntermission(true);
  });

  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    if (e.key.toLowerCase() === 'i') setIntermission(!ctx.state.intermission);
  });
}
