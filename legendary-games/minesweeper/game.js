/* Minesweeper. Mines are placed after the first reveal so it is never a mine (nor its neighbours). */
(function () {
  const LEVELS = {
    easy: { cols: 9, rows: 9, mines: 10, name: 'Easy' },
    medium: { cols: 16, rows: 16, mines: 40, name: 'Medium' },
    hard: { cols: 30, rows: 16, mines: 99, name: 'Hard' },
  };
  const $ = id => document.getElementById(id);
  const field = $('field');
  let L, cells, placed, over, flags, revealed, timer, seconds, focusIdx = 0, flagMode = false;

  function bestTimes() { try { return JSON.parse(localStorage.getItem('mines:best') || '{}'); } catch (e) { return {}; } }

  function start(levelKey) {
    if (levelKey) L = Object.assign({ key: levelKey }, LEVELS[levelKey]);
    cells = Array.from({ length: L.cols * L.rows }, (_, i) => ({ i, r: Math.floor(i / L.cols), c: i % L.cols, mine: false, n: 0, open: false, flag: false }));
    placed = false; over = false; flags = 0; revealed = 0; seconds = 0;
    clearInterval(timer); timer = null;
    field.style.setProperty('--cols', L.cols);
    field.dataset.cols = L.cols;
    field.innerHTML = '';
    cells.forEach(cell => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cell';
      b.tabIndex = cell.i === 0 ? 0 : -1;
      b.dataset.i = cell.i;
      cell.el = b;
      field.append(b);
      label(cell);
    });
    focusIdx = 0;
    $('result').style.display = 'none';
    document.querySelectorAll('[data-level]').forEach(b => b.setAttribute('aria-pressed', b.dataset.level === L.key));
    const best = bestTimes()[L.key];
    $('best').textContent = best ? fmt(best) : '--';
    hud();
  }

  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  function hud() {
    $('minesLeft').textContent = L.mines - flags;
    $('time').textContent = fmt(seconds);
  }

  function neighbours(cell) {
    const out = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const r = cell.r + dr, c = cell.c + dc;
      if (r >= 0 && r < L.rows && c >= 0 && c < L.cols) out.push(cells[r * L.cols + c]);
    }
    return out;
  }

  function place(safe) {
    const banned = new Set([safe.i, ...neighbours(safe).map(n => n.i)]);
    const pool = cells.filter(c => !banned.has(c.i));
    for (let k = 0; k < L.mines; k++) {
      const j = k + Math.floor(Math.random() * (pool.length - k));
      [pool[k], pool[j]] = [pool[j], pool[k]];
      pool[k].mine = true;
    }
    cells.forEach(c => { c.n = neighbours(c).filter(n => n.mine).length; });
    placed = true;
    timer = setInterval(() => { seconds++; hud(); }, 1000);
  }

  function label(cell) {
    const el = cell.el;
    el.className = 'cell' + (cell.open ? ' is-open' : '') + (cell.flag ? ' is-flag' : '');
    el.removeAttribute('data-n');
    el.textContent = '';
    let desc = `Row ${cell.r + 1}, column ${cell.c + 1}: `;
    if (cell.open) {
      if (cell.mine) { el.classList.add('is-mine'); el.textContent = '✹'; desc += 'mine'; }
      else if (cell.n) { el.dataset.n = cell.n; el.textContent = cell.n; desc += cell.n; }
      else desc += 'empty';
    } else if (cell.flag) { el.textContent = '⚑︎'; desc += 'flagged'; }
    else desc += 'hidden';
    el.setAttribute('aria-label', desc);
  }

  function reveal(cell) {
    if (over || cell.flag) return;
    if (!placed) place(cell);
    if (cell.open) { chord(cell); return; }
    if (cell.mine) { lose(cell); return; }
    // flood fill
    const stack = [cell];
    while (stack.length) {
      const c = stack.pop();
      if (c.open || c.flag) continue;
      c.open = true; revealed++;
      label(c);
      if (c.n === 0) neighbours(c).forEach(n => { if (!n.open && !n.mine) stack.push(n); });
    }
    if (revealed === cells.length - L.mines) win();
  }

  // a revealed number with the right count of flags around it opens the rest
  function chord(cell) {
    if (!cell.n) return;
    const around = neighbours(cell);
    if (around.filter(n => n.flag).length !== cell.n) return;
    around.forEach(n => { if (!n.open && !n.flag && !over) reveal(n); });
  }

  function toggleFlag(cell) {
    if (over || cell.open) return;
    cell.flag = !cell.flag;
    flags += cell.flag ? 1 : -1;
    label(cell); hud();
  }

  function lose(hit) {
    over = true; clearInterval(timer);
    cells.forEach(c => {
      if (c.mine && !c.flag) { c.open = true; label(c); }
      else if (c.flag && !c.mine) c.el.classList.add('is-wrong');
    });
    hit.el.classList.add('is-hit');
    setTimeout(() => show('You hit a mine', `${revealed} of ${cells.length - L.mines} safe squares cleared.`), 700);
  }

  function win() {
    over = true; clearInterval(timer);
    cells.forEach(c => { if (c.mine && !c.flag) { c.flag = true; label(c); } });
    flags = L.mines; hud();
    const all = bestTimes();
    const record = !all[L.key] || seconds < all[L.key];
    if (record) { all[L.key] = seconds; try { localStorage.setItem('mines:best', JSON.stringify(all)); } catch (e) {} $('best').textContent = fmt(seconds); }
    setTimeout(() => show('Field cleared', `${L.name} in <b>${fmt(seconds)}</b>${record ? '. New best time.' : '.'}`), 400);
  }

  function show(title, text) {
    $('resultTitle').textContent = title;
    $('resultText').innerHTML = text;
    $('result').style.display = 'block';
    $('againBtn').focus();
  }

  function cellFrom(e) { const b = e.target.closest('.cell'); return b ? cells[+b.dataset.i] : null; }

  // mouse and touch: click reveals, right-click or long-press flags
  let pressTimer, longPressed = false;
  field.addEventListener('pointerdown', e => {
    const cell = cellFrom(e);
    if (!cell || e.pointerType === 'mouse') return;
    longPressed = false;
    pressTimer = setTimeout(() => { longPressed = true; toggleFlag(cell); if (navigator.vibrate) navigator.vibrate(15); }, 380);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => field.addEventListener(t, () => clearTimeout(pressTimer)));
  field.addEventListener('click', e => {
    const cell = cellFrom(e);
    if (!cell) return;
    if (longPressed) { longPressed = false; return; }
    setFocus(cell.i, false);
    (flagMode && !cell.open) ? toggleFlag(cell) : reveal(cell);
  });
  field.addEventListener('contextmenu', e => {
    const cell = cellFrom(e);
    if (!cell) return;
    e.preventDefault();
    toggleFlag(cell);
  });

  // keyboard: arrows move, Enter/Space reveal, F flag
  function setFocus(i, move = true) {
    if (cells[focusIdx]) cells[focusIdx].el.tabIndex = -1;
    focusIdx = i;
    cells[i].el.tabIndex = 0;
    if (move) cells[i].el.focus();
  }
  field.addEventListener('keydown', e => {
    const cell = cellFrom(e);
    if (!cell) return;
    const d = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[e.key];
    if (d) {
      e.preventDefault();
      const r = Math.min(L.rows - 1, Math.max(0, cell.r + d[0]));
      const c = Math.min(L.cols - 1, Math.max(0, cell.c + d[1]));
      setFocus(r * L.cols + c);
    } else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); toggleFlag(cell); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); reveal(cell); }
  });

  document.querySelectorAll('[data-level]').forEach(b => b.addEventListener('click', () => start(b.dataset.level)));
  $('againBtn').addEventListener('click', () => start());
  $('newBtn').addEventListener('click', () => start());
  $('flagBtn').addEventListener('click', e => {
    flagMode = !flagMode;
    e.currentTarget.setAttribute('aria-pressed', flagMode);
    e.currentTarget.textContent = flagMode ? 'Flag mode on' : 'Flag mode off';
  });

  window.game = { start, reveal: i => reveal(cells[i]), flag: i => toggleFlag(cells[i]), get cells() { return cells; }, get over() { return over; } };
  start('easy');
})();
