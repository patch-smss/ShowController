export function init(container, ctx) {
  const btn = document.createElement('button');
  btn.id = 'btn-end-show';
  btn.className = 'btn-danger';
  btn.style.cssText = 'margin-top:auto; padding:12px;';
  btn.textContent = 'End Show & Exit';
  btn.onclick = () => ctx.actions.endShow();
  container.appendChild(btn);
}
