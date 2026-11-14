// Fighter list: add, rename, recolor and remove fighters.
// The roster array is edited in place; onChange runs after every edit.

import { LIMITS, PALETTE } from '../config.js';
import { createFighter, imageFileToDataUrl, updateFighter } from '../fighters.js';
import { createAvatar } from './avatar.js';

export function createRosterPanel({ roster, onChange }) {
  const list = document.getElementById('roster');
  const count = document.getElementById('roster-count');
  const form = document.getElementById('add-form');
  const nameInput = document.getElementById('add-name');
  const colorInput = document.getElementById('add-color');
  const imageInput = document.getElementById('add-image');
  const imageButton = document.getElementById('add-image-button');
  const imageLabel = document.getElementById('add-image-label');

  let pendingImage = null;

  function render() {
    list.replaceChildren(...roster.map(createRow));
    count.textContent = `${roster.length} / ${LIMITS.fighters}`;
    colorInput.value = PALETTE[roster.length % PALETTE.length];
    form.hidden = roster.length >= LIMITS.fighters;
  }

  function createRow(fighter) {
    const row = document.createElement('li');
    row.className = 'roster-row';

    let avatar = createAvatar(fighter);

    const name = document.createElement('input');
    name.type = 'text';
    name.id = `fighter-name-${fighter.id}`;
    name.value = fighter.name;
    name.maxLength = 24;
    name.setAttribute('aria-label', 'Fighter name');
    name.addEventListener('input', () => {
      fighter.name = name.value;
      updateFighter(fighter);
      const next = createAvatar(fighter);
      avatar.replaceWith(next);
      avatar = next;
      onChange();
    });

    const color = document.createElement('input');
    color.type = 'color';
    color.id = `fighter-color-${fighter.id}`;
    color.value = fighter.color;
    color.setAttribute('aria-label', 'Fighter color');
    color.addEventListener('input', () => {
      fighter.color = color.value;
      avatar.style.setProperty('--c', fighter.color);
      onChange();
    });

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove-button';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Remove ${fighter.label}`);
    remove.addEventListener('click', () => {
      roster.splice(roster.indexOf(fighter), 1);
      render();
      onChange();
    });

    row.append(avatar, name, color, remove);
    return row;
  }

  function clearPendingImage() {
    pendingImage = null;
    imageInput.value = '';
    imageButton.style.backgroundImage = '';
    imageLabel.textContent = 'Image';
  }

  imageInput.addEventListener('change', async () => {
    const file = imageInput.files?.[0];
    if (!file) return;
    try {
      pendingImage = await imageFileToDataUrl(file);
      imageButton.style.backgroundImage = `url("${pendingImage}")`;
      imageLabel.textContent = '';
      if (!nameInput.value.trim()) nameInput.value = file.name.replace(/\.[^.]+$/, '').slice(0, 24);
    } catch {
      clearPendingImage();
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (roster.length >= LIMITS.fighters) return;

    const name = nameInput.value.trim();
    if (!name && !pendingImage) {
      nameInput.focus();
      return;
    }

    roster.push(createFighter({
      name: name || `Fighter ${roster.length + 1}`,
      color: colorInput.value,
      imageData: pendingImage,
    }));

    nameInput.value = '';
    clearPendingImage();
    render();
    onChange();
    nameInput.focus();
  });

  render();
}
