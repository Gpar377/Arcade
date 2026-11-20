/* Asteroids: vector-drawn, wrap-around space. */
(function () {
  const cv = document.getElementById('gameCanvas');
  const g = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const $ = id => document.getElementById(id);
  const keys = {};
  let ship, rocks, shots, bits, score, lives, wave, best = 0, state = 'ready', last = 0, fireCool = 0, respawn = 0, paused = false;

  try { best = +localStorage.getItem('asteroids:best') || 0; } catch (e) {}

  const rnd = (a, b) => a + Math.random() * (b - a);
  const wrap = o => { o.x = (o.x + W) % W; o.y = (o.y + H) % H; };

  function makeRock(x, y, size) {
    const speed = { 3: 40, 2: 70, 1: 110 }[size] * (1 + wave * 0.06);
    const a = rnd(0, Math.PI * 2);
    const pts = Array.from({ length: 11 }, (_, k) => ({ a: (k / 11) * Math.PI * 2, r: rnd(0.72, 1.08) }));
    return { x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: { 3: 46, 2: 26, 1: 14 }[size], size, rot: rnd(-1, 1), ang: 0, pts };
  }

  function newShip() { return { x: W / 2, y: H / 2, vx: 0, vy: 0, a: -Math.PI / 2, safe: 2.5, thrust: false }; }

  function spawnWave() {
    wave++;
    const n = Math.min(3 + wave, 11);
    for (let k = 0; k < n; k++) {
      let x, y;
      do { x = rnd(0, W); y = rnd(0, H); } while (Math.hypot(x - ship.x, y - ship.y) < 170);
      rocks.push(makeRock(x, y, 3));
    }
    hud();
  }

  function start() {
    ship = newShip(); rocks = []; shots = []; bits = []; score = 0; lives = 3; wave = 0; respawn = 0; paused = false;
    spawnWave();
    state = 'play';
    $('gameOver').style.display = 'none';
    $('ready').style.display = 'none';
    hud();
  }

  function hud() {
    $('score').textContent = score; $('lives').textContent = lives; $('wave').textContent = wave; $('best').textContent = best;
  }

  function boom(x, y, n, speed) {
    for (let k = 0; k < n; k++) {
      const a = rnd(0, Math.PI * 2), s = rnd(20, speed);
      bits.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(0.4, 1) });
    }
  }

  function hitRock(i) {
    const r = rocks[i];
    rocks.splice(i, 1);
    score += { 3: 20, 2: 50, 1: 100 }[r.size];
    if (score > best) { best = score; try { localStorage.setItem('asteroids:best', best); } catch (e) {} }
    boom(r.x, r.y, 8 + r.size * 4, 160);
    if (r.size > 1) for (let k = 0; k < 2; k++) rocks.push(makeRock(r.x, r.y, r.size - 1));
    if (!rocks.length) setTimeout(() => { if (state === 'play') spawnWave(); }, 900);
    hud();
  }

  function lose() {
    boom(ship.x, ship.y, 36, 220);
    lives--;
    hud();
    if (lives <= 0) {
      state = 'over';
      ship = null;
      setTimeout(() => {
        $('finalScore').textContent = score;
        $('finalWave').textContent = wave;
        $('gameOver').style.display = 'block';
        $('againBtn').focus();
      }, 900);
    } else { ship = null; respawn = 1.4; }
  }

  function update(dt) {
    if (paused) return;
    if (state !== 'play') { // attract mode: rocks keep drifting behind the menus
      rocks.forEach(r => { r.x += r.vx * dt; r.y += r.vy * dt; r.ang += r.rot * dt; wrap(r); });
      bits.forEach(b => { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; });
      bits = bits.filter(b => b.life > 0);
      return;
    }
    if (!ship && (respawn -= dt) <= 0) ship = newShip();
    if (ship) {
      const turn = (keys.ArrowLeft || keys.a ? -1 : 0) + (keys.ArrowRight || keys.d ? 1 : 0);
      ship.a += turn * 4.2 * dt;
      ship.thrust = !!(keys.ArrowUp || keys.w);
      if (ship.thrust) { ship.vx += Math.cos(ship.a) * 260 * dt; ship.vy += Math.sin(ship.a) * 260 * dt; }
      const drag = Math.pow(0.55, dt);
      ship.vx *= drag; ship.vy *= drag;
      const sp = Math.hypot(ship.vx, ship.vy); if (sp > 420) { ship.vx *= 420 / sp; ship.vy *= 420 / sp; }
      ship.x += ship.vx * dt; ship.y += ship.vy * dt; wrap(ship);
      ship.safe = Math.max(0, ship.safe - dt);
      fireCool -= dt;
      if (keys[' '] && fireCool <= 0 && shots.length < 6) {
        shots.push({ x: ship.x + Math.cos(ship.a) * 16, y: ship.y + Math.sin(ship.a) * 16, vx: ship.vx + Math.cos(ship.a) * 560, vy: ship.vy + Math.sin(ship.a) * 560, life: 0.95 });
        fireCool = 0.2;
      }
    }
    rocks.forEach(r => { r.x += r.vx * dt; r.y += r.vy * dt; r.ang += r.rot * dt; wrap(r); });
    shots.forEach(s => { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; wrap(s); });
    shots = shots.filter(s => s.life > 0);
    bits.forEach(b => { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; });
    bits = bits.filter(b => b.life > 0);

    for (let i = rocks.length - 1; i >= 0; i--) {
      const r = rocks[i];
      const s = shots.findIndex(s => Math.hypot(s.x - r.x, s.y - r.y) < r.r);
      if (s >= 0) { shots.splice(s, 1); hitRock(i); continue; }
      if (ship && !ship.safe && Math.hypot(ship.x - r.x, ship.y - r.y) < r.r + 10) { hitRock(i); lose(); break; }
    }
  }

  function draw() {
    g.fillStyle = '#05070B'; g.fillRect(0, 0, W, H);
    // a few fixed stars
    g.fillStyle = '#2A313C';
    for (let k = 0; k < 60; k++) g.fillRect((k * 137) % W, (k * 251) % H, 2, 2);

    g.lineWidth = 2; g.lineJoin = 'round'; g.strokeStyle = '#EEF1F5';
    rocks.forEach(r => {
      g.beginPath();
      r.pts.forEach((p, k) => {
        const x = r.x + Math.cos(p.a + r.ang) * r.r * p.r, y = r.y + Math.sin(p.a + r.ang) * r.r * p.r;
        k ? g.lineTo(x, y) : g.moveTo(x, y);
      });
      g.closePath(); g.stroke();
    });
    g.fillStyle = '#FF8FA3';
    shots.forEach(s => { g.beginPath(); g.arc(s.x, s.y, 2.5, 0, Math.PI * 2); g.fill(); });
    bits.forEach(b => { g.globalAlpha = Math.max(0, b.life); g.fillStyle = '#FFC629'; g.fillRect(b.x, b.y, 2, 2); });
    g.globalAlpha = 1;

    if (ship && !(ship.safe && Math.floor(ship.safe * 8) % 2)) {
      g.save(); g.translate(ship.x, ship.y); g.rotate(ship.a);
      g.strokeStyle = '#FF8FA3'; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(16, 0); g.lineTo(-11, -10); g.lineTo(-6, 0); g.lineTo(-11, 10); g.closePath(); g.stroke();
      if (ship.thrust && Math.random() > 0.3) {
        g.strokeStyle = '#FFC629';
        g.beginPath(); g.moveTo(-8, -5); g.lineTo(-20 - Math.random() * 6, 0); g.lineTo(-8, 5); g.stroke();
      }
      g.restore();
    }
    if (paused) {
      g.fillStyle = 'rgba(5,7,11,.6)'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#EEF1F5'; g.font = '800 44px "Bricolage Grotesque", sans-serif'; g.textAlign = 'center';
      g.fillText('Paused', W / 2, H / 2); g.font = '500 18px "Bricolage Grotesque", sans-serif'; g.fillText('Press P to carry on', W / 2, H / 2 + 34);
    }
  }

  function loop(t) {
    const dt = Math.min(0.05, (t - last) / 1000 || 0);
    last = t;
    update(dt); draw();
    requestAnimationFrame(loop);
  }

  document.addEventListener('keydown', e => {
    if (document.querySelector('dialog[open]')) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    keys[k] = true;
    if (k === 'p' && state === 'play') paused = !paused;
    if ((k === ' ' || k === 'Enter') && state === 'ready') start();
    if (k === 'r' && state !== 'ready') start();
  });
  document.addEventListener('keyup', e => { keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false; });
  window.addEventListener('blur', () => { Object.keys(keys).forEach(k => (keys[k] = false)); });
  $('startBtn').addEventListener('click', start);
  $('againBtn').addEventListener('click', start);

  ship = newShip(); rocks = []; shots = []; bits = []; score = 0; lives = 3; wave = 0;
  for (let k = 0; k < 6; k++) rocks.push(makeRock(rnd(0, W), rnd(0, H), 1 + (k % 3)));
  ship = null; hud();
  window.game = { start, get state() { return state; }, get score() { return score; }, get rocks() { return rocks; }, get ship() { return ship; }, keys };
  requestAnimationFrame(loop);
})();
