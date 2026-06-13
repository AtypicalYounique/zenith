# Zodiac's Zenith: Claude Code Project Brief and Vision-Loop Setup

This file is the project memory for Zodiac's Zenith. Claude Code reads it automatically at the start of every session, so anything written here is context Claude always has.

There are no em-dashes anywhere in this file on purpose. The game follows the same rule, and so should you (see Conventions).

---

## 0. For Ryan (the human): how to use this file

1. Save this file as `CLAUDE.md` in the root of your project folder (the `~/zenith` folder where `index.html` lives). The name matters: Claude Code looks for exactly `CLAUDE.md`.
2. Make sure Claude Code is installed (Section 1 below has the steps).
3. Open Terminal, run `cd ~/zenith`, then run `claude`.
4. Paste the prompt in Section 2 as your first message. That sets up version control, the screenshot loop, and the test harness, without changing any game code.
5. From then on, you can just say things like "open the Mars realm and tell me what you see," and Claude will drive a browser, look at the rendered game, and report back.

You do not need to know how any of this works. Claude Code does the technical parts. Your job is to look at what it shows you and tell it what you want changed.

---

## 1. Installing Claude Code (one time)

Claude Code is Anthropic's terminal agent. It needs a paid Claude plan, which you have.

- Open the official quickstart: https://code.claude.com/docs/en/quickstart
- It shows a single install command for macOS. Copy whatever the official page shows (it is the source of truth if the command ever changes), paste it into Terminal, and press Return.
- Close and reopen Terminal, then type `claude --version` to confirm it installed.
- The first time you run `claude` it opens a browser once to log in.

---

## 2. First session: paste this prompt to Claude Code

> Read this entire CLAUDE.md first. Do not change any game logic in this session. Your job is to set up the safety net and the eyes so future sessions are safe and can build with visual feedback.
>
> 1. Version control. If this folder is not already a git repository, initialize one, and help me connect it to a new GitHub repository under my account (GitHub username AtypicalYounique). Walk me through any one-time step I have to click in the browser, in plain language. Make a first commit of the current state. From now on, after any change that passes the test harness, commit it with a clear message so I always have a working version to roll back to.
> 2. The test harness. Create a headless test harness in this repo as described in Section 8, so we can catch the silent freezes before I ever deploy. Confirm it runs and passes against the current file.
> 3. The screenshot loop. Set up a way for you to view the rendered game as images: install the Playwright MCP server for Claude Code using its current official command (look it up so it is correct), or use the Playwright CLI if you judge it a better fit. Start a local server (`python3 -m http.server 8000` works and the game is then at `http://localhost:8000/index.html`), open the game, take a screenshot of the menu and one of gameplay, and save them into a `shots/` folder.
> 4. Look at the screenshots and describe, in plain language, exactly what you see, so I know your eyes work.
>
> Do not deploy and do not edit game logic. When done, summarize in four or five sentences what you set up.

---

## 3. The project in one paragraph

Zodiac's Zenith is a single self-contained HTML file game built with Three.js (version r128, loaded from a CDN; no other external assets). The player is a zodiac sign, and there are twelve signs across three cycles of twelve levels each, plus a hidden boss named Typhon. The whole game (all code, all art, all sound) lives inline in one file. The art is generated in code: geometry, canvas textures, and noise. The file is the source of truth. Read it before making claims about how anything works.

---

## 4. Who you are working with, and how to work with him

- Ryan does not write code. He cannot read a diff and tell you if it is right. He judges the game by playing it and by what he sees on screen. This is the whole reason the screenshot loop matters.
- Because he cannot debug, your instructions to him must be complete and literal. Never say "just update the config." Give exact steps.
- He builds in approval-gated pieces. Propose a change, get a yes, then build it. Do not ship large multi-part changes without checking in.

---

## 5. Hard conventions (do not break these)

