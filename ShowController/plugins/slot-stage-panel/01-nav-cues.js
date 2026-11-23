export function init(container, ctx) {
  const nextBtn = document.createElement('button');
  nextBtn.id = 'btn-next';
  nextBtn.className = 'btn-go';
  nextBtn.textContent = 'NEXT CUE (Space / Right)';
  nextBtn.onclick = () => ctx.actions.nextCue();

  const prevBtn = document.createElement('button');
  prevBtn.id = 'btn-prev';
  prevBtn.textContent = 'PREVIOUS CUE (Left)';
  prevBtn.onclick = () => ctx.actions.prevCue();

  container.appendChild(nextBtn);
  container.appendChild(prevBtn);

  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    if (['ArrowRight', 'PageDown', ' '].includes(e.key)) {
      e.preventDefault();
      document.activeElement?.blur();
      ctx.actions.nextCue();
    }
    if (['ArrowLeft', 'PageUp'].includes(e.key)) {
      e.preventDefault();
      ctx.actions.prevCue();
    }
  });
}
