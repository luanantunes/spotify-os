import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei';
import { Sparkles, Music, BarChart3, Radio, LogIn, LogOut, User, Activity, Zap } from 'lucide-react';
import { HighTicketBackground } from './components/3d/HighTicketBackground.jsx';
import { 
  redirectToSpotify, 
  handleAuthCallback, 
  fetchUserProfile, 
  fetchTopTracks, 
  fetchTopArtists, 
  logoutSpotify 
} from './services/spotify';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('spotify_access_token'));
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

        if (code) {
          currentToken = await handleAuthCallback(code);
        }

        if (currentToken) {
          setToken(currentToken);
          const profile = await fetchUserProfile(currentToken);
          if (profile) {
            setUser(profile);
            const tracks = await fetchTopTracks(currentToken, 'medium_term');
            const artists = await fetchTopArtists(currentToken, 'medium_term');
            setTopTracks(tracks);
            setTopArtists(artists);
          } else {
            // Se o token for inválido/expirado, limpa e recarrega limpo
            localStorage.removeItem('spotify_access_token');
            setToken(null);
          }
        }
      } catch (err) {
        console.error("Erro no Auth:", err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  if (loading) {
    return (
      <div className="w-screen h-screen bg-[#06080d] text-[#10b981] flex items-center justify-center font-sans tracking-widest text-sm">
        <Activity className="w-5 h-5 animate-spin mr-3 text-[#10b981]" />
        CARREGANDO SPOTIFY OS...
      </div>
    );
  }

  return (
    <div className="relative w-screen min-h-screen bg-[#06080d] text-slate-100 font-sans select-none overflow-x-hidden flex flex-col justify-between">
      
      {/* Dynamic Ambient Background Glows */}
      <div className="fixed top-[-10%] left-[20%] w-[500px] h-[500px] bg-[#10b981]/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[20%] w-[500px] h-[500px] bg-[#00f0ff]/10 rounded-full blur-[140px] pointer-events-none" />

      {/* 3D Canvas Background */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-80">
        <Canvas>
          <PerspectiveCamera makeDefault position={[0, 0, 5]} />
          <HighTicketBackground />
          <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
        </Canvas>
      </div>

      {/* Modern High-Ticket Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#10b981] to-[#00f0ff] p-[1px]">
            <div className="w-full h-full bg-[#0b0f19] rounded-[11px] flex items-center justify-center">
              <Zap className="w-5 h-5 text-[#10b981]" />
            </div>
          </div>
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            SPOTIFY<span className="text-[#10b981]">OS</span>
          </span>
        </div>

        <div>
          {user ? (
            <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full shadow-2xl">
              {user.images?.[0]?.url ? (
                <img src={user.images[0].url} alt="User" className="w-7 h-7 rounded-full object-cover border border-[#10b981]" />
              ) : (
                <User className="w-5 h-5 text-[#10b981]" />
              )}
              <span className="text-xs font-semibold text-slate-200">{user.display_name}</span>
              <button 
                onClick={logoutSpotify}
                className="text-slate-400 hover:text-red-400 transition cursor-pointer ml-2"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={redirectToSpotify}
              className="group relative inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-[#10b981] to-[#059669] text-slate-950 font-bold text-xs tracking-wider uppercase transition-all duration-300 hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:scale-105 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              Conectar Spotify
            </button>
          )}
        </div>
      </header>

      {/* Main Hero & Content Section */}
      <main className="relative z-10 w-full max-w-5xl mx-auto px-6 py-12 my-auto">
        {!token ? (
          /* Landing Hero State (High Ticket) */
          <div className="text-center space-y-8 py-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-xs font-medium text-[#10b981]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Plataforma Next-Gen de Analytics Musical</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-tight">
              Sua música em uma <br />
              <span className="bg-gradient-to-r from-[#10b981] via-[#00f0ff] to-emerald-400 bg-clip-text text-transparent">
                nova dimensão visual.
              </span>
            </h1>

            <p className="max-w-xl mx-auto text-slate-400 text-base md:text-lg font-normal leading-relaxed">
              Explore suas estatísticas de reprodução, artistas preferidos e métricas de áudio com inteligência visual e design imersivo em 3D.
            </p>

            <div className="pt-4">
              <button
                onClick={redirectToSpotify}
                className="px-8 py-4 rounded-full bg-gradient-to-r from-[#10b981] to-[#00f0ff] text-slate-950 font-extrabold text-sm tracking-wider uppercase transition-all duration-300 hover:shadow-[0_0_35px_rgba(16,185,129,0.5)] hover:scale-105 cursor-pointer"
              >
                Acessar meu Dashboard
              </button>
            </div>
          </div>
        ) : (
          /* Authenticated Dashboard View (Clean SaaS) */
          <div className="space-y-10">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-6">
              <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Dashboard Overview</h1>
                <p className="text-xs text-slate-400 mt-1">Análise de dados dos últimos 6 meses</p>
              </div>
              <div className="flex items-center gap-2 text-xs bg-emerald-500/10 border border-emerald-500/20 text-[#10b981] px-3 py-1.5 rounded-full">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                Sessão Ativa
              </div>
            </div>

            {/* Grid de Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Card Top Tracks */}
              <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-[#10b981]/10 text-[#10b981]">
                    <Music className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-lg text-white">Top 10 Músicas</h3>
                </div>

                <div className="space-y-3">
                  {topTracks.map((track, idx) => (
                    <div key={track.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition border border-transparent hover:border-white/5">
                      <span className="text-xs font-mono font-bold text-slate-500 w-4">{idx + 1}</span>
                      {track.album?.images?.[0]?.url && (
                        <img src={track.album.images[0].url} alt="Cover" className="w-10 h-10 rounded-xl object-cover" />
                      )}
                      <div className="overflow-hidden">
                        <p className="text-sm font-semibold text-white truncate">{track.name}</p>
                        <p className="text-xs text-slate-400 truncate">{track.artists.map(a => a.name).join(', ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Top Artists */}
              <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-[#00f0ff]/10 text-[#00f0ff]">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-lg text-white">Top 10 Artistas</h3>
                </div>

                <div className="space-y-3">
                  {topArtists.map((artist, idx) => (
                    <div key={artist.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition border border-transparent hover:border-white/5">
                      <span className="text-xs font-mono font-bold text-slate-500 w-4">{idx + 1}</span>
                      {artist.images?.[0]?.url && (
                        <img src={artist.images[0].url} alt="Artist" className="w-10 h-10 rounded-full object-cover" />
                      )}
                      <div className="overflow-hidden">
                        <p className="text-sm font-semibold text-white truncate">{artist.name}</p>
                        <p className="text-xs text-slate-400 capitalize">{artist.genres?.slice(0, 2).join(' • ') || 'Artist'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}
      </main>

      {/* Clean Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 text-center text-xs text-slate-500 font-medium">
        SPOTIFY OS © {new Date().getFullYear()} — Engineered with React, Three.js & Spotify Web API
      </footer>

    </div>
  );
}