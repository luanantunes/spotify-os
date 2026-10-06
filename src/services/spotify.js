// Configuração do cliente Spotify
const CLIENT_ID = 'f4ae9203ee034084ab94d5ddbf94067b'.trim();
const REDIRECT_URI = 'https://spotify-os.pf-store.workers.dev'; 

// Escopos necessários para leitura e controle de player
const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-top-read',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'streaming',
  'playlist-modify-public',
  'playlist-modify-private'
];

/**
 * Redireciona para a página de autorização OAuth 2.0 PKCE do Spotify
 */
export const redirectToSpotify = async () => {
  try {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(128));
    const verifier = Array.from(values).map((x) => possible[x % possible.length]).join('');

    const data = new TextEncoder().encode(verifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    const bytes = new Uint8Array(digest);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const challenge = btoa(binary)
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    localStorage.setItem('spotify_code_verifier', verifier);

    const scopeEncoded = SCOPES.join('%20');
    const redirectEncoded = encodeURIComponent(REDIRECT_URI);
    
    const authUrl = `https://accounts.spotify.com/authorize?` +
      `client_id=${CLIENT_ID}` +
      `&response_type=code` +
      `&redirect_uri=${redirectEncoded}` +
      `&scope=${scopeEncoded}` +
      `&code_challenge_method=S256` +
      `&code_challenge=${challenge}`;

    window.location.href = authUrl;
  } catch (err) {
    console.error("Erro no fluxo PKCE:", err);
  }
};

/**
 * Processa a troca do código de autorização pelo Access Token
 */
export const handleAuthCallback = async (code) => {
  const verifier = localStorage.getItem('spotify_code_verifier');

  if (!verifier) {
    console.error('Code verifier ausente no localStorage');
    return null;
  }

  const params = new URLSearchParams();
  params.append('client_id', CLIENT_ID);
  params.append('grant_type', 'authorization_code');
  params.append('code', code);
  params.append('redirect_uri', REDIRECT_URI);
  params.append('code_verifier', verifier);

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const data = await response.json();

    if (data.access_token) {
      localStorage.setItem('spotify_access_token', data.access_token);
      if (data.refresh_token) {
        localStorage.setItem('spotify_refresh_token', data.refresh_token);
      }
      window.history.replaceState({}, document.title, window.location.pathname);
      return data.access_token;
    }
    return null;
  } catch (err) {
    console.error('Erro ao trocar token:', err);
    return null;
  }
};

/**
 * Busca perfil do usuário
 */
export const fetchUserProfile = async (token) => {
  try {
    const res = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status === 401 || res.status === 403) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
};

/**
 * Busca a faixa em execução no momento
 */
export const fetchCurrentlyPlaying = async (token) => {
  try {
    const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status === 204 || res.status === 404) return null;
    if (res.status === 403) {
      const error = new Error('FORBIDDEN_FREE_ACCOUNT');
      error.status = 403;
      throw error;
    }

    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    if (err.status === 403) throw err;
    console.error("Erro ao buscar reprodução atual:", err);
    return null;
  }
};

/**
 * Alterna Play/Pause na Web API do Spotify
 */
export const togglePlayback = async (token, isPlaying) => {
  const endpoint = isPlaying ? 'pause' : 'play';
  try {
    await fetch(`https://api.spotify.com/v1/me/player/${endpoint}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (err) {
    console.error(`Erro ao alternar para ${endpoint}:`, err);
  }
};

/**
 * Logout
 */
export const logoutSpotify = () => {
  localStorage.removeItem('spotify_access_token');
  localStorage.removeItem('spotify_refresh_token');
  localStorage.removeItem('spotify_code_verifier');
  window.location.reload();
};