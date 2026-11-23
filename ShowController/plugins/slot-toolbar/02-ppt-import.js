export async function sendPptCommand(action, file = '') {
  try {
    const res = await fetch('/api/ppt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, file })
    });
    if (!res.ok) alert((await res.json()).error || 'PowerPoint error');
  } catch {}
}

export function init(container, ctx) {
  const btn = document.createElement('button');
  btn.textContent = '+ PowerPoint';
  btn.style.background = '#b45309';

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.ppt,.pptx';
  input.style.display = 'none';

  btn.onclick = () => input.click();
  input.onchange = async () => {
    for (const file of input.files) {
      const res = await fetch('/api/upload-media', {
        method: 'POST',
        headers: { 'X-Filename': encodeURIComponent(file.name) },
        body: file
      });
      if (res.ok) ctx.store.addCue(file.name, 'ppt', file.name, { tempPpt: true });
      else alert('Failed to copy PowerPoint file to Media folder.');
    }
    input.value = '';
  };

  container.appendChild(btn);
  container.appendChild(input);

  ctx.on('CUE_TRIGGER', ({ cue }) => sendPptCommand(cue.kind === 'ppt' ? 'launch_ppt' : 'kill_ppt', cue.src));
  ctx.on('SHOW_ENDED', () => sendPptCommand('kill_ppt'));
  ctx.on('END_SHOW', () => sendPptCommand('kill_ppt'));
  ctx.on('PANIC', () => sendPptCommand('kill_ppt'));
}
