/**
 * Renders pieces onto the board that is already painted into the palace
 * backdrop. Geometry comes straight from img/layout_guide.png:
 *   board_playing_field (140,140)-(940,940) -> 8 squares of 100px.
 */
const FIELD_X = 140;
const FIELD_Y = 140;
const SQUARE = 100;
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

/** The backdrop has white-side coordinates baked in; cover them when flipped. */
const RANK_STRIP = { left: 100, top: 140, width: 40, height: 800 };
const FILE_STRIP = { left: 140, top: 940, width: 800, height: 46 };

function parseFen(fen) {
  const squares = [];
  const [placement] = fen.split(' ');
  placement.split('/').forEach((row, rankIndex) => {
    let file = 0;
    for (const token of row) {
      if (/\d/.test(token)) {
        file += Number(token);
        continue;
      }
      const colour = token === token.toUpperCase() ? 'w' : 'b';
      squares.push({
        piece: `${colour}${token.toUpperCase()}`,
        square: `${FILES[file]}${8 - rankIndex}`,
        file,
        rank: 8 - rankIndex,
      });
      file += 1;
    }
  });
  return squares;
}

const positionFor = (file, rank, flipped) => ({
  left: FIELD_X + (flipped ? 7 - file : file) * SQUARE,
  top: FIELD_Y + (flipped ? rank - 1 : 8 - rank) * SQUARE,
});

const squareToCoords = (square) => ({
  file: FILES.indexOf(square[0]),
  rank: Number(square[1]),
});

export default function ChessBoard({ fen, orientation = 'white', lastMove = null }) {
  const flipped = orientation === 'black';
  const pieces = parseFen(fen);
  const highlights = lastMove ? [lastMove.from, lastMove.to] : [];

  return (
    <div className="board-layer">
      {flipped && (
        <>
          <div className="coord-patch" style={RANK_STRIP} />
          <div className="coord-patch" style={FILE_STRIP} />
          {FILES.map((file, index) => {
            const { left } = positionFor(index, 1, flipped);
            return (
              <div key={file} className="coord-label coord-file" style={{ left, top: FILE_STRIP.top }}>
                {file}
              </div>
            );
          })}
          {[1, 2, 3, 4, 5, 6, 7, 8].map((rank) => {
            const { top } = positionFor(0, rank, flipped);
            return (
              <div key={rank} className="coord-label coord-rank" style={{ left: RANK_STRIP.left, top }}>
                {rank}
              </div>
            );
          })}
        </>
      )}

      {highlights.map((square) => {
        const { file, rank } = squareToCoords(square);
        return (
          <div
            key={square}
            className="square-highlight"
            style={{ ...positionFor(file, rank, flipped), width: SQUARE, height: SQUARE }}
          />
        );
      })}

      {pieces.map(({ piece, square, file, rank }) => (
        <img
          key={square}
          className="piece"
          src={`/assets/svg/${piece}.svg`}
          alt={piece}
          draggable={false}
          style={{ ...positionFor(file, rank, flipped), width: SQUARE, height: SQUARE }}
        />
      ))}
    </div>
  );
}
