// Small round fighter badge used in the roster, scoreboard and winner screen.

export function createAvatar(fighter, size = '') {
  const el = document.createElement('div');
  el.className = size ? `avatar avatar-${size}` : 'avatar';
  el.style.setProperty('--c', fighter.color);

  if (fighter.imageData) {
    el.style.backgroundImage = `url("${fighter.imageData}")`;
  } else if (fighter.emoji) {
    el.classList.add('avatar-emoji');
    el.textContent = fighter.emoji;
  } else {
    el.textContent = fighter.initials;
  }

  return el;
}
