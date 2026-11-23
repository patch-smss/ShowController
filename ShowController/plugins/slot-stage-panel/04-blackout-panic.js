async function syncPptBlackout(active) {
  try {
    await fetch('/api/ppt/nav', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'blackout', active })
    });
  } catch {}
}

export function init(container, ctx) {
  const blackBtn = document.createElement('button');
  blackBtn.id = 'btn-blackout';
  blackBtn.className = 'btn-black active';
  blackBtn.textContent = 'BLACKOUT: ON (B)';

  const panicBtn = document.createElement('button');
  panicBtn.id = 'btn-panic';
  panicBtn.className = 'btn-panic';
  panicBtn.textContent = 'PANIC / EMERGENCY BLACKOUT';

  const syncButton = () => {
    blackBtn.textContent = 'BLACKOUT: ' + (ctx.state.blackout ? 'ON (B)' : 'OFF (B)');
    blackBtn.classList.toggle('active', ctx.state.blackout);
  };

  const setBlackout = (active) => {
    ctx.state.blackout = active;
    if (active) {
      ctx.state.intermission = false;
      ctx.emit('SYNC_STAGE_BUTTONS');
    }
    syncButton();
    ctx.channel.postMessage({ type: 'BLACKOUT', active });
    syncPptBlackout(active);
  };

  const triggerPanic = () => {
    setBlackout(true);
    ctx.channel.postMessage({ type: 'PANIC' });
    ctx.emit('PANIC');
  };

  blackBtn.onclick = () => setBlackout(!ctx.state.blackout);
  panicBtn.onclick = triggerPanic;

  container.appendChild(blackBtn);
  container.appendChild(panicBtn);

  ctx.on('SET_BLACKOUT', ({ active }) => setBlackout(active));
  ctx.on('TOGGLE_BLACKOUT', () => setBlackout(!ctx.state.blackout));
  ctx.on('TRIGGER_PANIC', triggerPanic);
  ctx.on('SYNC_STAGE_BUTTONS', syncButton);
  ctx.on('SHOW_ENDED', ({ endAction }) => {
    if (endAction === 'blackout') setBlackout(true);
  });

  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    if (e.key.toLowerCase() === 'b' || e.key === '.') setBlackout(!ctx.state.blackout);
  });
}
