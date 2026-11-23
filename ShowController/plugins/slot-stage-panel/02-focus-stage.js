export function init(container, ctx) {
  const focusBtn = document.createElement('button');
  focusBtn.id = 'btn-open-proj';
  focusBtn.className = 'btn-proj';
  focusBtn.textContent = 'Focus / Launch Stage';
  focusBtn.onclick = () => ctx.actions.openProjector();

  const backTabBtn = document.createElement('button');
  backTabBtn.id = 'btn-close-web';
  backTabBtn.style.cssText = 'background:#475569; font-size:12px;';
  backTabBtn.textContent = 'Back to Projector Tab (W)';
  backTabBtn.onclick = () => ctx.actions.closeWebWindow();

  container.appendChild(focusBtn);
  container.appendChild(backTabBtn);

  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    if (e.key.toLowerCase() === 'p') { e.preventDefault(); ctx.actions.openProjector(); }
    if (e.key.toLowerCase() === 'w') { e.preventDefault(); ctx.actions.closeWebWindow(); }
  });
}
