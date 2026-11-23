import { detectMediaKind } from '/js/media.js';

export function init(container, ctx) {
  const btn = document.createElement('button');
  btn.textContent = '+ Browse Media';
  btn.style.cssText = 'background:#0284c7; flex:1;';

  const picker = document.createElement('input');
  picker.type = 'file';
  picker.multiple = true;
  picker.accept = 'image/*,audio/*,video/*,.pdf';
  picker.style.display = 'none';

  btn.onclick = () => picker.click();
  picker.onchange = () => {
    for (const file of picker.files) {
      const kind = detectMediaKind(file.name);
      if (kind) ctx.store.addCue(file.name, kind, URL.createObjectURL(file));
    }
    picker.value = '';
  };

  container.appendChild(btn);
  container.appendChild(picker);
}
