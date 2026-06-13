# Zenith live state

This file tracks the live state of the project so continuity survives across
sessions and tools. Update it as things change, not in a batch. (See CLAUDE.md
Section 6.) No em-dashes anywhere.

## Last updated
2026-06-13, first setup session.

## Where things stand

- Repo: this folder (`~/zenith`) is a clean git repository on branch `main`.
- GitHub: connected to https://github.com/AtypicalYounique/zenith (public).
  Push with `git push`. Authenticated locally via the `gh` CLI as AtypicalYounique.
- Vercel: the `.vercel/` folder links this to the existing Vercel project `zenith`
  (it is git-ignored, not committed). Deploy is out of scope until asked.
- The game is one file, `index.html` (Three.js r128 from CDN). Unchanged this session.

## Safety net (run before every deploy, then commit)

- `npm test` runs both quick gates then the play-through harness:
  - `npm run test:gates`: `node --check` on the inline script + zero-em-dash check.
  - `npm run test:harness`: boots the game headless (jsdom + three r128), drives
    menu -> Mars realm -> waymark -> gate of return -> a normal level, and steps
    animation frames so a silent freeze surfaces with a stack trace.
- Verified the harness catches an injected runtime crash (not a false pass).

## Eyes (the screenshot loop)

- Start a local server first: `python3 -m http.server 8000`
  (game is then at http://localhost:8000/index.html).
- `npm run shots` opens the game in a headless Chromium (WebGL via SwiftShader)
  and writes `shots/menu.png` and `shots/gameplay.png`. The `shots/` folder is
  git-ignored (regenerated each run).

## Done

- Clean first commit with the real game; pushed to GitHub.
- Test harness + two gates committed; confirmed passing and confirmed it catches crashes.
- Screenshot loop working; menu and gameplay captured and verified by eye.

## Next (from CLAUDE.md roadmap)

- Build W2: the natal chart system (birth date/time/place -> deterministic chart
  in-browser, no AI, birth data never leaves the device). Propose, get a yes, then build.
