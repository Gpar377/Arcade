/* Five Letters: six tries to find a five-letter word. Daily mode picks the same word for everyone each day. */
(function () {
  const $ = id => document.getElementById(id);
  const ANSWERS = window.FIVE.answers;
  const ALLOWED = new Set(window.FIVE.allowed.split(' '));
  ANSWERS.forEach(w => ALLOWED.add(w));
  const ROWS = 6, LEN = 5;
  const EPOCH = Date.UTC(2026, 0, 1);
  const rowsEl = $('rows');
  const keyEls = {};
  let mode = 'daily', answer, guesses, current, over, busy = false, dayNo;

  const todayNo = () => {
    const d = new Date();
    return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EPOCH) / 86400000);
  };
  const store = {
    get(k, d) { try { const v = localStorage.getItem('five:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('five:' + k, JSON.stringify(v)); } catch (e) {} },
  };

  /* ---------- board ---------- */
  for (let r = 0; r < ROWS; r++) {
    const row = document.createElement('div');
    row.className = 'wrow';
    for (let c = 0; c < LEN; c++) row.append(Object.assign(document.createElement('div'), { className: 'tile' }));
    rowsEl.append(row);
  }

  /* ---------- keyboard ---------- */
  ['qwertyuiop', 'asdfghjkl', '+zxcvbnm-'].forEach(line => {
    const row = document.createElement('div');
    row.className = 'krow';
    [...line].forEach(ch => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn key';
      if (ch === '+') { b.textContent = 'Enter'; b.classList.add('key--wide'); b.addEventListener('click', submit); }
      else if (ch === '-') { b.textContent = '⌫'; b.setAttribute('aria-label', 'Delete letter'); b.classList.add('key--wide'); b.addEventListener('click', back); }
      else { b.textContent = ch.toUpperCase(); keyEls[ch] = b; b.addEventListener('click', () => type(ch)); }
      b.addEventListener('mousedown', e => e.preventDefault()); // keep focus off the key so Enter submits
      row.append(b);
    });
    $('keys').append(row);
  });

  /* ---------- scoring with repeated letters handled properly ---------- */
  function score(guess, ans) {
    const res = Array(LEN).fill('absent');
    const left = {};
    for (let i = 0; i < LEN; i++) {
      if (guess[i] === ans[i]) res[i] = 'correct';
      else left[ans[i]] = (left[ans[i]] || 0) + 1;
    }
    for (let i = 0; i < LEN; i++) {
      if (res[i] !== 'correct' && left[guess[i]]) { res[i] = 'present'; left[guess[i]]--; }
    }
    return res;
  }

  /* ---------- game flow ---------- */
  function load(m) {
    mode = m;
    document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === mode));
    $('result').style.display = 'none';
    if (mode === 'daily') {
      dayNo = todayNo();
      answer = ANSWERS[((dayNo % ANSWERS.length) + ANSWERS.length) % ANSWERS.length];
      const saved = store.get('daily', null);
      guesses = saved && saved.day === dayNo ? saved.guesses : [];
      $('modeLabel').textContent = `Daily #${dayNo + 1}`;
    } else {
      const recent = store.get('recent', []);
      do { answer = ANSWERS[Math.floor(Math.random() * ANSWERS.length)]; } while (recent.includes(answer) || answer === ANSWERS[todayNo() % ANSWERS.length]);
      store.set('recent', [answer, ...recent].slice(0, 60));
      guesses = [];
      $('modeLabel').textContent = 'Practice';
    }
    current = '';
    over = false;
    drawAll();
    const last = guesses[guesses.length - 1];
    if (last === answer || guesses.length >= ROWS) { over = true; setTimeout(() => showResult(last === answer, false), 300); }
    setMsg(mode === 'daily' && guesses.length && !over ? 'Picking up today’s game where you left it.' : 'Type a five-letter word and press Enter.');
  }

  function setMsg(t) { $('msg').textContent = t; }

  function drawAll() {
    [...rowsEl.children].forEach((row, r) => {
      const word = r < guesses.length ? guesses[r] : r === guesses.length ? current : '';
      const res = r < guesses.length ? score(guesses[r], answer) : null;
      [...row.children].forEach((t, c) => {
        t.textContent = word[c] || '';
        t.className = 'tile' + (word[c] ? ' is-filled' : '') + (res ? ' is-' + res[c] : '');
      });
      row.setAttribute('aria-label', res ? `${word}: ${res.join(', ')}` : r === guesses.length ? 'Current guess' : 'Empty row');
    });
    paintKeys();
    $('tries').textContent = `${guesses.length}/${ROWS}`;
  }

  function paintKeys() {
    const rank = { absent: 1, present: 2, correct: 3 };
    const best = {};
    guesses.forEach(g => score(g, answer).forEach((s, i) => {
      if (!best[g[i]] || rank[s] > rank[best[g[i]]]) best[g[i]] = s;
    }));
    Object.entries(keyEls).forEach(([ch, b]) => { b.className = 'btn key' + (best[ch] ? ' is-' + best[ch] : ''); });
  }

  function drawCurrent() {
    const row = rowsEl.children[guesses.length];
    if (!row) return;
    [...row.children].forEach((t, c) => {
      t.textContent = current[c] || '';
      t.className = 'tile' + (current[c] ? ' is-filled' : '');
      if (c === current.length - 1) { t.classList.remove('is-pop'); void t.offsetWidth; t.classList.add('is-pop'); }
    });
  }

  function type(ch) {
    if (over || busy || current.length >= LEN) return;
    current += ch; drawCurrent();
  }
  function back() {
    if (over || busy || !current) return;
    current = current.slice(0, -1); drawCurrent();
  }

  function shake(text) {
    const row = rowsEl.children[guesses.length];
    row.classList.remove('is-shake'); void row.offsetWidth; row.classList.add('is-shake');
    setMsg(text);
  }

  function submit() {
    if (over || busy) return;
    if (current.length < LEN) { shake('Not enough letters.'); return; }
    if (!ALLOWED.has(current)) { shake(`${current.toUpperCase()} is not in the word list.`); return; }
    const g = current;
    guesses.push(g); current = '';
    if (mode === 'daily') store.set('daily', { day: dayNo, guesses });
    busy = true;
    const row = rowsEl.children[guesses.length - 1];
    const res = score(g, answer);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    [...row.children].forEach((t, i) => {
      setTimeout(() => {
        t.classList.add('is-flip');
        setTimeout(() => { t.className = `tile is-filled is-${res[i]}` + (reduced ? '' : ' is-flip-in'); }, reduced ? 0 : 160);
      }, reduced ? 0 : i * 230);
    });
    setTimeout(() => {
      busy = false;
      drawAll();
      const won = g === answer;
      if (won || guesses.length >= ROWS) { over = true; record(won); setTimeout(() => showResult(won, true), won ? 700 : 400); }
      else setMsg(`${ROWS - guesses.length} ${ROWS - guesses.length === 1 ? 'try' : 'tries'} left.`);
    }, reduced ? 50 : LEN * 230 + 250);
  }

  function record(won) {
    const s = store.get('stats', { played: 0, wins: 0, streak: 0, max: 0, dist: [0, 0, 0, 0, 0, 0], lastDay: null });
    if (mode === 'daily') {
      if (s.lastDay === dayNo) return;
      if (s.lastDay !== dayNo - 1) s.streak = 0;
      s.lastDay = dayNo;
    }
    s.played++;
    if (won) { s.wins++; s.dist[guesses.length - 1]++; if (mode === 'daily') { s.streak++; s.max = Math.max(s.max, s.streak); } }
    else if (mode === 'daily') s.streak = 0;
    store.set('stats', s);
  }

  function showResult(won, fresh) {
    const s = store.get('stats', { played: 0, wins: 0, streak: 0, max: 0, dist: [0, 0, 0, 0, 0, 0] });
    $('resultTitle').textContent = won ? ['First try', 'Brilliant', 'Great', 'Nice', 'Solid', 'Phew'][guesses.length - 1] : 'Out of tries';
    $('resultWord').innerHTML = won ? `Solved in <b>${guesses.length}</b>.` : `The word was <b>${answer.toUpperCase()}</b>.`;
    $('stPlayed').textContent = s.played;
    $('stWin').textContent = s.played ? Math.round((s.wins / s.played) * 100) + '%' : '0%';
    $('stStreak').textContent = s.streak;
    $('stMax').textContent = s.max;
    const top = Math.max(1, ...s.dist);
    $('dist').innerHTML = s.dist.map((n, i) =>
      `<div class="dbar${won && i === guesses.length - 1 ? ' is-now' : ''}"><span>${i + 1}</span><i style="width:${Math.max(8, (n / top) * 100)}%">${n}</i></div>`).join('');
    $('nextBtn').textContent = mode === 'daily' ? 'Play a practice word' : 'Next word';
    $('result').style.display = 'block';
    if (fresh) $('nextBtn').focus();
  }

  function shareText() {
    const grid = guesses.map(g => score(g, answer).map(s => ({ correct: '🟩', present: '🟨', absent: '⬛' })[s]).join('')).join('\n');
    const last = guesses[guesses.length - 1];
    return `Five Letters ${mode === 'daily' ? '#' + (dayNo + 1) : 'practice'} ${last === answer ? guesses.length : 'X'}/6\n\n${grid}`;
  }

  document.addEventListener('keydown', e => {
    if (document.querySelector('dialog[open]') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Enter') { if (e.target.tagName === 'BUTTON' && e.target.closest('.overlay, .modes, .bar')) return; e.preventDefault(); submit(); }
    else if (e.key === 'Backspace') { e.preventDefault(); back(); }
    else if (/^[a-z]$/i.test(e.key)) type(e.key.toLowerCase());
  });
  document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { b.blur(); load(b.dataset.mode); }));
  $('nextBtn').addEventListener('click', () => load('practice'));
  $('closeBtn').addEventListener('click', () => { $('result').style.display = 'none'; });
  $('shareBtn').addEventListener('click', async e => {
    const b = e.currentTarget;
    try { await navigator.clipboard.writeText(shareText()); b.textContent = 'Copied'; }
    catch (err) { Arcade.toast('Copying is blocked here.'); }
    setTimeout(() => (b.textContent = 'Copy result'), 1600);
  });
  $('cbBtn').addEventListener('click', e => {
    const on = document.body.classList.toggle('cb');
    e.currentTarget.setAttribute('aria-pressed', on);
    store.set('cb', on);
  });
  if (store.get('cb', false)) { document.body.classList.add('cb'); $('cbBtn').setAttribute('aria-pressed', 'true'); }

  window.game = { load, type, submit, back, score, get answer() { return answer; }, get guesses() { return guesses; }, get over() { return over; } };
  load('daily');
})();
