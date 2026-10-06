// Configuração do cliente Spotify
const CLIENT_ID = '93673cddb61d4a6fa8353f2cffaa633c'; // Substitua pelo seu Client ID real
const REDIRECT_URI = 'https://spotify-os.pf-store.workers.dev/';

// Escopos necessários incluindo o 'streaming' e controle do player
const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'streaming'
];

/**
 * Gera uma string aleatória para o PKCE Code Verifier
 */
function generateRandomString(length) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

/**
 * Gera o Code Challenge a partir do Verifier usando SHA-256
 */
async function generateCodeChallenge(codeVerifier) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode.apply(null, new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Redireciona para o login do Spotify usando PKCE Flow
 */
export const redirectToSpotify = async () => {
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

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
};

/**
 * Processa o callback de autenticação e troca o código pelo Access Token
 */
export const handleAuthCallback = async (code) => {
  const verifier = localStorage.getItem('spotify_code_verifier');

  if (!verifier) {
    console.error('Code verifier não encontrado no localStorage');
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
      // Limpa a URL removendo a query string
      window.history.replaceState({}, document.title, window.location.pathname);
      return data.access_token;
    } else {
      console.error('Erro na resposta do token:', data);
      return null;
    }
  } catch (err) {
    console.error('Falha na troca de código por token:', err);
    return null;
  }
};

/**
 * Busca o perfil do usuário logado
 */
export const fetchUserProfile = async (token) => {
  try {
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (response.status === 401 || response.status === 403) return null;
    return await response.json();
  } catch (err) {
    console.error('Erro ao buscar perfil do Spotify:', err);
    return null;
  }
};

/**
 * Busca a faixa atualmente em execução de forma silenciosa e segura contra 403
 */
export const fetchCurrentlyPlaying = async (token) => {
  try {
    const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${token}` }
    });

    // Trata bloqueios de permissão (403), não-autorizado (401) e sem conteúdo (204)
    if (response.status === 403) {
      const err = new Error('FORBIDDEN_FREE_ACCOUNT');
      err.status = 403;
      throw err;
    }

    if (response.status === 204 || response.status === 401) return null;

    return await response.json();
  } catch (err) {
    if (err.status === 403 || err.message === 'FORBIDDEN_FREE_ACCOUNT') {
      throw err; // Repassa para o App.jsx interromper o polling
    }
    return null;
  }
};

/**
 * Alterna entre Play e Pause via API REST
 */
export const togglePlayback = async (token, isPlaying) => {
  const endpoint = isPlaying ? 'pause' : 'play';
  try {
    const response = await fetch(`https://api.spotify.com/v1/me/player/${endpoint}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (response.status === 403) {
      throw new Error('FORBIDDEN_FREE_ACCOUNT');
    }
  } catch (err) {
    console.warn(`Operação ${endpoint} interrompida:`, err.message);
  }
};

/**
 * Desconecta o usuário limpando o localStorage
 */
export const logoutSpotify = () => {
  localStorage.removeItem('spotify_access_token');
  localStorage.removeItem('spotify_refresh_token');
  localStorage.removeItem('spotify_code_verifier');
  window.location.reload();
};