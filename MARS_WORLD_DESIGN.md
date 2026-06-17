# Mars Realm World Design: The Wanderers' Road

This is the design spec for transforming the Mars realm from a visual walkthrough into a living world with NPCs, quests, enemy zones, a shop, and gear that visibly changes your hero. Claude Code should read this file alongside CLAUDE.md before building any of these systems.

No em-dashes anywhere. Use contractions. Build in approval-gated chunks.

---

## Architecture rules for Claude Code

These rules exist because the codebase is a single 6,400-line HTML file, and without them, independently built systems won't fit together. Read this section before writing any code.

### Comment-header convention

Every new system block must begin with a searchable comment header in this format:

```
// ===== MARS: NPC SYSTEM =====
// ===== MARS: DIALOGUE UI =====
// ===== MARS: QUEST STATE =====
// ===== MARS: REALM ENEMIES =====
// ===== MARS: REALM GEAR =====
// ===== MARS: SHOP UI =====
// ===== MARS: INVENTORY UI =====
// ===== MARS: COMPASS HUD =====
// ===== MARS: DUNGEON ZONES =====
// ===== MARS: MAP UI =====
```

Claude Code can't read the whole file at once; it reads by line range. These headers let it search, jump, and scope its edits safely.

### The realm enemy system is separate from the arena enemy system

The arena's `spawnEnemy()` places enemies in a circle on a flat plane at Y=0. It's tuned for wave-based fights in a ring. Don't reuse it for the realm.

Build a new `spawnRealmEnemy()` that:

