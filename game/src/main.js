// Two of a Kind — a spot-the-difference game.
// Two near-identical procedurally drawn scenes side by side. Click the differences.

const W = 1280, H = 760;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

function fit() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', fit);
fit();

// ---------------------------------------------------------------- rng
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- palette
const PAL = {
  sky: '#8fd3f4', skyDeep: '#5eb8e8', sun: '#ffe08a', sunCore: '#ffd166',
  hillFar: '#7bc47f', hillNear: '#4e9f5a', grass: '#3f8a4c',
  trunk: '#8b5a2b', leaf: '#2f7d4f', leafLight: '#46a06a',
  wall: '#f4e4c1', roof: '#c1573f', door: '#7a4a2b', window: '#bfe6ff',
  petal: '#f06292', petal2: '#ba68c8', bird: '#37474f', cloud: '#ffffff',
};

// ---------------------------------------------------------------- scene
// Each item: {kind, x, y, s, c, ...}. A difference mutates one item.
function buildScene(seed) {
  const r = mulberry32(seed);
  const items = [];
  const add = (o) => items.push(o);

  // clouds
  const nClouds = 3 + Math.floor(r() * 2);
  for (let i = 0; i < nClouds; i++) {
    add({ kind: 'cloud', x: 60 + r() * 380, y: 40 + r() * 90, s: 0.7 + r() * 0.6, c: PAL.cloud });
  }
  // sun
  add({ kind: 'sun', x: 330, y: 78, s: 1, c: PAL.sun });

  // far hills
  add({ kind: 'hill', x: 0, y: 300, s: 1, c: PAL.hillFar, w: 500, h: 120 });
  add({ kind: 'hill', x: 180, y: 310, s: 1, c: PAL.hillFar, w: 460, h: 100 });

  // house
  const hx = 150, hy = 300;
  add({ kind: 'house', x: hx, y: hy, s: 1, c: PAL.wall, roof: PAL.roof, door: PAL.door, win: PAL.window });

  // trees
  const nTrees = 3 + Math.floor(r() * 2);
  for (let i = 0; i < nTrees; i++) {
    add({ kind: 'tree', x: 40 + i * 90 + r() * 30, y: 330 + r() * 20, s: 0.8 + r() * 0.35, c: PAL.leaf });
  }

  // flowers
  const nFlowers = 7 + Math.floor(r() * 3);
  for (let i = 0; i < nFlowers; i++) {
    add({ kind: 'flower', x: 40 + r() * 420, y: 400 + r() * 60, s: 0.8 + r() * 0.5, c: r() > 0.5 ? PAL.petal : PAL.petal2 });
  }

  // birds
  const nBirds = 2 + Math.floor(r() * 3);
  for (let i = 0; i < nBirds; i++) {
    add({ kind: 'bird', x: 250 + r() * 220, y: 60 + r() * 70, s: 0.8 + r() * 0.4, c: PAL.bird });
  }
  return items;
}

// Pick `n` items to mutate, and build the mutation for each.
function makeDifferences(items, seed, n) {
  const r = mulberry32(seed ^ 0x9e3779b9);
  const pool = items.map((it, i) => i).filter(i => items[i].kind !== 'sky');
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const diffs = [];
  const kinds = ['color', 'gone', 'bigger', 'moved', 'extra'];
  for (let k = 0; k < n && k < pool.length; k++) {
    const idx = pool[k];
    const kind = kinds[Math.floor(r() * kinds.length)];
    diffs.push({ idx, kind, r: r });
  }
  return diffs;
}

function applyDiff(item, diff) {
  const v = diff.r();
  switch (diff.kind) {
    case 'color': return { ...item, c: shiftColor(item.c, v) };
    case 'gone': return { ...item, hidden: true };
    case 'bigger': return { ...item, s: (item.s || 1) * (1.5 + v * 0.4) };
    case 'moved': return { ...item, x: item.x + (v > 0.5 ? 34 : -34), y: item.y + (v > 0.5 ? 22 : -18) };
    case 'extra': return { ...item, s: (item.s || 1) * 0.55, c: shiftColor(item.c, 1 - v) };
  }
  return item;
}

