export function init(container, ctx) {
  const box = document.createElement('div');
  box.className = 'control-box';
  box.innerHTML = `
    <strong style="font-size:11px; color:#94a3b8; text-transform:uppercase; display:block; margin-bottom:6px;">After Last Cue (End of Show)</strong>
    <select id="sel-end-action" style="width:100%;">
      <option value="stay">Stay on Current Screen</option>
      <option value="intermission" selected>Show Intermission / Backdrop</option>
      <option value="blackout">Go to Blackout</option>
    </select>
  `;
  box.querySelector('#sel-end-action').onchange = (e) => {
    ctx.state.endAction = e.target.value;
  };
  container.appendChild(box);
}
