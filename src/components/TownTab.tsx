import React, { useState, useEffect, useRef } from 'react';
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
import { TownHallModal } from './TownHallModal';
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
  Map,
  Bell,
  Landmark,
  X,
  Settings,
  Layers,
  Crosshair,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sound } from '../game/audio';

export interface TownTabProps {
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
  const [townHallPlot, setTownHallPlot] = useState<TownPlot | null>(null);
  const [relocatingPlot, setRelocatingPlot] = useState<TownPlot | null>(null);
  const [isDwellersOpen, setIsDwellersOpen] = useState(false);
  const [externalPlacementType, setExternalPlacementType] = useState<BuildingType | null>(null);

  // Events Notification Dropdown Widget
  const [isEventsOpen, setIsEventsOpen] = useState(false);
  const eventsRef = useRef<HTMLDivElement>(null);

  // Sync detailPlot and townHallPlot if state changes
  useEffect(() => {
    if (detailPlot && state.townPlots) {
      const updated = state.townPlots.find(p => p.id === detailPlot.id);
      if (updated && updated.buildingType) {
        setDetailPlot(updated);
      } else if (updated && !updated.buildingType) {
        setDetailPlot(null);
      }
    }
    if (townHallPlot && state.townPlots) {
      const updated = state.townPlots.find(p => p.id === townHallPlot.id);
      if (updated) {
        setTownHallPlot(updated);
      }
    }
  }, [state.townPlots]);

