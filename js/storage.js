// Small localStorage wrapper. Storage can be blocked or full
// (private windows, large images), so every call fails quietly.

const PREFIX = 'linewar.';

export function load(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Ignore: the game works without saved state.
  }
}
