export function init(container, ctx) {
  const box = document.createElement('div');
  box.className = 'control-box';
  box.style.cssText = 'display:flex; align-items:center; gap:10px;';
  box.innerHTML = `
    <div id="qr-box" style="background:#fff; padding:4px; border-radius:6px; width:76px; height:76px; display:flex; align-items:center; justify-content:center; flex-shrink:0;"></div>
    <div style="font-size:12px; line-height:1.4; overflow:hidden; flex:1;">
      <strong style="color:#38bdf8;">Wi-Fi Phone Remote</strong><br>
      <span id="remote-url" style="color:#94a3b8; word-break:break-all;">Connecting...</span><br>
      <button id="btn-copy-remote" style="margin-top:4px; padding:3px 8px; font-size:11px; background:#334155;">Copy Link</button>
    </div>
  `;
  container.appendChild(box);

  fetch('/api/info').then(r => r.json()).then(data => {
    const url = `http://${data.ip}:${data.port}/remote.html`;
    box.querySelector('#remote-url').textContent = url;
    box.querySelector('#btn-copy-remote').onclick = () => navigator.clipboard?.writeText(url);

    const script = document.createElement('script');
    script.src = 'https://cloudflare.com';
    script.onload = () => {
      new window.QRCode(box.querySelector('#qr-box'), { text: url, width: 68, height: 68, correctLevel: window.QRCode.CorrectLevel.L });
    };
    script.onerror = () => {
      box.querySelector('#qr-box').innerHTML = '<span style="color:#0f172a;font-size:10px;font-weight:700;text-align:center;">OPEN URL<br>ON PHONE</span>';
    };
    document.head.appendChild(script);
  }).catch(() => {
    box.querySelector('#remote-url').textContent = 'Offline';
  });

  setInterval(async () => {
    try {
      const cmds = await (await fetch('/api/poll')).json();
      for (const cmd of cmds) {
        if (cmd.type === 'NEXT') ctx.actions.nextCue();
        if (cmd.type === 'PREV') ctx.actions.prevCue();
        if (cmd.type === 'BLACKOUT') ctx.emit('TOGGLE_BLACKOUT');
        if (cmd.type === 'INTERMISSION') ctx.emit('TOGGLE_INTERMISSION');
        if (cmd.type === 'FREEZE') ctx.emit('TOGGLE_FREEZE');
        if (cmd.type === 'STOP_AUDIO') ctx.emit('STOP_AUDIO');
        if (cmd.type === 'BACK_PROJ_TAB') ctx.actions.closeWebWindow();
        if (cmd.type === 'FOCUS_PROJ') ctx.actions.openProjector();
        if (cmd.type === 'PANIC') ctx.emit('TRIGGER_PANIC');
        if (cmd.type === 'ADD_LINK' && cmd.url) {
          const kind = /youtu\.be\/|youtube\.com\//i.test(cmd.url) ? 'youtube' : 'canva';
          ctx.store.addCue(cmd.url, kind, cmd.url);
          if (cmd.playNow) ctx.actions.triggerCue(ctx.store.cues.length - 1);
        }
      }
    } catch {}
  }, 600);
}
