export function init(container, ctx) {
  const strip = document.createElement('div');
  strip.className = 'preview-strip';
  strip.innerHTML = `
    <div class="preview-card"><span>Now Live</span><strong id="now-title">--</strong></div>
    <div class="preview-card"><span>Next Up</span><strong id="next-title" style="color:#a3e635">--</strong></div>
  `;
  container.appendChild(strip);

  const nowEl = strip.querySelector('#now-title');
  const nextEl = strip.querySelector('#next-title');

  const refresh = () => {
    const idx = ctx.store.getActiveIndex();
    nowEl.textContent = ctx.state.finishedText || (ctx.store.cues[idx] ? ctx.store.cues[idx].name : '--');
    nextEl.textContent = ctx.store.cues[idx + 1] ? ctx.store.cues[idx + 1].name : 'End of Show';
  };

  ctx.on('STORE_UPDATED', refresh);
  ctx.on('SHOW_ENDED', ({ endAction }) => {
    if (endAction === 'intermission') nowEl.textContent = 'Intermission / Backdrop';
    if (endAction === 'blackout') nowEl.textContent = 'Blackout';
  });
}
