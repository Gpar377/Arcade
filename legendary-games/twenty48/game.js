/* 2048: tiles keep an id so they can slide between cells instead of re-rendering. */
(function () {
  const N = 4;
  const board = document.getElementById('board');
  const $ = id => document.getElementById(id);
  let tiles, nextId, score, best = 0, won, keepGoing, over, history;

  try { best = +localStorage.getItem('2048:best') || 0; } catch (e) {}

  // background cells
  for (let i = 0; i < N * N; i++) {
    const c = document.createElement('div');
    c.className = 'bg';
    c.style.setProperty('--r', Math.floor(i / N));
    c.style.setProperty('--c', i % N);
    board.append(c);
  }

  function grid() {
    const g = Array.from({ length: N }, () => Array(N).fill(null));
    tiles.forEach(t => { if (!t.dying) g[t.r][t.c] = t; });
    return g;
  }

  function addRandom() {
    const g = grid();
    const free = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!g[r][c]) free.push([r, c]);
    if (!free.length) return;
    const [r, c] = free[Math.floor(Math.random() * free.length)];
    tiles.push({ id: nextId++, v: Math.random() < 0.9 ? 2 : 4, r, c, fresh: true });
  }

  function snapshot() {
    return { tiles: tiles.filter(t => !t.dying).map(t => ({ id: t.id, v: t.v, r: t.r, c: t.c })), score, won };
  }

  function start() {
    tiles = []; nextId = 1; score = 0; won = false; keepGoing = false; over = false; history = [];
    board.querySelectorAll('.tile').forEach(el => el.remove());
    addRandom(); addRandom();
    $('result').style.display = 'none';
    render();
  }

  function move(dir) {
    if (over || (won && !keepGoing)) return;
    const [dr, dc] = { left: [0, -1], right: [0, 1], up: [-1, 0], down: [1, 0] }[dir];
    const before = snapshot();
    tiles = tiles.filter(t => !t.dying);
    tiles.forEach(t => { t.merged = false; t.fresh = false; });
    const g = grid();
    const rows = [0, 1, 2, 3], cols = [0, 1, 2, 3];
    if (dr === 1) rows.reverse();
    if (dc === 1) cols.reverse();
    let moved = false, gained = 0;

    for (const r of rows) for (const c of cols) {
      const t = g[r][c];
      if (!t) continue;
      let nr = r, nc = c, merged = false;
      for (;;) {
        const rr = nr + dr, cc = nc + dc;
        if (rr < 0 || rr >= N || cc < 0 || cc >= N) break;
        const o = g[rr][cc];
        if (!o) { nr = rr; nc = cc; continue; }
        if (o.v === t.v && !o.merged) {
          g[r][c] = null;
          t.r = rr; t.c = cc; t.dying = true;
          o.v *= 2; o.merged = true; gained += o.v;
          merged = moved = true;
        }
        break;
      }
      if (!merged && (nr !== r || nc !== c)) {
        g[r][c] = null; g[nr][nc] = t; t.r = nr; t.c = nc; moved = true;
      }
    }
    if (!moved) { board.classList.remove('is-bump'); void board.offsetWidth; board.classList.add('is-bump'); return; }

    history.push(before); if (history.length > 20) history.shift();
    score += gained;
    if (score > best) { best = score; try { localStorage.setItem('2048:best', best); } catch (e) {} }
    addRandom();
    if (gained) { const el = $('gain'); el.textContent = '+' + gained; el.classList.remove('is-on'); void el.offsetWidth; el.classList.add('is-on'); }
    render();
    setTimeout(() => {
      tiles = tiles.filter(t => !t.dying);
      render();
      if (!won && tiles.some(t => t.v >= 2048)) { won = true; finish(true); }
      else if (!canMove()) { over = true; finish(false); }
    }, 130);
  }

  function canMove() {
    const g = grid();
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const t = g[r][c];
      if (!t) return true;
      if (c < N - 1 && g[r][c + 1] && g[r][c + 1].v === t.v) return true;
      if (r < N - 1 && g[r + 1][c] && g[r + 1][c].v === t.v) return true;
    }
    return false;
  }

  function undo() {
    const s = history.pop();
    if (!s) { Arcade.toast('Nothing to undo.'); return; }
    tiles = s.tiles.map(t => Object.assign({}, t));
    score = s.score; won = s.won; over = false;
    board.querySelectorAll('.tile').forEach(el => { if (!tiles.some(t => t.id === +el.dataset.id)) el.remove(); });
    $('result').style.display = 'none';
    render();
  }

  function render() {
    const seen = new Set();
    tiles.forEach(t => {
      seen.add(t.id);
      let el = board.querySelector(`.tile[data-id="${t.id}"]`);
      if (!el) {
        el = document.createElement('div');
        el.className = 'tile';
        el.dataset.id = t.id;
        board.append(el);
      }
      el.style.setProperty('--r', t.r);
      el.style.setProperty('--c', t.c);
      el.style.zIndex = t.dying ? 1 : 2;
      if (!t.dying) {
        el.dataset.v = t.v > 2048 ? 'big' : t.v;
        el.textContent = t.v;
        el.classList.toggle('is-new', !!t.fresh);
        if (t.merged) { el.classList.remove('is-merged'); void el.offsetWidth; el.classList.add('is-merged'); }
        el.classList.toggle('is-long', t.v >= 1024);
      }
    });
    board.querySelectorAll('.tile').forEach(el => { if (!seen.has(+el.dataset.id)) el.remove(); });
    $('score').textContent = score;
    $('best').textContent = best;
    const top = tiles.reduce((m, t) => Math.max(m, t.v), 0);
    $('top').textContent = top;
    board.setAttribute('aria-label', `2048 board. Largest tile ${top}. Score ${score}.`);
  }

  function finish(win) {
    $('resultTitle').textContent = win ? 'You made 2048' : 'No moves left';
    $('resultText').innerHTML = `Score <b>${score}</b>`;
    $('keepBtn').hidden = !win;
    $('result').style.display = 'block';
    (win ? $('keepBtn') : $('againBtn')).focus();
  }

  const KEYS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down', A: 'left', D: 'right', W: 'up', S: 'down' };
  document.addEventListener('keydown', e => {
    if (document.querySelector('dialog[open]') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (KEYS[e.key]) { e.preventDefault(); move(KEYS[e.key]); }
    else if (e.key === 'u' || e.key === 'U' || e.key === 'Backspace') undo();
  });

  // swipe
  let sx, sy, sid;
  board.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; sid = e.pointerId; });
  board.addEventListener('pointerup', e => {
    if (e.pointerId !== sid || sx == null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    sx = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  });

  $('newBtn').addEventListener('click', start);
  $('undoBtn').addEventListener('click', undo);
  $('againBtn').addEventListener('click', start);
  $('keepBtn').addEventListener('click', () => { keepGoing = true; $('result').style.display = 'none'; });

  window.game = { move, undo, start, get score() { return score; }, get tiles() { return tiles; } };
  start();
})();
