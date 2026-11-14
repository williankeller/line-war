// Match simulation: movement, wall grips, line cutting and effects.
// This module has no DOM code. It reports what happens through the
// `events` callbacks so the caller can play sounds or update the UI.

import { ARENA, COLORS, LIMITS } from './config.js';

const { centerX: CX, centerY: CY, radius: R } = ARENA;
const TAU = Math.PI * 2;
const DEGREE = Math.PI / 180;
const SUBSTEPS = 2;               // physics steps per frame, keeps fast fighters from tunneling
const END_DELAY = 1.4;            // seconds between the last explosion and the winner screen
const SUDDEN_DEATH_SPEED = 1.3;   // speed multiplier in sudden death
const SUDDEN_DEATH_GRIP = 0.45;   // wall grip multiplier in sudden death

// Places fighters evenly on an inner ring with random headings.
// Also used to draw the idle preview before a match starts.
export function createLineup(fighters, settings, startAngle = -Math.PI / 2) {
  const ring = Math.min(R * 0.55, R - settings.size - 12);

  return fighters.map((fighter, i) => {
    const angle = startAngle + (i / Math.max(1, fighters.length)) * TAU;
    const heading = Math.random() * TAU;
    return {
      fighter,
      x: CX + Math.cos(angle) * ring,
      y: CY + Math.sin(angle) * ring,
      vx: Math.cos(heading) * settings.speed,
      vy: Math.sin(heading) * settings.speed,
      r: settings.size,
      mode: 'free',       // 'free' while flying, 'ride' while sliding along the wall
      ride: null,
      lines: [],          // wall anchor points; each line runs from an anchor to the body
      alive: true,
      hadLines: false,
      diedAt: 0,
    };
  });
}

export class Match {
  constructor(fighters, settings, events = {}) {
    this.settings = settings;
    this.events = events;
    this.bodies = createLineup(fighters, settings, Math.random() * TAU);
    this.particles = [];
    this.popups = [];
    this.time = 0;
    this.phase = 'running';  // running | paused | ending | over
    this.winner = null;
    this.endTimer = 0;
    this.suddenDeathAnnounced = false;
  }

  get isSuddenDeath() {
    return this.time >= this.settings.suddenDeath;
  }

  get aliveBodies() {
    return this.bodies.filter((body) => body.alive);
  }

  togglePause() {
    if (this.phase === 'running') this.phase = 'paused';
    else if (this.phase === 'paused') this.phase = 'running';
  }

  update(dt) {
    if (this.phase === 'running') this.simulate(dt);
    if (this.phase !== 'paused') this.updateEffects(dt);

    if (this.phase === 'ending') {
      this.endTimer -= dt;
      if (this.endTimer <= 0) {
        this.phase = 'over';
        this.emit('end', this.winner);
      }
    }
  }

  emit(name, ...args) {
    this.events[name]?.(...args);
  }

  // Simulation

  simulate(dt) {
    this.time += dt;

    const suddenDeath = this.isSuddenDeath;
    if (suddenDeath && !this.suddenDeathAnnounced) {
      this.suddenDeathAnnounced = true;
      this.popup(CX, CY, 'SUDDEN DEATH', COLORS.accent, 72, 2.2);
      this.emit('suddenDeath');
    }

    const speed = this.settings.speed * (suddenDeath ? SUDDEN_DEATH_SPEED : 1);
    const gripScale = suddenDeath ? SUDDEN_DEATH_GRIP : 1;
    const lineSpacing = DEGREE / this.settings.density;
    const h = dt / SUBSTEPS;

    for (const body of this.bodies) body.r = this.settings.size;

    for (let step = 0; step < SUBSTEPS; step++) {
      for (const body of this.bodies) {
        if (!body.alive) continue;
        if (body.mode === 'ride') this.advanceRide(body, h, speed, lineSpacing);
        else this.advanceFree(body, h, speed, gripScale);
      }
      this.resolveCollisions(speed);
    }

    this.cutLines();

    const alive = this.aliveBodies;
    if (alive.length <= 1) {
      this.phase = 'ending';
      this.endTimer = END_DELAY;
      this.winner = alive[0] ?? null;
      this.emit('ending');
    }
  }

