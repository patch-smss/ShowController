export function init(container, ctx) {
  let enabled = true;

  const btn = document.createElement('button');
  btn.id = 'btn-global-hotkeys';
  btn.style.cssText = 'background:#0f766e; font-size:12px;';
  btn.textContent = 'Clicker Hotkeys: ON';

  const render = () => {
    btn.textContent = 'Clicker Hotkeys: ' + (enabled ? 'ON' : 'OFF');
    btn.style.background = enabled ? '#0f766e' : '#334155';
  };

  btn.onclick = async () => {
    enabled = !enabled;
    render();
    try {
      await fetch('/api/hotkeys/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
    } catch {}
  };

  container.appendChild(btn);

  setInterval(async () => {
    if (!enabled) return;
    try {
      const cmds = await (await fetch('/api/hotkeys/poll')).json();
      for (const act of cmds) {
        if (act === 'NEXT') ctx.actions.nextCue();
        if (act === 'PREV') ctx.actions.prevCue();
        if (act === 'BLACKOUT') ctx.emit('TOGGLE_BLACKOUT');
      }
    } catch {}
  }, 150);
}