function shiftColor(hex, v) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (v < 0.34) { r = Math.min(255, r + 70); g = Math.max(0, g - 30); }
  else if (v < 0.67) { b = Math.min(255, b + 80); r = Math.max(0, r - 40); }
  else { g = Math.min(255, g + 70); b = Math.max(0, b - 40); }
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// ---------------------------------------------------------------- draw
function drawCloud(c, x, y, s) {
  c.beginPath();
  c.arc(x, y, 22 * s, 0, Math.PI * 2);
  c.arc(x + 26 * s, y + 6 * s, 17 * s, 0, Math.PI * 2);
  c.arc(x - 25 * s, y + 7 * s, 15 * s, 0, Math.PI * 2);
  c.fill();
}

function drawTree(c, x, y, s, col) {
  c.fillStyle = PAL.trunk;
  c.fillRect(x - 5 * s, y - 26 * s, 10 * s, 30 * s);
  c.fillStyle = col;
  c.beginPath();
  c.arc(x, y - 40 * s, 22 * s, 0, Math.PI * 2);
  c.arc(x - 16 * s, y - 28 * s, 15 * s, 0, Math.PI * 2);
  c.arc(x + 16 * s, y - 28 * s, 15 * s, 0, Math.PI * 2);
  c.fill();
}

function drawFlower(c, x, y, s, col) {
  c.fillStyle = col;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    c.beginPath();
    c.arc(x + Math.cos(a) * 6 * s, y + Math.sin(a) * 6 * s, 4.5 * s, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = '#ffd166';
  c.beginPath(); c.arc(x, y, 3.2 * s, 0, Math.PI * 2); c.fill();
}

function drawBird(c, x, y, s, col) {
  c.strokeStyle = col; c.lineWidth = 2 * s; c.lineCap = 'round';
  c.beginPath();
  c.moveTo(x - 9 * s, y);
  c.quadraticCurveTo(x - 4 * s, y - 6 * s, x, y);
  c.quadraticCurveTo(x + 4 * s, y - 6 * s, x + 9 * s, y);
  c.stroke();
}

function drawHouse(c, o) {
  const { x, y } = o;
  c.fillStyle = o.c;
  c.fillRect(x, y, 96, 66);
  c.fillStyle = o.roof;
  c.beginPath();
  c.moveTo(x - 12, y); c.lineTo(x + 48, y - 46); c.lineTo(x + 108, y); c.closePath(); c.fill();
  c.fillStyle = o.door;
  c.fillRect(x + 38, y + 28, 22, 38);
  c.fillStyle = o.win;
  c.fillRect(x + 12, y + 14, 20, 18);
  c.fillRect(x + 64, y + 14, 20, 18);
}

function drawScene(c, ox, oy, items, scale) {
  c.save();
  c.beginPath(); c.rect(ox, oy, 500 * scale, 460 * scale); c.clip();
  c.translate(ox, oy); c.scale(scale, scale);

  // sky
  const g = c.createLinearGradient(0, 0, 0, 320);
  g.addColorStop(0, PAL.skyDeep); g.addColorStop(1, PAL.sky);
  c.fillStyle = g; c.fillRect(0, 0, 500, 320);

  // ground
  c.fillStyle = PAL.grass; c.fillRect(0, 320, 500, 140);
  c.fillStyle = PAL.hillNear;
  c.beginPath(); c.moveTo(0, 330); c.quadraticCurveTo(250, 290, 500, 330); c.lineTo(500, 360); c.lineTo(0, 360); c.fill();

  for (const it of items) {
    if (it.hidden) continue;
    c.fillStyle = it.c || '#000';
    switch (it.kind) {
      case 'cloud': drawCloud(c, it.x, it.y, it.s); break;
      case 'sun':
        c.fillStyle = it.c; c.beginPath(); c.arc(it.x, it.y, 30 * it.s, 0, Math.PI * 2); c.fill();
        c.fillStyle = PAL.sunCore; c.beginPath(); c.arc(it.x, it.y, 20 * it.s, 0, Math.PI * 2); c.fill();
        break;
      case 'hill':
        c.fillStyle = it.c; c.beginPath();
        c.moveTo(it.x, it.y + 60); c.quadraticCurveTo(it.x + it.w / 2, it.y - it.h, it.x + it.w, it.y + 60);
        c.closePath(); c.fill(); break;
      case 'house': drawHouse(c, it); break;
      case 'tree': drawTree(c, it.x, it.y, it.s, it.c); break;
      case 'flower': drawFlower(c, it.x, it.y, it.s, it.c); break;
      case 'bird': drawBird(c, it.x, it.y, it.s, it.c); break;
    }
  }
  c.restore();
}

// ---------------------------------------------------------------- state
const state = {
  level: 0,
  seed: 1,
  items: [],
  diffs: [],
  found: [],
  wrong: [],
  misses: 0,
  done: false,
  started: false,
};

function setupLevel(level) {
  state.level = level;
  state.seed = 1000 + level * 137;
  state.items = buildScene(state.seed);
  state.diffs = makeDifferences(state.items, state.seed, 5 + Math.min(level, 3));
  state.found = [];
  state.wrong = [];
  state.misses = 0;
  state.done = false;
  state.started = true;
  say(`Level ${level + 1}. ${state.diffs.length} differences.`);
}

function say(t) { statusEl.textContent = t; }

// hotspot centre of a difference, in scene-local coords
function diffPoint(d) {
  const it = state.items[d.idx];
  return { x: it.x, y: it.y - (it.kind === 'tree' ? 40 * (it.s || 1) : 0) };
}

function layout() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const scale = Math.min((vw - 60) / 1080, (vh - 150) / 500);
  const totalW = 500 * scale * 2 + 40 * scale;
  const ox = (vw - totalW) / 2;
  const oy = (vh - 460 * scale) / 2 + 20;
  return { scale, ox, oy, gap: 40 * scale };
}

