import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Play, Pause, SkipForward, SkipBack, Music, Terminal, LogIn, LogOut, User } from 'lucide-react';
import { Vinyl3D } from './components/3d/Vinyl3D.jsx';
import { 
  redirectToSpotify, 
  handleAuthCallback, 
  fetchUserProfile, 
  fetchCurrentlyPlaying, 
  togglePlayback, 
  logoutSpotify 
} from './services/spotify.js';

export default function App() {
  const [token, setToken] = useState(window.localStorage.getItem('spotify_access_token'));
  const [user, setUser] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [track, setTrack] = useState({
    title: "NO TRACK PLAYING",
    artist: "CONNECT & PLAY MUSIC",
    albumArt: null,
    progressMs: 0,
    durationMs: 225000
  });

  // Processa Callback e Inicializa Sessão
  useEffect(() => {
    const initAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');

      let currentToken = token;

      if (code) {
        currentToken = await handleAuthCallback(code);
        if (currentToken) setToken(currentToken);
      }

      if (currentToken) {
        const profile = await fetchUserProfile(currentToken);
        if (profile) {
          setUser(profile);
        } else {
          logoutSpotify(); // Se o token estiver vencido/inválido
        }
      }
    };

    initAuth();
  }, []);

  // Polling para atualizar o que está tocando a cada 3 segundos
  useEffect(() => {
    if (!token) return;

    const updatePlayer = async () => {
      const data = await fetchCurrentlyPlaying(token);
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
    };

    updatePlayer();
    const interval = setInterval(updatePlayer, 3000);
    return () => clearInterval(interval);
  }, [token]);

  // Formatação de Tempo (ms -> MM:SS)
  const formatTime = (ms) => {
    if (!ms) return '00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = async () => {
    if (token) {
      await togglePlayback(token, isPlaying);
      setIsPlaying(!isPlaying);
    } else {
      setIsPlaying(!isPlaying); // Fallback local de teste
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
          {/* Capa do Álbum ou Áudio Ativo */}
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