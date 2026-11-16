import { store } from '/js/store.js';

export function initRemoteModule(actions) {
  const slot = document.getElementById('slot-remote');
  if (!slot) return;

  slot.innerHTML = `
    <div class="control-box" style="display:flex; align-items:center; gap:10px;">
      <div id="qr-box" style="background:#fff; padding:4px; border-radius:6px; width:76px; height:76px; display:flex; align-items:center; justify-content:center; flex-shrink:0;"></div>
      <div style="font-size:12px; line-height:1.4; overflow:hidden; flex:1;">
        <strong style="color:#38bdf8;">Wi-Fi Phone Remote</strong><br>
        <span id="remote-url" style="color:#94a3b8; word-break:break-all;">Connecting...</span><br>
        <button id="btn-copy-remote" style="margin-top:4px; padding:3px 8px; font-size:11px; background:#334155;">Copy Link</button>
      </div>
    </div>
  `;

  fetch('/api/info').then(r => r.json()).then(data => {
    const url = `http://${data.ip}:${data.port}/remote.html`;
    document.getElementById('remote-url').textContent = url;
    document.getElementById('btn-copy-remote').onclick = () => navigator.clipboard?.writeText(url);

    // Load tiny QR library with local text fallback
    const script = document.createElement('script');
    script.src = 'https://cloudflare.com';
    script.onload = () => {
      new window.QRCode(document.getElementById('qr-box'), {
        text: url,
        width: 68,
        height: 68,
        correctLevel: window.QRCode.CorrectLevel.L
      });
    };
    script.onerror = () => {
      document.getElementById('qr-box').innerHTML = '<span style="color:#0f172a;font-size:10px;font-weight:700;text-align:center;">OPEN URL<br>ON PHONE</span>';
    };
    document.head.appendChild(script);
  }).catch(() => {
    document.getElementById('remote-url').textContent = 'Offline';
  });

  setInterval(async () => {
    try {
      const res = await fetch('/api/poll');
      const cmds = await res.json();
      for (const cmd of cmds) {
        if (cmd.type === 'NEXT') actions.nextCue();
        if (cmd.type === 'PREV') actions.prevCue();
        if (cmd.type === 'BLACKOUT') actions.toggleBlackout();
        if (cmd.type === 'INTERMISSION') actions.toggleIntermission();
        if (cmd.type === 'FREEZE') actions.toggleFreeze();
        if (cmd.type === 'STOP_AUDIO') actions.stopAudioNow();
        if (cmd.type === 'BACK_PROJ_TAB') actions.closeWebWindow();
        if (cmd.type === 'FOCUS_PROJ') actions.openProjector();
        if (cmd.type === 'PANIC') actions.triggerPanic();
        if (cmd.type === 'ADD_LINK' && cmd.url) {
          const kind = /youtu\.be\/|youtube\.com\//i.test(cmd.url) ? 'youtube' : 'canva';
          store.addCue(cmd.url, kind, cmd.url);
          if (cmd.playNow) actions.triggerCue(store.cues.length - 1);
        }
      }
    } catch {}
  }, 600);
}
