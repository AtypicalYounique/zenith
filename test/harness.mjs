// Zodiac's Zenith headless test harness.
//
// Why this exists: a single bad line does not throw a visible error in the
// browser. The play loop just stops and the screen freezes. This harness boots
// the real game in Node (jsdom + the real three r128 npm package), presses the
// buttons, and steps animation frames one at a time so any crash surfaces with
// a real stack trace before Ryan ever deploys.
//
// It changes nothing in index.html. It reads the file, swaps the Three.js CDN
// tag for the npm build, stubs the few browser pieces Node lacks (WebGL,
// canvas 2D, audio), and drives the game through a real play session.
//
// Run with: npm test   (or: node test/harness.mjs)

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';
import * as THREE_NS from 'three';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML_PATH = join(__dirname, '..', 'index.html');

// ---------------------------------------------------------------------------
// Small reporting helpers so the output reads in plain language.
// ---------------------------------------------------------------------------
const pass = (m) => console.log(`  ok   ${m}`);
const info = (m) => console.log(`  ..   ${m}`);
function fail(m, err) {
  console.error(`\n  FAIL ${m}`);
  if (err) console.error('\n' + (err && err.stack ? err.stack : err) + '\n');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// A generic "absorber": an object that is both callable and indexable and
// returns itself for anything. Used for the canvas 2D context and the
// AudioContext, so the game's draw and sound calls never throw in Node.
// ---------------------------------------------------------------------------
function makeAbsorber() {
  const fn = function () { return absorber; };
  const absorber = new Proxy(fn, {
    get(_t, prop) {
      if (prop === Symbol.toPrimitive) return () => 0;
      if (prop === Symbol.iterator) return undefined;
      if (prop === 'then') return undefined; // not a thenable
      return absorber;
    },
    set() { return true; },
    apply() { return absorber; },
    construct() { return absorber; },
  });
  return absorber;
}

// ---------------------------------------------------------------------------
// Read index.html, drop the CDN Three.js script, and pull out the inline game
// script so we can run it ourselves after the stubs are in place.
// ---------------------------------------------------------------------------
let html = readFileSync(HTML_PATH, 'utf8');

// Remove the Three.js CDN <script src=...></script> (we inject npm three).
const cdnRe = /<script[^>]*src=["'][^"']*three[^"']*["'][^>]*><\/script>/i;
if (!cdnRe.test(html)) fail('could not find the Three.js CDN script tag in index.html');
html = html.replace(cdnRe, '');

// Extract the inline game script (the one <script> with no src attribute).
const inlineRe = /<script>([\s\S]*?)<\/script>/i;
const m = html.match(inlineRe);
if (!m) fail('could not find the inline game script in index.html');
const gameCode = m[1];
// Replace it with an empty placeholder so jsdom builds the DOM but does not run
// the game until our stubs are installed.
html = html.replace(inlineRe, '<script id="__game_placeholder__"></script>');

// Append a tiny export so the harness can read the game's closure state
// (S, player, realm) which live as const/let and are not on window.
const exportSnippet = `
;try{window.__h={
  get S(){return S}, get player(){return player}, get realm(){return realm},
  get scene(){return scene}, get keys(){return keys},
  enterMars: (typeof enterMars!=='undefined'?enterMars:null),
  startLevel:(typeof startLevel!=='undefined'?startLevel:null),
  beginPlay: (typeof beginPlay!=='undefined'?beginPlay:null),
  exitRealm: (typeof exitRealm!=='undefined'?exitRealm:null),
  marsH:     (typeof marsH!=='undefined'?marsH:null),
};}catch(e){window.__hErr=e;}
`;

// ---------------------------------------------------------------------------
// Build the jsdom DOM first (no game script yet), then install stubs.
// ---------------------------------------------------------------------------
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', (e) => { /* swallow benign load errors */ });

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole,
  url: 'http://localhost:8000/index.html',
});
const win = dom.window;
const doc = win.document;

// --- virtual clock (ms). Both the game and three.Clock read performance.now() ---
let vt = 0;
const nowFn = () => vt;
try { win.performance.now = nowFn; } catch { /* ignore */ }
try { globalThis.performance.now = nowFn; } catch {
  try { globalThis.performance = { now: nowFn }; } catch { /* ignore */ }
}

// --- requestAnimationFrame as a drainable queue we step frame by frame ---
let rafQ = [];
win.requestAnimationFrame = (cb) => { rafQ.push(cb); return rafQ.length; };
win.cancelAnimationFrame = () => {};

// --- misc globals jsdom does not provide ---
if (typeof win.devicePixelRatio === 'undefined') win.devicePixelRatio = 1;
if (typeof win.matchMedia !== 'function') {
  win.matchMedia = () => ({
    matches: false, media: '', onchange: null,
    addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, dispatchEvent() { return false; },
  });
}

// --- canvas 2D context -> absorber (jsdom returns null without the native lib) ---
win.HTMLCanvasElement.prototype.getContext = function (type) {
  return type === '2d' ? makeAbsorber() : null;
};

// --- AudioContext -> absorber so the procedural sound code is a no-op ---
const AudioStub = function () { return makeAbsorber(); };
win.AudioContext = AudioStub;
win.webkitAudioContext = AudioStub;

