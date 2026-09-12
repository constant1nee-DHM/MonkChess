/**
 * Thin wrapper over the royalty-free clips in /audio.
 * Files are played as-is — no processing, no Web Audio graph.
 */
const SFX = {
  click: '/assets/audio/click.mp3',
  move: '/assets/audio/move.mp3',
  check: '/assets/audio/check.mp3',
};

const THEME = '/assets/audio/main_theme.mp3';
const STORAGE_KEY = 'monk-chess:muted';

const VOLUME = { click: 0.55, move: 0.7, check: 0.75, theme: 0.4 };

/** Mutes the theme only — clicks, moves and checks always sound. */
let muted = (() => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
})();

const listeners = new Set();

/* Preload one element per effect, then clone it per playback so that rapid
   presses overlap instead of cutting each other off. */
const pool = Object.fromEntries(
  Object.entries(SFX).map(([name, src]) => {
    const el = new Audio(src);
    el.preload = 'auto';
    return [name, el];
  }),
);

const theme = new Audio(THEME);
theme.loop = true;
theme.preload = 'auto';
theme.volume = VOLUME.theme;

let themeWanted = false;
let unlockArmed = false;

/** Browsers block audio until the page has seen a gesture; retry after one. */
function armUnlock() {
  if (unlockArmed) return;
  unlockArmed = true;
  const unlock = () => {
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
    unlockArmed = false;
    if (themeWanted && !muted) theme.play().catch(() => {});
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

export function playSfx(name) {
  const template = pool[name];
  if (!template) return;
  const clip = template.cloneNode();
  clip.volume = VOLUME[name] ?? 0.6;
  clip.play().catch(() => {});
}

export function startTheme() {
  themeWanted = true;
  if (muted) return;
  theme.play().catch(armUnlock);
}

export function stopTheme() {
  themeWanted = false;
  theme.pause();
  theme.currentTime = 0;
}

export function isMuted() {
  return muted;
}

export function setMuted(next) {
  muted = next;
  try {
    localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
  } catch {
    /* private mode — fall back to in-memory only */
  }
  if (muted) theme.pause();
  else if (themeWanted) theme.play().catch(armUnlock);
  listeners.forEach((fn) => fn(muted));
}

export function toggleMuted() {
  setMuted(!muted);
  return muted;
}

export function subscribeMuted(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
