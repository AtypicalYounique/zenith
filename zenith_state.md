# Zenith live state

This file tracks the live state of the project so continuity survives across
sessions and tools. Update it as things change, not in a batch. (See CLAUDE.md
Section 6.) No em-dashes anywhere.

## Last updated
2026-06-17, Mars World build track step 8 (inventory UI).

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
- Done: step 2, dialogue system. New `// ===== MARS: DIALOGUE UI =====` block:
  a #npcDialog card (reuses .card / .loreBody styling) with glyph, name, body,
  and a #ndChoices button column. MARS_DIALOGUE is a per-NPC node graph; each node
  has text and either a single `next` (Continue), a set of `choices`, or an end
  (Farewell). A choice can `goto` a node, `end` the talk, or `accept` a quest.
  openDialog/renderDialogNode/handleChoice/closeDialog drive it. interactNPC() now
  opens the dialogue (replaced the step-1 toast). Opening sets S.mode='dialogue'
  (pauses play like the lore card); closing resumes. Escape closes; gameplay keys
  are swallowed while talking. dialogAccept() is a placeholder toast for now;
  step 3 wires it to HEROES[S.hero].mars.quests and the tracker. Enyo has a full
  intro: greeting -> hub with 4 choices -> lore branches that return -> a quest
  offer (firstBlood) with accept/decline. Verified in browser: 9 flow checks pass
  (open, branch, return, accept-closes-and-resumes, Escape-closes). Harness/gates pass.
- Playtest fixes (after step 2): (1) Enyo now visibly turns to face the player.
  The npcTick rotation math was already correct (proven by probe); the figure was
  symmetric so the turn was invisible and snapped. Added shortest-angle smoothing
  and a clearly-fronted model. (2) buildEnyo rebuilt as a feminine silhouette
  (flared gown/wide hips, cinched waist, narrow shoulders, circlet, long hair, face
  on +z). (3) Enyo's dialogue glyph changed from the Mars sign to crossed swords.
- Done: step 3, quest system. New `// ===== MARS: QUEST STATE =====` block:
  MARS_QUESTS registry (firstBlood: name/objective/goal 3/unit), state helpers
  heroMars/questState/setQuest (persists via saveHeroes), questAddProgress (the
  hook step 5 calls on kills; flips to 'done' at goal), and updateQuestTracker.
  A lower-right #questTracker shows the active quest name, objective, and "X / 3"
  progress. dialogAccept now sets the quest active (was a placeholder toast).
  openDialog picks Enyo's start node by state: locked->intro, active->questActive,
  done->questDone (new nodes added). Tracker refreshes on riBegin/setQuest/progress
  and hides on realm exit; questProgress (per-session count) resets on enterMars.
  Verified in browser: 18 checks (accept->active->persist across reload->progress
  ->done->persist; tracker show/hide; state-aware dialogue). Harness/gates pass.
- Done: step 4, compass HUD. New `// ===== MARS: COMPASS HUD =====` block:
  a top-center #compass bar (edge-faded via CSS mask) with 8 cardinal/intercardinal
  ticks that scroll with facing, plus pooled markers for the active quest waypoint
  (gold diamond, from MARS_QUESTS[id].target) and each NPC (dot), positioned by
  bearing and clamped to the bar edges when off-screen. Convention: North=-z, the
  camera's facing bearing is -camYaw; bearingDeg(dx,dz)=atan2(dx,-dz). updateCompass
  runs each play frame from realmTick; hides on realm exit. Refactored a shared
  activeQuestId() helper (used by the tracker and compass) and gave firstBlood a
  waypoint target (70,-110) in the Proving Grounds. Verified in browser: 7 checks
  (centered cardinal matches facing across N/E/S/W; NPC marker shown and centers
  when facing Enyo; quest waypoint appears when active). Harness/gates pass.