function toScene(px, py) {
  const L = layout();
  const local = { x: px, y: py };
  // left panel
  let sx = (local.x - L.ox) / L.scale;
  let sy = (local.y - L.oy) / L.scale;
  if (sx >= 0 && sx <= 500 && sy >= 0 && sy <= 460) return { panel: 0, x: sx, y: sy };
  // right panel
  sx = (local.x - (L.ox + 500 * L.scale + L.gap)) / L.scale;
  sy = (local.y - L.oy) / L.scale;
  if (sx >= 0 && sx <= 500 && sy >= 0 && sy <= 460) return { panel: 1, x: sx, y: sy };
  return null;
}

function handleClick(ev) {
  if (!state.started) setupLevel(0);
  if (state.done) {
    if (state.level < 2) setupLevel(state.level + 1);
    else { state.level = 0; setupLevel(0); }
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const hit = toScene(ev.clientX - rect.left, ev.clientY - rect.top);
  if (!hit) return;

  let best = -1, bestD = 1e9;
  state.diffs.forEach((d, i) => {
    if (state.found.includes(i)) return;
    const p = diffPoint(d);
    const dx = p.x - hit.x, dy = p.y - hit.y;
    const dist = Math.hypot(dx, dy);
    const radius = 40 + 34 * (state.items[d.idx].s || 1);
    if (dist < radius && dist < bestD) { bestD = dist; best = i; }
  });

  if (best >= 0) {
    state.found.push(best);
    say(`Found ${state.found.length} of ${state.diffs.length}.`);
    if (state.found.length === state.diffs.length) {
      state.done = true;
      say(`Level ${state.level + 1} clear. Click to continue.`);
    }
  } else {
    state.misses++;
    state.wrong.push({ x: hit.x, y: hit.y, t: performance.now(), panel: hit.panel });
    if (state.wrong.length > 6) state.wrong.shift();
    say(`Not quite. ${state.diffs.length - state.found.length} still hidden.`);
  }
}

canvas.addEventListener('click', handleClick);
canvas.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') setupLevel(state.level);
}) ;

