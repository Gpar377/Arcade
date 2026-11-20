/* Echo: a Simon-style memory game. Pads sit in a diamond so the arrow keys map onto them. */
(function () {
  const $ = id => document.getElementById(id);
  const PADS = [
    { key: 'ArrowUp', name: 'top', freq: 329.63 },     // E4
    { key: 'ArrowRight', name: 'right', freq: 261.63 }, // C4
    { key: 'ArrowDown', name: 'bottom', freq: 220.0 },  // A3
    { key: 'ArrowLeft', name: 'left', freq: 164.81 },   // E3
  ];
  const padEls = [...document.querySelectorAll('.epad')];
  let seq = [], step = 0, state = 'idle', best = 0, round = 0, muted = false, ctx, timers = [];

  try { best = +localStorage.getItem('echo:best') || 0; } catch (e) {}

  function audio() {
    if (muted) return null;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }
  function tone(freq, ms, type = 'triangle') {
    const a = audio();
    if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, a.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + ms / 1000);
    o.connect(g).connect(a.destination);
    o.start(); o.stop(a.currentTime + ms / 1000 + 0.05);
  }

  function flash(i, ms) {
    const el = padEls[i];
    el.classList.add('is-lit');
    tone(PADS[i].freq, ms);
    timers.push(setTimeout(() => el.classList.remove('is-lit'), ms));
  }

  function setState(s, text) {
    state = s;
    document.querySelector('.echo').dataset.state = s;
    $('status').textContent = text;
  }

  function hud() { $('round').textContent = round; $('best').textContent = best; $('roundBig').textContent = round || ''; }

  function start() {
    timers.forEach(clearTimeout); timers = [];
    seq = []; round = 0;
    $('result').style.display = 'none';
    next();
  }

  function next() {
    seq.push(Math.floor(Math.random() * 4));
    round = seq.length; step = 0;
    hud();
    play();
  }

  function play() {
    setState('watch', 'Watch');
    const gap = Math.max(260, 620 - round * 22);
    const on = Math.round(gap * 0.68);
    seq.forEach((p, k) => timers.push(setTimeout(() => flash(p, on), 650 + k * gap)));
    timers.push(setTimeout(() => setState('play', 'Your turn'), 650 + seq.length * gap));
  }

  function press(i) {
    if (state !== 'play') return;
    flash(i, 220);
    if (i !== seq[step]) { fail(i); return; }
    step++;
    if (step === seq.length) {
      if (round > best) { best = round; try { localStorage.setItem('echo:best', best); } catch (e) {} }
      hud();
      setState('watch', 'Nice');
      timers.push(setTimeout(next, 700));
    }
  }

  function fail(i) {
    setState('over', 'Missed');
    tone(110, 520, 'sawtooth');
    padEls[seq[step]].classList.add('is-answer');
    timers.push(setTimeout(() => {
      padEls.forEach(p => p.classList.remove('is-answer'));
      const reached = round - 1;
      $('resultText').innerHTML = `You remembered <b>${reached}</b> ${reached === 1 ? 'step' : 'steps'}. ` +
        `The next one was the <b>${PADS[seq[step]].name}</b> pad, not the ${PADS[i].name}.` +
        (reached >= best && reached > 0 ? ' That is your best.' : '');
      $('result').style.display = 'block';
      $('againBtn').focus();
      setState('idle', 'Press start');
    }, 900));
  }

  padEls.forEach((el, i) => el.addEventListener('pointerdown', e => { e.preventDefault(); press(i); }));
  padEls.forEach((el, i) => el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); press(i); } }));
  document.addEventListener('keydown', e => {
    if (document.querySelector('dialog[open]') || e.repeat) return;
    const i = PADS.findIndex(p => p.key === e.key);
    if (i >= 0) { e.preventDefault(); press(i); }
    else if ((e.key === 'Enter' || e.key === ' ') && state === 'idle' && e.target === document.body) { e.preventDefault(); start(); }
  });
  $('startBtn').addEventListener('click', start);
  $('againBtn').addEventListener('click', start);
  $('muteBtn').addEventListener('click', e => {
    muted = !muted;
    e.currentTarget.setAttribute('aria-pressed', muted);
    e.currentTarget.textContent = muted ? 'Sound off' : 'Sound on';
  });

  hud();
  setState('idle', 'Press start');
  window.game = { start, press, get seq() { return seq; }, get state() { return state; }, get round() { return round; } };
})();
