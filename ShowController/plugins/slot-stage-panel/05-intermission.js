let backdropFile = null;
let intermissionSlideIdx = null;
let prevSlideBeforeIntermission = 1;

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

  const syncButton = () => interBtn.classList.toggle('active', ctx.state.intermission);

  const setIntermission = async (active) => {
    ctx.state.intermission = active;
    if (active) {
      ctx.state.blackout = false;
      ctx.emit('SYNC_STAGE_BUTTONS');
      try {
        const st = await (await fetch('/api/ppt/sync')).json();
        if (st.ok && st.current && st.current !== intermissionSlideIdx) {
          prevSlideBeforeIntermission = st.current;
        }
      } catch {}
      const res = await ctx.actions.pptPost('/api/ppt/intermission', { file: backdropFile, show: true });
      if (res.ok) intermissionSlideIdx = res.slide;
    } else {
      const activeCue = ctx.store.cues[ctx.store.getActiveIndex()];
      const target = prevSlideBeforeIntermission || activeCue?.startSlide || 1;
      await ctx.actions.pptPost('/api/ppt/nav', { action: 'goto', slide: target });
    }
    syncButton();
  };

  interBtn.onclick = () => setIntermission(!ctx.state.intermission);
  bgBtn.onclick = () => picker.click();
  picker.onchange = async () => {
    const file = picker.files.item(0);
    if (!file) return;
    const up = await fetch('/api/upload-media', {
      method: 'POST',
      headers: { 'X-Filename': encodeURIComponent(file.name) },
      body: file
    });
    if (up.ok) {
      backdropFile = file.name;
      bgBtn.textContent = 'Backdrop: ' + file.name;
      const res = await ctx.actions.pptPost('/api/ppt/intermission', { file: backdropFile, show: ctx.state.intermission });
      if (res.ok) intermissionSlideIdx = res.slide;
    }
    picker.value = '';
  };

  container.appendChild(interBtn);
  container.appendChild(bgBtn);
  container.appendChild(picker);

  ctx.on('CUE_TRIGGER', () => { ctx.state.intermission = false; syncButton(); });
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
