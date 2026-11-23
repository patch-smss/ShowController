import { ingestMediaFile } from '/js/media.js';

export function init(container, ctx) {
  const dz = document.createElement('div');
  dz.id = 'dropzone';
  dz.textContent = 'Drag & drop any Image, Audio, or Video file';
  container.appendChild(dz);

  dz.ondragover = (e) => { e.preventDefault(); dz.classList.add('drag'); };
  dz.ondragleave = () => dz.classList.remove('drag');
  dz.ondrop = async (e) => {
    e.preventDefault();
    dz.classList.remove('drag');
    for (const file of e.dataTransfer.files) await ingestMediaFile(file, ctx.store);
  };
}
