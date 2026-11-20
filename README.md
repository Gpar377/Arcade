# Legendary Arcade

Twenty-four small games on one shelf. Twenty-three run in the browser with nothing to install; Temple Run is a pygame game for the desktop.

- **Play locally:** `cd legendary-games && python3 -m http.server`, then open http://localhost:8000
- **Deploy:** import this repo into Vercel and keep the default settings. `vercel.json` serves `legendary-games/` at the site root, adds security headers, and uses `404.html` for unknown pages. There is no build step.

The game list, controls and how the code is laid out are in [legendary-games/README.md](legendary-games/README.md). The original Python notebook version of Hangman is [HangMan.ipynb](HangMan.ipynb).
