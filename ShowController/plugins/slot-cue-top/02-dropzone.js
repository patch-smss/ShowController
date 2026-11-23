import { detectMediaKind } from '/js/media.js';

export function init(container, ctx) {
  const dz = document.createElement('div');
  dz.id = 'dropzone';
  dz.textContent = 'Drag & drop any Image, Audio, Video, or PDF file';
  container.appendChild(dz);

  dz.ondragover = (e) => { e.preventDefault(); dz.classList.add('drag'); };
  dz.ondragleave = () => dz.classList.remove('drag');
  dz.ondrop = (e) => {
    e.preventDefault();
    dz.classList.remove('drag');
    for (const file of e.dataTransfer.files) {
      const kind = detectMediaKind(file.name);
      if (kind) ctx.store.addCue(file.name, kind, URL.createObjectURL(file));
    }
  };
}
