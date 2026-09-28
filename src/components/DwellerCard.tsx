import React from 'react';
import { Dweller, DwellerRarity } from '../game/dwellers';
import { TownPlot, BuildingType } from '../types';
import { BUILDINGS_CONFIG } from '../game/townConfig';
import { 
  BicepsFlexed, 
  Pickaxe, 
  Flame, 
  HeartHandshake, 
  ShieldAlert, 
  Briefcase, 
  Home, 
  Check, 
  X, 
  Smile, 
  Sparkles 
} from 'lucide-react';

interface DwellerCardProps {
  key?: React.Key;
  dweller: Dweller;
  plots?: TownPlot[];
  onAssign?: (dwellerId: string, plotId: number | null) => void;
  onAcceptCandidate?: (dwellerId: string) => void;
  onDismissCandidate?: (dwellerId: string) => void;
  isCandidate?: boolean;
}

export function DwellerCard({
  dweller,
  plots = [],
  onAssign,
  onAcceptCandidate,
  onDismissCandidate,
  isCandidate = false
}: DwellerCardProps) {
  const currentPlot = plots.find(p => p.id === dweller.assignedPlotId);
  const currentBuilding = currentPlot?.buildingType ? BUILDINGS_CONFIG[currentPlot.buildingType] : null;

  const rarityStyles: Record<DwellerRarity, { border: string; bg: string; badge: string; text: string }> = {
    common: {
      border: 'border-slate-700/70',
      bg: 'bg-slate-900/80',
      badge: 'bg-slate-800 text-slate-300 border-slate-700',
      text: 'Обычный'
    },
    rare: {
      border: 'border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]',
      bg: 'bg-blue-950/30',
      badge: 'bg-blue-900/60 text-blue-300 border-blue-600/50',
      text: 'Редкий'
    },
    legendary: {
      border: 'border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.2)]',
      bg: 'bg-amber-950/30',
      badge: 'bg-amber-900/60 text-amber-300 border-amber-500/60',
      text: 'Легендарный'
    }
  };

  const style = rarityStyles[dweller.rarity];

  return (
    <div className={`rounded-xl border ${style.border} ${style.bg} p-3.5 flex flex-col gap-2.5 backdrop-blur-sm relative transition-all`}>
      {/* Top row: Avatar, Name, Title, Rarity Badge */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center justify-center text-2xl shadow-inner relative flex-shrink-0">
          <span>{dweller.avatar}</span>
          <div className="absolute -bottom-1 -right-1 bg-slate-950 border border-slate-700 rounded-full px-1 text-[9px] font-black text-emerald-400 flex items-center gap-0.5">
            <Smile size={10} />
            <span>{dweller.happiness}%</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-sm text-slate-100 truncate">{dweller.name}</h4>
            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${style.badge}`}>
              {style.text}
            </span>
          </div>
          <p className="text-xs text-amber-400/90 font-medium truncate">{dweller.title}</p>
          <p className="text-[10px] text-slate-400 italic truncate">{dweller.quote}</p>
        </div>
      </div>

      {/* S.P.E.C.I.A.L style stats bars */}
      <div className="grid grid-cols-5 gap-1.5 bg-black/40 p-2 rounded-lg border border-slate-800/80">
        <div className="flex flex-col items-center">
          <span className="text-[9px] font-bold text-red-400 uppercase tracking-tight flex items-center gap-0.5">
            <BicepsFlexed size={10} /> СИЛ
          </span>
          <span className="text-xs font-black text-slate-200">{dweller.stats.strength}</span>
          <div className="w-full bg-slate-800 h-1 rounded-full mt-0.5 overflow-hidden">
            <div className="bg-red-500 h-full rounded-full" style={{ width: `${Math.min(100, dweller.stats.strength * 10)}%` }} />
          </div>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-[9px] font-bold text-amber-400 uppercase tracking-tight flex items-center gap-0.5">
            <Pickaxe size={10} /> ШАХ
          </span>
          <span className="text-xs font-black text-slate-200">{dweller.stats.mining}</span>
          <div className="w-full bg-slate-800 h-1 rounded-full mt-0.5 overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.min(100, dweller.stats.mining * 10)}%` }} />
          </div>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-[9px] font-bold text-orange-400 uppercase tracking-tight flex items-center gap-0.5">
            <Flame size={10} /> РЕМ
          </span>
          <span className="text-xs font-black text-slate-200">{dweller.stats.craft}</span>
          <div className="w-full bg-slate-800 h-1 rounded-full mt-0.5 overflow-hidden">
            <div className="bg-orange-500 h-full rounded-full" style={{ width: `${Math.min(100, dweller.stats.craft * 10)}%` }} />
          </div>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-[9px] font-bold text-pink-400 uppercase tracking-tight flex items-center gap-0.5">
            <HeartHandshake size={10} /> ХАР
          </span>
          <span className="text-xs font-black text-slate-200">{dweller.stats.charisma}</span>
          <div className="w-full bg-slate-800 h-1 rounded-full mt-0.5 overflow-hidden">
            <div className="bg-pink-500 h-full rounded-full" style={{ width: `${Math.min(100, dweller.stats.charisma * 10)}%` }} />
          </div>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-tight flex items-center gap-0.5">
            <ShieldAlert size={10} /> ЗАЩ
          </span>
          <span className="text-xs font-black text-slate-200">{dweller.stats.defense}</span>
          <div className="w-full bg-slate-800 h-1 rounded-full mt-0.5 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, dweller.stats.defense * 10)}%` }} />
          </div>
        </div>
      </div>

      {/* Assignment / Actions Row */}
      {isCandidate ? (
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => onAcceptCandidate && onAcceptCandidate(dweller.id)}
            className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow transition-colors"
          >
            <Check size={14} /> Принять в городок
          </button>
          <button
            onClick={() => onDismissCandidate && onDismissCandidate(dweller.id)}
            className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors"
          >
            <X size={14} /> Отказать
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 pt-1 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300 truncate">
            {currentBuilding ? (
              <>
                <Briefcase size={13} className="text-amber-400 flex-shrink-0" />
                <span className="truncate">
                  Назначен: <strong className="text-amber-300">{currentBuilding.name.split('«')[0]}</strong>
                </span>
              </>
            ) : (
              <>
                <Home size={13} className="text-slate-400 flex-shrink-0" />
                <span className="text-slate-400">Отдыхает в бараках</span>
              </>
            )}
          </div>

          {/* Quick Plot Assignment Select */}
          {onAssign && (
            <select
              value={dweller.assignedPlotId === null ? 'none' : dweller.assignedPlotId}
              onChange={(e) => {
                const val = e.target.value;
                onAssign(dweller.id, val === 'none' ? null : Number(val));
              }}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="none">В резерв (Бараки)</option>
              {plots
                .filter(p => p.buildingType !== null)
                .map(p => {
                  const b = BUILDINGS_CONFIG[p.buildingType!];
                  const workersCount = p.assignedDwellerIds ? p.assignedDwellerIds.length : 0;
                  const maxWorkers = b.workerSlotCount(p.level);
                  const isHere = p.id === dweller.assignedPlotId;
                  const isFull = workersCount >= maxWorkers && !isHere;
                  return (
                    <option key={p.id} value={p.id} disabled={isFull}>
                      Участок #{p.id + 1}: {b.name.split('«')[0]} {isFull ? '(Занято)' : ''}
                    </option>
                  );
                })}
            </select>
          )}
        </div>
      )}
    </div>
  );
}
