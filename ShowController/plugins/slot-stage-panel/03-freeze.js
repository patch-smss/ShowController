let isFrozen = false;

export function init(container, ctx) {
  const btn = document.createElement('button');
  btn.id = 'btn-freeze';
  btn.textContent = 'FREEZE (F)';

  const toggleFreeze = async () => {
    isFrozen = !isFrozen;
    btn.textContent = isFrozen ? 'UNFREEZE (F)' : 'FREEZE (F)';
    btn.style.background = isFrozen ? '#0284c7' : '';
    ctx.channel.postMessage({ type: 'FREEZE', active: isFrozen });
    try {
      await fetch('/api/ppt/nav', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'freeze', active: isFrozen })
      });
    } catch {}
  };

  btn.onclick = toggleFreeze;
  container.appendChild(btn);

  ctx.on('TOGGLE_FREEZE', toggleFreeze);
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    if (e.key.toLowerCase() === 'f') toggleFreeze();
  });
}
