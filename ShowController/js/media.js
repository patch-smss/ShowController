import { store } from '/js/store.js';

const IMG_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
const AUD_EXTS = ['mp3', 'wav', 'ogg', 'm4a'];
const VID_EXTS = ['mp4', 'mov', 'webm'];

export function detectMediaKind(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (IMG_EXTS.includes(ext)) return 'image';
  if (AUD_EXTS.includes(ext)) return 'audio';
  if (VID_EXTS.includes(ext)) return 'video';
  return null;
}

function handleFiles(fileList) {
  for (const file of fileList) {
    const kind = detectMediaKind(file.name);
    if (kind) {
      const blobUrl = URL.createObjectURL(file);
      store.addCue(file.name, kind, blobUrl);
    }
  }
}

export function initMediaModule() {
  const picker = document.getElementById('file-picker');
  document.getElementById('btn-browse-files').onclick = () => picker.click();
  picker.onchange = () => {
    handleFiles(picker.files);
    picker.value = '';
  };

  const dz = document.getElementById('dropzone');
  dz.ondragover = (e) => { e.preventDefault(); dz.classList.add('drag'); };
  dz.ondragleave = () => dz.classList.remove('drag');
  dz.ondrop = (e) => {
    e.preventDefault();
    dz.classList.remove('drag');
    handleFiles(e.dataTransfer.files);
  };
}