  advanceFree(body, h, speed, gripScale) {
    body.x += body.vx * h;
    body.y += body.vy * h;

    const dx = body.x - CX;
    const dy = body.y - CY;
    const dist = Math.hypot(dx, dy) || 0.0001;
    if (dist + body.r < R) return;

    const nx = dx / dist;
    const ny = dy / dist;
    body.x = CX + nx * (R - body.r);
    body.y = CY + ny * (R - body.r);

    const outward = body.vx * nx + body.vy * ny;
    if (outward > 0) this.startRide(body, nx, ny, speed, gripScale);
  }

  // A fighter that hits the wall slides along it for a while.
  // Grazing hits slide longer than head-on hits.
  startRide(body, nx, ny, speed, gripScale) {
    const tangential = body.vx * -ny + body.vy * nx;
    const dir = Math.abs(tangential) < 1 ? (Math.random() < 0.5 ? 1 : -1) : Math.sign(tangential);
    const grazing = Math.min(1, Math.abs(tangential) / speed); // 0 head-on, 1 grazing
    const duration = (0.15 + grazing * 0.9 + Math.random() * 0.35) * this.settings.grip * gripScale;

    body.mode = 'ride';
    body.ride = {
      angle: Math.atan2(ny, nx),
      dir,
      timeLeft: duration,
      traveled: 0,   // radians slid so far
      nextLine: 0,   // radians at which the next line is added
      gained: 0,
    };
    this.emit('grip', body);
  }

  advanceRide(body, h, speed, lineSpacing) {
    const ride = body.ride;
    const orbit = R - body.r;
    const delta = (speed / orbit) * h;

    ride.angle += ride.dir * delta;
    ride.traveled += delta;
    ride.timeLeft -= h;

    body.x = CX + Math.cos(ride.angle) * orbit;
    body.y = CY + Math.sin(ride.angle) * orbit;
    body.vx = -Math.sin(ride.angle) * ride.dir * speed;
    body.vy = Math.cos(ride.angle) * ride.dir * speed;

    // Drop one anchor on the wall every `lineSpacing` radians traveled.
    while (ride.traveled >= ride.nextLine) {
      const anchor = ride.angle - ride.dir * (ride.traveled - ride.nextLine);
      if (body.lines.length < LIMITS.linesPerFighter) {
        body.lines.push({ x: CX + Math.cos(anchor) * R, y: CY + Math.sin(anchor) * R });
        body.hadLines = true;
        ride.gained++;
      }
      ride.nextLine += lineSpacing;
    }

    if (ride.timeLeft <= 0) this.endRide(body, speed, false);
  }

  // Launches the fighter back into the arena. When `keepVelocity` is true
  // (knocked off the wall by a collision) the current velocity is kept.
  endRide(body, speed, keepVelocity) {
    const { angle, dir, gained } = body.ride;
    const inX = -Math.cos(angle);
    const inY = -Math.sin(angle);

    body.mode = 'free';
    body.ride = null;

    if (!keepVelocity) {
      const tanX = -Math.sin(angle) * dir;
      const tanY = Math.cos(angle) * dir;
      const spread = (Math.random() * 2 - 1) * 1.1; // up to about 63 degrees off straight in
      body.vx = (inX * Math.cos(spread) + tanX * Math.sin(spread)) * speed;
      body.vy = (inY * Math.cos(spread) + tanY * Math.sin(spread)) * speed;
      body.x += inX * 2;
      body.y += inY * 2;
    }

    if (gained > 0) {
      this.popup(body.x + inX * 95, body.y + inY * 95, `+${gained} LINES`, body.fighter.color, 40, 1.5);
      this.emit('release', body, gained);
    }
  }

  resolveCollisions(speed) {
    const bodies = this.bodies;
    for (let i = 0; i < bodies.length; i++) {
      if (!bodies[i].alive) continue;
      for (let j = i + 1; j < bodies.length; j++) {
        if (bodies[j].alive) this.collide(bodies[i], bodies[j], speed);
      }
    }
  }

  // Equal-mass elastic bounce, then both fighters return to full speed.
  collide(a, b, speed) {
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    let dist = Math.hypot(dx, dy);
    const minDist = a.r + b.r;
    if (dist >= minDist) return;
    if (dist < 0.001) { dx = 1; dy = 0; dist = 1; }

    const nx = dx / dist;
    const ny = dy / dist;
    const push = (minDist - dist) / 2 + 0.3;
    a.x -= nx * push; a.y -= ny * push;
    b.x += nx * push; b.y += ny * push;

    const approach = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
    if (approach > 0) {
      a.vx -= approach * nx; a.vy -= approach * ny;
      b.vx += approach * nx; b.vy += approach * ny;
    }

    for (const body of [a, b]) {
      if (body.mode === 'ride') this.endRide(body, speed, true);
      setSpeed(body, speed);
      keepInside(body);
    }
    this.emit('bump');
  }

