export const channel = new BroadcastChannel('show_controller_bus');

let dragSrcIndex = null;

export const store = {
  cues: [],
  activeId: null,
  isAtEnd: false,
  onTrigger: null,
  onPreload: null,

  getActiveIndex() {
    if (!this.activeId) return -1;
    return this.cues.findIndex(c => c.id === this.activeId);
  },

  addCue(name, kind, src, extra = {}) {
    this.cues.push({ id: crypto.randomUUID(), name, kind, src, ...extra });
    this.render();
  },

  duplicateCue(index) {
    const orig = this.cues[index];
    if (!orig) return;
    const copy = { ...orig, id: crypto.randomUUID() };
    this.cues.push(copy);
    this.render();
  },

  removeCue(index) {
    if (this.cues[index]?.id === this.activeId) this.activeId = null;
    this.cues.splice(index, 1);
    this.render();
  },

  moveCue(fromIndex, toIndex) {
    if (fromIndex === null || fromIndex === toIndex) return;
    const [moved] = this.cues.splice(fromIndex, 1);
    this.cues.splice(toIndex, 0, moved);
    this.render();
  },

  setActive(id) {
    this.activeId = id;
    this.isAtEnd = false;
    this.render();
  },

  render() {
    const list = document.getElementById('cue-list');
    if (!list) return;
    list.innerHTML = '';

    const activeIdx = this.getActiveIndex();
    document.getElementById('now-title').textContent = this.cues[activeIdx] ? this.cues[activeIdx].name : '—';
    document.getElementById('next-title').textContent = this.cues[activeIdx + 1] ? this.cues[activeIdx + 1].name : 'End of Show';

    // Allow dropping into the empty space below cues to move an item to the end
    list.ondragover = (e) => e.preventDefault();
    list.ondrop = (e) => {
      if (e.target === list && dragSrcIndex !== null) {
        this.moveCue(dragSrcIndex, this.cues.length - 1);
        dragSrcIndex = null;
      }
    };

    this.cues.forEach((cue, i) => {
      const div = document.createElement('div');
      div.className = 'cue-item' + (cue.id === this.activeId ? ' active' : '');
      div.draggable = true;

      const label = document.createElement('div');
      label.className = 'cue-label';

      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = cue.kind;

      label.appendChild(badge);
      label.appendChild(document.createTextNode(cue.name));

      const actions = document.createElement('div');
      actions.style.flexShrink = '0';

      const goBtn = document.createElement('button');
      goBtn.textContent = 'Go';
      goBtn.onclick = () => this.onTrigger && this.onTrigger(i);
      actions.appendChild(goBtn);

      if (cue.kind === 'youtube' || cue.kind === 'canva') {
        const preBtn = document.createElement('button');
        preBtn.textContent = 'Pre-load';
        preBtn.title = 'Open tab now so you can skip ads & queue it up';
        preBtn.style.background = '#6d28d9';
        preBtn.style.marginLeft = '4px';
        preBtn.onclick = () => this.onPreload && this.onPreload(i);
        actions.appendChild(preBtn);
      }

      const dupBtn = document.createElement('button');
      dupBtn.textContent = 'Dup';
      dupBtn.title = 'Duplicate Cue to End of List';
      dupBtn.style.marginLeft = '4px';
      dupBtn.onclick = () => this.duplicateCue(i);

      const delBtn = document.createElement('button');
      delBtn.className = 'btn-danger';
      delBtn.textContent = 'X';
      delBtn.onclick = () => this.removeCue(i);

      actions.appendChild(dupBtn);
      actions.appendChild(delBtn);
      div.appendChild(label);
      div.appendChild(actions);

      div.ondragstart = () => { dragSrcIndex = i; };
      div.ondragover = (e) => e.preventDefault();
      div.ondrop = (e) => {
        e.stopPropagation();
        this.moveCue(dragSrcIndex, i);
        dragSrcIndex = null;
      };

      list.appendChild(div);
    });
  },

  initPersistence() {
    document.getElementById('btn-save').onclick = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const defaultName = `Show_${today}.json`;
      let fileHandle = null;
      let chosenFileName = defaultName;

      if (window.showSaveFilePicker) {
        try {
          fileHandle = await window.showSaveFilePicker({
            suggestedName: defaultName,
            types: [{
              description: 'Show Cue List (*.json)',
              accept: { 'application/json': ['.json'] }
            }]
          });
          chosenFileName = fileHandle.name;
        } catch (err) {
          if (err.name === 'AbortError') return;
        }
      } else {
        const promptName = prompt('Enter show file name:', defaultName);
        if (!promptName) return;
        chosenFileName = promptName.endsWith('.json') ? promptName : `${promptName}.json`;
      }

      const folderName = chosenFileName.replace(/\.json$/i, '').replace(/[^a-zA-Z0-9_-]/g, '_');

      const cleanCues = [];
      for (const cue of this.cues) {
        if (cue.fileObj && ['image', 'audio', 'video', 'pdf'].includes(cue.kind)) {
          const relTarget = `${folderName}/${cue.fileObj.name}`;
          await fetch('/api/upload-media', {
            method: 'POST',
            headers: { 'X-Filename': encodeURIComponent(relTarget) },
            body: cue.fileObj
          });
          const { fileObj, ...rest } = cue;
          cleanCues.push({ ...rest, src: relTarget });
        } else if (cue.kind === 'ppt') {
          const baseName = cue.src.split('/').pop();
          const relTarget = `${folderName}/${baseName}`;
          try {
            const pptRes = await fetch('/Media/' + encodeURIComponent(baseName));
            if (pptRes.ok) {
              const pptBlob = await pptRes.blob();
              await fetch('/api/upload-media', {
                method: 'POST',
                headers: { 'X-Filename': encodeURIComponent(relTarget) },
                body: pptBlob
              });
            }
          } catch {}
          const { fileObj, tempPpt, ...rest } = cue;
          cleanCues.push({ ...rest, src: relTarget });
        } else {
          const { fileObj, tempPpt, ...rest } = cue;
          cleanCues.push(rest);
        }
      }

      const jsonStr = JSON.stringify(cleanCues, null, 2);
      if (fileHandle) {
        const writable = await fileHandle.createWritable();
        await writable.write(jsonStr);
        await writable.close();
      } else {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = chosenFileName;
        a.click();
      }
    };

    const fileInput = document.getElementById('load-file');
    document.getElementById('btn-load').onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
      const file = e.target.files.item(0);
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          if (Array.isArray(parsed)) {
            this.cues = parsed;
            this.activeId = null;
            this.isAtEnd = false;
            this.render();
          }
        } catch {
          alert('Invalid JSON show file.');
        }
      };
      reader.readAsText(file);
      fileInput.value = '';
    };

    const clearBtn = document.getElementById('btn-clear');
    if (clearBtn) {
      clearBtn.onclick = () => {
        if (this.cues.length === 0) return;
        if (!confirm('Clear all cues from the list?')) return;
        this.cues = [];
        this.activeId = null;
        this.isAtEnd = false;
        this.render();
      };
    }
  }
};
