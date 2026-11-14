// Shared constants. All arena values are in logical canvas units;
// the renderer scales them to the real canvas size.

export const ARENA = {
  width: 800,
  height: 1000,
  centerX: 400,
  centerY: 590,
  radius: 370,
};

export const FONTS = {
  display: '"Bebas Neue", Impact, "Arial Narrow Bold", sans-serif',
  emoji: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif',
};

export const COLORS = {
  background: '#070709',
  ring: '#ffffff',
  title: '#ffffff',
  accent: '#ff3d3d',
};

// Colors handed to new fighters, in order.
export const PALETTE = [
  '#ff4fd8', '#8a6cff', '#ffb830', '#ffffff',
  '#3df2c4', '#ff5a3c', '#4fb8ff', '#c8ff4f',
  '#ff9ecb', '#ffe66d', '#6df2ff', '#b58cff',
  '#ff7a00', '#7dffb3', '#ff4d8d', '#9fd3ff',
];

export const DEFAULT_FIGHTERS = ['🦁 Lion', '🦈 Shark', '🦅 Eagle', '🐺 Wolf'];

export const DEFAULT_SETTINGS = {
  speed: 420,        // px per second
  size: 36,          // fighter radius in px
  density: 1,        // lines gained per degree of wall slide
  grip: 1,           // multiplier on how long a fighter slides along the wall
  suddenDeath: 60,   // seconds before sudden death starts
  title: 'WHO WINS?',
  subtitle: 'ROUND {round}',
  showCounts: true,
  sound: true,
};

export const LIMITS = {
  fighters: 16,
  linesPerFighter: 3000,
  particles: 800,
};
