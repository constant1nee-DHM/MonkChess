import { useCallback, useEffect, useRef, useState } from 'react';
import ChessBoard from './ChessBoard';
import { playSfx, stopTheme } from '../audio';
import SoundButton from './SoundButton';
import usePractise from '../practise';

export default function SessionScreen({ variation, onExit }) {
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState('lesson');
  const total = variation.plies.length;
  const previousIndex = useRef(0);
  const practise = usePractise(variation);

  // The theme is a home-screen thing — the session itself stays quiet.
  useEffect(() => stopTheme(), []);

  const step = useCallback((delta) => setIndex((i) => Math.min(total, Math.max(0, i + delta))), [total]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        onExit();
        return;
      }
      if (mode !== 'lesson') return; // practise is driven by the board itself
      if (event.key === 'ArrowRight' || event.key === ' ') {
        event.preventDefault();
        step(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        step(-1);
      } else if (event.key === 'Home') {
        setIndex(0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, onExit, mode]);

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

  const practising = mode === 'practise';

  const enterPractise = () => {
    playSfx('click');
    practise.reset();
    setMode('practise');
  };

  const leavePractise = () => {
    playSfx('click');
    setMode('lesson');
  };

  const handleSquare = (square) => {
    const result = practise.clickSquare(square);
    if (result === 'correct') playSfx('move');
    else if (result === 'wrong') playSfx('check');
  };

  // In practise the monk turns judgemental on a wrong move.
  const practiseSprite = practise.wrong
    ? 'monk_3_judgemental.png'
    : (variation.plies[practise.played - 1] ?? variation.intro).monkSprite;

  return (
    <>
      {practising ? (
        <ChessBoard
          fen={practise.fen}
          orientation={variation.orientation}
          lastMove={practise.lastMove}
          marks={practise.marks}
          dots={practise.dots}
          selected={practise.selected}
          onSquareClick={handleSquare}
        />
      ) : (
        <ChessBoard
          fen={fen}
          orientation={variation.orientation}
          lastMove={current ? { from: current.from, to: current.to } : null}
        />
      )}

      <img
        className="monk"
        src={`/assets/sprites/${practising ? practiseSprite : monkSprite}`}
        alt="The monk"
        draggable={false}
        style={{ left: 1300, top: 360, width: 300, height: 300 }}
      />

      <div className="commentary" style={{ left: 1104, top: 754, width: 692, height: 202 }}>
        {practising ? (
          <>
            <div className="commentary-head">
              <span className="commentary-move">{practise.wrong ? 'Wrong move' : 'Practise'}</span>
              <span className="commentary-count">
                {practise.played} / {practise.total}
              </span>
            </div>
            {practise.wrong ? (
              <p className="commentary-body">{practise.wrong.hint}</p>
            ) : (
              <p className="commentary-end">
                {practise.done ? 'Line complete. Well played.' : 'Your move.'}
              </p>
            )}
          </>
        ) : (
          <>
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
          </>
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
        {practising ? (
          <>
            <button
              type="button"
              className="slab nav-slab"
              onClick={() => {
                playSfx('click');
                practise.reset();
              }}
            >
              restart
            </button>
            <button
              type="button"
              className="slab nav-slab"
              onClick={() => {
                playSfx('click');
                practise.undo();
              }}
              disabled={!practise.wrong}
            >
              ‹ take back
            </button>
            <button type="button" className="slab nav-slab is-primary" onClick={leavePractise}>
              ‹ lesson
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="slab nav-slab"
              onClick={() => setIndex(0)}
              disabled={index === 0}
            >
              restart
            </button>
            <button
              type="button"
              className="slab nav-slab"
              onClick={() => step(-1)}
              disabled={index === 0}
            >
              ‹ back
            </button>
            <button
              type="button"
              className="slab nav-slab is-primary"
              onClick={() => step(1)}
              disabled={finished}
            >
              next ›
            </button>
            <button type="button" className="slab nav-slab is-primary" onClick={enterPractise}>
              practise ›
            </button>
          </>
        )}
      </div>

      <div className="session-caption">
        <span className="session-caption-name">{variation.name}</span>
        <span className="session-caption-meta">
          {variation.opening} · playing {variation.side} · {practising ? 'practise' : 'lesson'}
        </span>
      </div>
    </>
  );
}
