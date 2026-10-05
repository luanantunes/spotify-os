// src/services/spotify.js

const CLIENT_ID = f4ae9203ee034084ab94d5ddbf94067b;
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || window.location.origin;

function generateCodeVerifier(length = 64) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function generateCodeChallenge(codeVerifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function setCookie(name, value, minutes = 10) {
  const d = new Date();
  d.setTime(d.getTime() + (minutes * 60 * 1000));
  document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/;SameSite=Lax`;
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

export async function redirectToSpotify() {
  if (!CLIENT_ID) {
    alert("Erro: VITE_SPOTIFY_CLIENT_ID não configurado nas variáveis do Cloudflare!");
    return;
  }

  const verifier = generateCodeVerifier(64);
  const challenge = await generateCodeChallenge(verifier);

  window.localStorage.setItem('code_verifier', verifier);
  setCookie('code_verifier', verifier);

  const scopes = [
    'user-read-private',
    'user-read-email',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing'
  ].join(' ');

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: scopes,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function handleAuthCallback(code) {
  let codeVerifier = window.localStorage.getItem('code_verifier') || getCookie('code_verifier');

  if (!codeVerifier) {
    console.error("Verifier ausente.");
    return null;
  }

  try {
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
      if (data.refresh_token) {
        window.localStorage.setItem('spotify_refresh_token', data.refresh_token);
      }
      window.history.replaceState({}, document.title, window.location.pathname);
      return data.access_token;
    }
    return null;
  } catch (err) {
    console.error("Erro na autenticação:", err);
    return null;
  }
}

// Renovação Automática do Token expirado
export async function refreshAccessToken() {
  const refreshToken = window.localStorage.getItem('spotify_refresh_token');
  if (!refreshToken) return null;

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    const data = await response.json();
    if (data.access_token) {
      window.localStorage.setItem('spotify_access_token', data.access_token);
      if (data.refresh_token) {
        window.localStorage.setItem('spotify_refresh_token', data.refresh_token);
      }
      return data.access_token;
    }
  } catch (err) {
    console.error("Erro ao renovar token:", err);
  }
  return null;
}

export async function fetchUserProfile(token) {
  try {
    const res = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) return fetchUserProfile(newToken);
      return null;
    }
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchCurrentlyPlaying(token) {
  try {
    const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) return fetchCurrentlyPlaying(newToken);
      return null;
    }
    if (res.status === 204 || res.status > 400) return null;
    return await res.json();
  } catch {
    return null;
  }
}

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

export function logoutSpotify() {
  window.localStorage.clear();
  document.cookie = "code_verifier=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  window.location.href = window.location.origin;
}