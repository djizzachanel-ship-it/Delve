/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useReducer, useState } from 'react';
import { gameReducer, initialState } from './store';
import { MineTab } from './components/MineTab';
import { TownTab } from './components/TownTab';
import { CharacterTab } from './components/CharacterTab';
import { Pickaxe, Home, User, Volume2, VolumeX } from 'lucide-react';
import { sound } from './game/audio';

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [activeTab, setActiveTab] = useState<'town' | 'mine' | 'character'>('town');
  const [isAudioEnabled, setIsAudioEnabled] = useState(sound.enabled);
  
  const [autoStartTrigger, setAutoStartTrigger] = useState<{
    depth: number;
    focus: 'ore' | 'metal' | 'shards';
    timestamp: number;
  } | null>(null);

  const handleStartExpedition = (depth: number, focus: 'ore' | 'metal' | 'shards') => {
    setAutoStartTrigger({ depth, focus, timestamp: Date.now() });
    setActiveTab('mine');
  };

  const handleToggleAudio = () => {
    const next = sound.toggleMute();
    setIsAudioEnabled(next);
  };

  return (
    <div className="flex justify-center bg-black min-h-screen">
      <div className="w-full max-w-md bg-[#0a0f1d] shadow-[0_0_50px_rgba(0,0,0,1)] overflow-hidden flex flex-col relative h-[100dvh]">
        
        {/* Subtle global audio toggle on top-right */}
        <button
          onClick={handleToggleAudio}
          className="absolute top-3 right-3 z-30 p-2 rounded-full bg-slate-900/70 border border-slate-800/80 text-slate-400 hover:text-white backdrop-blur-md transition-colors"
          title={isAudioEnabled ? 'Выключить звук' : 'Включить звук'}
        >
          {isAudioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden relative">
          <div className={`absolute inset-0 transition-opacity duration-200 ${activeTab === 'town' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
            <TownTab 
              state={state} 
              dispatch={dispatch} 
              onStartExpedition={handleStartExpedition} 
            />
          </div>
          
          <div className={`absolute inset-0 transition-opacity duration-200 ${activeTab === 'mine' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
            <MineTab 
              state={state} 
              dispatch={dispatch} 
              isActive={activeTab === 'mine'} 
              onReturnToTown={() => setActiveTab('town')}
              autoStartTrigger={autoStartTrigger}
            />
          </div>
          
          <div className={`absolute inset-0 transition-opacity duration-200 ${activeTab === 'character' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
            <CharacterTab 
              state={state} 
              dispatch={dispatch} 
              onGoToTown={() => setActiveTab('town')} 
            />
          </div>
        </div>

        {/* Bottom Navigation (Optimized for Mobile & Telegram MiniApp) */}
        <nav className="bg-[#080d1a] border-t border-slate-800 flex justify-around p-2.5 pb-safe z-20 shadow-[0_-10px_25px_rgba(0,0,0,0.7)]">
          {/* Surface Town */}
          <button 
            onClick={() => setActiveTab('town')}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all flex-1 ${activeTab === 'town' ? 'text-amber-300 bg-amber-950/40 border border-amber-500/30' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Home size={22} />
            <span className="text-[10px] font-black tracking-widest uppercase">Городок</span>
          </button>

          {/* Underground Mine */}
          <button 
            onClick={() => setActiveTab('mine')}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all flex-1 ${activeTab === 'mine' ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-500/30' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Pickaxe size={22} />
            <span className="text-[10px] font-black tracking-widest uppercase">Шахта</span>
          </button>

          {/* Hero & Gear */}
          <button 
            onClick={() => setActiveTab('character')}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all flex-1 relative ${activeTab === 'character' ? 'text-indigo-400 bg-indigo-950/40 border border-indigo-500/30' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <User size={22} />
            <span className="text-[10px] font-black tracking-widest uppercase">Герой</span>
            {/* Notification badge for unequipped items */}
            {state.inventory.length > 0 && activeTab !== 'character' && (
              <span className="absolute top-1.5 right-6 w-2.5 h-2.5 bg-rose-500 rounded-full border border-black shadow" />
            )}
          </button>
        </nav>
      </div>
    </div>
  );
}
