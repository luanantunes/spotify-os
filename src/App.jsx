import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Play, Pause, SkipForward, SkipBack, Music, Terminal, LogIn, LogOut, User, Radio } from 'lucide-react';
import { Vinyl3D } from './components/3d/Vinyl3D.jsx';
import { 
  redirectToSpotify, 
  handleAuthCallback, 
  fetchUserProfile, 
  fetchCurrentlyPlaying, 
  togglePlayback, 
  logoutSpotify 
} from './services/spotify';

// Define a função global imediatamente para evitar o "onSpotifyWebPlaybackSDKReady is not defined"
window.onSpotifyWebPlaybackSDKReady = window.onSpotifyWebPlaybackSDKReady || (() => {});

export default function App() {
  const [token, setToken] = useState(window.localStorage.getItem('spotify_access_token'));
  const [user, setUser] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [deviceId, setDeviceId] = useState(null);
  const [player, setPlayer] = useState(null);
  const [sdkError, setSdkError] = useState(null);
  const [track, setTrack] = useState({
    title: "NO TRACK PLAYING",
    artist: "CONNECT & PLAY MUSIC",
    albumArt: null,
    progressMs: 0,
    durationMs: 225000
  });

  // Processa Callback e Autenticação
  useEffect(() => {
    const initAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');

      if (code) {
        const newToken = await handleAuthCallback(code);
        if (newToken) {
          setToken(newToken);
          const profile = await fetchUserProfile(newToken);
          if (profile) setUser(profile);
        }
      } else if (token) {
        const profile = await fetchUserProfile(token);
        if (profile) {
          setUser(profile);
        } else {
          // Token inválido/expirado
          logoutSpotify();
          setToken(null);
        }
      }
    };

    initAuth();
  }, []);

  // Inicializa o Web Playback SDK com verificação de estado
  useEffect(() => {
    if (!token) return;

    const setupPlayer = () => {
      if (!window.Spotify) return;

      const spotifyPlayer = new window.Spotify.Player({
        name: 'Spotify OS Cyberpunk',
        getOAuthToken: (cb) => { cb(token); },
        volume: 0.5,
      });

      spotifyPlayer.addListener('ready', ({ device_id }) => {
        console.log('Dispositivo Web Player Ativo. ID:', device_id);
        setDeviceId(device_id);
      });

      spotifyPlayer.addListener('not_ready', ({ device_id }) => {
        console.log('Dispositivo offline:', device_id);
      });

      spotifyPlayer.addListener('initialization_error', ({ message }) => {
        console.error('Erro de inicialização:', message);
      });

      spotifyPlayer.addListener('authentication_error', ({ message }) => {
        console.error('Erro de autenticação no SDK:', message);
        logoutSpotify();
      });

      spotifyPlayer.addListener('account_error', ({ message }) => {
        console.error('Erro de conta (Ex: Requer Spotify Premium):', message);
        setSdkError('Web Playback requer conta Spotify Premium');
      });

      spotifyPlayer.addListener('player_state_changed', (state) => {
        if (!state) return;
        setIsPlaying(!state.paused);
        setTrack({
          title: state.track_window.current_track.name,
          artist: state.track_window.current_track.artists.map(a => a.name).join(', '),
          albumArt: state.track_window.current_track.album.images[0]?.url || null,
          progressMs: state.position,
          durationMs: state.duration
        });
      });

      spotifyPlayer.connect();
      setPlayer(spotifyPlayer);
    };

    // Se o script do SDK já carregou na página
    if (window.Spotify) {
      setupPlayer();
    } else {
      // Registra a callback global para quando o script terminar de carregar
      window.onSpotifyWebPlaybackSDKReady = setupPlayer;
    }
  }, [token]);

  // Polling para sincronização (com interrupção em caso de erro de autorização)
  useEffect(() => {
    if (!token) return;

    let isSubscribed = true;

    const updatePlayer = async () => {
      try {
        const data = await fetchCurrentlyPlaying(token);
        if (!isSubscribed) return;

        if (data && data.item) {
          setIsPlaying(data.is_playing);
          setTrack({
            title: data.item.name,
            artist: data.item.artists.map(a => a.name).join(', '),
            albumArt: data.item.album.images[0]?.url || null,
            progressMs: data.progress_ms,
            durationMs: data.item.duration_ms
          });
        }
      } catch (err) {
        console.error("Erro na sincronização de reprodução:", err);
      }
    };

    updatePlayer();
    const interval = setInterval(updatePlayer, 4000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [token]);

  // Transferir reprodução para este navegador
  const transferPlayback = async () => {
    if (!deviceId || !token) return;
    try {
      const res = await fetch('https://api.spotify.com/v1/me/player', {
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

      if (res.status === 403) {
        alert("Transferência negada (403): Verifique se sua conta é Premium e se o app no dashboard do Spotify tem as permissões corretas.");
      }
    } catch (err) {
      console.error("Erro ao transferir reprodução:", err);
    }
  };

  const formatTime = (ms) => {
    if (!ms) return '00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = async () => {
    if (player) {
      await player.togglePlay();
    } else if (token) {
      await togglePlayback(token, isPlaying);
      setIsPlaying(!isPlaying);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const progressPercent = track.durationMs ? (track.progressMs / track.durationMs) * 100 : 0;

  return (
    <div className="relative w-screen h-screen bg-cyber-bg select-none overflow-hidden flex flex-col justify-between p-6">
      
      {/* Background 3D Canvas */}
      <div className="absolute inset-0 z-0">
        <Canvas>
          <PerspectiveCamera makeDefault position={[0, 0, 6]} />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} color="#00ff66" intensity={1.5} />
          <pointLight position={[-10, -10, -10]} color="#00f0ff" intensity={1.5} />
          <Vinyl3D isPlaying={isPlaying} />
          <OrbitControls enablePan={false} enableZoom={false} />
        </Canvas>
      </div>

      {/* Grid Cyberpunk Overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      {/* Top OS Header Bar */}
      <header className="relative z-10 flex items-center justify-between border-b border-cyber-border/60 pb-4 bg-cyber-card/40 backdrop-blur-md p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <Terminal className="text-cyber-neonGreen w-5 h-5" />
          <span className="text-xs tracking-widest text-cyber-neonGreen uppercase font-bold">
            SPOTIFY_OS // v0.9.2
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-black/50 border border-cyber-border px-3 py-1.5 rounded-lg text-slate-200">
                {user.images?.[0]?.url ? (
                  <img src={user.images[0].url} alt="Profile" className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-cyber-cyan" />
                )}
                <span className="font-semibold text-xs">{user.display_name}</span>
              </div>
              <button 
                onClick={logoutSpotify}
                className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/40 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500 hover:text-white transition cursor-pointer font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" />
                LOGOUT
              </button>
            </div>
          ) : (
            <button 
              onClick={redirectToSpotify}
              className="flex items-center gap-2 bg-cyber-neonGreen/10 border border-cyber-neonGreen text-cyber-neonGreen px-3 py-1.5 rounded-lg hover:bg-cyber-neonGreen hover:text-black transition cursor-pointer font-semibold shadow-[0_0_15px_rgba(0,255,102,0.2)]"
            >
              <LogIn className="w-4 h-4" />
              CONNECT SPOTIFY
            </button>
          )}
        </div>
      </header>

      {/* Main App Window (.exe style) */}
      <main className="relative z-10 w-full max-w-md mx-auto my-auto bg-cyber-card/80 backdrop-blur-xl border border-cyber-border rounded-2xl shadow-[0_0_50px_rgba(0,255,102,0.1)] overflow-hidden">
        
        {/* Titlebar */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-cyber-border text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-cyber-cyan" />
            <span>PROJECT_2.exe - PLAYER</span>
          </div>
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
          </div>
        </div>

        {/* Player UI Body */}
        <div className="p-6 flex flex-col gap-6">
          {sdkError && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-xs text-center font-mono">
              {sdkError}
            </div>
          )}

          {/* Capa do Álbum */}
          {track.albumArt && (
            <div className="w-24 h-24 mx-auto rounded-lg overflow-hidden border border-cyber-border shadow-[0_0_20px_rgba(0,240,255,0.2)]">
              <img src={track.albumArt} alt="Album Art" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="text-center space-y-1">
            <p className="text-xs text-cyber-cyan tracking-wider uppercase font-semibold">
              {isPlaying ? "TOCANDO AGORA" : "PAUSADO"}
            </p>
            <h2 className="text-lg font-bold text-white truncate px-2">{track.title}</h2>
            <p className="text-xs text-slate-400 truncate px-2">{track.artist}</p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-cyber-border">
              <div 
                className="bg-gradient-to-r from-cyber-cyan to-cyber-neonGreen h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>{formatTime(track.progressMs)}</span>
              <span>{formatTime(track.durationMs)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-6">
            <button className="text-slate-400 hover:text-white transition">
              <SkipBack className="w-5 h-5" />
            </button>
            <button 
              onClick={handlePlayPause}
              className="w-14 h-14 rounded-full bg-cyber-neonGreen text-black flex items-center justify-center font-bold shadow-[0_0_20px_rgba(0,255,102,0.4)] hover:scale-105 transition cursor-pointer"
            >
              {isPlaying ? <Pause className="w-6 h-6 fill-black" /> : <Play className="w-6 h-6 fill-black ml-1" />}
            </button>
            <button className="text-slate-400 hover:text-white transition">
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* Botão de Transferir Áudio */}
          {deviceId && (
            <button
              onClick={transferPlayback}
              className="flex items-center justify-center gap-2 text-xs bg-cyber-cyan/10 border border-cyber-cyan text-cyber-cyan py-2 px-4 rounded-lg hover:bg-cyber-cyan hover:text-black transition cursor-pointer font-bold"
            >
              <Radio className="w-4 h-4" />
              TRANSFERIR SOM PARA ESTE NAVEGADOR
            </button>
          )}
        </div>
      </main>

      {/* Footer OS Controls */}
      <footer className="relative z-10 flex justify-between items-center text-[10px] text-slate-500 border-t border-cyber-border/40 pt-3 font-mono">
        <span>STATUS: {user ? "AUTHENTICATED" : "IN DEVELOPMENT (35%)"}</span>
        <span className={user ? "text-cyber-neonGreen" : ""}>
          {user ? `CONNECTED: ${user.id.toUpperCase()}` : "CONNECTED TO SPOTIFY API"}
        </span>
      </footer>

    </div>
  );
}