/* Shared shell for every game page.
   <body data-game="snake" data-pad="arrows a:space:Pause">
   - colours the console from the catalogue and builds the top bar
   - "How to play" dialog from <template id="howto">
   - Arcade.toast() (also replaces window.alert)
   - on touch screens, an on-screen pad that sends real key events to the game */
(function () {
  const body = document.body;
  const id = body.dataset.game;
  const game = (window.GAMES || []).find(g => g.id === id) || { title: document.title, plastic: '#48515F', ink: '#fff', art: [] };
  const root = document.documentElement;
  root.style.setProperty('--plastic', game.plastic);
  root.style.setProperty('--on-plastic', game.ink);

  try { localStorage.setItem('arcade:last', id); } catch (e) {}

  // tab icon: the game's own label art
  if (window.sprite && game.art.length) {
    const svg = window.sprite(game.art, '#fff').replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" style="background:${game.plastic};color:#14161B" `);
    const link = document.createElement('link');
    link.rel = 'icon'; link.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
    document.head.append(link);
  }

  /* ---------- top bar ---------- */
  const bar = document.createElement('header');
  bar.className = 'bar';
  bar.innerHTML = `
    <a class="bar__back" href="../index.html"><span aria-hidden="true">&larr;</span> All games</a>
    <h1 class="bar__title"><span class="bar__art">${window.sprite ? window.sprite(game.art, game.ink === '#FFFFFF' ? '#FFC629' : '#fff') : ''}</span>${game.title}</h1>
    <button class="btn btn--quiet" type="button" id="howtoBtn">How to play</button>`;
  body.prepend(bar);

  const tpl = document.getElementById('howto');
  const helpBtn = bar.querySelector('#howtoBtn');
  if (tpl) {
    const dlg = document.createElement('dialog');
    dlg.className = 'sheet';
    dlg.innerHTML = `<form method="dialog"><h2>How to play ${game.title}</h2><div class="sheet__body"></div>
      <button class="btn btn--primary" value="ok">Got it</button></form>`;
    dlg.querySelector('.sheet__body').append(tpl.content.cloneNode(true));
    body.append(dlg);
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    helpBtn.addEventListener('click', () => dlg.showModal());
  } else helpBtn.remove();

  /* ---------- toast ---------- */
  const toastEl = document.createElement('div');
  toastEl.className = 'toast';
  toastEl.setAttribute('role', 'status');
  body.append(toastEl);
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 2200);
  }
  window.alert = toast;

  /* ---------- keep the page still while playing ---------- */
  const SCROLL_KEYS = [' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  window.addEventListener('keydown', e => {
    const t = e.target;
    const typing = t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA');
    if (typing || document.querySelector('dialog[open]')) return;
    if (SCROLL_KEYS.includes(e.key)) {
      // Space on a focused button would press it again mid-game: drop focus instead.
      if (e.key === ' ' && t && t.tagName === 'BUTTON' && body.dataset.pad) t.blur();
      e.preventDefault();
    }
  }, { capture: true });

  /* ---------- touch pad ---------- */
  const KEYS = {
    left: ['ArrowLeft', 'ArrowLeft', '←'], right: ['ArrowRight', 'ArrowRight', '→'],
    up: ['ArrowUp', 'ArrowUp', '↑'], down: ['ArrowDown', 'ArrowDown', '↓'],
    space: [' ', 'Space', ''],
  };
  const WASD = { up: ['w', 'KeyW'], left: ['a', 'KeyA'], down: ['s', 'KeyS'], right: ['d', 'KeyD'] };
  function send(type, key, code) {
    document.dispatchEvent(new KeyboardEvent(type, { key, code, bubbles: true, cancelable: true }));
  }
  function padButton(key, code, label, cls) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pad__key ' + (cls || '');
    b.textContent = label;
    b.setAttribute('aria-label', label);
    let rep;
    const down = e => {
      e.preventDefault();
      b.classList.add('is-down');
      send('keydown', key, code);
      if (b.dataset.repeat) rep = setInterval(() => send('keydown', key, code), 110);
    };
    const up = e => {
      e.preventDefault();
      if (!b.classList.contains('is-down')) return;
      b.classList.remove('is-down');
      clearInterval(rep);
      send('keyup', key, code);
    };
    b.addEventListener('pointerdown', down);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('pointerleave', up);
    b.addEventListener('contextmenu', e => e.preventDefault());
    return b;
  }
  /* data-pad tokens: "arrows" | "wasd" | "lr" | "key:Label" (key is a letter or "space"); add "repeat" to auto-repeat arrows */
  if (body.dataset.pad) {
    const tokens = body.dataset.pad.split(/\s+/);
    const pad = document.createElement('div');
    pad.className = 'pad';
    const dpad = document.createElement('div');
    const acts = document.createElement('div');
    acts.className = 'pad__acts';
    const repeat = tokens.includes('repeat');
    tokens.forEach(t => {
      if (t === 'arrows' || t === 'lr' || t === 'wasd') {
        dpad.className = 'pad__d pad__d--' + (t === 'lr' ? 'lr' : 'arrows');
        (t === 'lr' ? ['left', 'right'] : ['up', 'left', 'down', 'right']).forEach(d => {
          const k = t === 'wasd' ? WASD[d] : KEYS[d];
          const b = padButton(k[0], k[1], KEYS[d][2], 'pad__key--' + d);
          if (repeat) b.dataset.repeat = '1';
          dpad.append(b);
        });
      } else if (t.includes(':')) {
        const [k, label] = t.split(':');
        const key = k === 'space' ? ' ' : k;
        const code = k === 'space' ? 'Space' : 'Key' + k.toUpperCase();
        acts.append(padButton(key, code, label.replace(/_/g, ' '), 'pad__key--act'));
      }
    });
    if (dpad.children.length) pad.append(dpad);
    if (acts.children.length) pad.append(acts);
    (document.querySelector('.console') || body).append(pad);
  }

  window.Arcade = { toast, game };
})();
