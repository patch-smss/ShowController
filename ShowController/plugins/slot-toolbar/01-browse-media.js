import { ingestMediaFile } from '/js/media.js';

export function init(container, ctx) {
  const btn = document.createElement('button');
  btn.textContent = '+ Browse Media';
  btn.style.cssText = 'background:#0284c7; flex:1;';

  const picker = document.createElement('input');
  picker.type = 'file';
  picker.multiple = true;
  picker.accept = 'image/*,audio/*,video/*';
  picker.style.display = 'none';

  btn.onclick = () => picker.click();
  picker.onchange = async () => {
    for (const file of picker.files) await ingestMediaFile(file, ctx.store);
    picker.value = '';
  };

  container.appendChild(btn);
  container.appendChild(picker);
}