- Places enemies at specific positions on the Mars terrain using `marsH()` for grounding
- Gives each enemy a home position and a leash radius (returns to its spot if the player runs far enough)
- Uses aggro radius (enemies ignore you until you're within range)
- Runs its own tick function in `realmTick()`, separate from the arena's enemy movement in the render loop

The existing combat functions (damage, health, powers, basic attacks) are reused. The spawning, positioning, and movement AI are new.

### Dungeon zone transitions

The Sacred Places (Bronze Jar, Invisible Net, Hill of Justice) are interior areas that load separately from the open Mars world. They use a `S.zone` state variable alongside `S.world`:

- `S.world === 'mars'` and `S.zone === null`: the open Mars realm (Landing, Proving Grounds, Deep)
- `S.world === 'mars'` and `S.zone === 'bronzeJar'`: inside the Bronze Jar dungeon
- `S.world === 'mars'` and `S.zone === 'invisibleNet'`: inside the Invisible Net
- `S.world === 'mars'` and `S.zone === 'hillOfJustice'`: inside the Hill of Justice

Each dungeon has its own `build*()` function (e.g., `buildBronzeJar()`). Entering a dungeon calls `clearScene()` then the dungeon's build function. Exiting calls `clearScene()` then `buildMarsRealm()` and restores the player's position near the dungeon entrance.

Dungeon entrances are proximity triggers on the open Mars terrain, just like waymark stones. They only activate when the relevant quest chapter is active.

---

## Save schema (step 0, before any building)

The existing HEROES array stores per-hero data in localStorage as `zz_heroes`. Each hero currently has: level, XP, points, skill allocations, gear (3 relic slots: weapon, armor, charm), bounty completion, summit choice.

Mars realm data extends each hero with a `.mars` object. The `loadHeroes()` migration must initialize this cleanly for existing saves (default all fields, don't break old data).

```javascript
HEROES[i].mars = {
  lvl: 1,                    // Mars realm level (1 to 20)
  xp: 0,                     // Mars realm XP
  warMarks: 0,               // currency
  quests: {                   // quest state machine
    firstBlood: 'locked',     // locked | offered | active | done
    voiceInBronze: 'locked',
    whatNetRemembers: 'locked',
    fathersTrial: 'locked',
    sonsReckoning: 'locked',
    eyesOnEdge: 'locked',
    ironHarvest: 'locked',
    fallenScout: 'locked',
    roostersVigil: 'locked',
    skullRoad: 'locked',
    whatWasLeftBehind: 'locked'
  },
  dungeons: {                 // dungeon completion
    bronzeJar: false,
    invisibleNet: false,
    hillOfJustice: false
  },
  gear: {                     // realm gear (visual + realm stats)
    helm: null,               // item ID or null
    legs: null                // item ID or null
  },
  inventory: [],              // array of item IDs the player is carrying
  materials: {                // crafting materials
    ironDust: 0,
    warStone: 0,
    fangShard: 0,
    colossalIron: 0,
    dreadEssence: 0
  },
  discovered: [],             // array of location IDs the player has visited
  bounties: {                 // repeatable bounty completion counts
    eyesOnEdge: 0,
    ironHarvest: 0,
    fallenScout: 0,
    roostersVigil: 0,
    skullRoad: 0
  }
};
```

The existing `HEROES[i].gear` (weapon, armor, charm relics from the Mountain) stays exactly where it is. It's the universal progression layer. The new `HEROES[i].mars.gear` is the realm-specific visual layer. They coexist.

Save happens through the same `saveHeroes()` function. No new localStorage keys needed.

---

## How the two gear layers work together

This is a critical architectural distinction. There are two gear systems that coexist.

### Layer 1: Mountain relics (existing, universal)

- **3 slots:** weapon, armor, charm
- **Source:** drop from arena levels, found in all realms
- **Effect:** invisible stat bonuses (pdmg, dr, cd, hearts, etc.)
- **No visual change.** These are abstract relics, not physical equipment.
- **Scope:** work everywhere: arena, Mars, all future planetary realms
- **Managed by:** existing `RELICS` array, `gearBonus()`, `rollRelic()`, `claimRelic()`

### Layer 2: Realm gear (new, realm-specific)

- **5 visual slots:** helm, chest, legs, weapon, relic-accessory
- **Source:** enemy drops and quest rewards within the Mars realm, Harmonia's shop
- **Effect:** realm-specific stat bonuses AND visible mesh changes on the hero
- **Scope:** active only inside the Mars realm (future realms will have their own gear sets)
- **Managed by:** new `MARS_GEAR` array, new equip/unequip functions, visual mesh swapping

### How they interact

- The 3 Mountain relics give their bonuses everywhere, including inside Mars. A hero with a Phobos Spike (weapon relic, +18% power damage) keeps that bonus when fighting in the Mars realm.
- The 5 realm gear pieces give additional bonuses on top, but only inside the realm. When the player exits to the arena, realm gear bonuses don't apply (the visuals stay for flavor, or optionally revert).
- For the weapon slot: the Mountain relic is an invisible stat buff. The realm weapon is the visible mesh the hero swings. They stack. A hero can have a Phobos Spike relic AND a War-Speaker staff equipped at the same time.
- For the chest/armor slot: same principle. The Mountain armor relic gives an invisible DR bonus. The realm chest gear gives a visible chest piece plus realm-specific stats.
- The charm relic has no realm gear equivalent. It stays invisible.
- Helm and legs are realm-only slots. No Mountain equivalent exists for them.

### Why two layers

The Mountain is the game's permanent progression spine. It spans all content. Messing with it to add Mars-specific items would create problems when Venus, Jupiter, and the other 5 realms each need their own gear. By keeping realm gear as a separate layer, each realm gets its own visual identity and item economy without touching the universal system.

---

## Zone coordinate definitions

The Mars realm is one continuous terrain driven by `marsH()`. Zones are defined by distance from the origin (0, 0), which is the center of the Landing. This keeps the open-world feel without needing scene transitions.

- **The Landing:** radius 0 to 40 units from origin. Safe zone. No enemy spawns inside this radius. Contains NPCs, the shop, the gate of return, and the three existing waymark stones.
- **The Proving Grounds:** radius 40 to 180 units from origin. Entry-level combat zone. War Shades, Bolt Throwers, and Bloodhounds spawn here. Enemy density increases toward the outer edge.
- **Sacred Place entrances:** specific coordinates on the Proving Grounds boundary:
  - Bronze Jar entrance: approximately (140, 0, -80). East of center.
  - Invisible Net entrance: approximately (-100, 0, -130). Southwest.
  - Hill of Justice entrance: approximately (30, 0, -170). South.
- **The Deep:** radius 180+ units from origin. High-level zone. Darker terrain, lava glow, iron spires. All enemy types plus Iron Colossi and Dread Wraiths.

These coordinates are approximate starting points. Claude Code should adjust them to fit the actual terrain relief generated by `marsH()`. The key constraint is: the Landing must be clearly safe, the Proving Grounds must be reachable in 10 to 15 seconds of walking, and the Sacred Places must be far enough to feel like a journey.

The `realmTick()` function determines the current zone by checking `Math.hypot(player.position.x, player.position.z)` against these radii. Zone determines: which enemies can spawn, ambient music/sound changes, fog density, and whether the compass shows "The Landing," "The Proving Grounds," or "The Deep."

---

## Design philosophy: what WoW and Diablo teach us

The Mars realm should follow the proven patterns from World of Warcraft and Diablo, adapted for a single-player browser game.

**From WoW's quest design (Jeff Kaplan's original templates):**

- Hub-and-spoke structure. The player arrives at a safe hub with NPCs, picks up quests, ventures into dangerous areas, returns changed. Each hub points to the next.
- Quest actions are always clear. Even in a mystery story, the player always knows what to do: "go here, kill this, bring back that." The mystery is in the why, not the what.
- Breadcrumb quests guide the player forward. Finishing one hub's quests naturally leads to the next area.
- Zone storylines introduce characters, conflicts, and themes while directing the player through the world.
- Quest chains build investment. A 3 to 5 quest chain with escalating stakes and a real reward at the end is the core engagement unit.

**From Diablo's world structure:**

- Distinct regions with unique visual identity and enemy types. Each area feels different and has its own dangers.
- Strongholds: dangerous areas you liberate and transform into friendly hubs with vendors and services.
- Dungeons: contained combat challenges with a boss at the end and guaranteed loot.
- Gear visually changes your character. Every upgrade is something you can see. The transmog/wardrobe system lets you keep a look you like while equipping stronger stats.
- Loot drops tied to specific enemies and locations. Players learn where to farm for what they want.

**Applied to Zodiac's Zenith:**

- Each planetary realm is a self-contained world (like a WoW zone or a Diablo region).
- Mars is the first and the template. Every system built here gets reused for Moon, Mercury, Jupiter, Venus, Saturn, and the Sun.
- The 36 arena levels remain as the training module (Cycles I through III). After completing the first 12 levels, the player can enter the Mars realm and begin the real story.
- The existing Mountain progression (powers, ranks, passives, augments, Crowns, Invisible Heavens, relics) carries across all planetary realms. It's the through-line that makes leveling meaningful everywhere.

---

## Mars realm zones

The realm is divided into four distinct areas, each with its own visual feel, purpose, and danger level. All four share the same continuous terrain (see zone coordinate definitions above).

### 1. The Landing (safe hub)

- **What it is:** The player's arrival point. Where the existing waymark stones are. A sheltered valley near the gate of return.
- **Visual feel:** Warm rust rock formations create a natural shelter. The three existing waymark stones remain as teaching monuments. Campfire light, banners, a sense of a forward base.
- **What's here:**
  - NPCs with quests (see the cast below)
  - The Forge of Ares (the shop)
  - The gate of return (back to the arena menu)
  - A noticeboard with available quests and bounties
- **Enemies:** None. This is the safe zone.

### 2. The Proving Grounds (combat zone, entry level)

- **What it is:** Open red terrain between the hub and the deeper areas. Rolling dunes with scattered rock cover. This is where new arrivals fight their first Mars enemies and start leveling.
- **Visual feel:** The existing Mars terrain, but with enemy encampments: dark tents, weapon racks, skull totems marking the edges of hostile territory.
- **What's here:**
  - Roaming enemy packs (War Shades, see enemy roster below)
  - Gatherable resources (iron dust, war-stone fragments) for crafting
  - Random event spawns: a caravan under attack, a duel challenge, a meteor impact site
- **Enemies:** War Shades (basic melee), Bolt Throwers (ranged), Bloodhounds (fast flankers). Scales with player level.

### 3. The Sacred Places (quest destinations, mid-level)

Three specific mythological locations, each the destination for a major quest chain. These are the Diablo "dungeons" of the Mars realm: contained areas with distinct visuals, escalating combat, and a boss or revelation at the end. Each loads as a separate zone via the dungeon zone transition system (see architecture rules above).

**The Bronze Jar (the prison of Ares)**

- **The myth:** The giant twins Otus and Ephialtes captured Ares and imprisoned him in a bronze jar for thirteen months. Hermes eventually rescued him.
- **What the player does:** Descend into a cavern where a massive bronze vessel sits cracked open. The residual rage of Ares' imprisonment has given the darkness a life of its own. Fight through waves of fury-spirits (echoes of the god's screaming) to reach the core, where a fragment of Ares' unbroken will waits as a relic.
- **Boss:** The Wrath Echo, a towering manifestation of the rage Ares left behind. It mirrors the player's own powers back at them with a slight delay.
- **Reward:** The Shard of Endurance (relic). Ares survived thirteen months in the dark. The shard grants damage resistance that increases the longer you stay in combat without retreating.

