const IMG_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
const AUD_EXTS = ['mp3', 'wav', 'ogg', 'm4a'];
const VID_EXTS = ['mp4', 'mov', 'webm'];

// Media type detector and auto-uploader/inserter for visual files

export function detectMediaKind(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (IMG_EXTS.includes(ext)) return 'image';
  if (AUD_EXTS.includes(ext)) return 'audio';
  if (VID_EXTS.includes(ext)) return 'video';
  return null;
}

export async function ingestMediaFile(file, store) {
  const kind = detectMediaKind(file.name);
  if (!kind) return;
  if (kind === 'audio') {
    store.addCue(file.name, 'audio', URL.createObjectURL(file));
    return;
  }
  const up = await fetch('/api/upload-media', {
    method: 'POST',
    headers: { 'X-Filename': encodeURIComponent(file.name) },
    body: file
  });
  if (!up.ok) return;

  const ins = await (await fetch('/api/ppt/insert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file: file.name, kind })
  })).json();

  store.addCue(file.name, kind, file.name, {
    tempFile: true,
    startSlide: ins.ok ? ins.startSlide : null,
    endSlide: ins.ok ? ins.endSlide : null
  });
}
