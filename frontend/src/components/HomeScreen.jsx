import { useEffect, useRef, useState } from 'react';
import { getOpenings, importDataset } from '../api';

/** Slot geometry lifted from img/home_screen_palace_shema.png (1920x1080). */
const SIDE_SLOTS = [
  { move: 'e4', top: 366 },
  { move: 'd4', top: 470 },
  { move: 'other', top: 574 },
];

export default function HomeScreen({ meta, firstMoves, onStart, onDatasetReplaced }) {
  const [side, setSide] = useState(null);
  const [firstMove, setFirstMove] = useState(null);
  const [openings, setOpenings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const fileInput = useRef(null);

  useEffect(() => {
    if (!side || !firstMove) {
      setOpenings([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getOpenings(side, firstMove)
      .then((data) => !cancelled && setOpenings(data.openings))
      .catch((error) => !cancelled && setNotice(error.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [side, firstMove]);

  const chooseSide = (next) => {
    setSide(next);
    setFirstMove(null);
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const result = await importDataset(payload, file.name);
      setSide(null);
      setFirstMove(null);
      setNotice(`Loaded ${file.name}: ${result.totals.variations} variations.`);
      onDatasetReplaced?.();
    } catch (error) {
      setNotice(`Import failed: ${error.message}`);
    }
  };

  const optionFor = (move) => firstMoves.find((entry) => entry.move === move) ?? { enabled: false, count: 0 };

  const renderSideColumn = (columnSide, left) =>
    SIDE_SLOTS.map(({ move, top }) => {
      const option = optionFor(move);
      const active = side === columnSide;
      const usable = active && option.enabled;
      return (
        <button
          key={`${columnSide}-${move}`}
          type="button"
          className={`slab move-slab ${firstMove === move && active ? 'is-selected' : ''}`}
          style={{ left, top, width: 168, height: 96 }}
          disabled={!usable}
          onClick={() => setFirstMove(move)}
          title={option.enabled ? `${option.count} variations` : 'No lines in the library yet'}
        >
          {move}
        </button>
      );
    });

  return (
    <>
      <div className="home-panel" />

      <div className="home-title">
        <span className="home-title-main">Monk Chess</span>
        <span className="home-title-sub">Opening Trainer</span>
      </div>

      <button
        type="button"
        className={`slab side-slab ${side === 'black' ? 'is-selected' : ''}`}
        style={{ left: 317, top: 370, width: 215, height: 80 }}
        onClick={() => chooseSide('black')}
      >
        play black
      </button>
      <button
        type="button"
        className={`slab side-slab ${side === 'white' ? 'is-selected' : ''}`}
        style={{ left: 542, top: 370, width: 215, height: 80 }}
        onClick={() => chooseSide('white')}
      >
        play white
      </button>

      {renderSideColumn('black', 130)}
      {renderSideColumn('white', 778)}

      <div className="opening-list" style={{ left: 317, top: 466, width: 440, height: 504 }}>
        {!side && <p className="list-hint">Choose a side to begin.</p>}
        {side && !firstMove && <p className="list-hint">Now pick a first move on the {side} bar.</p>}
        {loading && <p className="list-hint">Consulting the library…</p>}

        {!loading &&
          openings.map((opening) => (
            <section key={opening.id} className="list-group">
              <h2 className="list-group-title">{opening.name}</h2>
              {opening.variations.map((variation) => (
                <button
                  key={variation.id}
                  type="button"
                  className="list-item"
                  onClick={() => onStart(variation.id, side)}
                >
                  <span className="list-item-name">
                    {variation.name}
                    {variation.status !== 'ok' && <span className="list-item-flag" title="Line is cut short by an illegal move in the dataset">!</span>}
                  </span>
                  <span className="list-item-meta">{variation.moveCount} moves</span>
                </button>
              ))}
            </section>
          ))}

        {!loading && side && firstMove && openings.length === 0 && (
          <p className="list-hint">No {firstMove} lines in this library yet.</p>
        )}
      </div>

      <button
        type="button"
        className="corner-button"
        style={{ left: 104, top: 920 }}
        onClick={() => fileInput.current?.click()}
        title="Import an opening library JSON"
      >
        json
      </button>
      <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={handleImport} />

      <div className="home-footer">
        {notice ?? `${meta.totals.variations} variations · ${meta.source}`}
        {meta.issueCount > 0 && !notice && (
          <span className="footer-warn"> · {meta.issueCount} flagged</span>
        )}
      </div>
    </>
  );
}