**The Invisible Net (Hephaestus' trap)**

- **The myth:** Hephaestus caught Ares and Aphrodite together in an invisible golden net and exposed them to the other gods' laughter.
- **What the player does:** Enter a ruined forge-temple where golden threads still hang in the air, nearly invisible. The area is a stealth and awareness challenge: trip the threads and enemies swarm. Navigate carefully, disable the anchors, and reach the central chamber where the original net still holds its shape.
- **Boss:** The Smith's Grudge, a construct of golden wire and volcanic glass that Hephaestus left behind. It sets traps and pulls you into kill zones.
- **Reward:** The Thread of Cunning (relic). Being caught taught Ares that raw strength isn't everything. Grants a brief window of invisibility after taking damage, once per fight.

**The Hill of Justice (the Areopagus)**

- **The myth:** Ares killed Poseidon's son Halirrhothios for attempting to assault his daughter Alcippe. Poseidon demanded a trial before the twelve Olympians. Ares was acquitted, and the hill became Athens' court for murder trials.
- **What the player does:** Climb a rocky promontory where twelve stone thrones circle an altar. The player must fight through Poseidon's sea-spirits who still seek vengeance, then face a judgment trial: answer three questions about the mythology you've learned from the waymark stones (the Neoplatonic descent, the planetary garments, the nature of courage). Wrong answers spawn harder enemies. Right answers weaken the final guardian.
- **Boss:** The Tide of Grudges, a towering wave-spirit that embodies Poseidon's undying anger. Weakened by correct answers during the trial.
- **Reward:** The Verdict (relic). Justice was Ares' finest hour. Grants bonus damage against enemies who have damaged you first (the defender's advantage).

