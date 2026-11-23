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
      if (res.ok) ctx.store.addCue(file.name, 'ppt', file.name, { tempFile: true });
      else alert('Failed to copy PowerPoint file to Media folder.');
    }
    input.value = '';
  };

  container.appendChild(btn);
  container.appendChild(input);
}
