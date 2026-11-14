// Fighter model: what the player adds to the roster.
// A fighter has a name, a color and an optional image. A name that starts
// with an emoji uses that emoji as its face.

import { DEFAULT_FIGHTERS, LIMITS, PALETTE } from './config.js';
import * as storage from './storage.js';

const STORAGE_KEY = 'roster';
const PICTOGRAPH = /\p{Extended_Pictographic}/u;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter
  ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  : null;

let nextId = 1;

function firstGrapheme(text) {
  if (!segmenter) return Array.from(text)[0] ?? '';
  for (const { segment } of segmenter.segment(text)) return segment;
  return '';
}

export function createFighter({ name = '', color = PALETTE[0], imageData = null }) {
  return updateFighter({ id: nextId++, name, color, imageData, image: null });
}

// Recomputes the derived fields (emoji, label, initials, image) after an edit.
export function updateFighter(fighter) {
  const name = fighter.name.trim();
  const first = firstGrapheme(name);

  if (first && PICTOGRAPH.test(first)) {
    fighter.emoji = first;
    fighter.label = name.slice(first.length).trim() || name;
  } else {
    fighter.emoji = '';
    fighter.label = name || 'Fighter';
  }

  const words = fighter.label.split(/\s+/).filter(Boolean);
  const initials = words.length >= 2 ? words[0][0] + words[1][0] : fighter.label.slice(0, 2);
  fighter.initials = initials.toUpperCase();

  if (fighter.imageData && !fighter.image) {
    fighter.image = new Image();
    fighter.image.src = fighter.imageData;
  } else if (!fighter.imageData) {
    fighter.image = null;
  }

  return fighter;
}

export function loadRoster() {
  const saved = storage.load(STORAGE_KEY);

  if (!Array.isArray(saved) || saved.length === 0) {
    return DEFAULT_FIGHTERS.map((name, i) => createFighter({ name, color: PALETTE[i] }));
  }

  return saved.slice(0, LIMITS.fighters).map((entry, i) => createFighter({
    name: String(entry.name ?? ''),
    color: HEX_COLOR.test(entry.color) ? entry.color : PALETTE[i % PALETTE.length],
    imageData: isImageDataUrl(entry.imageData) ? entry.imageData : null,
  }));
}

export function saveRoster(roster) {
  storage.save(STORAGE_KEY, roster.map(({ name, color, imageData }) => ({ name, color, imageData })));
}

function isImageDataUrl(value) {
  return typeof value === 'string' && value.startsWith('data:image/');
}

// Reads an uploaded image and returns a square, center-cropped data URL.
// Keeping it small means the roster still fits in localStorage.
export function imageFileToDataUrl(file, size = 256) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        canvas.getContext('2d').drawImage(img, (size - w) / 2, (size - h) / 2, w, h);

        const hasTransparency = ['image/png', 'image/svg+xml', 'image/webp', 'image/gif'].includes(file.type);
        resolve(hasTransparency ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.88));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
