(() => {
const WIDTH = 960;
const HEIGHT = 540;
const COLORS = { red: '#ef6677', blue: '#5d83e2', green: '#55b981' };
const rand = (min, max) => min + Math.random() * (max - min);
const pick = items => items[Math.floor(Math.random() * items.length)];

function rounded(ctx, x, y, width, height, radius, fill, stroke = null, lineWidth = 1) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) { ctx.lineWidth = lineWidth; ctx.strokeStyle = stroke; ctx.stroke(); }
}

function starPath(ctx, x, y, outer = 17, inner = outer * .48, points = 5) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = -Math.PI / 2 + i * Math.PI / points;
    const radius = i % 2 ? inner : outer;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}

function drawStar(ctx, x, y, radius, rotation = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.shadowColor = '#fff1a2';
  ctx.shadowBlur = radius * 1.1;
  starPath(ctx, 0, 0, radius, radius * .45);
  const fill = ctx.createLinearGradient(0, -radius, 0, radius);
  fill.addColorStop(0, '#fff9b3');
  fill.addColorStop(1, '#ffbd43');
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#fffdf0';
  ctx.stroke();
  ctx.restore();
}

function softText(ctx, text, x, y, size, color, align = 'left', weight = 800) {
  ctx.font = `${weight} ${size}px "Trebuchet MS", system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function makeRooftop(config, hooks) {
  const difficulty = { suave: { speed: 260, hazard: 1.95, gap: 1.35 }, media: { speed: 315, hazard: 1.55, gap: 1.08 }, alta: { speed: 365, hazard: 1.25, gap: .88 } }[config.difficulty];
  const game = {
    timed: true, score: 0, player: { x: 210, feet: 402, vy: 0, jumps: 0, blink: 0 },
    objects: [], particles: [], distance: 0, speed: difficulty.speed, slow: 0,
    hazardClock: 1.1, starClock: .45, invulnerable: 0, ground: 402,
    update(dt) {
      this.distance += this.speed * (this.slow > 0 ? .48 : 1) * dt;
      this.slow = Math.max(0, this.slow - dt);
      this.invulnerable = Math.max(0, this.invulnerable - dt);
      const p = this.player;
      p.vy += 1520 * dt;
      p.feet += p.vy * dt;
      if (p.feet >= this.ground) { p.feet = this.ground; p.vy = 0; p.jumps = 0; }
      p.blink = Math.max(0, p.blink - dt);
      this.hazardClock -= dt;
      this.starClock -= dt;
      if (this.hazardClock <= 0) {
        this.objects.push({ type: 'hazard', x: WIDTH + 45, y: this.ground, w: rand(32, 44), h: rand(32, 47), hit: false });
        this.hazardClock = difficulty.hazard * rand(.78, 1.24);
      }
      if (this.starClock <= 0) {
        const height = pick([this.ground - 75, this.ground - 115, this.ground - 155]);
        this.objects.push({ type: 'star', x: WIDTH + 30, y: height, r: 16, hit: false });
        this.starClock = difficulty.gap * rand(.8, 1.25);
      }
      for (const item of this.objects) {
        item.x -= this.speed * (this.slow > 0 ? .48 : 1) * dt;
        if (!item.hit && item.type === 'star' && Math.abs(item.x - p.x) < 37 && Math.abs(item.y - (p.feet - 54)) < 51) {
          item.hit = true; this.score++; hooks.collect?.(); this.burst(item.x, item.y, '#ffd75f');
        }
        const playerRect = { l: p.x - 18, r: p.x + 20, t: p.feet - 76, b: p.feet - 5 };
        const itemRect = item.type === 'hazard' ? { l: item.x - item.w / 2, r: item.x + item.w / 2, t: item.y - item.h, b: item.y } : null;
        if (!item.hit && item.type === 'hazard' && this.invulnerable <= 0 && playerRect.r > itemRect.l && playerRect.l < itemRect.r && playerRect.b > itemRect.t && playerRect.t < itemRect.b) {
          item.hit = true; this.invulnerable = .7; this.slow = .7; p.blink = .55;
          if (this.score > 0) this.score--;
          hooks.hit?.();
        }
      }
      this.objects = this.objects.filter(item => !item.hit && item.x > -60);
      this.particles = this.particles.filter(particle => (particle.life -= dt) > 0);
      for (const particle of this.particles) { particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vy += 100 * dt; }
    },
    burst(x, y, color) { for (let i = 0; i < 9; i++) this.particles.push({ x, y, vx: rand(-110, 110), vy: rand(-150, 10), life: rand(.3, .65), color }); },
    jump() {
      const p = this.player;
      if (p.jumps >= 2 || (p.jumps === 1 && p.feet >= this.ground - 1)) return;
      p.vy = p.jumps === 0 ? -610 : -545;
      p.jumps++;
      hooks.jump?.();
    },
    pointerDown() { this.jump(); },
    getResult() { return { score: this.score, label: 'Estrellas juntadas', icon: '✦', message: '¡El cielo está lleno de estrellas gracias a vos!' }; },
    getProgress() { return null; },
    draw(ctx, elapsed) {
      drawRooftopBackground(ctx, this.distance, elapsed);
      for (const item of this.objects) {
        if (item.type === 'star') drawStar(ctx, item.x, item.y, 16, Math.sin(elapsed * 3 + item.x) * .12);
        else drawRoofHazard(ctx, item.x, item.y, item.w, item.h);
      }
      drawKid(ctx, this.player.x, this.player.feet, elapsed, this.player.blink > 0);
      for (const particle of this.particles) { ctx.globalAlpha = Math.min(1, particle.life * 2); ctx.fillStyle = particle.color; ctx.beginPath(); ctx.arc(particle.x, particle.y, 3 + particle.life * 3, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
      if (this.slow > 0) { ctx.fillStyle = '#fff5db22'; ctx.fillRect(0, 0, WIDTH, HEIGHT); }
    },
  };
  return game;
}

function drawRooftopBackground(ctx, distance, elapsed) {
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, '#9fdcf2'); sky.addColorStop(.66, '#def5f3'); sky.addColorStop(1, '#ffdda9');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#fff6cf'; ctx.beginPath(); ctx.arc(790, 96, 39, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 5; i++) {
    const x = ((i * 235 - distance * .13) % 1180 + 1180) % 1180 - 100;
    const y = 64 + (i % 3) * 53;
    ctx.fillStyle = '#ffffff88'; ctx.beginPath(); ctx.ellipse(x, y, 43, 13, 0, 0, Math.PI * 2); ctx.ellipse(x + 25, y - 5, 28, 17, 0, 0, Math.PI * 2); ctx.fill();
  }
  const skyline = [95, 150, 112, 185, 125, 168, 100, 145, 196, 125];
  for (let i = 0; i < 13; i++) {
    const w = 82 + (i % 3) * 11;
    const x = ((i * 100 - distance * .24) % 1300 + 1300) % 1300 - 120;
    const h = skyline[i % skyline.length];
    ctx.fillStyle = i % 2 ? '#a9b3d4' : '#c2aac6';
    ctx.fillRect(x, 385 - h, w, h + 28);
    ctx.fillStyle = '#fff4bd99';
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) ctx.fillRect(x + 12 + col * 22, 385 - h + 18 + row * 30, 9, 12);
  }
  ctx.fillStyle = '#7587ac'; ctx.fillRect(0, 396, WIDTH, 38);
  ctx.fillStyle = '#445980'; ctx.fillRect(0, 433, WIDTH, 107);
  ctx.fillStyle = '#f7ca82'; ctx.fillRect(0, 396, WIDTH, 7);
  const stripe = ((distance * .7) % 92);
  for (let i = -1; i < 12; i++) { ctx.fillStyle = '#a8bbd1'; ctx.fillRect(i * 92 - stripe, 451, 49, 6); }
  ctx.fillStyle = '#ffffff55'; ctx.fillRect(0, 434, WIDTH, 3);
}

function drawRoofHazard(ctx, x, y, w, h) {
  ctx.save(); ctx.translate(x, y);
  ctx.shadowColor = '#26395f44'; ctx.shadowBlur = 9; ctx.shadowOffsetY = 5;
  rounded(ctx, -w / 2, -h, w, h, 7, '#f38c68', '#fff0d5', 2);
  ctx.shadowColor = 'transparent';
  rounded(ctx, -w / 2 + 5, -h + 7, w - 10, h - 14, 4, '#f8ac78');
  ctx.fillStyle = '#d97064'; ctx.fillRect(-w / 2 + 3, -h + 4, w - 6, 6);
  ctx.restore();
}

function drawKid(ctx, x, feet, elapsed, blink) {
  ctx.save(); ctx.translate(x, feet);
  if (blink && Math.floor(elapsed * 18) % 2) ctx.globalAlpha = .35;
  const airborne = feet < 399;
  const legSwing = airborne ? -.35 : Math.sin(elapsed * 17) * .48;
  ctx.lineCap = 'round';
  // legs and sneakers
  ctx.strokeStyle = '#384a75'; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(-4, -23); ctx.lineTo(-8 + legSwing * 12, -7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(8, -23); ctx.lineTo(12 - legSwing * 12, -7); ctx.stroke();
  ctx.strokeStyle = '#f6c45d'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(-8 + legSwing * 12, -7); ctx.lineTo(-18 + legSwing * 12, -4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(12 - legSwing * 12, -7); ctx.lineTo(21 - legSwing * 12, -4); ctx.stroke();
  // body and arms
  rounded(ctx, -15, -56, 31, 38, 11, '#ed6f7c', '#fff4e6', 2);
  ctx.strokeStyle = '#edb18e'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(-12, -49); ctx.lineTo(-23, -35 + Math.sin(elapsed * 16) * 4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(13, -49); ctx.lineTo(23, -39 - Math.sin(elapsed * 16) * 4); ctx.stroke();
  // head
  ctx.fillStyle = '#f3bd96'; ctx.beginPath(); ctx.arc(1, -68, 16, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4b3d58'; ctx.beginPath(); ctx.arc(0, -73, 16, Math.PI * 1.08, Math.PI * 2.05); ctx.lineTo(15, -67); ctx.quadraticCurveTo(5, -76, -3, -65); ctx.fill();
  ctx.fillStyle = '#36415f'; ctx.beginPath(); ctx.arc(7, -68, 1.7, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#bd6e63'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(8, -62, 4, .2, 1.4); ctx.stroke();
  ctx.restore();
}

function makeTruck(config, hooks) {
  const difficulty = { suave: { speed: 285, interval: 1.1 }, media: { speed: 340, interval: .88 }, alta: { speed: 395, interval: .7 } }[config.difficulty];
  return {
    timed: true, score: 0, lane: 1, laneY: laneCenter(1), objects: [], spawnClock: .55,
    speed: difficulty.speed, slow: 0, hitCooldown: 0, particles: [],
    update(dt) {
      this.slow = Math.max(0, this.slow - dt); this.hitCooldown = Math.max(0, this.hitCooldown - dt);
      const targetY = laneCenter(this.lane);
      this.laneY += (targetY - this.laneY) * Math.min(1, dt * 9);
      this.spawnClock -= dt;
      if (this.spawnClock <= 0) {
        const type = Math.random() < .48 ? 'star' : 'meteor';
        this.objects.push({ type, lane: Math.floor(Math.random() * 3), x: WIDTH + 35, checked: false, wobble: rand(0, Math.PI * 2) });
        this.spawnClock = difficulty.interval * rand(.76, 1.22);
      }
      for (const obj of this.objects) {
        obj.x -= this.speed * (this.slow > 0 ? .48 : 1) * dt;
        if (obj.checked || obj.x > 214) continue;
        if (Math.abs(obj.x - 172) < 31 && Math.abs(laneCenter(obj.lane) - this.laneY) < 37) {
          obj.checked = true;
          if (obj.type === 'star') { this.score++; hooks.collect?.(); this.burst(obj.x, laneCenter(obj.lane), '#ffe178'); }
          else { this.slow = .72; this.hitCooldown = .72; if (this.score > 0) this.score--; hooks.hit?.(); }
        }
      }
      this.objects = this.objects.filter(obj => !obj.checked && obj.x > -50);
      this.particles = this.particles.filter(p => (p.life -= dt) > 0);
      for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 110 * dt; }
    },
    burst(x, y, color) { for (let i = 0; i < 9; i++) this.particles.push({ x, y, vx: rand(-110, 110), vy: rand(-120, 30), life: rand(.3, .65), color }); },
    pointerDown(point) { this.lane = Math.max(0, Math.min(2, Math.floor((point.y - 85) / 130))); hooks.lane?.(); },
    getResult() { return { score: this.score, label: 'Estrellas juntadas', icon: '✦', message: '¡Piloto espacial de primera!' }; },
    getProgress() { return null; },
    draw(ctx, elapsed) {
      drawSpaceBackground(ctx, elapsed);
      const bands = [laneCenter(0), laneCenter(1), laneCenter(2)];
      for (let i = 0; i < 3; i++) {
        const cy = bands[i];
        ctx.fillStyle = i === this.lane ? '#6ed7d922' : '#8194d014'; ctx.fillRect(0, cy - 55, WIDTH, 110);
        ctx.strokeStyle = i === this.lane ? '#7ee8e577' : '#d3d9ff33'; ctx.lineWidth = i === this.lane ? 3 : 1.5;
        ctx.setLineDash([22, 17]); ctx.beginPath(); ctx.moveTo(0, cy + 50); ctx.lineTo(WIDTH, cy + 50); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#ffffff88'; ctx.beginPath(); ctx.arc(33, cy, 4, 0, Math.PI * 2); ctx.fill();
      }
      for (const obj of this.objects) {
        const y = laneCenter(obj.lane) + Math.sin(elapsed * 3 + obj.wobble) * 7;
        if (obj.type === 'star') drawStar(ctx, obj.x, y, 18, Math.sin(elapsed * 2 + obj.wobble) * .12);
        else drawMeteor(ctx, obj.x, y, elapsed + obj.wobble);
      }
      drawTruck(ctx, 169, this.laneY, elapsed, this.hitCooldown > 0);
      for (const p of this.particles) { ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 3 + p.life * 3, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
      if (this.slow > 0) { ctx.fillStyle = '#ffbc8730'; ctx.fillRect(0, 0, WIDTH, HEIGHT); }
      softText(ctx, 'TOCA UN CARRIL', 790, 505, 13, '#d5e1ff', 'right', 900);
    },
  };
}

function laneCenter(lane) { return [150, 275, 400][lane]; }

function drawSpaceBackground(ctx, elapsed) {
  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bg.addColorStop(0, '#17234d'); bg.addColorStop(.55, '#333a77'); bg.addColorStop(1, '#63568c');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  for (let i = 0; i < 68; i++) {
    const x = (i * 137 + Math.sin(i * 22) * 30 - elapsed * (11 + i % 4 * 7)) % WIDTH;
    const y = (i * 83) % HEIGHT;
    const alpha = .3 + (Math.sin(elapsed * 2 + i) + 1) * .3;
    ctx.fillStyle = `rgba(255,255,236,${alpha})`; ctx.beginPath(); ctx.arc((x + WIDTH) % WIDTH, y, i % 7 === 0 ? 2 : 1.2, 0, Math.PI * 2); ctx.fill();
  }
  const planetX = 795 - (elapsed * 8 % 1150);
  ctx.fillStyle = '#ee9a9a'; ctx.beginPath(); ctx.arc(planetX, 68, 36, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffcc9b'; ctx.beginPath(); ctx.ellipse(planetX, 69, 54, 11, -.18, 0, Math.PI * 2); ctx.strokeStyle = '#f6c99a'; ctx.lineWidth = 4; ctx.stroke();
  ctx.fillStyle = '#edbd94'; ctx.beginPath(); ctx.arc(95, 475, 88, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#d795a0'; ctx.beginPath(); ctx.arc(97, 487, 66, Math.PI, 0); ctx.fill();
  const glow = ctx.createRadialGradient(470, 275, 20, 470, 275, 420); glow.addColorStop(0, '#b4b5ff08'); glow.addColorStop(1, '#a3baff16'); ctx.fillStyle = glow; ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawMeteor(ctx, x, y, angle) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(.45);
  const tail = ctx.createLinearGradient(-48, 0, 6, 0); tail.addColorStop(0, '#ffad6a00'); tail.addColorStop(1, '#ffbd78aa');
  ctx.fillStyle = tail; ctx.beginPath(); ctx.moveTo(-55, -10); ctx.lineTo(4, -18); ctx.lineTo(9, 15); ctx.lineTo(-55, 9); ctx.fill();
  ctx.shadowColor = '#ff9c5b'; ctx.shadowBlur = 14; ctx.fillStyle = '#f79b64'; ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = '#c36e68'; ctx.beginPath(); ctx.arc(-5, -4, 4, 0, Math.PI * 2); ctx.arc(6, 6, 3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

function drawTruck(ctx, x, y, elapsed, hit) {
  ctx.save(); ctx.translate(x, y + Math.sin(elapsed * 5) * 3);
  ctx.fillStyle = '#62e4df'; ctx.shadowColor = hit ? '#ff8467' : '#60e9ef'; ctx.shadowBlur = hit ? 5 : 18;
  ctx.beginPath(); ctx.moveTo(-51, 0); ctx.lineTo(-24, -20); ctx.lineTo(28, -18); ctx.lineTo(50, 0); ctx.lineTo(27, 18); ctx.lineTo(-25, 18); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = '#e0ffff'; ctx.beginPath(); ctx.moveTo(-12, -10); ctx.lineTo(18, -10); ctx.lineTo(31, 0); ctx.lineTo(-12, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fda75d'; ctx.beginPath(); ctx.arc(-29, 20, 5, 0, Math.PI * 2); ctx.arc(28, 20, 5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c2fff8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-45, 0); ctx.lineTo(41, 0); ctx.stroke();
  ctx.restore();
}

function makeSorting(config, hooks) {
  const count = Number(config.count) || 15;
  const boxes = [
    { color: 'red', label: 'ROJO', x: 760, y: 104, w: 166, h: 100 },
    { color: 'blue', label: 'AZUL', x: 760, y: 220, w: 166, h: 100 },
    { color: 'green', label: 'VERDE', x: 760, y: 336, w: 166, h: 100 },
  ];
  const items = [];
  const colors = ['red', 'blue', 'green'];
  const cols = Math.min(6, Math.ceil(Math.sqrt(count * 1.4)));
  const rows = Math.ceil(count / cols);
  const cellW = 680 / cols;
  const cellH = 380 / rows;
  for (let i = 0; i < count; i++) {
    const col = i % cols, row = Math.floor(i / cols);
    const homeX = 48 + cellW * (col + .5) + rand(-10, 10);
    const homeY = 75 + cellH * (row + .5) + rand(-8, 8);
    items.push({ id: i, color: colors[i % 3], shape: i % 3, x: homeX, y: homeY, homeX, homeY, size: Math.max(18, Math.min(26, cellH * .29, cellW * .25)), dragging: false });
  }
  // Mix the palette and positions so every round feels a little different.
  for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [items[i].color, items[j].color] = [items[j].color, items[i].color]; }
  return {
    timed: false, score: 0, items, boxes, count, drag: null, feedback: null, feedbackTimer: 0,
    update(dt) { if (this.feedbackTimer > 0) { this.feedbackTimer -= dt; if (this.feedbackTimer <= 0) this.feedback = null; } },
    pointerDown(point) {
      let target = null;
      for (let i = this.items.length - 1; i >= 0; i--) { const item = this.items[i]; if (Math.hypot(point.x - item.x, point.y - item.y) < item.size + 10) { target = item; break; } }
      if (target) { this.drag = target; target.dragging = true; target.x = point.x; target.y = point.y; hooks.pick?.(); }
    },
    pointerMove(point) { if (this.drag) { this.drag.x = point.x; this.drag.y = point.y; } },
    pointerUp(point) {
      if (!this.drag) return;
      const item = this.drag; item.dragging = false; this.drag = null;
      const box = this.boxes.find(candidate => point.x >= candidate.x - 12 && point.x <= candidate.x + candidate.w + 12 && point.y >= candidate.y - 8 && point.y <= candidate.y + candidate.h + 8);
      if (!box) { item.x = item.homeX; item.y = item.homeY; return; }
      if (box.color === item.color) {
        this.items = this.items.filter(current => current !== item);
        this.score++;
        this.feedback = { text: '¡Muy bien!', color: COLORS[item.color], x: box.x + box.w / 2, y: box.y + 22, good: true };
        this.feedbackTimer = .65;
        hooks.correct?.();
      } else {
        this.score--;
        this.feedback = { text: '¡Casi! Prueba otra caja', color: '#e36b76', x: box.x + box.w / 2, y: box.y + 22, good: false };
        this.feedbackTimer = .8;
        item.x = item.homeX; item.y = item.homeY;
        hooks.wrong?.();
      }
    },
    isComplete() { return this.items.length === 0; },
    getProgress() { return `${count - this.items.length}/${count}`; },
    getResult() { return { score: this.score, label: 'Puntos finales', icon: '●', message: '¡Qué bien ordenaste todo! ¡Buen ojo!' }; },
    draw(ctx, elapsed) {
      drawSortBackground(ctx, elapsed);
      softText(ctx, 'ARRASTRA CADA OBJETO A SU COLOR', 35, 34, 15, '#56678e', 'left', 950);
      for (const box of this.boxes) drawSortBox(ctx, box, this.drag?.color === box.color);
      for (const item of this.items) if (item !== this.drag) drawSortItem(ctx, item, false);
      if (this.drag) drawSortItem(ctx, this.drag, true);
      if (this.feedback && this.feedbackTimer > 0) {
        ctx.save(); ctx.globalAlpha = Math.min(1, this.feedbackTimer * 2); softText(ctx, this.feedback.text, this.feedback.x, this.feedback.y, 14, this.feedback.color, 'center', 1000); ctx.restore();
      }
      if (this.items.length === 0) {
        ctx.fillStyle = '#fffdf4bb'; ctx.fillRect(0, 0, WIDTH, HEIGHT);
        softText(ctx, '¡TODO EN SU LUGAR!', WIDTH / 2, HEIGHT / 2 - 12, 32, '#394c7a', 'center', 1000);
        softText(ctx, '¡Qué buen trabajo!', WIDTH / 2, HEIGHT / 2 + 27, 18, '#68779a', 'center', 850);
      }
    },
  };
}

function drawSortBackground(ctx, elapsed) {
  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT); bg.addColorStop(0, '#fff3d7'); bg.addColorStop(1, '#fbe3ed');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#fff9eb'; ctx.beginPath(); ctx.ellipse(340, 280, 480, 260, 0, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 12; i++) { ctx.fillStyle = i % 2 ? '#f4d9e388' : '#d9ebd488'; ctx.beginPath(); ctx.arc((i * 91 + elapsed * 5) % WIDTH, 48 + (i * 67) % 450, 3 + i % 3, 0, Math.PI * 2); ctx.fill(); }
}

function drawSortBox(ctx, box, active) {
  const color = COLORS[box.color];
  ctx.save();
  ctx.shadowColor = `${color}44`; ctx.shadowBlur = active ? 23 : 9; ctx.shadowOffsetY = 5;
  rounded(ctx, box.x, box.y, box.w, box.h, 17, `${color}22`, active ? color : `${color}88`, active ? 4 : 2);
  ctx.shadowColor = 'transparent';
  rounded(ctx, box.x + 7, box.y + 13, box.w - 14, box.h - 20, 11, `${color}22`);
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(box.x - 5, box.y + 4); ctx.lineTo(box.x + box.w + 5, box.y + 4); ctx.lineTo(box.x + box.w - 2, box.y + 25); ctx.lineTo(box.x + 3, box.y + 25); ctx.closePath(); ctx.fill();
  softText(ctx, box.label, box.x + box.w / 2, box.y + box.h - 19, 13, color, 'center', 1000);
  ctx.restore();
}

function drawSortItem(ctx, item, dragging) {
  const color = COLORS[item.color];
  ctx.save(); ctx.translate(item.x, item.y); if (dragging) ctx.scale(1.15, 1.15);
  ctx.shadowColor = `${color}55`; ctx.shadowBlur = dragging ? 20 : 7; ctx.shadowOffsetY = dragging ? 9 : 4;
  ctx.fillStyle = color; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
  if (item.shape === 0) { ctx.beginPath(); ctx.arc(0, 0, item.size, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  else if (item.shape === 1) { rounded(ctx, -item.size, -item.size, item.size * 2, item.size * 2, 7, color, '#fff', 3); }
  else { ctx.beginPath(); ctx.moveTo(0, -item.size - 2); ctx.lineTo(item.size + 2, item.size); ctx.lineTo(-item.size - 2, item.size); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ctx.shadowColor = 'transparent'; ctx.fillStyle = '#ffffff66'; ctx.beginPath(); ctx.ellipse(-item.size * .32, -item.size * .39, item.size * .34, item.size * .17, -.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function createGameMode(id, config, hooks) {
  if (id === 'rooftop') return makeRooftop(config, hooks);
  if (id === 'space') return makeTruck(config, hooks);
  if (id === 'sorting') return makeSorting(config, hooks);
  throw new Error(`Modo desconocido: ${id}`);
}

window.createGameMode = createGameMode;
})();
