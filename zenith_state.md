# Zenith live state

This file tracks the live state of the project so continuity survives across
sessions and tools. Update it as things change, not in a batch. (See CLAUDE.md
Section 6.) No em-dashes anywhere.

## Last updated
2026-06-17, Mars World build track step 1 (NPC system).

## Mars World build track (from MARS_WORLD_DESIGN.md)

Building the Mars realm into a living world (NPCs, quests, enemies, gear, shop,
dungeons) per MARS_WORLD_DESIGN.md, in its 17-step build order (0 through 16).
Each step: build, run harness, screenshots if visual, check with Ryan, commit.

- Done: step 0, save schema and migration. Added per-hero HEROES[i].mars via a
  new loadMars(m) helper in loadHeroes(); coexists with the universal Mountain
  progression and saves through the existing saveHeroes(). Schema version bumped
  v4 -> v5. Added S.zone (default null) for future dungeon zone transitions.
  Migration verified in a real browser: 22 checks (fresh defaults, partial-save
  merge, bad-data rejection, lvl clamp to 20, S.zone present). No gameplay change.
- Done: step 1, NPC system. New `// ===== MARS: NPC SYSTEM =====` block:
  npcLabel() (canvas name sprite), buildEnyo() (simple crimson humanoid with
  spear and helm crest), MARS_NPCS registry (Enyo at the Landing, -12,-7,
  interaction radius 6), spawnRealmNPCs(), npcTick() (in-range detection, NPC
  turns to face player, shows/hides the #npcPrompt), and interactNPC() (step-1
  placeholder: a greeting toast; the dialogue card is step 2). Wired E (desktop)
  and tap-the-prompt (mobile) to interact; camera 'e' rotation is suppressed
  while an NPC is in range so there's no conflict. Prompt hides on lore-card open
  and on realm exit; npcs[] resets on exit. Verified in browser: in-range shows
  Enyo + prompt, E triggers the greeting, walking away clears both, she faces the
  player. Harness and both gates pass.
- Next: step 2, dialogue system (card-based UI reusing the lore-card pattern;
  multiple lines, response choices, quest-accept buttons; replaces the step-1
  greeting toast).

## Where things stand

- Repo: this folder (`~/zenith`) is a clean git repository on branch `main`.
- GitHub: connected to https://github.com/AtypicalYounique/zenith (public).
  Push with `git push`. Authenticated locally via the `gh` CLI as AtypicalYounique.
- Vercel: the `.vercel/` folder links this to the existing Vercel project `zenith`
  (it is git-ignored, not committed). Production alias is `zenith-jet-beta.vercel.app`.
- Deploy method (verified 2026-06-17): GitHub push does NOT auto-deploy. The repo
  is not connected to Vercel's Git integration, so `git push` only updates GitHub.
  To publish, deploy explicitly with the Vercel CLI from `~/zenith`:
  `npx vercel deploy --prod --yes`. The CLI is already logged in as
  `ryanslacerda1992-9598`, and `.vercel/project.json` links the project, so it is
  non-interactive. Confirm a deploy is live by fetching
  `https://zenith-jet-beta.vercel.app/index.html` and grepping for a unique string
  from the change. (Optional one-time fix: connect the GitHub repo in the Vercel
  dashboard to enable push-to-deploy.)
- The game is one file, `index.html` (Three.js r128 from CDN).

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
- Done: #3 sky, moons, and camera pitch.
  - Far plane: raised to 2200 on enterMars and restored to 500 on exitRealm
    (Mars-scoped) so the sky dome, sun, stars, and both moons are no longer
    clipped. The dome now fills the background in place of the flat color.
  - Sky: warmer horizon, dusky-violet zenith, brighter/larger stars.
  - Moons: bigger (Phobos r17, Deimos r11) and lit with a sun terminator plus a
    faint emissive so the dark side reads as a moon, not a hole. Findable now.
  - Camera pitch: new camPitch var, added to the existing right-drag (vertical)
    on desktop and the one-finger camera drag on mobile. Pitch raises the lookAt
    aim by tan(camPitch)*horizDist, so at camPitch 0 the framing is byte-for-byte
    the old view. Clamped [0, 1.35] (resting view is the floor, up to ~76 degrees,
    cannot flip). Input is gated to S.world==='mars'; camPitch resets on
    startLevel, enterMars, and exitRealm, so the 12 normal levels are untouched.
    No new keys bound, per request.
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
