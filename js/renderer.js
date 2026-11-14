// Draws the arena, lines, fighters and effects onto the canvas.
// Everything is drawn in logical ARENA units and scaled to fit.

import { ARENA, COLORS, FONTS } from './config.js';

const { width: W, height: H, centerX: CX, centerY: CY, radius: R } = ARENA;
const ASPECT = H / W;

export function createRenderer(canvas, container) {
  const ctx = canvas.getContext('2d');

  function resize() {
    const style = getComputedStyle(container);
    const availableWidth = container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const availableHeight = container.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);

    let cssWidth = Math.min(availableWidth, availableHeight / ASPECT);
    if (!(cssWidth > 50)) cssWidth = Math.max(50, availableWidth);

    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssWidth * ASPECT}px`;

    const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(cssWidth * pixelRatio);
    canvas.height = Math.round(cssWidth * ASPECT * pixelRatio);
  }

  new ResizeObserver(resize).observe(container);
  resize();

  // state: { bodies, match, settings, round, rosterSize }
  function draw(state) {
    const scale = canvas.width / W;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    drawBackground(ctx);
    drawLines(ctx, state.bodies);
    drawRing(ctx);

    const showCounts = Boolean(state.match && state.settings.showCounts);
    for (const body of state.bodies) {
      if (body.alive) drawFighter(ctx, body, showCounts);
    }

    if (state.match) drawEffects(ctx, state.match);
    drawTitle(ctx, state.settings, state.round);
    drawStatus(ctx, state);
  }

  return { draw };
}

function drawBackground(ctx) {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(CX, CY, R * 0.15, CX, CY, R);
  glow.addColorStop(0, 'rgba(255, 255, 255, 0.045)');
  glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(CX, CY, R, 0, Math.PI * 2);
  ctx.fill();
}

// One path per fighter keeps thousands of lines cheap to draw.
function drawLines(ctx, bodies) {
  ctx.save();
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.55;

  for (const body of bodies) {
    if (!body.alive || body.lines.length === 0) continue;
    ctx.strokeStyle = body.fighter.color;
    ctx.beginPath();
    for (const line of body.lines) {
      ctx.moveTo(line.x, line.y);
      ctx.lineTo(body.x, body.y);
    }
    ctx.stroke();
  }

  ctx.restore();
}

function drawRing(ctx) {
  ctx.save();
  ctx.shadowColor = 'rgba(255, 255, 255, 0.85)';
  ctx.shadowBlur = 14;
  ctx.strokeStyle = COLORS.ring;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(CX, CY, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawFighter(ctx, body, showCount) {
  const { fighter, x, y, r } = body;

  // Glowing colored rim
  ctx.save();
  ctx.shadowColor = fighter.color;
  ctx.shadowBlur = 22;
  ctx.fillStyle = fighter.color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Face: image, emoji or initials, clipped to the circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r - 3, 0, Math.PI * 2);
  ctx.clip();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const image = fighter.image;
  if (image && image.complete && image.naturalWidth) {
    ctx.fillStyle = fighter.color;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.drawImage(image, x - r, y - r, r * 2, r * 2);
  } else if (fighter.emoji) {
    ctx.fillStyle = '#15151c';
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.font = `${Math.round(r * 1.25)}px ${FONTS.emoji}`;
    ctx.fillText(fighter.emoji, x, y + r * 0.08);
  } else {
    ctx.fillStyle = fighter.color;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.fillStyle = '#0b0b0f';
    ctx.font = `${Math.round(r * 1.1)}px ${FONTS.display}`;
    ctx.fillText(fighter.initials, x, y + r * 0.08);
  }
  ctx.restore();

  if (showCount) drawCountBadge(ctx, body);
}

function drawCountBadge(ctx, body) {
  const text = String(body.lines.length);
  ctx.font = `18px ${FONTS.display}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const width = ctx.measureText(text).width + 14;
  const top = body.y + body.r + 6;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
  roundRect(ctx, body.x - width / 2, top, width, 20, 10);
  ctx.fill();

  ctx.fillStyle = body.fighter.color;
  ctx.fillText(text, body.x, top + 10.5);
}

function drawEffects(ctx, match) {
  ctx.save();

  for (const p of match.particles) {
    const fade = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = fade;
    ctx.beginPath();
    if (p.ring) {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3 * fade + 0.5;
      ctx.arc(p.x, p.y, p.size * (1 - fade) + 4, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = p.color;
      ctx.arc(p.x, p.y, p.size * fade + 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  for (const p of match.popups) {
    ctx.globalAlpha = Math.min(1, (p.life / p.maxLife) * 3);
    ctx.font = `${p.size}px ${FONTS.display}`;
    ctx.lineWidth = Math.max(3, p.size * 0.12);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.strokeText(p.text, p.x, p.y);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y);
  }

  ctx.restore();
}

function drawTitle(ctx, settings, round) {
  const subtitle = (settings.subtitle || '').replace(/\{round\}/gi, String(Math.max(1, round)));

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = COLORS.title;
  ctx.font = `112px ${FONTS.display}`;
  fillTextFitted(ctx, (settings.title || '').toUpperCase(), W / 2, 118, 720);

  ctx.fillStyle = COLORS.accent;
  ctx.font = `54px ${FONTS.display}`;
  fillTextFitted(ctx, subtitle.toUpperCase(), W / 2, 180, 720);
}

function drawStatus(ctx, { match, settings, rosterSize }) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (!match) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = `30px ${FONTS.display}`;
    ctx.fillText(rosterSize < 2 ? 'ADD AT LEAST 2 FIGHTERS' : 'PRESS START', CX, CY);
    return;
  }

  if (match.phase === 'paused') {
    ctx.fillStyle = 'rgba(7, 7, 9, 0.6)';
    ctx.beginPath();
    ctx.arc(CX, CY, R - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.title;
    ctx.font = `72px ${FONTS.display}`;
    ctx.fillText('PAUSED', CX, CY);
  }

  if (match.time >= settings.suddenDeath && match.phase !== 'over') {
    ctx.fillStyle = COLORS.accent;
    ctx.font = `28px ${FONTS.display}`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('SUDDEN DEATH', CX, H - 8);
  }
}

// Squeezes text horizontally when it is wider than maxWidth.
function fillTextFitted(ctx, text, x, y, maxWidth) {
  const width = ctx.measureText(text).width;
  if (width <= maxWidth || width === 0) {
    ctx.fillText(text, x, y);
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(maxWidth / width, 1);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
