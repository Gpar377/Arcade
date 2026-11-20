"""Plays every game in a real browser and checks the mechanics work.

Run from the repo root:
    pip install playwright && playwright install chromium
    python3 -m http.server 8000 -d legendary-games &
    python3 tests/play_test.py            # or ARCADE_URL=https://your-site.vercel.app/ python3 tests/play_test.py

Exits non-zero if any check fails.
"""
import asyncio, json, os, sys, time, urllib.request
from playwright.async_api import async_playwright

B = os.environ.get('ARCADE_URL', 'http://localhost:8000/').rstrip('/') + '/'
results = []

def ok(name, cond, detail=''):
    results.append((name, bool(cond), detail))

async def main():
    async with async_playwright() as p:
        try:
            b = await p.chromium.launch(channel='chrome')
        except Exception:
            b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 1280, 'height': 800})

        async def open_(path):
            pg = await ctx.new_page()
            errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
            pg.on('console', lambda m: errs.append('console: ' + m.text[:160]) if m.type == 'error' and 'favicon' not in m.text else None)
            await pg.goto(B + path)
            await pg.wait_for_timeout(450)
            return pg, errs

        async def hold(pg, key, ms):
            await pg.keyboard.down(key); await pg.wait_for_timeout(ms); await pg.keyboard.up(key)

        ev = lambda pg, js: pg.evaluate(js)

        # ---------- hub ----------
        pg, e = await open_('index.html')
        hrefs = await ev(pg, "[...document.querySelectorAll('a.cart')].map(a=>a.getAttribute('href'))")
        carts = await ev(pg, "document.querySelectorAll('.cart').length")
        bad = []
        for h in hrefs:
            try: urllib.request.urlopen(B + h).read(1)
            except Exception as ex: bad.append(h)
        ok('hub: every cartridge link loads', not bad and carts == 24, f'{carts} carts, broken: {bad}')
        await pg.click('.chip[data-kind="Puzzle"]')
        shown = await ev(pg, "[...document.querySelectorAll('#shelf li')].filter(l=>!l.hidden).length")
        ok('hub: filter', shown == 6, f'puzzle shows {shown}')
        await pg.click('.chip[data-kind="All"]')
        await pg.click('button.cart')
        ok('hub: Temple Run sheet opens', await ev(pg, "document.getElementById('desktopSheet').open"), str(e))

        # ---------- hangman ----------
        pg, e = await open_('hangman/index.html')
        for ch in 'etaoinshrdlucmfwypvbgkqjxz':
            if await ev(pg, "document.getElementById('result').style.display==='block'"): break
            await pg.keyboard.press(ch); await pg.wait_for_timeout(30)
        await pg.wait_for_timeout(1100)
        t = await pg.inner_text('#resultTitle')
        ok('hangman: game finishes with a result', await ev(pg, "document.getElementById('result').style.display") == 'block', t + ' ' + str(e))

        # ---------- five letters ----------
        pg, e = await open_('five-letters/index.html')
        sc = await ev(pg, "[game.score('speed','abide').join(), game.score('allee','apple').join(), game.score('crane','crane').join()]")
        ok('five letters: repeated-letter scoring', sc == ['absent,absent,present,absent,present', 'correct,present,absent,absent,correct', 'correct,correct,correct,correct,correct'], str(sc))
        for ch in 'qzxjk': await pg.keyboard.press(ch)
        await pg.keyboard.press('Enter'); await pg.wait_for_timeout(200)
        ok('five letters: rejects a non-word', 'not in the word list' in await pg.inner_text('#msg'), await pg.inner_text('#msg'))
        for _ in range(5): await pg.keyboard.press('Backspace')
        ans = await ev(pg, 'game.answer')
        for ch in ans: await pg.keyboard.press(ch)
        await pg.keyboard.press('Enter'); await pg.wait_for_timeout(2600)
        ok('five letters: solving shows stats', await ev(pg, "document.getElementById('result').style.display") == 'block' and await pg.inner_text('#stPlayed') == '1', f'{ans} played={await pg.inner_text("#stPlayed")} {e}')
        await pg.reload(); await pg.wait_for_timeout(700)
        ok('five letters: daily game is remembered', await ev(pg, 'game.over') and len(await ev(pg, 'game.guesses')) == 1, '')
        await pg.click('#nextBtn'); await pg.wait_for_timeout(200)
        ok('five letters: practice word differs', await ev(pg, 'game.answer') != ans and not await ev(pg, 'game.over'), '')

        # ---------- 2048 ----------
        pg, e = await open_('twenty48/index.html')
        await ev(pg, "(()=>{const t=game.tiles; t.length=0; t.push({id:900,v:2,r:0,c:0},{id:901,v:2,r:0,c:2},{id:902,v:4,r:0,c:3});})()")
        await pg.keyboard.press('ArrowLeft'); await pg.wait_for_timeout(300)
        vals = await ev(pg, "game.tiles.filter(t=>t.r===0).sort((a,b)=>a.c-b.c).map(t=>t.v)")
        ok('2048: merge rules (2 2 4 -> 4 4)', vals[:2] == [4, 4] and await ev(pg, 'game.score') == 4, str(vals))
        for k in ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'] * 15: await pg.keyboard.press(k); await pg.wait_for_timeout(15)
        await pg.wait_for_timeout(300)
        ok('2048: plays a long sequence', await ev(pg, 'game.score') > 20 and not e, f"score {await ev(pg,'game.score')} {e}")
        await pg.click('#undoBtn')
        ok('2048: undo works', not e, '')

        # ---------- minesweeper ----------
        pg, e = await open_('minesweeper/index.html')
        await pg.locator('.cell').nth(40).click()
        st = await ev(pg, "[game.over, game.cells.filter(c=>c.open).length, game.cells.filter(c=>c.mine).length]")
        ok('minesweeper: first click is safe and opens', st[0] is False and st[1] > 0 and st[2] == 10, str(st))
        await ev(pg, "game.cells.forEach(c=>{ if(!c.mine && !c.open) game.reveal(c.i) })")
        await pg.wait_for_timeout(600)
        ok('minesweeper: clearing the field wins', 'cleared' in await pg.inner_text('#resultTitle') and await ev(pg, "result.style.display") == 'block', await pg.inner_text('#resultTitle'))
        await pg.click('#againBtn'); await pg.locator('.cell').nth(0).click()
        mine = await ev(pg, "game.cells.find(c=>c.mine).i")
        await pg.locator('.cell').nth(mine).click(button='right')
        ok('minesweeper: right-click flags', await pg.inner_text('#minesLeft') == '9', '')
        await pg.locator('.cell').nth(mine).click(button='right')
        await pg.locator('.cell').nth(mine).click(); await pg.wait_for_timeout(900)
        ok('minesweeper: hitting a mine loses', 'mine' in await pg.inner_text('#resultTitle'), str(e))
        await pg.click('[data-level="hard"]')
        ok('minesweeper: hard level builds 480 squares', await ev(pg, "document.querySelectorAll('.cell').length") == 480, '')

        # ---------- sudoku ----------
        pg, e = await open_('sudoku/index.html')
        ok('sudoku: puzzle has exactly one solution', await ev(pg, 'game.solveCount(game.puzzle)') == 1, '')
        await ev(pg, "game.puzzle.forEach((v,i)=>{ if(!v){ game.select(i); game.input(game.solution[i]); } })")
        await pg.wait_for_timeout(1200)
        ok('sudoku: filling the solution completes it', await ev(pg, 'game.done') and await ev(pg, "result.style.display") == 'block', str(e))
        t0 = time.time(); await pg.click('[data-level="hard"]'); dt = time.time() - t0
        givens = await ev(pg, 'game.puzzle.filter(Boolean).length')
        ok('sudoku: hard puzzle generates quickly and is unique', dt < 3 and await ev(pg, 'game.solveCount(game.puzzle)') == 1, f'{dt:.2f}s, {givens} givens')
        await pg.locator('.sgrid .cell').nth(await ev(pg, 'game.puzzle.findIndex(v=>!v)')).click()
        await pg.keyboard.press('5')
        ok('sudoku: keyboard entry', 5 in await ev(pg, 'game.values') , '')

        # ---------- echo ----------
        pg, e = await open_('echo/index.html')
        await pg.click('#startBtn')
        for _ in range(40):
            if await ev(pg, 'game.state') == 'play': break
            await pg.wait_for_timeout(100)
        seq = await ev(pg, 'game.seq')
        for i in seq: await pg.locator('.epad').nth(i).dispatch_event('pointerdown')
        await pg.wait_for_timeout(900)
        ok('echo: correct answer moves to round 2', await ev(pg, 'game.round') == 2, str(seq))
        for _ in range(60):
            if await ev(pg, 'game.state') == 'play': break
            await pg.wait_for_timeout(100)
        wrong = (await ev(pg, 'game.seq[0]') + 1) % 4
        await pg.keyboard.press(['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'][wrong]); await pg.wait_for_timeout(1200)
        ok('echo: wrong pad ends the game', await ev(pg, "result.style.display") == 'block', str(e))

        # ---------- asteroids ----------
        pg, e = await open_('asteroids/index.html')
        await pg.click('#startBtn'); await pg.wait_for_timeout(200)
        x0 = await ev(pg, 'game.ship.x')
        await hold(pg, 'ArrowUp', 500)
        moved = await ev(pg, 'game.ship ? Math.abs(game.ship.y - 300) + Math.abs(game.ship.x-' + str(x0) + ') : 99')
        await pg.keyboard.down(' '); await pg.keyboard.down('ArrowLeft'); await pg.wait_for_timeout(4000); await pg.keyboard.up(' '); await pg.keyboard.up('ArrowLeft')
        ok('asteroids: thrust moves, shots score', moved > 5 and await ev(pg, 'game.score') > 0, f"moved {moved:.0f} score {await ev(pg,'game.score')} {e}")

        # ---------- snake ----------
        pg, e = await open_('cyber-snake/index.html')
        h0 = await ev(pg, 'game.snake[0].x')
        await pg.keyboard.press('ArrowRight'); await pg.wait_for_timeout(700)
        ok('snake: starts and moves', await ev(pg, 'game.gameRunning') and await ev(pg, 'game.snake[0].x') != h0, str(e))

        # ---------- tetris ----------
        pg, e = await open_('neon-tetris/index.html')
        for _ in range(3): await pg.keyboard.press('Space'); await pg.wait_for_timeout(60)
        ok('tetris: hard drops score', int(await pg.inner_text('#score')) > 0, str(e))

        # ---------- invaders ----------
        pg, e = await open_('space-invaders/index.html')
        x0 = await ev(pg, 'game.player.x')
        await hold(pg, 'ArrowRight', 400); await pg.keyboard.press(' ')
        ok('invaders: moves and fires', await ev(pg, 'game.player.x') > x0 and await ev(pg, 'game.bullets.length') > 0, str(e))

        # ---------- breakout ----------
        pg, e = await open_('neon-breakout/index.html')
        await pg.click('text=Start game'); await pg.keyboard.press(' '); await pg.wait_for_timeout(300)
        y0 = await ev(pg, 'game.balls[0].y'); await pg.wait_for_timeout(300)
        ok('breakout: starts and ball moves', await ev(pg, 'game.gameState') == 'playing' and await ev(pg, 'game.balls[0].y') != y0, str(e))

        # ---------- flappy ----------
        pg, e = await open_('flappy-neon/index.html')
        await pg.click('text=Start game')
        for _ in range(8): await pg.keyboard.press(' '); await pg.wait_for_timeout(180)
        ok('flappy: starts and flaps', await ev(pg, 'game.gameState') == 'playing', await ev(pg, 'game.gameState') + str(e))

        # ---------- racer ----------
        pg, e = await open_('racing-game/index.html')
        await hold(pg, 'w', 900)
        ok('racer: accelerates and travels', await ev(pg, 'game.speed') > 0 and await ev(pg, 'game.distance') > 0, f"speed {await ev(pg,'game.speed'):.1f} {e}")

        # ---------- deletion ----------
        pg, e = await open_('deletion-game-improved/index.html')
        for k in ['ArrowRight', 'ArrowDown']: await pg.keyboard.press(k); await pg.wait_for_timeout(120)
        ok('deletion: moving deletes tiles', await ev(pg, 'game.stepCount + (game.gameLost?1:0)') > 0, str(e))

        # ---------- chess ----------
        pg, e = await open_('chess/index.html')
        sq = pg.locator('.square')
        await sq.nth(52).click(); await sq.nth(20).click()
        illegal_blocked = await ev(pg, 'game.currentPlayer') == 'white'
        await sq.nth(52).click(); await sq.nth(36).click()
        ok('chess: legal move plays, illegal blocked', illegal_blocked and await ev(pg, 'game.currentPlayer') == 'black', str(e))
        await pg.get_by_text('Play against the computer').click()
        await sq.nth(12).click(); await sq.nth(28).click(); await pg.wait_for_timeout(200)
        await sq.nth(62).click(); await sq.nth(45).click(); await pg.wait_for_timeout(1000)
        ok('chess: computer replies', await ev(pg, 'game.currentPlayer') == 'white' and await ev(pg, 'game.moveHistory.length') == 4, str(e))

        # ---------- connect four / tic tac toe ----------
        pg, e = await open_('connect-four/index.html')
        for c in [0, 1, 0, 1, 0, 1, 0]: await pg.locator('.cell').nth(35 + c).click(); await pg.wait_for_timeout(50)
        await pg.wait_for_timeout(300)
        ok('connect four: four in a row wins', 'wins' in await pg.inner_text('#gameResult'), str(e))
        pg, e = await open_('tic-tac-toe/index.html')
        for i in [0, 3, 1, 4, 2]: await pg.locator('.cell').nth(i).click(); await pg.wait_for_timeout(50)
        await pg.wait_for_timeout(300)
        ok('tic-tac-toe: three in a row wins', 'wins' in await pg.inner_text('#gameResult'), str(e))

        # ---------- uno ----------
        pg, e = await open_('uno/index.html')
        idx = await ev(pg, "game.playerHand.findIndex(c=>c.color===game.currentColor||c.color==='wild'||c.value===game.discardPile[game.discardPile.length-1].value)")
        d0 = await ev(pg, 'game.discardPile.length')
        if idx >= 0:
            await pg.locator('#playerHand .card').nth(idx).click(); await pg.wait_for_timeout(300)
            if await ev(pg, "getComputedStyle(colorSelector).display") == 'block': await pg.locator('.color-option').first.click()
            ok('uno: playing a matching card', await ev(pg, 'game.discardPile.length') > d0, str(e))
        else:
            await pg.click('#drawBtn'); await pg.wait_for_timeout(300)
            ok('uno: drawing a card', await ev(pg, 'game.playerHand.length') == 8, str(e))
        await pg.wait_for_timeout(2500)
        ok('uno: computer takes its turn', await ev(pg, 'game.currentPlayer') == 'player', str(e))

        # ---------- war ----------
        pg, e = await open_('war-commander/index.html')
        await pg.click('#soldierBtn'); box = await pg.locator('#gameCanvas').bounding_box()
        await pg.mouse.click(box['x'] + box['width'] * .1, box['y'] + box['height'] * .95)
        await pg.click('#endTurnBtn')
        ok('war: deploy and hand over the turn', await ev(pg, 'game.units.length') == 1 and await ev(pg, 'game.currentPlayer') == 2, str(e))

        # ---------- townscaper ----------
        pg, e = await open_('townscaper/index.html')
        box = await pg.locator('#gameCanvas').bounding_box()
        await pg.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
        await pg.mouse.click(box['x'] + box['width'] / 2 + 60, box['y'] + box['height'] / 2)
        ok('townscaper: clicking places blocks', await ev(pg, 'game.buildings.size') >= 1, f"{await ev(pg,'game.buildings.size')} {e}")

        # ---------- impostor ----------
        pg, e = await open_('neon-impostor/index.html')
        await pg.click('text=Complete a task'); await pg.wait_for_timeout(300)
        ok('impostor: actions run', not e, await pg.inner_text('#taskProgress'))

        # ---------- rpg ----------
        pg, e = await open_('neon-rpg/index.html')
        l0 = await ev(pg, "gameLog.children.length")
        box = await pg.locator('#worldCanvas').bounding_box()
        await pg.mouse.click(box['x'] + box['width'] * 140 / 620, box['y'] + box['height'] * 190 / 440); await pg.wait_for_timeout(200)
        await pg.get_by_role('button', name='Explore', exact=True).click(); await pg.wait_for_timeout(300)
        if await ev(pg, 'game.inCombat'):
            for _ in range(20):
                if not await ev(pg, 'game.inCombat'): break
                await pg.locator('#combatScreen button', has_text='Attack').click(); await pg.wait_for_timeout(150)
        ok('rpg: travelling, exploring and fighting', await ev(pg, "gameLog.children.length") > l0 + 2 and not e, f"{l0} -> {await ev(pg, 'gameLog.children.length')} {e}")

        # ---------- dungeon ----------
        pg, e = await open_('cyber-dungeon/index.html')
        seen = set()
        for k in ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'] * 3:
            await pg.keyboard.press(k); await pg.wait_for_timeout(40)
            seen.add(await ev(pg, 'JSON.stringify([game.player.x,game.player.y])'))
            if await ev(pg, 'game.inCombat'): break
        ok('dungeon: player moves', len(seen) > 1 or await ev(pg, 'game.inCombat'), f'{len(seen)} positions {e}')
        reach = await ev(pg, """() => { let bad = 0;
          for (let k = 0; k < 200; k++) {
            game.generateDungeon();
            const d = game.dungeon, p = game.player, W = d.width, H = d.height;
            const open = (x,y) => x>=0&&y>=0&&x<W&&y<H&&d.grid[y][x].type!=='wall';
            const seen = new Set([p.x+','+p.y]), q = [[p.x,p.y]];
            while (q.length) { const [x,y] = q.pop(); for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const a=x+dx, b=y+dy, key=a+','+b; if (open(a,b) && !seen.has(key)) { seen.add(key); q.push([a,b]); } } }
            const targets = [d.stairs, ...d.enemies, ...d.treasures].filter(Boolean);
            if (!targets.every(t => seen.has(t.x+','+t.y))) bad++;
          } return bad; }""")
        ok('dungeon: stairs, enemies and loot always reachable (200 maps)', reach == 0, f'{reach}/200 maps broken')

        # ---------- phone width: no sideways scrolling, help sheet present ----------
        m = await b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
        paths = ['index.html'] + [h for h in hrefs]
        wide = []
        for path in paths:
            pg = await m.new_page(); errs = []
            pg.on('pageerror', lambda x: errs.append(str(x)))
            await pg.goto(B + path); await pg.wait_for_timeout(350)
            ov = await ev(pg, 'document.documentElement.scrollWidth - innerWidth')
            if ov > 1 or errs: wide.append(f'{path}: +{ov}px {errs[:1]}')
            await pg.close()
        ok('phone: no page scrolls sideways, no errors', not wide, '; '.join(wide))

        await b.close()

asyncio.run(main())
w = max(len(n) for n, _, _ in results)
for n, good, d in results:
    print(('PASS ' if good else 'FAIL ') + n.ljust(w) + ('  ' + d if (d and not good) or n.startswith('sudoku: hard') else ''))
passed = sum(g for _, g, _ in results)
print(f"\n{passed}/{len(results)} passed")
sys.exit(0 if passed == len(results) else 1)