### 4. The Deep (high-level zone, endgame Mars content)

- **What it is:** The outermost edge of the realm, where Mars' raw influence is strongest. A volcanic rift zone with magma rivers, iron spires, and perpetual red lightning.
- **Visual feel:** Darker, more intense. The warm rust of the landing gives way to deep crimson and black. The sky is closer here, angrier. Phobos and Deimos are visible and larger in this zone (they orbit lower).
- **What's here:**
  - Elite enemy packs with unique modifiers
  - The entrance to the Typhon's Shadow dungeon (a harder version of the Typhon fight, Mars-flavored)
  - Rare resource spawns for the best gear
  - A world-boss event: "The Descent of Phobos," where one of the moons crashes to the surface periodically and you fight fear-spirits in the crater
- **Enemies:** All previous types plus Iron Colossi (heavy, slow, devastating) and Dread Wraiths (apply fear debuffs that reverse your controls briefly).

---

## The cast: NPCs of Mars

Every NPC is sourced from real Ares/Mars mythology. None are invented.

### Enyo (quest-giver, the first voice)

- **Who she is:** Ares' sister and constant battle companion. The goddess of the sack of cities, of destructive war. In the myths, she's always at his side.
- **Role in the realm:** The player's primary quest-giver. She's the one who's been here longest, watching the realm darken. She gives the main quest chain and knows where the Sacred Places are.
- **Personality:** Direct, unsentimental, but deeply loyal. She doesn't sugarcoat danger. She respects action over talk.
- **Location:** The Landing, near the central campfire.
- **Quest chain:** "The Trials of the War-Road" (the main storyline that leads through all three Sacred Places).

### Harmonia (shop-keeper, lore guide)

- **Who she is:** The daughter of Ares and Aphrodite. Her name means harmony. In the myth, she's the balance between war and love, between destruction and beauty.
- **Role in the realm:** Runs the Forge of Ares (the shop). Also serves as a lore guide: she can tell you about each constellation, each planetary gift, and the deeper meaning of what you're doing. She's the bridge between combat and understanding.
- **Personality:** Warm, curious, thoughtful. The opposite of her mother's realm and her father's realm, and yet belonging to both. She sees the hero's journey as something beautiful.
- **Location:** The Forge of Ares, inside a sheltered alcove in the Landing.
- **Dialogue topics:** Shop transactions, constellation lore, the meaning of the player's natal chart (once W2 is built).

### Alectryon (bounty master, scout)

- **Who he is:** The soldier Ares stationed outside his room to watch for Helios (the sun) during his affair with Aphrodite. Alectryon fell asleep, Helios saw the lovers, and Ares punished him by turning him into a rooster, forever crying out at sunrise.
- **Role in the realm:** The bounty and side-quest NPC. He's a scout who watches the edges of the realm and reports enemy movements. He's trying to redeem himself after his ancient failure.
- **Personality:** Nervous, eager, always over-explaining. Desperate to prove he won't fall asleep on the watch again. Oddly endearing.
- **Location:** An elevated rock near the edge of the Landing, always watching the horizon.
- **Quests:** Side quests, repeatable bounties ("clear this enemy camp," "retrieve this fallen scout's gear," "mark the position of an elite enemy").

### Eros (wandering, appears contextually)

- **Who he is:** The son of Ares and Aphrodite. God of love. In ancient art, he's often depicted playing with Ares' discarded armor in Aphrodite's boudoir: the child who turns weapons into toys.
- **Role in the realm:** A wandering NPC who appears at unexpected moments, usually after a difficult fight or a heavy lore beat. He offers cryptic, surprising perspective. He's the voice that reminds you this isn't just about fighting.
- **Personality:** Playful, knowing, slightly mischievous. Speaks in short sentences that hit harder than they should.
- **Location:** Not fixed. Appears at scripted moments throughout quest chains.
- **Function:** Delivers key emotional story beats. Offers a single unique side quest about retrieving something Aphrodite left in the realm.

### Cycnus (enemy champion, recurring antagonist)

