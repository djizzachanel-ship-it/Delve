import React, { useState, useEffect } from 'react';
import { GameState, TownPlot, BuildingType } from '../types';
import { GameAction } from '../store';
import { 
  BUILDINGS_CONFIG, 
  calculatePassiveIncome, 
  getMaxDwellers, 
  getWatchtowerBonus,
  getForgeDwellerBonus 
} from '../game/townConfig';
import { BuildingPlotCard } from './BuildingPlotCard';
import { BuildNewModal } from './BuildNewModal';
import { BuildingDetailModal } from './BuildingDetailModal';
import { DwellersRosterModal } from './DwellersRosterModal';
import { SurfaceWorldView } from './SurfaceWorldView';
import { 
  Pickaxe, 
  Users, 
  Smile, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  Flame, 
  Hammer, 
  Coffee, 
  Shield, 
  ArrowDown, 
  Check, 
  UserPlus,
  Coins,
  Map
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sound } from '../game/audio';

interface TownTabProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  onStartExpedition: (depth: number, focus: 'ore' | 'metal' | 'shards') => void;
}

export function TownTab({ state, dispatch, onStartExpedition }: TownTabProps) {
  const [selectedDepth, setSelectedDepth] = useState(state.unlockedDepth || 0);
  const [selectedFocus, setSelectedFocus] = useState<'ore' | 'metal' | 'shards'>('ore');
  const [viewMode, setViewMode] = useState<'world' | 'overview'>('world');

  // Modals state
  const [buildPlotId, setBuildPlotId] = useState<number | null>(null);
  const [detailPlot, setDetailPlot] = useState<TownPlot | null>(null);
  const [relocatingPlot, setRelocatingPlot] = useState<TownPlot | null>(null);
  const [isDwellersOpen, setIsDwellersOpen] = useState(false);

  // Sync detailPlot if state changes (e.g. on upgrade or worker assignment)
  useEffect(() => {
    if (detailPlot && state.townPlots) {
      const updated = state.townPlots.find(p => p.id === detailPlot.id);
      if (updated && updated.buildingType) {
        setDetailPlot(updated);
      } else if (updated && !updated.buildingType) {
        setDetailPlot(null);
      }
    }
  }, [state.townPlots]);

  // Check dweller arrivals periodically
  useEffect(() => {
    const arrivalInterval = setInterval(() => {
      dispatch({ type: 'CHECK_DWELLER_ARRIVAL' });
    }, 20000);
    return () => clearInterval(arrivalInterval);
  }, [dispatch]);

  // Passive income ticker
  const [passiveLoot, setPassiveLoot] = useState(
    calculatePassiveIncome(state.town, state.lastCollectTime, Date.now(), state.townPlots, state.dwellers)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setPassiveLoot(
        calculatePassiveIncome(state.town, state.lastCollectTime, Date.now(), state.townPlots, state.dwellers)
      );
    }, 5000);
    return () => clearInterval(timer);
  }, [state.town, state.lastCollectTime, state.townPlots, state.dwellers]);

  const dwellers = state.dwellers || [];
  const candidates = state.candidateDwellers || [];
  const maxDwellers = getMaxDwellers(state.townPlots);
  const avgHappiness = dwellers.length > 0 
    ? Math.round(dwellers.reduce((s, d) => s + d.happiness, 0) / dwellers.length)
    : 100;

  const handleCollectPassive = () => {
    if (passiveLoot.ore > 0 || passiveLoot.metal > 0 || passiveLoot.shards > 0) {
      sound.playLoot();
      dispatch({ type: 'COLLECT_PASSIVE' });
      setPassiveLoot(calculatePassiveIncome(state.town, Date.now(), Date.now(), state.townPlots, state.dwellers));
    }
  };

  const handleBuild = (plotId: number, buildingType: BuildingType) => {
    dispatch({ type: 'BUILD_ON_PLOT', plotId, buildingType });
  };

  const handleAcceptFirstCandidate = () => {
    if (candidates.length === 0) return;
    if (dwellers.length >= maxDwellers) {
      alert('В городке не хватает спальных мест! Улучшите Бараки для расширения вместимости.');
      return;
    }
    sound.playLevelUp();
    dispatch({ type: 'ACCEPT_DWELLER', dwellerId: candidates[0].id });
  };

  // Combat bonuses from watchtower
  const towerBonus = getWatchtowerBonus(state.townPlots, state.dwellers);

  return (
    <div className="flex flex-col h-full bg-[#080d19] text-slate-100 overflow-y-auto pb-10 select-none">
      
      {/* ================= STICKY TOP BAR: RESOURCES & TOWN STATS ================= */}
      <div className="p-3.5 bg-[#0e1424] border-b border-slate-800 shadow-md sticky top-0 z-20 backdrop-blur-md">
        {/* Resource Chips */}
        <div className="grid grid-cols-3 gap-2 text-center mb-2.5">
          <div className="bg-slate-900/90 rounded-xl p-2 border border-slate-800 shadow-inner flex items-center justify-between px-3">
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
              ⛏️ Руда
            </span>
            <span className="font-mono text-base font-black text-amber-300">{state.resources.ore}</span>
          </div>

          <div className="bg-slate-900/90 rounded-xl p-2 border border-slate-800 shadow-inner flex items-center justify-between px-3">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
              🔩 Металл
            </span>
            <span className="font-mono text-base font-black text-slate-200">{state.resources.metal}</span>
          </div>

          <div className="bg-slate-900/90 rounded-xl p-2 border border-slate-800 shadow-inner flex items-center justify-between px-3">
            <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider flex items-center gap-1">
              💎 Осколки
            </span>
            <span className="font-mono text-base font-black text-sky-300">{state.resources.shards}</span>
          </div>
        </div>

        {/* Town Name & Population Header */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-black text-slate-100 uppercase tracking-widest flex items-center gap-1.5">
              <span>⛰️</span> Каменные Уступы
            </h2>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
              <span className="flex items-center gap-1">
                <Smile size={12} className="text-emerald-400" />
                <strong className="text-emerald-400">{avgHappiness}%</strong>
              </span>
              <span>•</span>
              <span>Зданий: {(state.townPlots || []).filter(p => p.buildingType !== null).length}</span>
            </div>
          </div>

          {/* View mode switcher and Dwellers button */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5">
              <button
                onClick={() => setViewMode('world')}
                className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  viewMode === 'world'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Изометрический 3D Мир (Поверхность)"
              >
                <Map size={13} />
                <span>Мир</span>
              </button>
              <button
                onClick={() => setViewMode('overview')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'overview'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Карточки построек"
              >
                Список
              </button>
            </div>

            {/* Dwellers button */}
            <button
              onClick={() => setIsDwellersOpen(true)}
              className="py-1 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 shadow transition-all active:scale-95"
            >
              <Users size={13} className="text-amber-400" />
              <span className="font-mono text-amber-300 font-black">{dwellers.length}/{maxDwellers}</span>
              {candidates.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ================= PASSIVE INCOME BAR ================= */}
      {(passiveLoot.ore > 0 || passiveLoot.metal > 0 || passiveLoot.shards > 0) && (
        <div className="mx-3.5 mt-2 p-2.5 rounded-xl bg-gradient-to-r from-amber-950/70 to-slate-900 border border-amber-500/40 flex items-center justify-between gap-2 shadow-lg animate-pulse z-10 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Coins size={18} className="text-amber-400 flex-shrink-0" />
            <div className="text-xs truncate">
              <span className="text-slate-300">Накоплена добыча: </span>
              <strong className="text-amber-300 font-mono">
                {passiveLoot.ore > 0 && `+${passiveLoot.ore} руды `}
                {passiveLoot.metal > 0 && `+${passiveLoot.metal} металла `}
                {passiveLoot.shards > 0 && `+${passiveLoot.shards} оск.`}
              </strong>
            </div>
          </div>
          <button
            onClick={handleCollectPassive}
            className="py-1 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs shadow flex-shrink-0 transition-transform active:scale-95 cursor-pointer"
          >
            Собрать
          </button>
        </div>
      )}

      {/* ================= AT TOWN GATES: CANDIDATE ARRIVAL BANNER ================= */}
      {candidates.length > 0 && (
        <div className="mx-3.5 mt-2 p-2.5 rounded-2xl bg-amber-950/40 border border-amber-500/50 flex items-center justify-between gap-2.5 shadow-lg backdrop-blur-sm z-10 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-900/60 border border-amber-500/60 flex items-center justify-center text-lg flex-shrink-0 shadow-inner">
              {candidates[0].avatar}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-black text-amber-300 flex items-center gap-1 truncate">
                <UserPlus size={12} /> У ворот странник: {candidates[0].name}
              </div>
              <div className="text-[10px] text-slate-400 truncate">{candidates[0].title}</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleAcceptFirstCandidate}
              className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow flex items-center gap-1 transition-colors"
            >
              <Check size={13} /> Принять
            </button>
            <button
              onClick={() => setIsDwellersOpen(true)}
              className="py-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-colors"
            >
              Все ({candidates.length})
            </button>
          </div>
        </div>
      )}

      {/* ================= PRIMARY CONTENT AREA ================= */}
      {viewMode === 'world' ? (
        <div className="flex-1 w-full h-full min-h-0 relative overflow-hidden flex flex-col">
          <SurfaceWorldView
            state={state}
            dispatch={dispatch}
            relocatingPlot={relocatingPlot}
            onClearRelocate={() => setRelocatingPlot(null)}
            onOpenPlot={(plot) => setDetailPlot(plot)}
            onOpenDwellers={() => setIsDwellersOpen(true)}
            onStartExpedition={onStartExpedition}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pb-10 space-y-3">
          {/* Section Title with Shelter Atmosphere */}
          <div className="px-3.5 pt-2 flex items-center justify-between">
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>🏘️</span> Здания и постройки
            </span>
            <span className="text-[10px] text-slate-500">Кликните на здание для управления</span>
          </div>

          {/* 2-Column Visual Plot Grid */}
          <div className="grid grid-cols-2 gap-2.5 px-3.5">
            {(state.townPlots || []).map((plot) => (
              <BuildingPlotCard
                key={plot.id}
                plot={plot}
                dwellers={state.dwellers || []}
                onOpenPlot={(p) => setDetailPlot(p)}
                onOpenBuild={(id) => setBuildPlotId(id)}
              />
            ))}
          </div>

          {/* Expedition launcher card in overview mode */}
          <div className="mx-3.5 mt-2 p-4 rounded-2xl bg-gradient-to-b from-slate-900 via-[#0a0f1d] to-[#060913] border border-slate-800 shadow-xl space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Pickaxe size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-100 uppercase tracking-wider">
                    Шахтный ствол
                  </h3>
                  <p className="text-[10px] text-slate-400">Спуск в подземные горизонты</p>
                </div>
              </div>

              {state.activeTownBuff && (
                <div className="text-[10px] bg-amber-950/70 border border-amber-500/40 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                  🍲 {state.activeTownBuff.name}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                sound.playHit();
                onStartExpedition(selectedDepth, selectedFocus);
              }}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all active:scale-98 cursor-pointer"
            >
              <Pickaxe size={18} />
              <span>Спуститься в шахту</span>
              <ArrowDown size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ================= MODALS ================= */}

      {/* 1. Build New Building Modal */}
      {buildPlotId !== null && (
        <BuildNewModal
          plotId={buildPlotId}
          resources={state.resources}
          onBuild={handleBuild}
          onClose={() => setBuildPlotId(null)}
        />
      )}

      {/* 2. Building Detail & Management Modal (Crafting, Smelting, Upgrades, Workers) */}
      {detailPlot && (
        <BuildingDetailModal
          plot={detailPlot}
          state={state}
          dispatch={dispatch}
          onRelocatePlot={(p) => {
            setDetailPlot(null);
            setViewMode('world');
            setRelocatingPlot(p);
          }}
          onClose={() => setDetailPlot(null)}
        />
      )}

      {/* 3. Dwellers Roster Modal */}
      {isDwellersOpen && (
        <DwellersRosterModal
          state={state}
          dispatch={dispatch}
          onClose={() => setIsDwellersOpen(false)}
        />
      )}

    </div>
  );
}
