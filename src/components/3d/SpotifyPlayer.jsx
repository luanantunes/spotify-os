import { useEffect, useState } from 'react';

export function SpotifyPlayer({ token }) {
  const [player, setPlayer] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [isPaused, setIsPaused] = useState(true);
  const [currentTrack, setCurrentTrack] = useState(null);

  useEffect(() => {
    if (!token) return;

    // Função chamada automaticamente quando o script do index.html carrega
    window.onSpotifyWebPlaybackSDKReady = () => {
      const spotifyPlayer = new window.Spotify.Player({
        name: 'Spotify OS Web Player',
        getOAuthToken: (cb) => { cb(token); },
        volume: 0.5,
      });

      // Dispositivo pronto
      spotifyPlayer.addListener('ready', ({ device_id }) => {
        console.log('Web Player Conectado! Device ID:', device_id);
        setDeviceId(device_id);
      });

      // Erros
      spotifyPlayer.addListener('initialization_error', ({ message }) => console.error(message));
      spotifyPlayer.addListener('authentication_error', ({ message }) => console.error(message));
      spotifyPlayer.addListener('account_error', ({ message }) => console.error(message));

      // Mudança de estado da música (Play/Pause/Troca de faixa)
      spotifyPlayer.addListener('player_state_changed', (state) => {
        if (!state) return;
        setCurrentTrack(state.track_window.current_track);
        setIsPaused(state.paused);
      });

      spotifyPlayer.connect();
      setPlayer(spotifyPlayer);
    };
  }, [token]);

  // Função para transferir a reprodução para o Spotify OS automaticamente
  const transferPlaybackHere = async () => {
    if (!deviceId || !token) return;
    await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        device_ids: [deviceId],
        play: true,
      }),
    });
  };

  if (!token) return null;

  return (
    <div style={{ padding: '20px', border: '1px solid #00ffcc', borderRadius: '8px', background: '#0d0d1a', color: '#fff' }}>
      <h2>PLAYER EM TEMPO REAL</h2>
      {currentTrack ? (
        <div>
          <img src={currentTrack.album.images[0]?.url} alt="Capa da música" width={120} style={{ borderRadius: '4px' }} />
          <h3>{currentTrack.name}</h3>
          <p>{currentTrack.artists.map((a) => a.name).join(', ')}</p>
          <button 
            onClick={() => player?.togglePlay()}
            style={{ padding: '10px 20px', background: '#00ffcc', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {isPaused ? '▶ PLAY' : '❚❚ PAUSE'}
          </button>
        </div>
      ) : (
        <div>
          <p>Nenhuma faixa tocando no dispositivo virtual.</p>
          {deviceId && (
            <button 
              onClick={transferPlaybackHere}
              style={{ padding: '8px 16px', background: '#1db954', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              Transferir Som para este Navegador
            </button>
          )}
        </div>
      )}
    </div>
  );
}