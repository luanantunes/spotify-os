import React, { useEffect, useState } from 'react';
import { 
  redirectToSpotify, 
  handleAuthCallback, 
  fetchUserProfile, 
  fetchTopTracks, 
  fetchTopArtists,
  logoutSpotify 
} from './services/spotify';

function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [topTracks, setTopTracks] = useState([]);
  const [topArtists, setTopArtists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        let currentToken = localStorage.getItem('spotify_access_token');

        // Se veio o código do Spotify na URL, processa a troca pelo token
        if (code && !currentToken) {
          currentToken = await handleAuthCallback(code);
        }

        // Se temos um token válido, busca os dados
        if (currentToken) {
          setToken(currentToken);
          
          const profileData = await fetchUserProfile(currentToken);
          if (profileData) {
            setUser(profileData);
            
            // Busca os dados do Wrapped
            const tracks = await fetchTopTracks(currentToken, 'medium_term');
            const artists = await fetchTopArtists(currentToken, 'medium_term');
            setTopTracks(tracks);
            setTopArtists(artists);
          } else {
            // Se o token expirou ou é inválido, limpa e força novo login
            logoutSpotify();
          }
        }
      } catch (err) {
        console.error("Erro na inicialização da sessão:", err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  if (loading) {
    return (
      <div style={{ backgroundColor: '#0a0a12', color: '#00ffcc', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
        [SYSTEM]: AUTENTICANDO COM SPOTIFY OS...
      </div>
    );
  }

  return (
    <div style={{ background: '#0a0a12', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
      {!token ? (
        <div style={{ textAlign: 'center', marginTop: '100px' }}>
          <h1 style={{ color: '#00ffcc', fontFamily: 'monospace' }}>SPOTIFY OS // CYBERPUNK STATS</h1>
          <p style={{ color: '#888', marginBottom: '30px' }}>Dashboard de Estatísticas e Análise Musical</p>
          <button 
            onClick={redirectToSpotify}
            style={{
              padding: '14px 28px',
              backgroundColor: '#1db954',
              color: '#fff',
              border: 'none',
              borderRadius: '25px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '16px'
            }}
          >
            CONNECT SPOTIFY
          </button>
        </div>
      ) : (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '15px' }}>
            <div>
              <h2 style={{ color: '#00ffcc', margin: 0, fontFamily: 'monospace' }}>
                // USER: {user?.display_name?.toUpperCase()}
              </h2>
              <span style={{ color: '#888', fontSize: '12px' }}>
                PLANO: {user?.product?.toUpperCase() || 'FREE'}
              </span>
            </div>
            <button 
              onClick={logoutSpotify} 
              style={{ background: '#ff0055', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              LOGOUT
            </button>
          </header>

          <main style={{ marginTop: '30px' }}>
            <section style={{ marginBottom: '40px' }}>
              <h3 style={{ color: '#00ffcc', fontFamily: 'monospace', borderBottom: '1px solid #00ffcc', paddingBottom: '5px' }}>
                // TOP 10 MÚSICAS (ÚLTIMOS 6 MESES)
              </h3>
              <ol style={{ paddingLeft: '20px' }}>
                {topTracks.map((track) => (
                  <li key={track.id} style={{ marginBottom: '12px', lineHeight: '1.4' }}>
                    <strong style={{ color: '#fff' }}>{track.name}</strong> 
                    <span style={{ color: '#aaa' }}> — {track.artists.map(a => a.name).join(', ')}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section>
              <h3 style={{ color: '#ff0055', fontFamily: 'monospace', borderBottom: '1px solid #ff0055', paddingBottom: '5px' }}>
                // TOP 10 ARTISTAS
              </h3>
              <ol style={{ paddingLeft: '20px' }}>
                {topArtists.map((artist) => (
                  <li key={artist.id} style={{ marginBottom: '12px', color: '#fff' }}>
                    <strong>{artist.name}</strong>
                  </li>
                ))}
              </ol>
            </section>
          </main>
        </div>
      )}
    </div>
  );
}

export default App;