- **Who he is:** A son of Ares who challenged travelers to combat and used their skulls to build a temple to his father. Heracles eventually killed him, and Ares himself tried to avenge his son but was wounded by Heracles.
- **Role in the realm:** The recurring enemy champion. He appears at the end of Proving Grounds encounters, taunts the player, and retreats. The player fights him fully at the climax of the main quest chain.
- **Personality:** Arrogant, brutal, genuinely dangerous. He believes he's honoring his father; he's actually corrupting the realm.
- **Location:** Roams the Proving Grounds and appears in the Sacred Places. Final confrontation in the Deep.

---

## Quest structure

### Main quest chain: "The Trials of the War-Road"

Given by Enyo. Five chapters that lead through the entire realm.

**Chapter 1: "The First Blood"**

- Enyo asks you to clear a War Shade camp in the Proving Grounds that's been creeping toward the Landing.
- Combat quest: defeat 3 enemy packs.
- On return, Enyo tells you the camps are being organized by someone: they didn't used to coordinate.
- Reward: first piece of Mars gear (see gear section), XP.

**Chapter 2: "The Voice in the Bronze"**

- Enyo has heard screaming from the east, near where the old prison site is. She asks you to investigate.
- Travel to the Bronze Jar. Discover the entrance. Fight through the outer caves.
- Return to report what you've found. Enyo recognizes the description: "That's where they kept him. The rage never left."
- Reward: access to the Bronze Jar dungeon, XP.

**Chapter 3: "What the Net Remembers"**

- After clearing the Bronze Jar, Harmonia mentions that Hephaestus left more than the net in this realm: he left a grudge. She asks you to find the forge-temple and disable what's left.
- Travel to the Invisible Net. Complete the stealth-and-combat challenge.
- On return, Harmonia reveals that the threads are connected to something deeper: someone is using the old traps to channel power.
- Reward: access to the Invisible Net dungeon, gear upgrade, XP.

**Chapter 4: "The Father's Trial"**

- Alectryon reports that Cycnus has been seen climbing the Hill of Justice with a war-band. He's trying to corrupt the place where Ares was once acquitted.
- Race to the Hill. Fight through sea-spirits and Cycnus' war-band.
- The trial sequence: answer the three knowledge questions, then face the Tide of Grudges.
- Reward: The Verdict relic, major XP.

**Chapter 5: "The Son's Reckoning"**

- Cycnus has retreated to the Deep. He's channeling the relics' opposites: endurance into exhaustion, cunning into paranoia, justice into vengeance.
- Journey through the Deep. Face elite enemies. Confront Cycnus at the edge of the volcanic rift.
- Final boss fight: Cycnus uses all three corrupted powers. The player's relics respond and can be activated as special abilities during the fight.
- Eros appears after the victory with a short, quietly devastating line about fathers and sons.
- Reward: Cycnus' Skull Crown (unique helmet, see gear), massive XP, Mars realm completion achievement.

### Side quests (from Alectryon)

Repeatable and one-time quests:

- **"Eyes on the Edge":** Mark three enemy patrol routes in the Proving Grounds (exploration quest).
- **"Iron Harvest":** Collect 10 iron dust from the Proving Grounds. Delivers to Harmonia for crafting.
- **"The Fallen Scout":** Recover a dead scout's journal from deep in the Proving Grounds. The journal contains a short mythology teaching (rotates between different myths of Ares).
- **"Rooster's Vigil":** Stay at a watchtower and survive 3 waves of night enemies. Alectryon watches and provides intel (calls out enemy positions).
- **"Skull Road":** Destroy 5 of Cycnus' skull totems scattered across the Proving Grounds.

### Eros' side quest: "What Was Left Behind"

- Eros asks you to find a small golden object Aphrodite left in the realm: a mirror that shows what you love, not what you fear.
- The mirror is hidden in the Invisible Net, in a room the main quest doesn't require you to enter.
- Returning it to Eros triggers a short, beautiful cutscene-card where he holds it up and the player sees their own zodiac constellation reflected.
- Reward: Aphrodite's Favor (cosmetic aura, a faint rose-gold shimmer on your hero).

---

## Enemy roster

All enemies are Mars-themed: war-spirits, corrupted soldiers, manifestations of conflict. All use the realm enemy system (see architecture rules above), not the arena's `spawnEnemy()`.

### War Shades (basic melee)

- **Look:** Dark crimson humanoid silhouettes with flickering edges, like soldiers made of heat-haze. Red eyes. Carrying jagged swords.
- **Behavior:** Charge in groups of 2 to 4. Predictable attack patterns. The training enemy.
- **Aggro radius:** 18 units. Leash radius: 40 units.
- **Drop:** Iron dust (crafting material), occasional minor gear piece.

