// Upload .ppt/.pptx files and immediately append slides into the master presentation
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
      const up = await fetch('/api/upload-media', {
        method: 'POST',
        headers: { 'X-Filename': encodeURIComponent(file.name) },
        body: file
      });
      if (!up.ok) {
        alert('Failed to copy PowerPoint file to Media folder.');
        continue;
      }
      const ins = await ctx.actions.pptPost('/api/ppt/insert', { file: file.name, kind: 'ppt' });
      ctx.store.addCue(file.name, 'ppt', file.name, {
        tempFile: true,
        startSlide: ins.ok ? ins.startSlide : null,
        endSlide: ins.ok ? ins.endSlide : null
      });
    }
    input.value = '';
  };

  container.appendChild(btn);
  container.appendChild(input);
}
