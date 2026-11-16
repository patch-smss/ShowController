import { store } from '/js/store.js';

export function initEmbedsModule() {
  const slot = document.getElementById('slot-embeds');
  if (!slot) return;

  slot.innerHTML = `
    <div class="toolbar-row" style="flex-wrap:wrap;">
      <input type="text" id="url-input" placeholder="Paste YouTube or Canva link..." />
      <input type="number" id="yt-start" placeholder="Start(s)" min="0" style="width:74px;" title="Start Seconds" />
      <input type="number" id="yt-end" placeholder="End(s)" min="0" style="width:74px;" title="End Seconds" />
      <label style="display:flex;align-items:center;gap:4px;font-size:12px;color:#cbd5e1;">
        <input type="checkbox" id="yt-loop"> Loop
      </label>
      <button id="btn-add-url">+ Add Link</button>
    </div>
  `;

  document.getElementById('btn-add-url').onclick = () => {
    const urlInput = document.getElementById('url-input');
    const rawUrl = urlInput.value.trim();
    if (!rawUrl) return;

    const isYouTube = /youtu\.be\/|youtube\.com\//i.test(rawUrl);
    const kind = isYouTube ? 'youtube' : 'canva';

    const start = document.getElementById('yt-start').value.trim();
    const end = document.getElementById('yt-end').value.trim();
    const loop = document.getElementById('yt-loop').checked;

    const metaParts = [];
    if (start) metaParts.push(`${start}s`);
    if (end) metaParts.push(`to ${end}s`);
    if (loop) metaParts.push('loop');
    const displayName = metaParts.length ? `${rawUrl} [${metaParts.join(', ')}]` : rawUrl;

    store.addCue(displayName, kind, rawUrl, { start, end, loop });

    urlInput.value = '';
    document.getElementById('yt-start').value = '';
    document.getElementById('yt-end').value = '';
    document.getElementById('yt-loop').checked = false;
  };
}