### Bolt Throwers (ranged)

- **Look:** Similar silhouette but taller, thinner, with a bow made of dark energy. Glowing orange arrow trails.
- **Behavior:** Keep distance. Fire slow, dodgeable bolts. Prioritize them first in mixed groups.
- **Aggro radius:** 24 units. Leash radius: 50 units.
- **Drop:** War-stone fragments (crafting material).

### Bloodhounds (fast flankers)

- **Look:** Low, four-legged shadow beasts with ember-colored eyes. Based on the sacred animal of Ares: the war dog.
- **Behavior:** Fast, circle to your blind side, attack in pairs. Low health but high damage.
- **Aggro radius:** 22 units. Leash radius: 35 units.
- **Drop:** Fang shards (crafting material for swift gear).

### Iron Colossi (heavy elite, the Deep only)

- **Look:** Massive armored figures, twice the player's height. Rusty iron plate, glowing red joints. Slow overhead slams that crack the ground.
- **Behavior:** Telegraphed attacks with area damage. Block or dodge; standing still is death.
- **Aggro radius:** 14 units. Leash radius: 30 units.
- **Drop:** Colossal iron (rare crafting material for heavy gear).

### Dread Wraiths (debuff elite, the Deep only)

- **Look:** Pale, ghostly figures wreathed in purple-black mist. The children of Phobos and Deimos.
- **Behavior:** Apply a "fear" debuff that briefly reverses your movement controls. Must be cleansed by attacking them quickly.
- **Aggro radius:** 20 units. Leash radius: 45 units.
- **Drop:** Dread essence (rare crafting material for enchantments).

---

## Gear system: see what you wear

This is the system that makes every upgrade feel real. When you pick up new armor or a weapon, your hero's appearance changes. See "How the two gear layers work together" (above) for how realm gear coexists with Mountain relics.

### Gear slots

Every hero has five visual gear slots in the realm. Three overlap with the existing Mountain relic slots; two are new.

- **Helm** (new, realm-only): changes head appearance. Realm stats + visual.
- **Chest** (overlaps existing "armor" relic slot): changes torso appearance. Realm stats + visual. The Mountain armor relic still gives its invisible universal bonus on top.
- **Legs** (new, realm-only): changes lower body appearance. Realm stats + visual.
- **Weapon** (overlaps existing "weapon" relic slot): changes the weapon model and attack animation. Realm stats + visual. The Mountain weapon relic still gives its invisible universal bonus on top.
- **Relic-accessory** (overlaps existing "charm" relic slot): invisible slot, grants a passive bonus, no visual change. The existing Mountain charm relic fills this role; realm-specific relic-accessories (like the Shard of Endurance from the Bronze Jar) go here and replace the charm.

### How gear looks work in Three.js

Since all art is procedural geometry and code, gear changes work by swapping mesh groups on the hero rig:

- Each gear piece is a small function that returns a THREE.Group of meshes.
- Equipping a piece removes the old group from the hero and adds the new one.
- Colors and materials come from the gear's tier and element.
- The hero's base body (sign-specific shape and palette) always shows through: gear augments the silhouette, it doesn't replace the identity.

### Gear tiers

Five tiers, each visibly distinct:

- **Worn (gray):** Starting gear. Minimal geometry. Dull colors. Just enough to show the slot exists.
- **Forged (green):** Basic crafted gear from Harmonia's shop. Cleaner lines, a slight metallic sheen.
- **Battle-Tested (blue):** Drops from quest rewards and mid-level enemies. Noticeable additions: shoulder guards, helm crests, weapon glow.
- **War-Blessed (purple):** Drops from Sacred Place bosses and the Deep. Distinctive silhouette changes: wings on helms, layered plate, weapon trails.
- **Mythic (gold):** One per slot, tied to completing major quest chains. Glowing effects, particle trails, unique geometry. Cycnus' Skull Crown is a Mythic helm.

### Mars-specific gear sets

All gear from the Mars realm has a war-and-iron aesthetic: rust reds, dark iron, ember accents.

**The Iron Vanguard (heavy set):**

