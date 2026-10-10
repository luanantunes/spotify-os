const CLIENT_ID = 'f4ae9203ee034084ab94d5ddbf94067b'.trim();
const REDIRECT_URI = 'https://spotify-os.pf-store.workers.dev'; 

const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-top-read',
  'user-read-playback-state',
  'user-read-currently-playing'
];

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

export const handleAuthCallback = async (code) => {
  const verifier = localStorage.getItem('spotify_code_verifier');

  // Limpa o parâmetro da URL imediatamente para evitar loops ao recarregar
  window.history.replaceState({}, document.title, window.location.pathname);

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
      return data.access_token;
    } else {
      console.error('Erro na resposta do token:', data);
      return null;
    }
  } catch (err) {
    console.error('Erro ao trocar token:', err);
    return null;
  }
};

const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-top-read'
];

export const fetchUserProfile = async (token) => {
  try {
    const res = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Erro 403/401 detalhado do Spotify (/v1/me):`, errorText);
      return null;
    }
    
    return await res.json();
  } catch (err) {
    console.error("Erro de rede ao buscar perfil:", err);
    return null;
  }
};

export const fetchTopTracks = async (token, timeRange = 'medium_term') => {
  try {
    const res = await fetch(`https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=10`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  } catch (err) {
    console.error("Erro ao buscar top tracks:", err);
    return [];
  }
};

export const fetchTopArtists = async (token, timeRange = 'medium_term') => {
  try {
    const res = await fetch(`https://api.spotify.com/v1/me/top/artists?time_range=${timeRange}&limit=10`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  } catch (err) {
    console.error("Erro ao buscar top artists:", err);
    return [];
  }
};

export const logoutSpotify = () => {
  localStorage.removeItem('spotify_access_token');
  localStorage.removeItem('spotify_refresh_token');
  localStorage.removeItem('spotify_code_verifier');
  window.location.href = window.location.origin;
};