export const store = {
  cues: [],
  activeId: null,
  onTrigger: null,

  getActiveIndex() {
    if (!this.activeId) return -1;
    return this.cues.findIndex(c => c.id === this.activeId);
  },

  addCue(name, kind, src, extra = {}) {
    this.cues.push({ id: crypto.randomUUID(), name, kind, src, ...extra });
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
    this.render();
  },

  render() {
    const list = document.getElementById('cue-list');
    if (!list) return;
    list.innerHTML = '';

    const activeIdx = this.getActiveIndex();
    document.getElementById('now-title').textContent = this.cues[activeIdx] ? this.cues[activeIdx].name : '—';
    document.getElementById('next-title').textContent = this.cues[activeIdx + 1] ? this.cues[activeIdx + 1].name : 'End of Show';

    let dragSrcIndex = null;

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

      const delBtn = document.createElement('button');
      delBtn.className = 'btn-danger';
      delBtn.textContent = 'X';
      delBtn.onclick = () => this.removeCue(i);

      actions.appendChild(goBtn);
      actions.appendChild(delBtn);
      div.appendChild(label);
      div.appendChild(actions);

      div.ondragstart = () => { dragSrcIndex = i; };
      div.ondragover = (e) => e.preventDefault();
      div.ondrop = () => {
        this.moveCue(dragSrcIndex, i);
        dragSrcIndex = null;
      };

      list.appendChild(div);
    });
  },

  initPersistence() {
    document.getElementById('btn-save').onclick = () => {
      const blob = new Blob([JSON.stringify(this.cues, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'MyShow.json';
      a.click();
    };

    const fileInput = document.getElementById('load-file');
    document.getElementById('btn-load').onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          if (Array.isArray(parsed)) {
            this.cues = parsed;
            this.activeId = null;
            this.render();
          }
        } catch {
          alert('Invalid JSON show file.');
        }
      };
      reader.readAsText(file);
    };
  }
};
