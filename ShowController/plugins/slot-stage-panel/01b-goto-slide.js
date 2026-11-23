export function init(container, ctx) {
  const row = document.createElement('div');
  row.style.cssText = 'display:flex; gap:6px;';
  row.innerHTML = `
    <input type="number" id="inp-goto-slide" min="1" placeholder="Page #" style="width:90px; flex:1;" />
    <button id="btn-goto-slide" style="background:#334155;">Jump to Page</button>
  `;
  container.appendChild(row);

  const input = row.querySelector('#inp-goto-slide');
  const jump = async () => {
    const page = parseInt(input.value, 10);
    if (!page || page < 1) return;
    ctx.emit('SET_BLACKOUT', { active: false });
    await ctx.actions.pptPost('/api/ppt/nav', { action: 'goto', slide: page + 1 });
    input.value = '';
  };

  row.querySelector('#btn-goto-slide').onclick = jump;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); jump(); }
  });
}