- Done: step 5, realm enemy spawning. New `// ===== MARS: REALM ENEMIES =====`
  block. REALM_ENEMIES defines War Shade (melee), Bolt Thrower (ranged, fires
  fireShadowBolt), Bloodhound (fast flanker) with hp/speed/dmg/aggro/leash.
  spawnRealmEnemy flags userData.realm and puts them in the shared enemies[] so
  powers/basic-attacks/dealDamage/status all reuse the existing combat. They are
  skipped in the arena movement loop (`if(e.userData.realm) return;`) and branched
  out of slayEnemy (realmEnemySlain) so no arena XP/respawn. realmEnemyTick (called
  from realmTick) grounds them on marsH, runs aggro/leash, ranged-strafe and flank
  AI, separation, lookAt, and contact damage (hurt). Meshes: buildRealmShade reuses
  buildWraith tinted crimson (+ bow for archers); buildBloodhound is a new low
  quadruped. REALM_PACKS spawns 4 packs (13 enemies) in the Proving Grounds on
  realm build (realmPacks counts members); clearing a pack while firstBlood is
  active calls questAddProgress, so 3 packs completes the quest. Re-entering the
  realm respawns the packs (no mid-session respawn; clearScene wipes enemies[]).
  Verified in browser: 11 checks (counts/kinds, aggro, approach, grounding, leash,
  pack->progress, quest done after 3 packs, persisted). Harness/gates pass.
- Possible polish later: the Bloodhound mesh reads as a low dark shape but less
  distinct than the shades; could get a dedicated visual pass like Enyo did.
- Done: step 6, loot drops. New `// ===== MARS: LOOT DROPS =====` block.
  realmEnemySlain now grants War-Marks per kill (warShade 3-4, boltThrower 4-5,
  bloodhound 3-4) via addWarMarks -> HEROES[i].mars.warMarks (saveHeroes), shown in
  a small top-left #marksHUD counter (⚔ + value), and a 35% chance to dropMaterial
  keyed by kind (warShade->ironDust, boltThrower->warStone, bloodhound->fangShard).
  Materials drop as glowing spinning pickups (realmPickups[]) collected by walking
  within 2 units (realmPickupTick, called from realmTick) into HEROES[i].mars.
  materials (saveHeroes). Pickups reset on realm build/exit; marksHUD shown on
  riBegin, hidden on exit. Gear drops are deferred to step 7 (MARS_GEAR not built
  yet). Verified in browser: 10 checks (War-Marks on kill + HUD + persist; material
  spawn, walk-over collect +1, pickup removed, persist; kills leave drops). Harness/gates pass.
- Done: step 7, realm gear system. New `// ===== MARS: REALM GEAR =====` block.
  MARS_GEAR registry (Worn tier: worn_helm, worn_legs) with buildWornHelm/
  buildWornLegs. equipMarsGear/unequipMarsGear store the item id in
  HEROES[i].mars.gear (saveHeroes) and applyMarsGear swaps mesh groups onto the
  hero, placed from the avatar's own extents (spawnHero now captures bodyMinY/
  bodyMaxY before effect meshes inflate the box). applyMarsGear runs after
  spawnHero in buildMarsRealm so equipped gear re-shows on entry. dropGear drops a
  gold pickup (12% on kill); collecting adds to mars.inventory and auto-equips an
  empty slot (visible immediately). Verified in browser: 10 checks (attach,
  persist, unequip, reload+re-apply, drop->inventory+auto-equip). Harness/gates pass.
- Placement note: helm/legs sit via the body box and read best on humanoid signs;
  on creature rigs (Leo lion, Aries ram) they sit approximately. Candidate for a
  per-sign anchor polish later, like the Bloodhound mesh.
- Done: step 8, inventory UI. New `// ===== MARS: INVENTORY UI =====` block and a
  #invSheet card-layer (reuses the character-sheet scroll/.csRow styling). Press I
  (or tap the #marksHUD War-Marks counter) to open the War-Pack; sets S.mode='inv'
  which pauses play like the char sheet, closing resumes. renderInv lays out: the
  War-Marks balance and Mars level; Realm Gear (helm/legs live with a Remove button,
  chest/weapon shown as "awaits the forge" until their step-15 meshes); the three
  universal Mountain relics read-only beside them (from RELIC_BY_ID); Carried bag
  (each owned MARS_GEAR item with an Equip button, or a disabled Worn tag if equipped
  to its slot); and all five crafting materials with counts. Tier tags via MARS_TIERS
  (worn gray, plus forged/battle/blessed/mythic colors ready for later tiers). Equip/
  Remove route through the existing equipMarsGear/unequipMarsGear (mesh swap + save),
  then re-render. Wired via delegated data-* click handlers like the char sheet; I
  closes on Escape/I; #invSheet hidden on realm exit. marksHUD made clickable (was
  pointer-events:none). Harness extended with an open->render->close inventory step;
  harness and both gates pass. Verified by screenshot: clean, on-aesthetic layout.
- Next: step 9, the shop (Forge of Ares). Place Harmonia as an NPC; buy/sell/craft
  tabs spending War-Marks; test with Forged-tier gear purchases.

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
