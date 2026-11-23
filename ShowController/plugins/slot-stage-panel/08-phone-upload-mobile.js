// Mobile-only plugin to upload local media or push web links to the host queue
export function init(container, ctx) {
  const box = document.createElement('div');
  box.className = 'control-box';
  box.innerHTML = `
    <strong style="font-size:11px; color:#94a3b8; text-transform:uppercase;">Upload Photo / Video / Audio / PPTX</strong>
    <input type="file" id="phone-file" accept="image/*,video/*,audio/*,.ppt,.pptx" style="margin-top:6px; width:100%;" />
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:6px;">
      <button id="btn-up-queue">+ Add to Queue</button>
      <button id="btn-up-play" style="background:#0284c7;">Upload &amp; Play</button>
    </div>
    <strong style="font-size:11px; color:#94a3b8; text-transform:uppercase; display:block; margin-top:10px;">Push YouTube / Canva Link</strong>
    <input type="text" id="phone-link" placeholder="Paste YouTube or Canva link..." style="margin-top:6px; width:100%;" />
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:6px;">
      <button id="btn-link-queue">+ Add Link</button>
      <button id="btn-link-play" style="background:#7c3aed;">Open Now</button>
    </div>
  `;
  container.appendChild(box);

  const upload = async (playNow) => {
    const file = box.querySelector('#phone-file').files[0];
    if (!file) return ctx.actions.toast('Select a file first', true);
    ctx.actions.toast('Uploading ' + file.name + '...');
    const res = await fetch('/api/phone-upload', {
      method: 'POST',
      headers: {
        'X-Filename': encodeURIComponent(file.name),
        'X-Pin': ctx.actions.getPin(),
        'X-PlayNow': playNow ? '1' : '0'
      },
      body: file
    });
    if (res.status === 401) return ctx.actions.toast('Invalid Remote PIN', true);
    if (!res.ok) return ctx.actions.toast('Upload failed', true);
    box.querySelector('#phone-file').value = '';
    ctx.actions.toast(playNow ? 'Playing: ' + file.name : 'Queued: ' + file.name);
  };

  const pushLink = (playNow) => {
    const inp = box.querySelector('#phone-link');
    const url = inp.value.trim();
    if (!url) return;
    ctx.actions.sendCmd({ type: 'ADD_LINK', url, playNow });
    inp.value = '';
  };

  box.querySelector('#btn-up-queue').onclick = () => upload(false);
  box.querySelector('#btn-up-play').onclick = () => upload(true);
  box.querySelector('#btn-link-queue').onclick = () => pushLink(false);
  box.querySelector('#btn-link-play').onclick = () => pushLink(true);
}
