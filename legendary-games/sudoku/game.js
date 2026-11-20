/* Sudoku: generates a full grid, then removes digits while the puzzle still has exactly one solution. */
(function () {
  const $ = id => document.getElementById(id);
  const gridEl = $('grid');
  const LEVELS = { easy: { keep: 40, name: 'Easy' }, medium: { keep: 32, name: 'Medium' }, hard: { keep: 26, name: 'Hard' } };
  const ROW = i => Math.floor(i / 9), COL = i => i % 9, BOX = i => Math.floor(ROW(i) / 3) * 3 + Math.floor(COL(i) / 3);
  const PEERS = Array.from({ length: 81 }, (_, i) => {
    const s = new Set();
    for (let j = 0; j < 81; j++) if (j !== i && (ROW(j) === ROW(i) || COL(j) === COL(i) || BOX(j) === BOX(i))) s.add(j);
    return [...s];
  });

  let level = 'easy', puzzle, solution, values, notes, sel = 40, noteMode = false, history = [], seconds = 0, timer, done = false, hints = 0;

  /* ---------- solver (bitmasks; counts solutions up to `limit`) ---------- */
  function solve(board, limit, randomise) {
    const b = board.slice();
    const rows = Array(9).fill(0), cols = Array(9).fill(0), boxes = Array(9).fill(0);
    for (let i = 0; i < 81; i++) if (b[i]) { const m = 1 << b[i]; rows[ROW(i)] |= m; cols[COL(i)] |= m; boxes[BOX(i)] |= m; }
    let count = 0, first = null;
    (function rec() {
      if (count >= limit) return;
      let best = -1, bestMask = 0, bestN = 10;
      for (let i = 0; i < 81; i++) {
        if (b[i]) continue;
        const mask = ~(rows[ROW(i)] | cols[COL(i)] | boxes[BOX(i)]) & 0x3FE;
        let n = 0; for (let m = mask; m; m &= m - 1) n++;
        if (n < bestN) { best = i; bestMask = mask; bestN = n; if (n <= 1) break; }
      }
      if (best === -1) { count++; if (!first) first = b.slice(); return; }
      const digits = [];
      for (let d = 1; d <= 9; d++) if (bestMask & (1 << d)) digits.push(d);
      if (randomise) digits.sort(() => Math.random() - 0.5);
      for (const d of digits) {
        const m = 1 << d;
        b[best] = d; rows[ROW(best)] |= m; cols[COL(best)] |= m; boxes[BOX(best)] |= m;
        rec();
        b[best] = 0; rows[ROW(best)] &= ~m; cols[COL(best)] &= ~m; boxes[BOX(best)] &= ~m;
        if (count >= limit) return;
      }
    })();
    return { count, first };
  }

  function generate(keep) {
    const full = solve(Array(81).fill(0), 1, true).first;
    const p = full.slice();
    const order = [...Array(81).keys()].sort(() => Math.random() - 0.5);
    let filled = 81;
    for (const i of order) {
      if (filled <= keep) break;
      const v = p[i];
      p[i] = 0;
      if (solve(p, 2).count !== 1) p[i] = v; else filled--;
    }
    return { puzzle: p, solution: full };
  }

  /* ---------- game ---------- */
  function newGame(lv) {
    if (lv) level = lv;
    const g = generate(LEVELS[level].keep);
    puzzle = g.puzzle; solution = g.solution;
    values = puzzle.slice();
    notes = Array.from({ length: 81 }, () => new Set());
    history = []; seconds = 0; done = false; hints = 0;
    sel = puzzle.findIndex(v => !v);
    startTimer();
    $('result').style.display = 'none';
    render(); save();
  }

  function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => { if (!done && !document.hidden) { seconds++; $('time').textContent = fmt(seconds); if (seconds % 10 === 0) save(); } }, 1000);
  }
  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  function save() {
    try {
      localStorage.setItem('sudoku:game', JSON.stringify({ level, puzzle, solution, values, notes: notes.map(s => [...s]), seconds, done, hints }));
    } catch (e) {}
  }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem('sudoku:game'));
      if (!s || s.done || !s.puzzle) return false;
      ({ level, puzzle, solution, values, seconds, hints } = s);
      notes = s.notes.map(a => new Set(a));
      done = false; history = [];
      sel = values.findIndex(v => !v); if (sel < 0) sel = 0;
      startTimer();
      return true;
    } catch (e) { return false; }
  }

  function conflicts(i) {
    const v = values[i];
    return v && PEERS[i].some(j => values[j] === v);
  }

  function render() {
    if (!gridEl.children.length) {
      for (let i = 0; i < 81; i++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset.i = i;
        b.addEventListener('click', () => select(i));
        gridEl.append(b);
      }
    }
    const sv = values[sel];
    [...gridEl.children].forEach((b, i) => {
      const cls = ['cell'];
      if (puzzle[i]) cls.push('is-given');
      if (i === sel) cls.push('is-sel');
      else if (PEERS[sel].includes(i)) cls.push('is-peer');
      if (sv && values[i] === sv && i !== sel) cls.push('is-same');
      if (!puzzle[i] && conflicts(i)) cls.push('is-bad');
      if (COL(i) % 3 === 2 && COL(i) < 8) cls.push('edge-r');
      if (ROW(i) % 3 === 2 && ROW(i) < 8) cls.push('edge-b');
      b.className = cls.join(' ');
      b.tabIndex = i === sel ? 0 : -1;
      if (values[i]) {
        b.textContent = values[i];
        b.setAttribute('aria-label', `Row ${ROW(i) + 1}, column ${COL(i) + 1}: ${values[i]}${puzzle[i] ? ', given' : ''}`);
      } else {
        b.innerHTML = notes[i].size
          ? `<span class="notes">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<i>${notes[i].has(d) ? d : ''}</i>`).join('')}</span>` : '';
        b.setAttribute('aria-label', `Row ${ROW(i) + 1}, column ${COL(i) + 1}: empty${notes[i].size ? ', notes ' + [...notes[i]].sort().join(' ') : ''}`);
      }
    });
    // digits fully placed get dimmed on the pad
    document.querySelectorAll('[data-digit]').forEach(b => {
      const d = +b.dataset.digit;
      const n = values.filter(v => v === d).length;
      b.classList.toggle('is-used', n >= 9);
      b.querySelector('small').textContent = 9 - n > 0 ? 9 - n : '';
    });
    $('time').textContent = fmt(seconds);
    $('level').textContent = LEVELS[level].name;
    $('filled').textContent = values.filter(Boolean).length;
    document.querySelectorAll('[data-level]').forEach(b => b.setAttribute('aria-pressed', b.dataset.level === level));
  }

  function select(i, focus) {
    sel = i; render();
    if (focus !== false) gridEl.children[i].focus();
  }

  function input(d) {
    if (done || puzzle[sel]) return;
    history.push({ i: sel, v: values[sel], n: new Set(notes[sel]), peers: PEERS[sel].map(j => [j, new Set(notes[j])]) });
    if (noteMode && d) {
      if (values[sel]) return;
      notes[sel].has(d) ? notes[sel].delete(d) : notes[sel].add(d);
    } else {
      values[sel] = values[sel] === d ? 0 : d;
      if (values[sel]) { notes[sel].clear(); PEERS[sel].forEach(j => notes[j].delete(d)); }
    }
    render(); save(); check();
  }

  function erase() {
    if (done || puzzle[sel]) return;
    history.push({ i: sel, v: values[sel], n: new Set(notes[sel]), peers: [] });
    values[sel] = 0; notes[sel].clear();
    render(); save();
  }

  function undo() {
    const h = history.pop();
    if (!h || done) return;
    values[h.i] = h.v; notes[h.i] = h.n;
    h.peers.forEach(([j, s]) => { notes[j] = s; });
    sel = h.i; render(); save();
  }

  function hint() {
    if (done) return;
    let i = !puzzle[sel] && values[sel] !== solution[sel] ? sel : -1;
    if (i < 0) {
      const wrong = values.findIndex((v, k) => v && v !== solution[k]);
      i = wrong >= 0 ? wrong : values.findIndex(v => !v);
    }
    if (i < 0) return;
    history.push({ i, v: values[i], n: new Set(notes[i]), peers: [] });
    values[i] = solution[i]; notes[i].clear(); hints++;
    PEERS[i].forEach(j => notes[j].delete(solution[i]));
    sel = i; render(); save(); check();
    Arcade.toast(`Filled in a ${solution[i]}.`);
  }

  function check() {
    if (values.every((v, i) => v === solution[i])) {
      done = true; clearInterval(timer);
      const key = 'sudoku:best:' + level;
      let best = null;
      try { best = +localStorage.getItem(key) || null; } catch (e) {}
      const record = !hints && (!best || seconds < best);
      if (record) try { localStorage.setItem(key, seconds); } catch (e) {}
      save();
      gridEl.classList.add('is-solved');
      setTimeout(() => {
        gridEl.classList.remove('is-solved');
        $('resultText').innerHTML = `${LEVELS[level].name} in <b>${fmt(seconds)}</b>` +
          (hints ? `, with ${hints} ${hints === 1 ? 'hint' : 'hints'}.` : record ? '. New best time.' : best ? `. Best is ${fmt(best)}.` : '.');
        $('result').style.display = 'block';
        $('againBtn').focus();
      }, 900);
    }
  }

  function setNoteMode(on) {
    noteMode = on;
    $('noteBtn').setAttribute('aria-pressed', on);
    $('noteBtn').textContent = on ? 'Notes on' : 'Notes off';
    document.querySelector('.pad9').classList.toggle('is-notes', on);
  }

  /* ---------- controls ---------- */
  const pad = document.querySelector('.pad9');
  for (let d = 1; d <= 9; d++) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn'; b.dataset.digit = d;
    b.innerHTML = `${d}<small></small>`;
    b.addEventListener('click', () => { input(d); gridEl.children[sel].focus(); });
    pad.append(b);
  }
  $('eraseBtn').addEventListener('click', erase);
  $('undoBtn').addEventListener('click', undo);
  $('hintBtn').addEventListener('click', hint);
  $('noteBtn').addEventListener('click', () => setNoteMode(!noteMode));
  $('againBtn').addEventListener('click', () => newGame());
  document.querySelectorAll('[data-level]').forEach(b => b.addEventListener('click', () => newGame(b.dataset.level)));

  document.addEventListener('keydown', e => {
    if (document.querySelector('dialog[open]') || e.ctrlKey || e.metaKey || e.altKey) return;
    const mv = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 }[e.key];
    if (mv) {
      e.preventDefault();
      let r = ROW(sel), c = COL(sel);
      if (mv === -1) c = (c + 8) % 9; else if (mv === 1) c = (c + 1) % 9;
      else if (mv === -9) r = (r + 8) % 9; else r = (r + 1) % 9;
      select(r * 9 + c);
    } else if (/^[1-9]$/.test(e.key)) { e.preventDefault(); input(+e.key); }
    else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { e.preventDefault(); erase(); }
    else if (e.key === 'n' || e.key === 'N') setNoteMode(!noteMode);
    else if (e.key === 'z' || e.key === 'Z' || e.key === 'u' || e.key === 'U') undo();
  });

  window.game = { newGame, input, select: i => select(i, false), get solution() { return solution; }, get values() { return values; }, get puzzle() { return puzzle; }, get done() { return done; }, solveCount: p => solve(p, 2).count };
  if (load()) render(); else newGame('easy');
})();
