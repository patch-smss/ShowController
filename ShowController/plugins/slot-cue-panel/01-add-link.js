const webTabs = new Map();

function buildDirectUrl(cue) {
  if (cue.kind === 'youtube') {
    const match = cue.src.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([^&?#/]+)/);
    const vidId = match ? match.at(1) : null;
    if (vidId && (cue.end || cue.loop)) {
      let params = 'autoplay=1&rel=0';
      if (cue.start) params += `&start=${parseInt(cue.start, 10)}`;
      if (cue.end) params += `&end=${parseInt(cue.end, 10)}`;
      if (cue.loop) params += `&loop=1&playlist=${vidId}`;
      return `https://youtube.com{vidId}?${params}`;
    }
    let url = cue.src;
    if (cue.start) url += `${url.includes('?') ? '&' : '?'}t=${parseInt(cue.start, 10)}s`;
    return url;
  }
  return cue.src;
}

export function init(container, ctx) {
  const row = document.createElement('div');
  row.className = 'toolbar-row';
  row.innerHTML = `
    <input type="text" id="url-input" placeholder="Paste YouTube or Canva link..." />
    <button id="btn-add-url">+ Add Link</button>
  `;
  container.appendChild(row);

  row.querySelector('#btn-add-url').onclick = () => {
    const input = row.querySelector('#url-input');
    const rawUrl = input.value.trim();
    if (!rawUrl) return;
    const kind = /youtu\.be\/|youtube\.com\//i.test(rawUrl) ? 'youtube' : 'canva';
    ctx.store.addCue(rawUrl, kind, rawUrl);
    input.value = '';
  };

  ctx.on('CUE_PRELOAD', ({ cue }) => {
    if (cue.kind !== 'youtube' && cue.kind !== 'canva') return;
    const tab = window.open(buildDirectUrl(cue), 'tab_' + cue.id);
    if (tab) webTabs.set(cue.id, tab);
    ctx.actions.ensureProjectorOpen().then(() => {
      setTimeout(() => {
        const win = ctx.actions.getProjectorWin();
        if (win && !win.closed) win.focus();
      }, 300);
    });
  });

  ctx.on('CUE_TRIGGER', ({ cue }) => {
    if (cue.kind !== 'youtube' && cue.kind !== 'canva') return;
    let tab = webTabs.get(cue.id);
    if (tab && !tab.closed) tab.focus();
    else {
      tab = window.open(buildDirectUrl(cue), 'tab_' + cue.id);
      if (tab) webTabs.set(cue.id, tab);
    }
  });

  ctx.on('END_SHOW', () => {
    webTabs.forEach(tab => { try { if (tab && !tab.closed) tab.close(); } catch {} });
    webTabs.clear();
  });
}
