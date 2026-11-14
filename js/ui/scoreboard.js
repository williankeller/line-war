// Live scoreboard: line counts per fighter, sorted with survivors first.

import { createAvatar } from './avatar.js';

export function createScoreboard() {
  const list = document.getElementById('scoreboard');
  const hint = document.getElementById('live-hint');
  const status = document.getElementById('live-status');
  const rows = new Map();

  function reset() {
    rows.clear();
    list.replaceChildren();
  }

  function createRow(fighter) {
    const row = document.createElement('li');
    row.className = 'score';
    row.style.setProperty('--c', fighter.color);

    const name = document.createElement('span');
    name.className = 'score-name';
    name.textContent = fighter.label;

    const count = document.createElement('span');
    count.className = 'score-count';

    const bar = document.createElement('div');
    bar.className = 'score-bar';
    const fill = document.createElement('span');
    bar.append(fill);

    row.append(createAvatar(fighter, 'small'), name, count, bar);
    return { row, count, fill };
  }

  function update(match) {
    if (!match) {
      hint.hidden = false;
      status.textContent = '';
      reset();
      return;
    }

    hint.hidden = true;
    status.textContent = match.phase === 'over'
      ? 'final'
      : `${match.aliveBodies.length} alive · ${Math.floor(match.time)} s`;

    const most = Math.max(1, ...match.bodies.map((body) => body.lines.length));
    const sorted = [...match.bodies].sort((a, b) =>
      (b.alive - a.alive) || (b.lines.length - a.lines.length) || (b.diedAt - a.diedAt));

    for (const body of sorted) {
      let entry = rows.get(body.fighter.id);
      if (!entry) {
        entry = createRow(body.fighter);
        rows.set(body.fighter.id, entry);
      }
      entry.row.classList.toggle('score-out', !body.alive);
      entry.count.textContent = body.alive ? body.lines.length : 'OUT';
      entry.fill.style.width = `${body.alive ? (body.lines.length / most) * 100 : 0}%`;
      list.append(entry.row); // re-appending moves the row into sorted order
    }
  }

  return { update, reset };
}
