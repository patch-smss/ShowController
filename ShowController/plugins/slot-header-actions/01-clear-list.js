export function init(container, ctx) {
  const btn = document.createElement('button');
  btn.id = 'btn-clear';
  btn.textContent = 'Clear';
  btn.style.background = '#7f1d1d';
  btn.onclick = () => {
    if (ctx.store.cues.length === 0) return;
    if (!confirm('Clear all cues from the list?')) return;
    ctx.store.clearAll();
  };
  container.appendChild(btn);
}
