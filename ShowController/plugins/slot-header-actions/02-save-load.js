export function init(container, ctx) {
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.style.cssText = 'background:#0369a1; margin-right:4px;';

  const loadBtn = document.createElement('button');
  loadBtn.textContent = 'Load';
  loadBtn.style.cssText = 'background:#334155; margin-right:4px;';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json';
  fileInput.style.display = 'none';

  saveBtn.onclick = async () => {
    const defaultName = `Show_${new Date().toISOString().slice(0, 10)}`;
    const name = prompt('Save show name (saves .json cue list + Master .pptx):', defaultName);
    if (!name) return;

    const pptRes = await ctx.actions.pptPost('/api/ppt/save', { name });
    const payload = {
      masterPptx: pptRes.ok ? pptRes.file : null,
      cues: ctx.store.cues.map(({ tempFile, ...rest }) => rest)
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${name.replace(/\.json$/i, '')}.json`;
    a.click();
  };

  loadBtn.onclick = () => fileInput.click();
  fileInput.onchange = (e) => {
    const file = e.target.files.item(0);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result);
        const cues = Array.isArray(parsed) ? parsed : parsed.cues;
        if (!Array.isArray(cues)) throw new Error();
        if (parsed.masterPptx) {
          await ctx.actions.pptPost('/api/ppt/load', { file: parsed.masterPptx });
        }
        ctx.store.cues = cues;
        ctx.store.activeId = null;
        ctx.store.isAtEnd = false;
        ctx.store.notify();
      } catch {
        alert('Invalid show file.');
      }
    };
    reader.readAsText(file);
    fileInput.value = '';
  };

  container.insertBefore(fileInput, container.firstChild);
  container.insertBefore(loadBtn, container.firstChild);
  container.insertBefore(saveBtn, container.firstChild);
}
