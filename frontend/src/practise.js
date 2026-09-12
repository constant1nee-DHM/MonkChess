import { useCallback, useRef, useState } from 'react';
import { Chess } from 'chess.js';

/**
 * Practise mode: the learner plays their own side of the line by hand while
 * the opponent's replies are played automatically from the same ply data the
 * lesson uses. A move that matches the line is accepted; anything else is
 * shown as wrong and must be taken back.
 */
export default function usePractise(variation) {
  const gameRef = useRef(null);
  const game = () => (gameRef.current ??= new Chess());

  const [fen, setFen] = useState(() => new Chess().fen());
  const [ply, setPly] = useState(0); // index of the half-move we are waiting for
  const [selected, setSelected] = useState(null);
  const [dots, setDots] = useState([]);
  const [marks, setMarks] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [wrong, setWrong] = useState(null);

  const plies = variation.plies;
  const mySide = variation.side; // 'white' | 'black'
  const isMine = (entry) => entry.side.toLowerCase() === mySide;

  /** Plays the opponent's moves from `from` until it is the learner's turn. */
  const autoPlay = (chess, from) => {
    let i = from;
    let last = null;
    while (i < plies.length && !isMine(plies[i])) {
      const entry = plies[i];
      chess.move({ from: entry.from, to: entry.to, promotion: 'q' });
      last = { from: entry.from, to: entry.to };
      i += 1;
    }
    return { next: i, last };
  };

  const reset = useCallback(() => {
    const chess = new Chess();
    gameRef.current = chess;
    const { next, last } = autoPlay(chess, 0);
    setFen(chess.fen());
    setPly(next);
    setLastMove(last);
    setSelected(null);
    setDots([]);
    setMarks([]);
    setWrong(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variation]);

  const done = ply >= plies.length;

  /** Returns 'correct' | 'wrong' so the caller can pick a sound. */
  const tryMove = (from, to) => {
    const chess = game();
    const expected = plies[ply];
    if (!expected) return null;

    const moved = chess.move({ from, to, promotion: 'q' });
    if (!moved) return null;

    setSelected(null);
    setDots([]);

    if (expected.from === from && expected.to === to) {
      const { next, last } = autoPlay(chess, ply + 1);
      setPly(next);
      setMarks([{ square: to, kind: 'correct' }]);
      setLastMove(last);
      setWrong(null);
      setFen(chess.fen());
      return 'correct';
    }

    setMarks([{ square: to, kind: 'wrong' }]);
    setLastMove(null);
    setWrong({ hint: expected.comment, san: expected.san });
    setFen(chess.fen());
    return 'wrong';
  };

  /** Single entry point for board clicks: select a piece, or play to a dot. */
  const clickSquare = (square) => {
    if (wrong || done) return null; // take the move back first
    const chess = game();

    if (selected && dots.includes(square)) return tryMove(selected, square);

    const piece = chess.get(square);
    if (piece && piece.color === (mySide === 'black' ? 'b' : 'w')) {
      setSelected(square);
      setDots(chess.moves({ square, verbose: true }).map((m) => m.to));
    } else {
      setSelected(null);
      setDots([]);
    }
    return null;
  };

  /** Takes back the wrong move so the same half-move can be tried again. */
  const undo = () => {
    if (!wrong) return;
    game().undo();
    setFen(game().fen());
    setMarks([]);
    setSelected(null);
    setDots([]);
    setWrong(null);
  };

  return {
    fen,
    dots,
    marks,
    selected,
    lastMove,
    wrong,
    done,
    played: ply,
    total: plies.length,
    reset,
    clickSquare,
    undo,
  };
}
