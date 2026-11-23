export const channel = new BroadcastChannel('show_controller_bus');

// Reactive cue list state container

export const store = {
  cues: [],
  activeId: null,
  isAtEnd: false,
  onChange: null,

  notify() {
    if (typeof this.onChange === 'function') this.onChange();
  },

  getActiveIndex() {
    if (!this.activeId) return -1;
    return this.cues.findIndex(c => c.id === this.activeId);
  },

  addCue(name, kind, src, extra = {}) {
    this.cues.push({ id: crypto.randomUUID(), name, kind, src, ...extra });
    this.notify();
  },

  duplicateCue(index) {
    const orig = this.cues[index];
    if (!orig) return;
    this.cues.push({ ...orig, id: crypto.randomUUID() });
    this.notify();
  },

  removeCue(index) {
    if (this.cues[index]?.id === this.activeId) this.activeId = null;
    this.cues.splice(index, 1);
    this.notify();
  },

  moveCue(fromIndex, toIndex) {
    if (fromIndex === null || fromIndex === toIndex) return;
    const [moved] = this.cues.splice(fromIndex, 1);
    this.cues.splice(toIndex, 0, moved);
    this.notify();
  },

  clearAll() {
    this.cues = [];
    this.activeId = null;
    this.isAtEnd = false;
    this.notify();
  },

  setActive(id) {
    this.activeId = id;
    this.isAtEnd = false;
    this.notify();
  }
};
