let dragSrcIndex = null;

export function init(container, ctx) {
  const list = document.createElement('div');
  list.id = 'cue-list';
  container.appendChild(list);

  list.ondragover = (e) => e.preventDefault();
  list.ondrop = (e) => {
    if (e.target === list && dragSrcIndex !== null) {
      ctx.store.moveCue(dragSrcIndex, ctx.store.cues.length - 1);
      dragSrcIndex = null;
    }
  };

  const render = () => {
    list.innerHTML = '';
    ctx.store.cues.forEach((cue, i) => {
      const div = document.createElement('div');
      div.className = 'cue-item' + (cue.id === ctx.store.activeId ? ' active' : '');
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
      goBtn.onclick = () => ctx.actions.triggerCue(i);
      actions.appendChild(goBtn);

      if (cue.kind === 'youtube' || cue.kind === 'canva') {
        const preBtn = document.createElement('button');
        preBtn.textContent = 'Pre-load';
        preBtn.style.cssText = 'background:#6d28d9; margin-left:4px;';
        preBtn.onclick = () => ctx.actions.preloadCue(i);
        actions.appendChild(preBtn);
      }

      const dupBtn = document.createElement('button');
      dupBtn.textContent = 'Dup';
      dupBtn.style.marginLeft = '4px';
      dupBtn.onclick = () => ctx.store.duplicateCue(i);

      const delBtn = document.createElement('button');
      delBtn.className = 'btn-danger';
      delBtn.textContent = 'X';
      delBtn.onclick = () => ctx.store.removeCue(i);

      actions.appendChild(dupBtn);
      actions.appendChild(delBtn);
      div.appendChild(label);
      div.appendChild(actions);

      div.ondragstart = () => { dragSrcIndex = i; };
      div.ondragover = (e) => e.preventDefault();
      div.ondrop = (e) => {
        e.stopPropagation();
        ctx.store.moveCue(dragSrcIndex, i);
        dragSrcIndex = null;
      };
      list.appendChild(div);
    });
  };

  ctx.on('STORE_UPDATED', render);
}
