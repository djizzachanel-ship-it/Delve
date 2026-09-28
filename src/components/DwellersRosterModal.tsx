import React, { useState, useEffect } from 'react';
import { GameState, TownPlot } from '../types';
import { GameAction } from '../store';
import { Dweller } from '../game/dwellers';
import { DwellerCard } from './DwellerCard';
import { getMaxDwellers } from '../game/townConfig';
import { Users, X, UserPlus, Smile, Sparkles, Home, Briefcase, ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { sound } from '../game/audio';

interface DwellersRosterModalProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  onClose: () => void;
}

export function DwellersRosterModal({ state, dispatch, onClose }: DwellersRosterModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const [filter, setFilter] = useState<'all' | 'working' | 'resting'>('all');

  const dwellers = state.dwellers || [];
  const candidates = state.candidateDwellers || [];
  const maxLimit = getMaxDwellers(state.townPlots);

  const avgHappiness = dwellers.length > 0 
    ? Math.round(dwellers.reduce((sum, d) => sum + d.happiness, 0) / dwellers.length)
    : 100;

  const filteredDwellers = dwellers.filter(d => {
    if (filter === 'working') return d.assignedPlotId !== null;
    if (filter === 'resting') return d.assignedPlotId === null;
    return true;
  });

  const handleAssign = (dwellerId: string, plotId: number | null) => {
    dispatch({ type: 'ASSIGN_DWELLER', dwellerId, plotId });
    sound.playHit();
  };

  const handleAccept = (dwellerId: string) => {
    if (dwellers.length >= maxLimit) return;
    dispatch({ type: 'ACCEPT_DWELLER', dwellerId });
    sound.playLevelUp();
  };

  const handleDismiss = (dwellerId: string) => {
    dispatch({ type: 'DISMISS_CANDIDATE', dwellerId });
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#0b0f19] border border-slate-800 rounded-2xl flex flex-col max-h-[92vh] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
              <span>В городок</span>
            </button>
            <div className="flex items-center gap-1.5">
              <Users size={16} className="text-amber-400" />
              <h3 className="text-xs font-black text-slate-100 uppercase tracking-wider">
                Жители ({dwellers.length}/{maxLimit})
              </h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Закрыть (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Town Stats Bar */}
        <div className="px-4 py-2.5 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Users size={14} className="text-amber-400" />
            <span>Население:</span>
            <strong className="font-mono text-amber-300 font-bold">{dwellers.length} / {maxLimit}</strong>
          </div>

          <div className="flex items-center gap-1.5 text-slate-300">
            <Smile size={14} className="text-emerald-400" />
            <span>Настроение:</span>
            <strong className="font-mono text-emerald-400 font-bold">{avgHappiness}%</strong>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 p-1.5 gap-1 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
              filter === 'all' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Все ({dwellers.length})
          </button>
          <button
            onClick={() => setFilter('working')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
              filter === 'working' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            На работе ({dwellers.filter(d => d.assignedPlotId !== null).length})
          </button>
          <button
            onClick={() => setFilter('resting')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
              filter === 'resting' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            В бараках ({dwellers.filter(d => d.assignedPlotId === null).length})
          </button>
        </div>

        {/* Dwellers List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {/* Candidates waiting at the gate */}
          {candidates.length > 0 && (
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <UserPlus size={14} /> У ворот городка ({candidates.length})
              </div>
              {candidates.map(candidate => (
                <DwellerCard
                  key={candidate.id}
                  dweller={candidate}
                  isCandidate={true}
                  onAcceptCandidate={handleAccept}
                  onDismissCandidate={handleDismiss}
                />
              ))}
            </div>
          )}

          {/* Regular town dwellers */}
          <div className="space-y-2.5">
            {filteredDwellers.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 border border-slate-800 rounded-xl">
                В этой категории нет жителей.
              </div>
            ) : (
              filteredDwellers.map(dweller => (
                <DwellerCard
                  key={dweller.id}
                  dweller={dweller}
                  plots={state.townPlots || []}
                  onAssign={handleAssign}
                />
              ))
            )}
          </div>
        </div>

        {/* Footer Back Button */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-center z-10">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow"
          >
            <ChevronLeft size={16} />
            <span>Вернуться к карте городка</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
