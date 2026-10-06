// Configuração do cliente Spotify
const CLIENT_ID = 'f4ae9203ee034084ab94d5ddbf94067b'.trim();
const REDIRECT_URI = 'https://spotify-os.pf-store.workers.dev/';

// Lista estrita de escopos suportados
const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'streaming'
];

/**
 * Gera string aleatória para o Code Verifier do PKCE
 */
function generateRandomString(length) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values).map((x) => possible[x % possible.length]).join('');
}

/**
 * Gera o Code Challenge em formato Base64URL sem padding (=)
 */
async function generateCodeChallenge(codeVerifier) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  
  const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return base64
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Redireciona para a página de autorização OAuth 2.0 PKCE do Spotify
 */
export const redirectToSpotify = async () => {
  try {
    const verifier = generateRandomString(128);
    const challenge = await generateCodeChallenge(verifier);

    localStorage.setItem('spotify_code_verifier', verifier);

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope: SCOPES.join(' '),
      code_challenge_method: 'S256',
      code_challenge: challenge,
    });

    const targetUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
    console.log("Redirecionando para Spotify Auth:", targetUrl);

    window.location.href = targetUrl;
  } catch (err) {
    console.error("Erro ao gerar requisição PKCE:", err);
  }
};

/**
 * Troca o código temporário recebido na URL pelo Access Token
 */
export const handleAuthCallback = async (code) => {
  const verifier = localStorage.getItem('spotify_code_verifier');

  if (!verifier) {
    console.error('Code verifier ausente no localStorage');
    return null;
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier,
  });

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
    } else {
      console.error('Erro na resposta do token:', data);
      return null;
    }
  } catch (err) {
    console.error('Falha na troca de token:', err);
    return null;
  }
};

/**
 * Busca perfil do usuário
 */
export const fetchUserProfile = async (token) => {
  try {
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (response.status === 401 || response.status === 403) return null;
    return await response.json();
  } catch (err) {
    return null;
  }
};

/**
 * Busca estado de reprodução atual de forma resiliente
 */
export const fetchCurrentlyPlaying = async (token) => {
  try {
    const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.status === 403) {
      const err = new Error('FORBIDDEN_FREE_ACCOUNT');
      err.status = 403;
      throw err;
    }

    if (response.status === 204 || response.status === 401) return null;

    return await response.json();
  } catch (err) {
    if (err.status === 403 || err.message === 'FORBIDDEN_FREE_ACCOUNT') {
      throw err;
    }
    return null;
  }
};

/**
 * Alterna Play/Pause
 */
export const togglePlayback = async (token, isPlaying) => {
  const endpoint = isPlaying ? 'pause' : 'play';
  try {
    await fetch(`https://api.spotify.com/v1/me/player/${endpoint}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (err) {
    console.warn(`Erro no playback ${endpoint}:`, err);
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