- Helm: Closed iron helm with a red horsehair crest (echoes the Spartan tradition of honoring Ares)
- Chest: Layered iron plate with ember veins between the segments
- Legs: Greaves with iron shin-guards
- Weapon: A broad iron blade that glows redder as your health drops (Ares' bloodlust)
- Set bonus (3+ pieces): Damage increases as health decreases, up to +30% at one heart

**The Shadow Runner (swift set):**

- Helm: Open-faced hood with two red eye-slits (Phobos' gaze)
- Chest: Light wraps with dark iron studs
- Legs: Wrapped boots with fang-bone clasps
- Weapon: Twin daggers that leave dark trails (Deimos' touch)
- Set bonus (3+ pieces): Movement speed +15%, first strike from stealth does double damage

**The War-Speaker (caster set):**

- Helm: A circlet of dark iron thorns
- Chest: Robes layered with iron-thread weave, ember symbols stitched in
- Legs: Simple cloth with iron ankle-guards
- Weapon: A staff topped with a war-stone that pulses with Ares' voice
- Set bonus (3+ pieces): Power cooldowns reduced by 20%, mana regen doubled in combat

### Visual change rules

- Every gear change must be visible in-game immediately. The player should never wonder "did that do anything?"
- Higher tiers = more geometry, more glow, more presence. A Mythic piece should be visible from across the screen.
- Sign identity is preserved. An Aries in War-Blessed gear still reads as Aries, not as generic iron warrior. The gear layers on top of the sign's colors and shapes, it doesn't erase them.

---

## The shop: Forge of Ares

Run by Harmonia. Located in the Landing.

### Currency

**War-Marks.** Earned from:

- Killing enemies (small amounts)
- Completing quests (significant amounts)
- Selling unwanted gear
- Clearing bounties from Alectryon

War-Marks are thematically correct: Mars/Ares was honored with marks and scars in Spartan culture.

### What the shop sells

**Gear (Forged tier):**

- One piece per slot, rotating stock. Gives the player a reliable upgrade path separate from drops.
- Price: 50 to 150 War-Marks depending on slot.

**Consumables:**

- Health potions (5 War-Marks each, stack of 3)
- Mana potions (5 War-Marks each, stack of 3)
- Courage Draft: temporarily removes fear debuffs from Dread Wraiths (15 War-Marks)
- Waymark Stone (portable): place a temporary respawn point in the field (25 War-Marks)

**Crafting:**

- Bring crafting materials (iron dust, war-stone fragments, fang shards, colossal iron, dread essence) plus War-Marks to upgrade gear by one tier.
- Crafting upgrades preserve the visual look of the lower tier but add the higher tier's geometry and effects on top.
- Cost scales with tier: Worn to Forged = 30 War-Marks + 5 iron dust. Forged to Battle-Tested = 80 War-Marks + 10 war-stone. And so on.

**Reforging:**

- Pay War-Marks to reroll the stat bonuses on a piece of gear without changing its tier or look.
- Prevents the "I love how this looks but the stats are wrong" frustration.

---

## Progression and leveling in the realm

### How it connects to the existing Mountain

- The Mountain's passives, augments, Crowns, and Invisible Heavens are the permanent progression layer. They work everywhere: in the arena levels, in Mars, and in all future planetary realms.
- Mars realm progression adds a combat level that scales enemy difficulty and loot quality within the realm.
- Powers earned through the Mountain carry into realm combat. A hero with three powers and ranked-up abilities is genuinely stronger in the realm than one with one power.

### Mars realm level

- Separate from the arena cycle count. Think of it as a "zone level" like WoW's system.
- Starts at 1 when you first enter Mars. Enemies and loot scale with your Mars level.
- XP earned from killing enemies, completing quests, discovering locations, and clearing dungeons.
- Cap for Mars is level 20. At cap, the player has access to all of Mars' content and the best gear drops.

### Death and respawn

- Dying in the realm respawns you at the Landing (or at a portable waymark if you placed one).
- You keep all your gear and XP. No death penalty beyond the travel time back.
- This matches the arena's "Every fall is a retrograde, not an ending" philosophy.

---

## Camera and controls (realm-specific)

- **Vertical camera pitch.** Already built (pass 4 of the Mars visual polish). Right-click drag vertical on desktop, one-finger drag vertical on mobile. Clamped [0, 1.35], gated to `S.world==='mars'`, resets on level start and realm enter/exit. No new keys needed.
- **NPC interaction.** Walk near an NPC and press E (or tap on mobile) to open dialogue. Dialogue is a simple card with the NPC's portrait, their lines, and response options.
- **Compass HUD.** A horizontal compass bar at the top of the screen showing the cardinal direction the camera faces, with icons for the active quest objective, nearby NPCs, and dungeon entrances. Lighter than a full map and always visible during gameplay.
- **Quest tracker.** A small UI element in the lower-right corner showing the current quest name, objective text, and a count (e.g., "War Shades defeated: 2/3").
- **Map.** Press M to open a simple top-down map of the realm showing discovered locations, NPC positions, and quest markers. The compass HUD handles moment-to-moment navigation; the map is for planning.

---

## Build order for Claude Code

Build these systems one at a time, in this order. Each one is a commit-worthy unit. Each step: build it, run the test harness, take screenshots, check with Ryan, commit.

0. **Save schema and migration.** Add `HEROES[i].mars` to `loadHeroes()` with the full schema defined above. Migrate existing saves cleanly. Add `S.zone = null` to the state object. Test that the harness still passes with no gameplay changes. This is the foundation everything else sits on.

1. **NPC system.** Teach the game what an NPC is: a positioned mesh with a name label, an interaction radius, and a dialogue card. Place Enyo at the Landing as the test case. NPCs ground on `marsH()` and face the player when in interaction range. Press E (or tap on mobile) to interact.

2. **Dialogue system.** A card-based dialogue UI (reuse the lore-card pattern from waymark stones). Supports multiple lines, response choices, and quest-accept buttons. Test with Enyo's intro dialogue.

3. **Quest system.** A quest state machine using `HEROES[i].mars.quests`: locked, offered, active, done. A quest tracker UI in the lower-right corner. Enyo's first quest ("The First Blood") as the test case. Quest state persists across sessions via `saveHeroes()`.

4. **Compass HUD.** A horizontal compass bar at the top of the screen. Shows cardinal direction, active quest waypoint icon, and nearby NPC icons. This goes here because from step 5 onward, the player needs to navigate to specific locations.

5. **Realm enemy spawning.** War Shades, Bolt Throwers, Bloodhounds. New `spawnRealmEnemy()` and `realmEnemyTick()` functions, separate from the arena system. Enemies ground on `marsH()`, have aggro/leash radii, and only spawn in zones outside the Landing. Uses the existing combat system for damage, health, powers, and basic attacks.

6. **Loot drops.** Enemies drop War-Marks (auto-pickup, added to `HEROES[i].mars.warMarks`) and occasionally gear or crafting materials. Walk-over pickup, like shards. War-Marks display as a small counter in the HUD.

7. **Realm gear system.** The two new realm-only slots (helm, legs) plus visual representations for weapon and chest. Equip/unequip with visual mesh swapping on the hero. Start with Worn tier only. Store in `HEROES[i].mars.gear`.

8. **Inventory UI.** Press I to open. A simple grid showing equipped gear (5 visual slots), inventory bag, crafting materials, and War-Marks balance. Shows both Mountain relics (the 3 universal slots) and realm gear (the 5 visual slots) side by side.

9. **The shop.** Place Harmonia as an NPC. The Forge of Ares UI: buy, sell, craft tabs. Test with Forged-tier gear purchases.

10. **Remaining NPCs.** Place Alectryon and his bounty quests. Place Eros' contextual appearances. Wire up all side quests in the quest state machine.

11. **The Bronze Jar dungeon.** Build `buildBronzeJar()`. Zone transition via `S.zone = 'bronzeJar'`. Interior terrain, fury-spirit enemies, the Wrath Echo boss, the Shard of Endurance reward.

12. **The Invisible Net dungeon.** Build `buildInvisibleNet()`. Stealth-and-awareness zone, golden thread trip-wire mechanic, the Smith's Grudge boss, the Thread of Cunning reward.

13. **The Hill of Justice dungeon.** Build `buildHillOfJustice()`. Twelve stone thrones, the trial mechanic (mythology questions affect boss difficulty), the Tide of Grudges boss, the Verdict reward.

14. **The Deep zone.** Visual upgrades for radius 180+ (darker terrain, lava, iron spires). Iron Colossi and Dread Wraiths. Cycnus final fight. Mythic gear drops.

15. **Gear tiers 2 through 5.** Visual mesh upgrades for Forged, Battle-Tested, War-Blessed, and Mythic tiers. Crafting system in the shop.

16. **Map UI.** Press M for a simple top-down map with discovered locations, NPC positions, quest markers, and zone labels.

---

## Mythology sources (for accuracy checks)

- Ares' retinue (Phobos, Deimos, Eris, Enyo): Hesiod's Theogony; Homer's Iliad Book V; Quintus Smyrnaeus' Fall of Troy
- The Aloadae imprisonment: Homer's Iliad V.385; Apollodorus' Bibliotheca 1.7.4
- Hephaestus' golden net: Homer's Odyssey VIII.266-366; Lucian's Dialogues of the Gods
- The Areopagus trial: Apollodorus' Bibliotheca 3.14.2; Euripides' Electra
- Cycnus: Hesiod's Shield of Heracles; Apollodorus' Bibliotheca 2.5.11; Hyginus' Fabulae 31
- Alectryon: Lucian's The Cock (Gallus); various scholia
- Harmonia as daughter of Ares and Aphrodite: Hesiod's Theogony 937; Apollodorus' Bibliotheca 3.4.2
- Eros as son of Ares and Aphrodite: Simonides (6th century BCE); later tradition
- Ares' sacred animals (dog, boar, vulture, serpent): multiple sources; Pausanias' Description of Greece
- Mars in Neoplatonic descent: Macrobius, Commentary on the Dream of Scipio I.12; the soul receives boldness and the spirited impulse from Mars' sphere