  // Close events dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (eventsRef.current && !eventsRef.current.contains(e.target as Node)) {
        setIsEventsOpen(false);
      }
    };
    if (isEventsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEventsOpen]);

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

  // Active Town Hall plot in state
  const currentTownHall = (state.townPlots || []).find(p => p.buildingType === 'town_hall') || (state.townPlots || [])[0];

  // Accumulated passive income check
  const hasPassiveLoot = passiveLoot.ore > 0 || passiveLoot.metal > 0 || passiveLoot.shards > 0;
  const totalEventsCount = (hasPassiveLoot ? 1 : 0) + candidates.length;

  const handleCollectPassive = () => {
    if (hasPassiveLoot) {
      sound.playLoot();
      dispatch({ type: 'COLLECT_PASSIVE' });
      setPassiveLoot(calculatePassiveIncome(state.town, Date.now(), Date.now(), state.townPlots, state.dwellers));
    }
  };

  const handleBuild = (plotId: number, buildingType: BuildingType) => {
    dispatch({ type: 'BUILD_ON_PLOT', plotId, buildingType });
  };

  const handleAcceptCandidate = (candidateId: string) => {
    if (dwellers.length >= maxDwellers) {
      alert('В городке не хватает спальных мест! Улучшите Бараки для расширения вместимости.');
      return;
    }
    sound.playLevelUp();
    dispatch({ type: 'ACCEPT_DWELLER', dwellerId: candidateId });
  };

  const handleDismissCandidate = (candidateId: string) => {
    sound.playClick();
    dispatch({ type: 'DISMISS_CANDIDATE', dwellerId: candidateId });
  };

  const handleOpenTownHall = () => {
    sound.playClick();
    if (currentTownHall) {
      setTownHallPlot(currentTownHall);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#080d19] text-slate-100 overflow-hidden select-none relative">
      
      {/* ================= FIXED SEMI-TRANSPARENT TOP BAR ================= */}
      <header className="px-3.5 py-2.5 bg-[#090e1c]/85 border-b border-slate-800/80 shadow-md sticky top-0 z-30 backdrop-blur-md flex items-center justify-between gap-2 flex-shrink-0">
        
        {/* Left: Settlement Branding & Town Hall Quick-Action */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={handleOpenTownHall}
            className="flex items-center gap-2 p-1.5 px-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 to-slate-900 border border-amber-500/40 hover:border-amber-400 text-left transition-all active:scale-95 cursor-pointer shadow-sm group"
            title="Открыть Ратушу (Чертог Старейшин): Градостроительство и Развитие"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform flex-shrink-0">
              <Landmark size={15} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black text-slate-100 flex items-center gap-1 leading-tight truncate">
                <span className="text-amber-400">Ратуша</span>
                <span className="text-[10px] text-amber-300 font-mono font-bold bg-amber-950/80 border border-amber-500/30 px-1 rounded">
                  Ур.{currentTownHall?.level || 1}
                </span>
              </div>
              <div className="text-[9.5px] text-slate-400 truncate">
                Каменные Уступы
              </div>
            </div>
          </button>

          {/* Clean Top Resources (Ore, Metal, Shards) without pill enclosures */}
          <div className="hidden sm:flex items-center gap-3 pl-1 border-l border-slate-800/80">
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="text-amber-400 text-sm">⛏️</span>
              <span className="font-black text-amber-300">{state.resources.ore}</span>
            </div>
            <span className="text-slate-600">·</span>
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="text-slate-400 text-sm">🔩</span>
              <span className="font-black text-slate-200">{state.resources.metal}</span>
            </div>
            <span className="text-slate-600">·</span>
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="text-sky-400 text-sm">💎</span>
              <span className="font-black text-sky-300">{state.resources.shards}</span>
            </div>
          </div>
        </div>

        {/* Mobile Compact Resources */}
        <div className="flex sm:hidden items-center gap-2 font-mono text-xs">
          <span className="text-amber-300 font-black flex items-center gap-0.5">
            <span className="text-[11px]">⛏️</span>{state.resources.ore}
          </span>
          <span className="text-slate-200 font-black flex items-center gap-0.5">
            <span className="text-[11px]">🔩</span>{state.resources.metal}
          </span>
          <span className="text-sky-300 font-black flex items-center gap-0.5">
            <span className="text-[11px]">💎</span>{state.resources.shards}
          </span>
        </div>

        {/* Right: Population Status, Consolidated Events Bell, Mode Switcher */}
        <div className="flex items-center gap-2 flex-shrink-0">
          
          {/* Residents Status Button */}
          <button
            onClick={() => setIsDwellersOpen(true)}
            className="p-1.5 px-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
            title="Список жителей и рабочие места"
          >
            <Users size={13} className="text-amber-400" />
            <span className="font-mono text-amber-300 font-black">
              {dwellers.length}/{maxDwellers}
            </span>
            <span className="hidden md:inline-flex items-center gap-0.5 text-[10px] text-emerald-400 font-semibold ml-0.5">
              <Smile size={11} /> {avgHappiness}%
            </span>
          </button>

          {/* Consolidated Floating Events Bell Widget */}
          <div className="relative" ref={eventsRef}>
            <button
              onClick={() => {
                sound.playClick();
                setIsEventsOpen(prev => !prev);
              }}
              className={`p-2 rounded-xl border backdrop-blur-md transition-all relative cursor-pointer ${
                totalEventsCount > 0
                  ? 'bg-amber-950/60 border-amber-500/50 text-amber-300 hover:bg-amber-900/70 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title={totalEventsCount > 0 ? `События городка (${totalEventsCount})` : 'Событий нет'}
            >
              <Bell size={16} className={totalEventsCount > 0 ? 'animate-bounce' : ''} />
              {totalEventsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 bg-amber-500 text-slate-950 font-mono text-[10px] font-black rounded-full flex items-center justify-center shadow-lg ring-2 ring-slate-950">
                  {totalEventsCount}
                </span>
              )}
            </button>

            {/* Events Dropdown Menu */}
            <AnimatePresence>
              {isEventsOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 8 }}
                  className="absolute right-0 top-11 w-80 max-w-[90vw] p-3 bg-slate-950/95 border border-slate-700 rounded-2xl shadow-2xl backdrop-blur-xl z-50 flex flex-col gap-2.5"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Bell size={13} className="text-amber-400" />
                      События и Вести городка
                    </span>
                    <button
                      onClick={() => setIsEventsOpen(false)}
                      className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
                    {/* 1. Passive Loot Event */}
                    {hasPassiveLoot && (
                      <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-950/60 to-slate-900 border border-amber-500/40 flex items-center justify-between gap-2 shadow">
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                            <Coins size={14} className="text-amber-400 flex-shrink-0" />
                            <span>Накоплена добыча</span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-300 mt-0.5 truncate">
                            {passiveLoot.ore > 0 && `+${passiveLoot.ore} руды `}
                            {passiveLoot.metal > 0 && `+${passiveLoot.metal} металла `}
                            {passiveLoot.shards > 0 && `+${passiveLoot.shards} оск.`}
                          </div>
                        </div>

                        <button
                          onClick={handleCollectPassive}
                          className="py-1 px-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs shadow transition-transform active:scale-95 cursor-pointer flex-shrink-0"
                        >
                          Собрать
                        </button>
                      </div>
                    )}

                    {/* 2. Candidate Dwellers Events */}
                    {candidates.map((cand) => (
                      <div 
                        key={cand.id}
                        className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2 shadow"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-amber-900/40 border border-amber-500/40 flex items-center justify-center text-base flex-shrink-0">
                            {cand.avatar}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-black text-slate-200 truncate">
                              {cand.name}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {cand.title} • {cand.rarity === 'legendary' ? 'Легендарный' : cand.rarity === 'rare' ? 'Редкий' : 'Обычный'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleAcceptCandidate(cand.id)}
                            className="p-1 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow transition-colors cursor-pointer"
                            title="Принять в городок"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            onClick={() => handleDismissCandidate(cand.id)}
                            className="p-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 rounded-lg text-xs transition-colors cursor-pointer"
                            title="Отпустить"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Empty State */}
                    {totalEventsCount === 0 && (
                      <div className="p-4 text-center text-slate-500 text-xs">
                        🌿 В городке всё спокойно. Жители трудятся, а дозорные несут службу.
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* View Mode Toggle: World View / Overview Cards */}
          <div className="hidden md:flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('world')}
              className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'world'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Изометрический 3D Мир (Поверхность)"
            >
              <Map size={13} />
              <span>Карта</span>
            </button>
            <button
              onClick={() => setViewMode('overview')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'overview'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Карточки построек"
            >
              Список
            </button>
          </div>

        </div>
      </header>

      {/* ================= PRIMARY CONTENT AREA (100% REMAINING HEIGHT) ================= */}
      {viewMode === 'world' ? (
        <div className="flex-1 w-full h-full relative overflow-hidden flex flex-col min-h-0">
          <SurfaceWorldView
            state={state}
            dispatch={dispatch}
            relocatingPlot={relocatingPlot}
            onClearRelocate={() => setRelocatingPlot(null)}
            onOpenPlot={(plot) => {
              if (plot.buildingType === 'town_hall') {
                setTownHallPlot(plot);
              } else {
                setDetailPlot(plot);
              }
            }}
            onOpenTownHall={(plot) => setTownHallPlot(plot)}
            onOpenDwellers={() => setIsDwellersOpen(true)}
            onStartExpedition={onStartExpedition}
            externalPlacementType={externalPlacementType}
            onClearPlacement={() => setExternalPlacementType(null)}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pb-12 space-y-3">
          {/* Overview List Header */}
          <div className="px-3.5 pt-3 flex items-center justify-between">
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>🏘️</span> Здания и постройки
            </span>
            <span className="text-[10px] text-slate-500">
              Построено: {(state.townPlots || []).filter(p => p.buildingType !== null).length}
            </span>
          </div>

          {/* 2-Column Plot Grid Cards */}
          <div className="grid grid-cols-2 gap-2.5 px-3.5">
            {(state.townPlots || []).map((plot) => (
              <BuildingPlotCard
                key={plot.id}
                plot={plot}
                dwellers={state.dwellers || []}
                onOpenPlot={(p) => {
                  if (p.buildingType === 'town_hall') {
                    setTownHallPlot(p);
                  } else {
                    setDetailPlot(p);
                  }
                }}
                onOpenBuild={(id) => setBuildPlotId(id)}
              />
            ))}
          </div>

          {/* Expedition Launcher Card */}
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

      {/* 1. Town Hall "Строительство и Развитие" Modal */}
      {townHallPlot && (
        <TownHallModal
          plot={townHallPlot}
          state={state}
          dispatch={dispatch}
          onStartPlacement={(type) => {
            setTownHallPlot(null);
            setViewMode('world');
            setExternalPlacementType(type);
          }}
          onOpenDwellersRoster={() => {
            setTownHallPlot(null);
            setIsDwellersOpen(true);
          }}
          onClose={() => setTownHallPlot(null)}
        />
      )}

      {/* 2. Individual Building Detail & Management Modal */}
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

      {/* 3. Build New Plot Modal (legacy / fallback) */}
      {buildPlotId !== null && (
        <BuildNewModal
          plotId={buildPlotId}
          resources={state.resources}
          onBuild={handleBuild}
          onClose={() => setBuildPlotId(null)}
        />
      )}

      {/* 4. Dwellers Roster Modal */}
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

// Re-export as TownScreen for backward compatibility and clean nomenclature
export { TownTab as TownScreen };
