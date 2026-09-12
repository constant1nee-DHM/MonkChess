import { useCallback, useEffect, useState } from 'react';
import { getFirstMoves, getMeta, getVariation } from './api';
import HomeScreen from './components/HomeScreen';
import SessionScreen from './components/SessionScreen';

/** The artwork is authored at 1920x1080; scale the whole stage to fit. */
function useStageScale() {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return scale;
}

export default function App() {
  const scale = useStageScale();
  const [meta, setMeta] = useState(null);
  const [firstMoves, setFirstMoves] = useState([]);
  const [variation, setVariation] = useState(null);
  const [error, setError] = useState(null);

  const loadLibrary = useCallback(() => {
    Promise.all([getMeta(), getFirstMoves()])
      .then(([metaData, moves]) => {
        setMeta(metaData);
        setFirstMoves(moves.options);
        setError(null);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(loadLibrary, [loadLibrary]);

  const startSession = async (id, side) => {
    try {
      setVariation(await getVariation(id, side));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="viewport">
      <div className="stage" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
        <img className="backdrop" src="/assets/img/palace_bg_1920x1080_white_bottom.png" alt="" draggable={false} />

        {error && <div className="boot-message">{error}</div>}

        {!error && !meta && <div className="boot-message">Waking the monk…</div>}

        {!error && meta && !variation && (
          <HomeScreen
            meta={meta}
            firstMoves={firstMoves}
            onStart={startSession}
            onDatasetReplaced={loadLibrary}
          />
        )}

        {!error && meta && variation && (
          <SessionScreen variation={variation} onExit={() => setVariation(null)} />
        )}
      </div>
    </div>
  );
}