- No em-dashes anywhere, ever: not in the game's on-screen text, not in code comments, not in messages to Ryan. Use periods, commas, colons, or semicolons. Before shipping any change to the file, verify zero em-dashes by counting them. If the count is not zero, fix it before shipping.
- Use contractions in all on-screen text and in messages to Ryan. Write "you can't," not "you cannot."
- One file. Everything stays inline in the single HTML file. No external assets beyond the Three.js CDN script already in the head. (See Section 9 on when this should change, and when it should not.)
- Edit by precise anchored replacements, not broad rewrites. Match an exact existing string, replace it, and confirm the match was unique. This protects the rest of the game.
- Test before you ship, then commit. The file has many interdependent systems, and a single bad line crashes the whole play loop silently (the screen just freezes). Run the harness and the two QA gates, then commit the working version, then tell Ryan to deploy.

---

## 6. Version control and deploy

Git is the safety net for someone who cannot debug. Use it well.

- After any change that passes the harness, commit it with a clear message. Each commit is a version Ryan can roll back to. If a change ever breaks something Ryan cannot fix, the recovery is "check out the last good commit."
- Keep `CLAUDE.md` and `zenith_state.md` in the repo and update `zenith_state.md` as the live state changes (what is done, what is next, decisions). Do not batch these updates; write them as they happen. This is how continuity survives across sessions and across tools.

Deploy, two paths:

- If the repo is connected to Vercel, deploying is just commit and push; Vercel's Git integration builds and serves it automatically. Confirm the connection from the repo's Vercel settings before assuming this.
- If not yet connected, give Ryan the manual steps verbatim:
  1. Download the new file to Downloads.
  2. Command and Space, type Terminal, Return.
  3. `cd ~/zenith`
  4. `mv ~/Downloads/zenith.html index.html`
  5. `npx vercel deploy --prod`
  6. Open the URL it prints.
- His live project has been `zenith-jet-beta.vercel.app`. Confirm from the `.vercel` folder rather than assuming.

---

## 7. What exists in the file today (map, not gospel; read the code)

The file is one large inline script. Systems already built and working:

- Twelve playable signs, each with its own avatar, palette, and feel.
- A power system: five powers per hero across five ranks. On-screen they fire on keys 1 through 5. Camera rotates on q and e. Movement is WASD or tap-to-move; look is right-drag.
- Deep meta-progression: many passives, per-hero augments, a set of Crowns, three Invisible Heavens (Uranus, Neptune, Pluto), and relics. Three difficulty cycles, plus the hidden Typhon gate.
- The Mars realm ("The Wanderers' Road"), which runs inside normal play with a world flag set to `mars`. Key functions:
  - `marsH(x, z)`: the single height function driving terrain, ground, and placement. Most important function in the realm.
  - `buildMarsRealm()`: builds the scene (terrain, sky dome, the moons Phobos and Deimos, rocks, dust, three teaching waymark stones, a gate of return).
  - `realmTick(dt, t)`: per-frame realm logic (moves moons and dust, opens a lore card at a waymark).
  - `MARS_LORE`: the short teaching texts.
  - The realm reuses the normal `spawnHero(...)` so the hero has all the usual shield and effect meshes. (An earlier crash came from building the avatar by hand and skipping those. Do not reintroduce that.)

---

## 8. The test harness (run before every deploy, then commit)

A bad line does not throw a visible error in the browser; the play loop just stops and the screen freezes. To catch that, the project uses a headless harness that boots the game in Node, presses the buttons, and steps animation frames so any crash surfaces with a real stack trace.

Keep a harness file in the repo. The pattern that works:

