// src/services/spotify.js

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;

// Utilitários para PKCE
function generateRandomString(length) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
}

function base64encode(input) {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

// 1. Redirecionar para o Login
export async function redirectToSpotify() {
  if (!CLIENT_ID || !REDIRECT_URI) {
    alert("Erro: Variáveis VITE_SPOTIFY_CLIENT_ID e VITE_SPOTIFY_REDIRECT_URI devem estar configuradas!");
    return;
  }

  const codeVerifier = generateRandomString(64);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64encode(hashed);

  window.localStorage.setItem('code_verifier', codeVerifier);

  const scopes = [
    'user-read-private',
    'user-read-email',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing'
  ].join(' ');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: scopes,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    redirect_uri: REDIRECT_URI,
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

// 2. Trocar o código pelo Access Token
export async function handleAuthCallback(code) {
  const codeVerifier = window.localStorage.getItem('code_verifier');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  });

  const data = await response.json();
  if (data.access_token) {
    window.localStorage.setItem('spotify_access_token', data.access_token);
    window.localStorage.setItem('spotify_refresh_token', data.refresh_token || '');
    // Limpa a URL limpando o parâmetro code
    window.history.replaceState({}, document.title, window.location.pathname);
    return data.access_token;
  }
  return null;
}

// 3. Buscar Perfil do Usuário
export async function fetchUserProfile(token) {
  try {
    const res = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status === 401) return null; // Token expirado
    return await res.json();
  } catch {
    return null;
  }
}

// 4. Buscar Música Tocando Agora
export async function fetchCurrentlyPlaying(token) {
  try {
    const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status === 204 || res.status > 400) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// 5. Controlar Play / Pause no Spotify
export async function togglePlayback(token, isPlaying) {
  const endpoint = isPlaying ? 'pause' : 'play';
  try {
    await fetch(`https://api.spotify.com/v1/me/player/${endpoint}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (err) {
    console.error("Erro ao alterar reprodução:", err);
  }
}

// 6. Logout
export function logoutSpotify() {
  window.localStorage.removeItem('spotify_access_token');
  window.localStorage.removeItem('spotify_refresh_token');
  window.localStorage.removeItem('code_verifier');
  window.location.reload();
}