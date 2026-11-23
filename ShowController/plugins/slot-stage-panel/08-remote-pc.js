import { detectMediaKind } from '/js/media.js';

export function init(container, ctx) {
  const box = document.createElement('div');
  box.className = 'control-box';
  box.style.cssText = 'display:flex; align-items:center; gap:10px;';
  box.innerHTML = `
    <div id="qr-box" style="background:#fff; padding:4px; border-radius:6px; width:76px; height:76px; display:flex; align-items:center; justify-content:center; flex-shrink:0; overflow:hidden;"></div>
    <div style="font-size:12px; line-height:1.4; overflow:hidden; flex:1;">
      <strong style="color:#38bdf8;">Wi-Fi Phone Remote</strong><br>
      <span id="remote-url" style="color:#94a3b8; word-break:break-all;">Connecting...</span><br>
      <button id="btn-copy-remote" style="margin-top:4px; padding:3px 8px; font-size:11px; background:#334155;">Copy Link</button>
    </div>
  `;
  container.appendChild(box);

  fetch('/api/info').then(r => r.json()).then(async data => {
    const url = `http://${data.ip}:${data.port}/remote.html`;
    box.querySelector('#remote-url').textContent = url;
    box.querySelector('#btn-copy-remote').onclick = () => navigator.clipboard?.writeText(url);

    const qrRes = await (await fetch('/api/qr-image')).json();
    if (qrRes.url) {
      box.querySelector('#qr-box').innerHTML = `<img src="${qrRes.url}" style="width:100%; height:100%; object-fit:contain;" alt="QR" />`;
      return;
    }
    box.querySelector('#qr-box').innerHTML = '<span style="color:#0f172a;font-size:10px;font-weight:700;text-align:center;">OPEN URL<br>ON PHONE</span>';
  }).catch(() => { box.querySelector('#remote-url').textContent = 'Offline'; });

  setInterval(async () => {
    try {
      const cmds = await (await fetch('/api/poll')).json();
      for (const cmd of cmds) {
        if (cmd.type === 'NEXT') ctx.actions.nextCue();
        if (cmd.type === 'PREV') ctx.actions.prevCue();
        if (cmd.type === 'GOTO_PAGE' && cmd.page >= 1) {
          ctx.emit('SET_BLACKOUT', { active: false });
          ctx.actions.pptPost('/api/ppt/nav', { action: 'goto', slide: cmd.page + 1 });
        }
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
        if (cmd.type === 'ADD_MEDIA' && cmd.file) {
          const ext = cmd.file.split('.').pop().toLowerCase();
          const kind = ['ppt', 'pptx'].includes(ext) ? 'ppt' : detectMediaKind(cmd.file);
          if (!kind) continue;
          if (kind === 'audio') {
            ctx.store.addCue(cmd.file, 'audio', cmd.file, { tempFile: true });
          } else {
            const ins = await ctx.actions.pptPost('/api/ppt/insert', { file: cmd.file, kind });
            ctx.store.addCue(cmd.file, kind, cmd.file, { tempFile: true, startSlide: ins.startSlide, endSlide: ins.endSlide });
          }
          if (cmd.playNow) ctx.actions.triggerCue(ctx.store.cues.length - 1);
        }
      }
    } catch {}
  }, 600);
}
