// src/services/spotify.js

// Pega das variáveis de ambiente do Vite ou usa a origem atual como Fallback
const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
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

// Auxiliares para salvar/ler Verifier em Cookie de backup
function setCookie(name, value, minutes = 10) {
  const d = new Date();
  d.setTime(d.getTime() + (minutes * 60 * 1000));
  document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/;SameSite=Lax`;
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

// 1. Redirecionar para o Login
export async function redirectToSpotify() {
  if (!CLIENT_ID) {
    alert("Erro: VITE_SPOTIFY_CLIENT_ID não foi definido nas variáveis do Cloudflare/Vite!");
    return;
  }

  const verifier = generateCodeVerifier(64);
  const challenge = await generateCodeChallenge(verifier);

  // Salva no localStorage E nos cookies para ter redundância
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

// 2. Trocar Código por Access Token
export async function handleAuthCallback(code) {
  // Recupera do localStorage ou do Cookie
  let codeVerifier = window.localStorage.getItem('code_verifier') || getCookie('code_verifier');

  if (!codeVerifier) {
    console.error("Code verifier não encontrado no LocalStorage/Cookies.");
    alert("Erro de Sessão: Code Verifier ausente. Tente clicar em CONNECT SPOTIFY novamente.");
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
      // Limpa os parâmetros da URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return data.access_token;
    } else {
      console.error("Erro na resposta do Spotify API:", data);
      alert(`Erro no Spotify Token: ${data.error_description || data.error}`);
      return null;
    }
  } catch (err) {
    console.error("Erro na requisição ao Spotify:", err);
    return null;
  }
}

// 3. Buscar Perfil
export async function fetchUserProfile(token) {
  try {
    const res = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status === 401) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// 4. Buscar Tocando Agora
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

// 5. Play / Pause
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
  window.localStorage.clear();
  document.cookie = "code_verifier=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  window.location.href = window.location.origin;
}