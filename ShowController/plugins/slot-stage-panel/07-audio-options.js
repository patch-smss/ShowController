export function init(container, ctx) {
  const box = document.createElement('div');
  box.className = 'control-box';
  box.innerHTML = `
    <strong style="font-size:11px; color:#94a3b8; text-transform:uppercase;">Audio Options (1.5s Fade)</strong>
    <label><input type="checkbox" id="chk-fade-in" checked> Fade In on Start</label>
    <label><input type="checkbox" id="chk-fade-out" checked> Fade Out on Stop / Next</label>
    <button id="btn-stop-audio" style="background:#334155; width:100%; margin-top:8px;">Stop Audio Now</button>
  `;

  const stopAudio = () => {
    ctx.channel.postMessage({ type: 'STOP_AUDIO', fadeOut: ctx.state.audioPrefs.fadeOut });
  };

  box.querySelector('#chk-fade-in').onchange = (e) => { ctx.state.audioPrefs.fadeIn = e.target.checked; };
  box.querySelector('#chk-fade-out').onchange = (e) => { ctx.state.audioPrefs.fadeOut = e.target.checked; };
  box.querySelector('#btn-stop-audio').onclick = stopAudio;

  container.appendChild(box);
  ctx.on('STOP_AUDIO', stopAudio);
}
