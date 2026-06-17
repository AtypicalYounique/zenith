# Zenith live state

This file tracks the live state of the project so continuity survives across
sessions and tools. Update it as things change, not in a batch. (See CLAUDE.md
Section 6.) No em-dashes anywhere.

## Last updated
2026-06-16, Mars visual polish, pass 3 (rocks and waymark stones).

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
- Mars visual polish pass 1 (lighting and tonal range), all inside buildMarsRealm:
  stronger low warm sun as key, lower flat ambient plus a dim cool fill for the
  shadow side, widened ground albedo (darker hollows, brighter wind-bleached
  crests), and a deeper baked light-to-shadow gradient. Terrain, rocks, and the
  waymark stones now read with form instead of flat brown. Harness and both gates
  passed. No global renderer or tone-mapping change (kept the edit Mars-only).

## Mars polish backlog (ranked from the visual read, 2026-06-16)

- Done: #1 lighting and tonal range.
- Done: #2 dust. Replaced the default square point sprite with a canvas radial
  dot, added per-point size variation via an aScale attribute injected into the
  PointsMaterial shader (onBeforeCompile), lowered opacity to .32, depthWrite
  off. Reads as soft warm haze now. realmTick was untouched (still drives dP/dG).
- #3: sky and moons. Note: camera far plane is 500, but the sky dome (r900),
  sun disc, stars, and Phobos (dist 500) are at/beyond it, so they get clipped
  and the upper sky is just the flat scene.background. Fixing the sky likely
  needs the far plane raised or the dome/moons pulled inside 500. Also make the
  moons read as lit bodies (currently dark Lambert blobs).
- Done: #4 rocks and waymark stones. Rocks now carry per-instance color (warm
  iron reds plus a few cooler slate stones) so they separate from the warm
  ground; every rock is seated with a soft contact-shadow stamp (a shared canvas
  radial dot on an instanced flat plane). Waymark stones are now faceted, tapered
  CylinderGeometry monoliths in a cooler stone color, each on a wider base with
  its own contact shadow. The gate of return is seated the same way. All inside
  buildMarsRealm; realmTick (orb hover) unchanged.

## Next (from CLAUDE.md roadmap)

- Build W2: the natal chart system (birth date/time/place -> deterministic chart
  in-browser, no AI, birth data never leaves the device). Propose, get a yes, then build.
