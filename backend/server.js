import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import {
  DATA_FILE,
  LIB_DIR,
  MONK_SPRITES,
  firstMoveOptions,
  loadDataset,
  openingsForBucket,
  setDataset,
} from './lib/dataset.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 3001;

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));

let dataset = loadDataset();

/* ---------------------------------------------------------------- assets */

const staticOptions = { maxAge: '1h', fallthrough: true };
app.use('/assets/img', express.static(path.join(ROOT, 'img'), staticOptions));
app.use('/assets/sprites', express.static(path.join(ROOT, 'sprites'), staticOptions));
app.use('/assets/svg', express.static(path.join(ROOT, 'svg'), staticOptions));

/* ------------------------------------------------------------------- api */

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, source: dataset.source, loadedAt: dataset.loadedAt });
});

app.get('/api/meta', (_req, res) => {
  res.json({
    title: 'Monk Chess — Opening Trainer',
    source: dataset.source,
    schemaVersion: dataset.schemaVersion,
    description: dataset.description,
    commentaryStyle: dataset.commentaryStyle,
    totals: dataset.totals,
    monkSprites: MONK_SPRITES,
    issueCount: dataset.issues.length,
    loadedAt: dataset.loadedAt,
  });
});

app.get('/api/first-moves', (_req, res) => {
  res.json({ options: firstMoveOptions(dataset) });
});

/** Openings for a chosen side + first move. Side only flips the board. */
app.get('/api/openings', (req, res) => {
  const side = req.query.side === 'black' ? 'black' : 'white';
  const bucket = ['e4', 'd4', 'other'].includes(req.query.firstMove) ? req.query.firstMove : 'e4';
  const openings = openingsForBucket(dataset, bucket);
  res.json({
    side,
    firstMove: bucket,
    count: openings.reduce((sum, o) => sum + o.variations.length, 0),
    openings,
  });
});

app.get('/api/variations/:id', (req, res) => {
  const variation = dataset.variationsById.get(req.params.id);
  if (!variation) return res.status(404).json({ error: `Unknown variation "${req.params.id}".` });

  const side = req.query.side === 'black' ? 'black' : 'white';
  const { plies, ...rest } = variation;

  res.json({
    ...rest,
    side,
    orientation: side,
    intro: {
      monkSprite: MONK_SPRITES[0],
      comment: `${variation.opening} — ${variation.name}. ${variation.plyCount} half-moves ahead. Take your time.`,
    },
    plies,
  });
});

app.get('/api/validation', (_req, res) => {
  res.json({ source: dataset.source, totals: dataset.totals, issues: dataset.issues });
});

/** Backs the "import json" button on the home screen. */
app.post('/api/import', (req, res) => {
  const { payload, filename, persist = true } = req.body ?? {};
  try {
    if (persist) {
      const safeName = path.basename(filename || `imported_${Date.now()}.json`);
      const target = path.join(LIB_DIR, safeName);
      fs.writeFileSync(target, JSON.stringify(payload, null, 2), 'utf8');
      dataset = setDataset(payload, safeName);
    } else {
      dataset = setDataset(payload, filename || 'in-memory');
    }
    res.json({ ok: true, source: dataset.source, totals: dataset.totals, issues: dataset.issues });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

app.post('/api/reload', (_req, res) => {
  try {
    dataset = loadDataset({ force: true, file: DATA_FILE });
    res.json({ ok: true, source: dataset.source, totals: dataset.totals });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/* --------------------------------------------------- optional static build */

const builtFrontend = path.join(ROOT, 'frontend', 'dist');
if (fs.existsSync(builtFrontend)) {
  app.use(express.static(builtFrontend));
  app.get(/^(?!\/api|\/assets).*/, (_req, res) => {
    res.sendFile(path.join(builtFrontend, 'index.html'));
  });
}

app.listen(PORT, () => {
  const { openings, variations, playable } = dataset.totals;
  console.log(`\n  Monk Chess backend  ->  http://localhost:${PORT}`);
  console.log(`  dataset: ${dataset.source}`);
  console.log(`  ${openings} openings, ${variations} variations, ${playable} fully legal`);
  if (dataset.issues.length) {
    console.log(`\n  ${dataset.issues.length} variation(s) truncated at an illegal move:`);
    for (const issue of dataset.issues) {
      console.log(
        `    - ${issue.id} (${issue.name}): ply ${issue.offendingPly} ` +
          `${issue.offendingSide} "${issue.offendingMove}" is illegal; ` +
          `playing ${issue.playedPlies}/${issue.totalPlies} half-moves.`,
      );
    }
  }
  console.log('');
});
