import { useCallback, useEffect, useRef, useState } from 'react';
import ChessBoard from './ChessBoard';
import { playSfx, stopTheme } from '../audio';
import SoundButton from './SoundButton';

export default function SessionScreen({ variation, onExit }) {
  const [index, setIndex] = useState(0);
  const total = variation.plies.length;
  const previousIndex = useRef(0);

  // The theme is a home-screen thing — the session itself stays quiet.
  useEffect(() => stopTheme(), []);

  const step = useCallback((delta) => setIndex((i) => Math.min(total, Math.max(0, i + delta))), [total]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'ArrowRight' || event.key === ' ') {
        event.preventDefault();
        step(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        step(-1);
      } else if (event.key === 'Escape') {
        onExit();
      } else if (event.key === 'Home') {
        setIndex(0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, onExit]);

  // One sound per position change, whichever control caused it.
  useEffect(() => {
    if (index === previousIndex.current) return;
    previousIndex.current = index;
    if (index === 0) return;
    playSfx(variation.plies[index - 1].check ? 'check' : 'move');
  }, [index, variation]);

  const current = index === 0 ? null : variation.plies[index - 1];
  const fen = current ? current.fen : variation.startFen;
  const monkSprite = current ? current.monkSprite : variation.intro.monkSprite;
  const comment = current ? current.comment : variation.intro.comment;
  const finished = index === total;

  const heading = current
    ? `${current.moveNumber}${current.side === 'White' ? '.' : '…'} ${current.san}`
    : 'Starting position';

  return (
    <>
      <ChessBoard
        fen={fen}
        orientation={variation.orientation}
        lastMove={current ? { from: current.from, to: current.to } : null}
      />

      <img
        className="monk"
        src={`/assets/sprites/${monkSprite}`}
        alt="The monk"
        draggable={false}
        style={{ left: 1300, top: 360, width: 300, height: 300 }}
      />

      <div className="commentary" style={{ left: 1104, top: 754, width: 692, height: 202 }}>
        <div className="commentary-head">
          <span className="commentary-move">{heading}</span>
          <span className="commentary-count">
            {index} / {total}
          </span>
        </div>
        <p className="commentary-body">{comment}</p>
        {finished && total > 0 && (
          <p className="commentary-end">End of the line. Sit with the position a moment.</p>
        )}
      </div>

      <button
        type="button"
        className="corner-button"
        style={{ left: 104, top: 1005 }}
        onClick={() => {
          playSfx('click');
          onExit();
        }}
        title="Back to the home screen (Esc)"
      >
        exit
      </button>

      <SoundButton left={168} top={1005} />

      <div className="session-controls">
        <button type="button" className="slab nav-slab" onClick={() => setIndex(0)} disabled={index === 0}>
          restart
        </button>
        <button type="button" className="slab nav-slab" onClick={() => step(-1)} disabled={index === 0}>
          ‹ back
        </button>
        <button type="button" className="slab nav-slab is-primary" onClick={() => step(1)} disabled={finished}>
          next ›
        </button>
      </div>

      <div className="session-caption">
        <span className="session-caption-name">{variation.name}</span>
        <span className="session-caption-meta">
          {variation.opening} · playing {variation.side}
        </span>
      </div>
    </>
  );
}
