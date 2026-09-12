import { useEffect, useState } from 'react';
import { isMuted, playSfx, subscribeMuted, toggleMuted } from '../audio';

export default function SoundButton({ left, top }) {
  const [muted, setMuted] = useState(isMuted);

  useEffect(() => subscribeMuted(setMuted), []);

  return (
    <button
      type="button"
      className="corner-button"
      style={{ left, top }}
      onClick={() => {
        playSfx('click');
        toggleMuted();
      }}
      title={muted ? 'Theme muted — click to play it' : 'Theme playing — click to mute it'}
    >
      {muted ? 'off' : 'on'}
    </button>
  );
}