- Use `jsdom` to load the HTML, and inject the real `three` npm package (same r128 API) by replacing the CDN script tag.
- Stub what Node lacks: replace `THREE.WebGLRenderer` with a no-op class, and provide a small "absorber" Proxy for canvas 2D contexts and the AudioContext so calls do not throw.
- Replace `requestAnimationFrame` with a queue you can drain frame by frame, and advance a virtual clock (patch both `window.performance.now` and the Node global `performance.now`, since the game's clock uses the latter).
- Script a run: boot frames, enter the realm, begin play, walk the hero, trigger a waymark, return through the gate, run a normal level. Assert no frame threw.

Two quick gates on every change:

- Extract the inline script and run `node --check` for syntax.
- Count em-dashes and confirm zero.

Only after the harness and both gates pass should you commit and then tell Ryan to deploy.

---

## 9. Architecture guidance (do not prematurely rewrite)

This is settled. Do not relitigate it without a clear new reason.

- The single-file HTML format does not limit the graphics. The graphics ceiling is set by the browser GPU layer (WebGL, and now WebGPU), not by the file format. A React or TypeScript rewrite would not change a single rendered pixel.
- Stay single-file for the current solo, single-player, content-building phase. It is the right fit for a non-coding founder working with an AI: one openable, testable, deployable artifact.
- WebGPU is a version upgrade, not a rewrite. When Ryan wants the visual jump, upgrade Three.js from r128 to a current release and switch to the `three/webgpu` WebGPURenderer (it falls back to WebGL 2 automatically). This is done in place, in the single file.
- Real-time multiplayer is the migration trigger. Multiplayer needs an authoritative server (browsers cannot trust each other) and a split between persistent state (accounts, characters, natal charts, progress in a database such as Supabase) and ephemeral state (live positions in server memory). The client can stay Three.js; it adds networking. The moment real-time sync is being written is the natural point to move to a modular TypeScript build (optionally React Three Fiber), because that is when modularity and types start paying for themselves. Not before.

---

## 10. Roadmap

- Done: the full set of meta-systems (powers, ranks, passives, augments, Crowns, the three Invisible Heavens, relics, the Typhon gate, the difficulty cycles), verified so the full kit costs more than the lifetime budget by design. Done: Build W1, the Mars realm ground (terrain, sky, moons, dust, three teaching waymarks, gate of return), shipped and confirmed working in-browser.
- Next: Build W2, the natal chart system. The player enters birth date, time, and place. The game computes their real chart in the browser using deterministic astronomy (no AI; birth data never leaves the device; bundled city list; whole-sign houses). It narrates the player's descent of the soul as a prologue, then uses the chart to shape the realm (strong Mars placement: the valley salutes you; weak placement: it tests you). The chart ruler's gate can open first for a personalized order.
- After that: Build W3, the first catasterism quest. The player lives out a constellation's origin myth; on completing it that constellation lights permanently in their sky. The night sky becomes a personal quest log.

---

## 11. The why (the mythology frame)

The game teaches the real mythology of astrology, and the structure is the teaching. In the ancient Neoplatonic account, the soul descends to birth through the seven planetary spheres, receiving a gift at each one (boldness from Mars, reason from Saturn, and so on). A natal chart is the timestamp of that descent. So the player's journey up through the planetary realms is the ancient ascent of the soul, reclaiming each gift. The sign stories come from the old catasterism sourcebooks (how each constellation got placed in the sky), and they are naturally quest-shaped. Keep new content faithful to this frame. A small amount of real, short reading at the right moments is wanted, not avoided.

---

## 12. Visual cookbook (for building with eyes open)

- One height function drives terrain, physics, and placement.
- Ridged plus domain-warped noise for peaks and canyons; damp noise on steep slopes.
- Bake sun shadows into vertex colors at load when the sun is static (Mars already does this).
- Linear color plus ACES tone mapping, vignette, grain, exposure that stops down toward the sun.
- Instancing for anything repeated (grass, rocks, embers). On WebGPU, compute shaders unlock far larger particle and physics counts.
- Fake light scattering for dust and clouds; gradient sky dome; small constant ambient motion.
- Work in a loop: render, look at the screenshot, name the single biggest visual problem, fix only that, render again, compare. Small steps with eyes on beat big blind rewrites.
