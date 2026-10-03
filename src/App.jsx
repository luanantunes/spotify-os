import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Play, Pause, SkipForward, SkipBack, Music, Terminal } from 'lucide-react';
import { Vinyl3D } from './components/3d/Vinyl3D.jsx';

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [track] = useState({
    title: "CYBERPUNK_SYNTH_WAVE.WAV",
    artist: "NEXUS CORE",
    progress: 42
  });

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
          <OrbitControls enableZoom={false} enablePan={false} />
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
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyber-neonGreen animate-pulse"></span>
            SYSTEM ONLINE
          </span>
          <span className="border border-cyber-border px-2 py-1 rounded bg-black/40">
            RARITY: EPIC
          </span>
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
          <div className="text-center space-y-1">
            <p className="text-xs text-cyber-cyan tracking-wider uppercase font-semibold">TOCANDO AGORA</p>
            <h2 className="text-lg font-bold text-white truncate">{track.title}</h2>
            <p className="text-xs text-slate-400">{track.artist}</p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-cyber-border">
              <div 
                className="bg-gradient-to-r from-cyber-cyan to-cyber-neonGreen h-full transition-all duration-300"
                style={{ width: `${track.progress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>01:12</span>
              <span>03:45</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-6">
            <button className="text-slate-400 hover:text-white transition">
              <SkipBack className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
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
      <footer className="relative z-10 flex justify-between items-center text-[10px] text-slate-500 border-t border-cyber-border/40 pt-3">
        <span>STATUS: IN DEVELOPMENT (35%)</span>
        <span>CONNECTED TO SPOTIFY API</span>
      </footer>

    </div>
  );
}