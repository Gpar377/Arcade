# Legendary Arcade

Twenty-four small games behind one shelf. Twenty-three run in the browser with nothing to install; Temple Run is a pygame game that runs on your computer.

Serve the folder with `python3 -m http.server` and open it in a browser (opening `index.html` directly also works). The repo root has a `vercel.json`, so importing the repo into Vercel deploys it as-is with no build step.

## Games

| Game | Kind | Controls |
| --- | --- | --- |
| Hangman | Puzzle | Keyboard or on-screen keys |
| Five Letters | Puzzle | Keyboard or on-screen keys; daily word and practice |
| 2048 | Puzzle | Arrows / WASD or swipe, U undo |
| Minesweeper | Puzzle | Click, right-click or long-press to flag; arrows + Enter + F |
| Sudoku | Puzzle | Click or arrows, 1–9, N notes, U undo |
| Echo | Memory | Arrow keys or tap the pads |
| The Deletion Game | Puzzle | WASD / arrows, H hint, R restart |
| Cyber Snake | Arcade | WASD / arrows, Space pause |
| Neon Tetris | Arcade | Arrows, Space hard drop, P pause |
| Space Invaders | Arcade | A/D or arrows, Space fire |
| Neon Breakout | Arcade | Arrows or A/D, Space launch / fire |
| Flappy Neon | Arcade | Space, click or tap |
| Neon Racer | Arcade | WASD, Space nitro |
| Asteroids | Arcade | Arrows to turn and thrust, Space fire, P pause |
| Chess | Board | Click; optional computer opponent |
| Connect Four | Board | Click; optional computer opponent |
| Tic-Tac-Toe | Board | Click; computer with three levels |
| UNO | Cards | Click |
| War Commander | Strategy | Click; two players on one screen |
| Townscaper | Builder | Click, right-drag to pan, scroll to zoom |
| Neon Impostor | Deduction | Click |
| Neon RPG | Adventure | Click |
| Cyber Dungeon | Adventure | WASD / arrows, Space interact |
| Temple Run | Arcade (Python) | `pip install -r temple-run/requirements.txt && python3 temple-run/temple_run.py` |

On phones and tablets, keyboard games get an on-screen pad automatically.

## How it is put together

- `assets/games.js` is the catalogue: each game's name, kind, colour and 8×8 label art. The shelf and every game page read from it.
- `assets/arcade.css` is the shared design system. Each game sits in a moulded "console" in its own colour, with an LCD strip for scores and key-cap buttons.
- `assets/arcade.js` builds the top bar, the "How to play" sheet, toasts, and the touch pad (which sends real key events, so the game code needs no changes to work on touch).
- Each game folder keeps its own game logic in its `.js` file; `index.html` is only layout.

The original Python notebook version of Hangman is `../HangMan.ipynb`.