// ---------------------------------------------------------------- frame
function drawMarker(c, x, y, scale, colour) {
  c.strokeStyle = colour; c.lineWidth = 3 / scale;
  c.beginPath(); c.arc(x, y, 26, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.arc(x, y, 20, 0, Math.PI * 2); c.stroke();
}

function frame(now) {
  const vw = window.innerWidth, vh = window.innerHeight;
  ctx.clearRect(0, 0, vw, vh);
  ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, vw, vh);

  if (!state.started) setupLevel(0);

  const L = layout();
  const itemsA = state.items;
  const itemsB = state.items.map((it, i) => {
    const d = state.diffs.find((dd) => dd.idx === i);
    return d ? applyDiff(it, d) : it;
  });

  // panels
  drawScene(ctx, L.ox, L.oy, itemsA, L.scale);
  drawScene(ctx, L.ox + 500 * L.scale + L.gap, L.oy, itemsB, L.scale);

  // frames
  ctx.strokeStyle = '#2a3444'; ctx.lineWidth = 2;
  ctx.strokeRect(L.ox, L.oy, 500 * L.scale, 460 * L.scale);
  ctx.strokeRect(L.ox + 500 * L.scale + L.gap, L.oy, 500 * L.scale, 460 * L.scale);

  // found markers on both panels
  const nowMs = now || 0;
  for (const i of state.found) {
    const p = diffPoint(state.diffs[i]);
    ctx.save(); ctx.translate(L.ox, L.oy); ctx.scale(L.scale, L.scale);
    drawMarker(ctx, p.x, p.y, L.scale, '#4ade80');
    ctx.restore();
    ctx.save(); ctx.translate(L.ox + 500 * L.scale + L.gap, L.oy); ctx.scale(L.scale, L.scale);
    drawMarker(ctx, p.x, p.y, L.scale, '#4ade80');
    ctx.restore();
  }

  // wrong flash
  state.wrong = state.wrong.filter((w) => nowMs - w.t < 600);
  for (const w of state.wrong) {
    const a = 1 - (nowMs - w.t) / 600;
    const ox = w.panel === 0 ? L.ox : L.ox + 500 * L.scale + L.gap;
    ctx.save(); ctx.globalAlpha = a * 0.9; ctx.strokeStyle = '#f87171'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ox + w.x * L.scale, L.oy + w.y * L.scale, 18, 0, Math.PI * 2);
    ctx.stroke(); ctx.restore();
  }

  // ---- HUD
  const remaining = state.diffs.length - state.found.length;
  ctx.save();
  ctx.font = '600 26px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = '#e6edf3';
  ctx.textAlign = 'center';
  ctx.fillText('Two of a Kind', vw / 2, 46);
  ctx.font = '500 17px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = '#8b98a9';
  ctx.fillText(`Level ${state.level + 1} of 3`, vw / 2, 74);

  // counter pill
  const label = state.done
    ? (state.level < 2 ? 'Level clear — click to continue' : 'All levels clear — click to play again')
    : `${remaining} still hidden`;
  ctx.font = '600 20px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  const tw = ctx.measureText(label).width;
  const pw = tw + 44, ph = 44, px = vw / 2 - pw / 2, py = vh - 74;
  ctx.fillStyle = state.done ? 'rgba(74,222,128,0.16)' : 'rgba(255,255,255,0.07)';
  ctx.strokeStyle = state.done ? 'rgba(74,222,128,0.5)' : 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 1.5;
  roundRect(px, py, pw, ph, 22);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = state.done ? '#86efac' : '#cbd5e1';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, vw / 2, py + ph / 2 + 1);
  ctx.restore();

  // progress dots
  ctx.save();
  const dotY = 100, dotR = 5, gapD = 18;
  const total = state.diffs.length;
  const startX = vw / 2 - ((total - 1) * gapD) / 2;
  for (let i = 0; i < total; i++) {
    ctx.beginPath();
    ctx.arc(startX + i * gapD, dotY, dotR, 0, Math.PI * 2);
    ctx.fillStyle = i < state.found.length ? '#4ade80' : 'rgba(255,255,255,0.18)';
    ctx.fill();
  }
  ctx.restore();

  requestAnimationFrame(frame);
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------------------------------------------------------------- shot mode (for screenshots)
// ?shot=start|play|end&seed=1  — renders a deterministic frame for capture.
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  const seedOverride = Number(params.get('seed') || 1);
  setupLevel(0);
  if (shot === 'play' || shot === 'end') {
    const n = shot === 'end' ? state.diffs.length : Math.max(1, Math.floor(state.diffs.length / 2));
    for (let i = 0; i < n; i++) state.found.push(i);
    if (shot === 'end') { state.done = true; state.level = 1; }
  }
  state.seed = seedOverride;
  requestAnimationFrame(frame);
  setTimeout(() => { window.__shotReady = true; }, 400);
} else {
  requestAnimationFrame(frame);
}

// expose a tiny hook for automated capture
window.__game = { state, setupLevel, frame };