import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const LIB_DIR = path.resolve(__dirname, '../../lib');
export const DATA_FILE = path.join(LIB_DIR, 'opening_variations_with_commentary.json');

/**
 * The monk cycles through his seven moods, one step per half-move.
 * Ply 0 (the starting position) always shows the welcome sprite.
 */
export const MONK_SPRITES = [
  'monk_1_welcome.png',
  'monk_2_normal_move.png',
  'monk_3_judgemental.png',
  'monk_4_reassuring.png',
  'monk_5_cautious_key_move.png',
  'monk_6_offensive_check.png',
  'monk_7_happy_end.png',
];

export const monkSpriteForPly = (ply) => MONK_SPRITES[ply % MONK_SPRITES.length];

const START_FEN = new Chess().fen();

/** Openings whose first white move is not e4/d4 are grouped under "other". */
const firstMoveBucket = (san) => (san === 'e4' || san === 'd4' ? san : 'other');

const slugify = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

/**
 * Replays a variation's SAN list through a real engine so the UI can render
 * positions instead of just text. A line that goes illegal is kept, but
 * truncated at the last legal half-move and flagged for the validation report.
 */
function buildPlies(variation) {
  const chess = new Chess();
  const plies = [];
  let validation = { status: 'ok' };

  variation.moves.forEach((entry, index) => {
    if (validation.status !== 'ok') return;

    const fenBefore = chess.fen();
    let result = null;
    try {
      result = chess.move(entry.move);
    } catch {
      result = null;
    }

    if (!result) {
      validation = {
        status: 'truncated',
        offendingMove: entry.move,
        offendingSide: entry.side,
        offendingPly: index + 1,
        playedPlies: plies.length,
        totalPlies: variation.moves.length,
        fen: fenBefore,
        legalMoves: new Chess(fenBefore).moves(),
        reason: `"${entry.move}" is not legal in this position.`,
      };
      return;
    }

    plies.push({
      ply: index + 1,
      moveNumber: entry.move_number,
      side: entry.side,
      san: result.san,
      comment: entry.comment,
      fenBefore,
      fen: chess.fen(),
      from: result.from,
      to: result.to,
      capture: result.san.includes('x'),
      check: chess.inCheck(),
      checkmate: chess.isCheckmate(),
      castle: result.san.startsWith('O-O'),
      monkSprite: monkSpriteForPly(index + 1),
    });
  });

  return { plies, validation };
}

function normalise(raw, sourceName) {
  const openings = [];
  const variationsById = new Map();
  const issues = [];

  for (const opening of raw.openings ?? []) {
    const openingId = slugify(opening.opening);
    const summaries = [];

    for (const variation of opening.variations ?? []) {
      const { plies, validation } = buildPlies(variation);
      const firstMove = variation.moves?.[0]?.move ?? '';

      const record = {
        id: variation.id,
        name: variation.name,
        opening: opening.opening,
        openingId,
        movesSan: variation.moves_san,
        firstMove,
        bucket: firstMoveBucket(firstMove),
        plyCount: plies.length,
        declaredPlyCount: variation.moves.length,
        validation,
        startFen: START_FEN,
        plies,
      };

      variationsById.set(record.id, record);
      summaries.push({
        id: record.id,
        name: record.name,
        opening: record.opening,
        openingId,
        movesSan: record.movesSan,
        firstMove,
        bucket: record.bucket,
        plyCount: record.plyCount,
        moveCount: Math.ceil(record.plyCount / 2),
        status: validation.status,
      });

      if (validation.status !== 'ok') {
        issues.push({
          id: record.id,
          name: record.name,
          opening: opening.opening,
          ...validation,
        });
      }
    }

    openings.push({
      id: openingId,
      name: opening.opening,
      variationCount: summaries.length,
      buckets: [...new Set(summaries.map((s) => s.bucket))],
      variations: summaries,
    });
  }

  const total = openings.reduce((sum, o) => sum + o.variations.length, 0);

  return {
    source: sourceName,
    schemaVersion: raw.schema_version ?? 'unknown',
    description: raw.description ?? '',
    commentaryStyle: raw.commentary_style ?? null,
    openings,
    variationsById,
    totals: { openings: openings.length, variations: total, playable: total - issues.length },
    issues,
    loadedAt: new Date().toISOString(),
  };
}

/** Rejects a payload that does not look like the opening-library schema. */
export function assertValidPayload(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('Payload is not a JSON object.');
  if (!Array.isArray(raw.openings) || raw.openings.length === 0) {
    throw new Error('Payload has no "openings" array.');
  }
  for (const opening of raw.openings) {
    if (!opening.opening) throw new Error('An opening is missing its "opening" name.');
    if (!Array.isArray(opening.variations)) {
      throw new Error(`Opening "${opening.opening}" has no "variations" array.`);
    }
    for (const variation of opening.variations) {
      if (!variation.id || !variation.name) {
        throw new Error(`A variation in "${opening.opening}" is missing "id" or "name".`);
      }
      if (!Array.isArray(variation.moves) || variation.moves.length === 0) {
        throw new Error(`Variation "${variation.id}" has no "moves" array.`);
      }
      for (const move of variation.moves) {
        if (!move.move || !move.side) {
          throw new Error(`Variation "${variation.id}" has a move missing "move" or "side".`);
        }
      }
    }
  }
  return true;
}

let cache = null;

export function loadDataset({ force = false, file = DATA_FILE } = {}) {
  if (cache && !force && cache.file === file) return cache.data;
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  assertValidPayload(raw);
  const data = normalise(raw, path.basename(file));
  cache = { file, data };
  return data;
}

export function setDataset(raw, sourceName) {
  assertValidPayload(raw);
  const data = normalise(raw, sourceName);
  cache = { file: sourceName, data };
  return data;
}

/** Side only changes board orientation — every line in the set opens 1.e4. */
export function firstMoveOptions(dataset) {
  const counts = { e4: 0, d4: 0, other: 0 };
  for (const opening of dataset.openings) {
    for (const variation of opening.variations) counts[variation.bucket] += 1;
  }
  return [
    { move: 'e4', label: 'e4', count: counts.e4, enabled: counts.e4 > 0 },
    { move: 'd4', label: 'd4', count: counts.d4, enabled: counts.d4 > 0 },
    { move: 'other', label: 'other', count: counts.other, enabled: counts.other > 0 },
  ];
}

export function openingsForBucket(dataset, bucket) {
  return dataset.openings
    .map((opening) => ({
      ...opening,
      variations: opening.variations.filter((v) => v.bucket === bucket),
    }))
    .filter((opening) => opening.variations.length > 0);
}
