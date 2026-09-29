/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useReducer, useState, useEffect } from 'react';
import { gameReducer, initialState, saveStateToStorage } from './store';
import { MineTab } from './components/MineTab';
import { TownTab } from './components/TownTab';
import { HeroScreen } from './components/HeroScreen';
import { ThemeStudioModal } from './components/ThemeStudioModal';
import { Pickaxe, Home, User, Volume2, VolumeX, Palette, RotateCcw, Settings, Check, AlertTriangle, Save, X } from 'lucide-react';
import { sound } from './game/audio';
import { useTheme } from './theme';

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [activeTab, setActiveTab] = useState<'town' | 'mine' | 'character'>('town');
  const [isAudioEnabled, setIsAudioEnabled] = useState(sound.enabled);
  const [isThemeStudioOpen, setIsThemeStudioOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const { theme } = useTheme();
  
  const [autoStartTrigger, setAutoStartTrigger] = useState<{
    depth: number;
    focus: 'ore' | 'metal' | 'shards';
    timestamp: number;
  } | null>(null);

  // 1. Auto-save every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      saveStateToStorage(state);
    }, 4000);
    return () => clearInterval(interval);
  }, [state]);

  // 2. Save on window unload, tab hide, and visibility change
  useEffect(() => {
    const handleSave = () => {
      saveStateToStorage(state);
    };

    window.addEventListener('beforeunload', handleSave);
    window.addEventListener('pagehide', handleSave);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        handleSave();
      }
    });

    return () => {
      window.removeEventListener('beforeunload', handleSave);
      window.removeEventListener('pagehide', handleSave);
    };
  }, [state]);

  const handleManualSave = () => {
    saveStateToStorage(state);
    dispatch({ type: 'SAVE_GAME' });
    sound.playClick();
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  const handleResetGame = () => {
    sound.playClick();
    dispatch({ type: 'RESET_GAME' });
    setShowResetConfirm(false);
    setIsSettingsOpen(false);
    setActiveTab('town');
  };

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
        
        {/* Subtle global controls on top-right */}
        <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5">
          {/* Quick Manual Save indicator / button */}
          <button
            onClick={handleManualSave}
            className={`p-2 rounded-full border backdrop-blur-md transition-all shadow-sm cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center ${
              savedFeedback 
                ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300' 
                : 'bg-slate-900/80 border-slate-700/80 text-slate-300 hover:text-white'
            }`}
            title="Сохранить игру"
          >
            {savedFeedback ? <Check size={16} /> : <Save size={16} />}
          </button>

          {/* Theme & Asset Studio Button */}
          <button
            onClick={() => { sound.play('click'); setIsThemeStudioOpen(true); }}
            className="p-2 rounded-full bg-slate-900/80 border border-amber-500/40 text-amber-300 hover:text-amber-200 hover:bg-slate-800 backdrop-blur-md transition-all shadow-sm cursor-pointer hover:scale-105 active:scale-95"
            title="Стили оформления & Реестр ассетов"
          >
            <Palette size={16} />
          </button>

          {/* Global Settings & Reset Button */}
          <button
            onClick={() => { sound.play('click'); setIsSettingsOpen(true); }}
            className="p-2 rounded-full bg-slate-900/70 border border-slate-800/80 text-slate-400 hover:text-white backdrop-blur-md transition-colors cursor-pointer hover:scale-105 active:scale-95"
            title="Настройки & Новая игра"
          >
            <Settings size={16} />
          </button>

          {/* Global audio toggle */}
          <button
            onClick={handleToggleAudio}
            className="p-2 rounded-full bg-slate-900/70 border border-slate-800/80 text-slate-400 hover:text-white backdrop-blur-md transition-colors cursor-pointer hover:scale-105 active:scale-95"
            title={isAudioEnabled ? 'Выключить звук' : 'Включить звук'}
          >
            {isAudioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>

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
            <HeroScreen 
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

        {/* Settings & Game Management Modal */}
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
            <div className="w-full max-w-sm bg-[#0e1424] border border-slate-700/80 rounded-3xl shadow-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-slate-100 font-black text-sm uppercase tracking-wider">
                  <Settings size={18} className="text-amber-400" />
                  <span>Настройки & Сохранение</span>
                </div>
                <button
                  onClick={() => { setIsSettingsOpen(false); setShowResetConfirm(false); }}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Status info */}
              <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Статус сохранения:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Check size={13} /> Автосохранение активно
                  </span>
                </div>
                <div className="flex justify-between text-slate-400 font-mono text-[11px]">
                  <span>Глубина шахты:</span>
                  <span className="text-amber-300 font-bold">{state.depth} м (Открыто: {state.unlockedDepth} м)</span>
                </div>
                <div className="flex justify-between text-slate-400 font-mono text-[11px]">
                  <span>Жителей в поселении:</span>
                  <span className="text-cyan-300 font-bold">{state.dwellers?.length || 0}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-2">
                <button
                  onClick={handleManualSave}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
                >
                  <Save size={15} className="text-emerald-400" />
                  <span>Сохранить игру сейчас</span>
                </button>

                {!showResetConfirm ? (
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    className="w-full py-2.5 px-4 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
                  >
                    <RotateCcw size={15} />
                    <span>Начать новую игру (Сброс)</span>
                  </button>
                ) : (
                  <div className="p-3 bg-rose-950/60 border border-rose-600 rounded-2xl space-y-2.5 animate-fadeIn">
                    <div className="flex items-center gap-2 text-rose-200 text-xs font-bold">
                      <AlertTriangle size={16} className="text-rose-400 flex-shrink-0" />
                      <span>Вы точно хотите начать заново?</span>
                    </div>
                    <p className="text-[11px] text-rose-300 leading-snug">
                      Весь накопленный прогресс, здания, экипировка и ресурсы будут сброшены до начального состояния.
                    </p>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleResetGame}
                        className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition cursor-pointer shadow active:scale-95"
                      >
                        Да, начать заново
                      </button>
                      <button
                        onClick={() => setShowResetConfirm(false)}
                        className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Theme & Asset Studio Modal */}
        <ThemeStudioModal 
          isOpen={isThemeStudioOpen} 
          onClose={() => setIsThemeStudioOpen(false)} 
        />
      </div>
    </div>
  );
}
