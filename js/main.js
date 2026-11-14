// Entry point: wires the simulation, renderer, audio and UI together.

import { DEFAULT_SETTINGS } from './config.js';
import * as storage from './storage.js';
import { loadRoster, saveRoster } from './fighters.js';
import { Match, createLineup } from './game.js';
import { createRenderer } from './renderer.js';
import { createAudio } from './audio.js';
import { createAvatar } from './ui/avatar.js';
import { createRosterPanel } from './ui/roster.js';
import { createSettingsPanel } from './ui/settings.js';
import { createScoreboard } from './ui/scoreboard.js';

const SCOREBOARD_INTERVAL = 150; // ms

const settings = { ...DEFAULT_SETTINGS, ...(storage.load('settings') ?? {}) };
const roster = loadRoster();
const audio = createAudio(() => settings.sound);
const renderer = createRenderer(document.getElementById('arena'), document.getElementById('stage'));
const scoreboard = createScoreboard();

const controls = {
  start: document.getElementById('start'),
  pause: document.getElementById('pause'),
  reset: document.getElementById('reset'),
  rematch: document.getElementById('rematch'),
  edit: document.getElementById('edit'),
};

const winnerScreen = {
  root: document.getElementById('winner'),
  avatar: document.getElementById('winner-avatar'),
  label: document.getElementById('winner-label'),
  name: document.getElementById('winner-name'),
};

let match = null;
let round = 0;
let preview = createLineup(roster, settings);

// Match lifecycle

function startMatch() {
  if (roster.length < 2) return;

  round++;
  audio.unlock();
  winnerScreen.root.hidden = true;
  scoreboard.reset();

  match = new Match(roster, settings, {
    grip: () => audio.grip(),
    release: () => audio.release(),
    cut: () => audio.cut(),
    bump: () => audio.bump(),
    eliminate: () => audio.explode(),
    suddenDeath: () => audio.alarm(),
    ending: () => updateControls(),
    end: (winner) => showWinner(winner),
  });

  updateControls();
  scoreboard.update(match);
}

function backToSetup() {
  match = null;
  winnerScreen.root.hidden = true;
  preview = createLineup(roster, settings);
  updateControls();
  scoreboard.update(null);
}

function togglePause() {
  if (!match) return;
  match.togglePause();
  if (match.phase === 'running') audio.unlock();
  updateControls();
}

function showWinner(winner) {
  winnerScreen.avatar.replaceChildren();

  if (winner) {
    const { fighter } = winner;
    winnerScreen.avatar.append(createAvatar(fighter, 'large'));
    winnerScreen.label.textContent = 'Winner';
    winnerScreen.name.textContent = fighter.label;
    celebrate(match, winner);
    audio.win();
  } else {
    winnerScreen.label.textContent = 'Draw';
    winnerScreen.name.textContent = 'Nobody survived';
  }

  winnerScreen.root.hidden = false;
  updateControls();
  scoreboard.update(match);
}

function celebrate(current, winner) {
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      if (match !== current) return;
      const x = winner.x + (Math.random() - 0.5) * 300;
      const y = winner.y + (Math.random() - 0.5) * 300;
      current.burst(x, y, winner.fighter.color, 20);
    }, i * 260);
  }
}

function updateControls() {
  const phase = match ? match.phase : 'setup';
  const busy = phase === 'running' || phase === 'paused' || phase === 'ending';

  controls.start.disabled = roster.length < 2 || busy;
  controls.start.textContent = phase === 'over' ? 'Rematch' : 'Start';
  controls.pause.disabled = !(phase === 'running' || phase === 'paused');
  controls.pause.textContent = phase === 'paused' ? 'Resume' : 'Pause';
  controls.reset.disabled = !match;
}

// UI wiring

createRosterPanel({
  roster,
  onChange() {
    saveRoster(roster);
    if (!match) preview = createLineup(roster, settings);
    updateControls();
  },
});

createSettingsPanel({
  settings,
  onChange(key) {
    storage.save('settings', settings);
    if (key === 'size' && !match) preview = createLineup(roster, settings);
    if (key === 'sound' && settings.sound) audio.unlock();
  },
});

controls.start.addEventListener('click', startMatch);
controls.pause.addEventListener('click', togglePause);
controls.reset.addEventListener('click', backToSetup);
controls.rematch.addEventListener('click', startMatch);
controls.edit.addEventListener('click', backToSetup);

// Space starts, pauses and resumes, unless the user is typing or on a button.
document.addEventListener('keydown', (event) => {
  if (event.code !== 'Space') return;
  if (event.target.closest('input, textarea, button, select, [contenteditable]')) return;
  event.preventDefault();
  if (!match || match.phase === 'over') startMatch();
  else togglePause();
});

setInterval(() => { if (match) scoreboard.update(match); }, SCOREBOARD_INTERVAL);

// Main loop

let lastFrame = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000); // cap so a background tab does not jump
  lastFrame = now;

  match?.update(dt);
  renderer.draw({
    bodies: match ? match.bodies : preview,
    match,
    settings,
    round,
    rosterSize: roster.length,
  });

  requestAnimationFrame(frame);
}

updateControls();
scoreboard.update(null);
requestAnimationFrame(frame);