// --- the npm three, with WebGLRenderer swapped for a no-op that still gives a
//     real canvas as its domElement (the game appends it to #stage). ---
const THREE = { ...THREE_NS };
THREE.WebGLRenderer = function () {
  const canvas = doc.createElement('canvas');
  const target = { domElement: canvas, shadowMap: {} };
  const absorb = makeAbsorber();
  return new Proxy(target, {
    get(t, p) {
      if (p in t) return t[p];
      if (typeof p === 'symbol') return undefined;
      return absorb; // any method or unknown property is absorbed
    },
    set(t, p, v) { t[p] = v; return true; },
  });
};
win.THREE = THREE;

// ---------------------------------------------------------------------------
// Frame stepper. Drains the rAF queue, advancing the virtual clock first so
// the game sees a real delta. Any throw inside a frame fails the test loudly.
// ---------------------------------------------------------------------------
let frameCount = 0;
function step(frames = 1, ctx = 'play') {
  for (let i = 0; i < frames; i++) {
    vt += 16; // ~60fps
    const q = rafQ;
    rafQ = [];
    for (const cb of q) {
      frameCount++;
      try {
        cb(vt);
      } catch (e) {
        fail(`a frame threw during "${ctx}" (frame ${frameCount})`, e);
      }
    }
  }
}

function dispatchKey(eventType, props) {
  win.dispatchEvent(new win.KeyboardEvent(eventType, { bubbles: true, ...props }));
}
function clickEl(id) {
  const el = doc.getElementById(id);
  if (!el) fail(`expected element #${id} to exist`);
  el.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
}

// ---------------------------------------------------------------------------
// Boot the game: inject the inline script (now that stubs are in place).
// ---------------------------------------------------------------------------
console.log('\nZodiac\'s Zenith :: headless harness\n');
try {
  const s = doc.createElement('script');
  s.textContent = gameCode + exportSnippet;
  doc.body.appendChild(s);
} catch (e) {
  fail('the game script threw while booting', e);
}
const H = win.__h;
if (win.__hErr) fail('could not wire up game state handles', win.__hErr);
if (!H || !H.S) fail('game booted but global state S was not reachable');
if (!H.enterMars || !H.startLevel || !H.beginPlay || !H.exitRealm) {
  fail('game booted but expected functions (enterMars/startLevel/beginPlay/exitRealm) were missing');
}
pass(`game booted; menu state is "${H.S.mode}" / world "${H.S.world}"`);

// 1) Boot frames in the menu.
step(10, 'menu');
pass('stepped 10 menu frames with no crash');

// 2) Enter the Mars realm.
H.enterMars();
if (H.S.world !== 'mars') fail(`enterMars did not set world to mars (got "${H.S.world}")`);
step(6, 'realm intro');
pass('entered the Mars realm (The Wanderers\' Road)');

// 3) Begin play in the realm.
clickEl('riBegin');
if (H.S.mode !== 'play') fail(`begin-play did not set mode to play (got "${H.S.mode}")`);
step(10, 'realm play');
pass('began play in the realm and stepped 10 frames');

// 4) Walk the hero forward.
if (!H.player) fail('no player/hero was spawned in the realm');
dispatchKey('keydown', { key: 'w', code: 'KeyW' });
step(30, 'walking');
dispatchKey('keyup', { key: 'w', code: 'KeyW' });
pass('walked the hero forward for 30 frames');

// 5) Trigger a teaching waymark (lore site at x=14, z=-24, kind 0).
H.player.position.x = 14;
H.player.position.z = -24;
step(2, 'waymark');
if (H.S.mode !== 'lore') fail(`stepping onto a waymark did not open a lore card (mode "${H.S.mode}")`);
pass('triggered a teaching waymark; a lore card opened');
clickEl('lcOk');
step(3, 'after waymark');
pass('dismissed the waymark and resumed play');

// 6) Return through the gate of return (site at x=0, z=20, kind 3).
H.player.position.x = 0;
H.player.position.z = 20;
step(2, 'gate');
if (H.S.mode !== 'lore') fail(`stepping into the gate did not open the return card (mode "${H.S.mode}")`);
clickEl('lcReturn');
if (H.S.world !== 'wheel' || H.S.mode !== 'menu') {
  fail(`returning through the gate did not go back to the menu (world "${H.S.world}", mode "${H.S.mode}")`);
}
step(6, 'back at menu');
pass('returned through the gate to the wheel menu');

// 7) Run a normal level (sign 0, cycle 0): intro -> play -> walk -> powers.
H.startLevel(0, 0);
step(6, 'level intro');
H.beginPlay();
if (H.S.mode !== 'play') fail(`beginPlay did not enter play (mode "${H.S.mode}")`);
step(12, 'level play');
dispatchKey('keydown', { key: 'd', code: 'KeyD' });
step(20, 'level walking');
dispatchKey('keyup', { key: 'd', code: 'KeyD' });
dispatchKey('keydown', { key: ' ', code: 'Space' }); // power 1
step(6, 'power 1');
dispatchKey('keydown', { key: 'q', code: 'KeyQ' }); // rotate camera
step(10, 'camera + play');
dispatchKey('keyup', { key: 'q', code: 'KeyQ' });
pass('ran a normal level: intro, play, movement, a power, and camera rotation');

console.log(`\nAll checks passed. Stepped ${frameCount} animation frames total with no crash.\n`);
process.exit(0);