  // Any rival body that overlaps a line segment cuts it.
  cutLines() {
    const eliminated = [];

    for (const cutter of this.bodies) {
      if (!cutter.alive) continue;
      const reach = (cutter.r - 0.5) ** 2;

      for (const owner of this.bodies) {
        if (owner === cutter || !owner.alive || owner.lines.length === 0) continue;

        const lines = owner.lines;
        let kept = 0;
        let cuts = 0;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const segX = owner.x - line.x;
          const segY = owner.y - line.y;
          const lengthSq = segX * segX + segY * segY;
          let t = lengthSq > 0 ? ((cutter.x - line.x) * segX + (cutter.y - line.y) * segY) / lengthSq : 0;
          t = Math.max(0, Math.min(1, t));

          const hitX = line.x + segX * t;
          const hitY = line.y + segY * t;
          const gapX = hitX - cutter.x;
          const gapY = hitY - cutter.y;

          if (gapX * gapX + gapY * gapY < reach) {
            if (cuts < 3) this.spark(hitX, hitY, owner.fighter.color);
            cuts++;
          } else {
            lines[kept++] = line;
          }
        }

        if (cuts > 0) {
          lines.length = kept;
          this.emit('cut', cutter, owner, cuts);
          if (kept === 0 && owner.hadLines && !eliminated.includes(owner)) eliminated.push(owner);
        }
      }
    }

    for (const body of eliminated) this.eliminate(body);
  }

  eliminate(body) {
    body.alive = false;
    body.diedAt = this.time;
    body.lines.length = 0;
    this.burst(body.x, body.y, body.fighter.color, body.r);
    this.popup(body.x, body.y - body.r - 34, `${body.fighter.label.toUpperCase()} OUT`, body.fighter.color, 46, 1.8);
    this.emit('eliminate', body);
  }

  // Effects

  popup(x, y, text, color, size, life) {
    this.popups.push({ x, y, text, color, size, life, maxLife: life });
  }

  spark(x, y, color) {
    if (this.particles.length > LIMITS.particles) return;
    const angle = Math.random() * TAU;
    const velocity = 40 + Math.random() * 120;
    this.particles.push({
      x, y, color,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      size: 2.2, life: 0.3, maxLife: 0.3,
    });
  }

  burst(x, y, color, radius) {
    this.particles.push({ x, y, vx: 0, vy: 0, ring: true, size: radius * 4.5, life: 0.6, maxLife: 0.6, color: '#ffffff' });
    this.particles.push({ x, y, vx: 0, vy: 0, ring: true, size: radius * 7, life: 0.9, maxLife: 0.9, color });

    for (let i = 0; i < 70; i++) {
      const angle = Math.random() * TAU;
      const velocity = 80 + Math.random() * 360;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        size: 2 + Math.random() * 4,
        life: 0.5 + Math.random() * 0.8,
        maxLife: 1.3,
        color: Math.random() < 0.3 ? '#ffffff' : color,
      });
    }
  }

  updateEffects(dt) {
    const damping = Math.exp(-2.5 * dt);

    this.particles = this.particles.filter((p) => {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= damping;
      p.vy *= damping;
      return p.life > 0;
    });

    this.popups = this.popups.filter((p) => {
      p.life -= dt;
      p.y -= 34 * dt;
      return p.life > 0;
    });
  }
}

function setSpeed(body, speed) {
  const current = Math.hypot(body.vx, body.vy) || 1;
  body.vx = (body.vx / current) * speed;
  body.vy = (body.vy / current) * speed;
}

// Pushes a body back inside the ring and reflects any outward velocity.
function keepInside(body) {
  const dx = body.x - CX;
  const dy = body.y - CY;
  const dist = Math.hypot(dx, dy) || 0.0001;
  if (dist + body.r <= R) return;

  const nx = dx / dist;
  const ny = dy / dist;
  body.x = CX + nx * (R - body.r - 0.5);
  body.y = CY + ny * (R - body.r - 0.5);

  const outward = body.vx * nx + body.vy * ny;
  if (outward > 0) {
    body.vx -= 2 * outward * nx;
    body.vy -= 2 * outward * ny;
  }
}
