import React from 'react';
import { TownPlot, BuildingType } from '../types';
import { BUILDINGS_CONFIG } from '../game/townConfig';
import { Dweller } from '../game/dwellers';
import { 
  Hammer, 
  Flame, 
  Coffee, 
  Warehouse, 
  Home, 
  Shield, 
  Wrench, 
  Plus, 
  Users, 
  ArrowUpCircle,
  Sparkles,
  Zap,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';

interface BuildingPlotCardProps {
  key?: React.Key;
  plot: TownPlot;
  dwellers: Dweller[];
  onOpenPlot: (plot: TownPlot) => void;
  onOpenBuild: (plotId: number) => void;
}

const BUILDING_ICONS: Record<BuildingType, React.ElementType> = {
  forge: Hammer,
  smelter: Flame,
  tavern: Coffee,
  guild: Warehouse,
  barracks: Home,
  workshop: Wrench,
  watchtower: Shield
};

const BUILDING_THEMES: Record<BuildingType, {
  bgGradient: string;
  borderColor: string;
  glowColor: string;
  accentColor: string;
  badgeBg: string;
  ambientEffect: string;
}> = {
  forge: {
    bgGradient: 'from-amber-950/80 via-red-950/60 to-slate-900',
    borderColor: 'border-amber-600/50 hover:border-amber-400',
    glowColor: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]',
    accentColor: 'text-amber-400',
    badgeBg: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
    ambientEffect: '🔥 Кузнечный горн'
  },
  smelter: {
    bgGradient: 'from-orange-950/80 via-red-950/60 to-slate-900',
    borderColor: 'border-orange-600/50 hover:border-orange-400',
    glowColor: 'shadow-[0_0_20px_rgba(249,115,22,0.15)]',
    accentColor: 'text-orange-400',
    badgeBg: 'bg-orange-950/80 text-orange-300 border-orange-500/40',
    ambientEffect: '♨️ Плавильный тигель'
  },
  tavern: {
    bgGradient: 'from-amber-950/70 via-stone-900 to-slate-900',
    borderColor: 'border-amber-500/40 hover:border-amber-300',
    glowColor: 'shadow-[0_0_20px_rgba(217,119,6,0.15)]',
    accentColor: 'text-amber-300',
    badgeBg: 'bg-amber-900/60 text-amber-200 border-amber-600/40',
    ambientEffect: '🍲 Уютный очаг'
  },
  guild: {
    bgGradient: 'from-blue-950/70 via-slate-900 to-slate-950',
    borderColor: 'border-blue-500/40 hover:border-blue-300',
    glowColor: 'shadow-[0_0_20px_rgba(59,130,246,0.15)]',
    accentColor: 'text-blue-400',
    badgeBg: 'bg-blue-950/80 text-blue-300 border-blue-500/40',
    ambientEffect: '⛏️ Забой старателей'
  },
  barracks: {
    bgGradient: 'from-emerald-950/60 via-slate-900 to-slate-950',
    borderColor: 'border-emerald-500/40 hover:border-emerald-300',
    glowColor: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]',
    accentColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
    ambientEffect: '🛏️ Тёплый приют'
  },
  workshop: {
    bgGradient: 'from-indigo-950/60 via-slate-900 to-slate-950',
    borderColor: 'border-indigo-500/40 hover:border-indigo-300',
    glowColor: 'shadow-[0_0_20px_rgba(99,102,241,0.15)]',
    accentColor: 'text-indigo-400',
    badgeBg: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40',
    ambientEffect: '⚙️ Рельсовый цех'
  },
  watchtower: {
    bgGradient: 'from-cyan-950/60 via-slate-900 to-slate-950',
    borderColor: 'border-cyan-500/40 hover:border-cyan-300',
    glowColor: 'shadow-[0_0_20px_rgba(6,182,212,0.15)]',
    accentColor: 'text-cyan-400',
    badgeBg: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40',
    ambientEffect: '🛡️ Дозорный рубеж'
  }
};

export function BuildingPlotCard({ plot, dwellers, onOpenPlot, onOpenBuild }: BuildingPlotCardProps) {
  // Empty Plot
  if (!plot.buildingType) {
    return (
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onOpenBuild(plot.id)}
        className="h-36 rounded-2xl border-2 border-dashed border-slate-700/80 hover:border-amber-500/70 bg-slate-900/40 hover:bg-slate-900/70 flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all group relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:12px_12px] opacity-30" />
        <div className="w-11 h-11 rounded-full bg-slate-800/90 group-hover:bg-amber-500/20 border border-slate-700 group-hover:border-amber-500/50 flex items-center justify-center text-slate-400 group-hover:text-amber-400 transition-colors mb-2 z-10">
          <Plus size={22} />
        </div>
        <span className="text-xs font-bold text-slate-300 group-hover:text-amber-300 z-10 transition-colors">
          Участок #{plot.id + 1}
        </span>
        <span className="text-[10px] text-slate-500 group-hover:text-amber-400/80 font-medium z-10 uppercase tracking-wider mt-0.5">
          + Построить здание
        </span>
      </motion.div>
    );
  }

  const bInfo = BUILDINGS_CONFIG[plot.buildingType];
  const theme = BUILDING_THEMES[plot.buildingType];
  const IconComponent = BUILDING_ICONS[plot.buildingType] || Hammer;

  // Assigned workers
  const assignedWorkers = dwellers.filter(d => (plot.assignedDwellerIds || []).includes(d.id));
  const maxWorkers = bInfo.workerSlotCount(plot.level);

  // Quick stat preview
  const getQuickEffect = () => {
    switch (plot.buildingType) {
      case 'forge': {
        const str = assignedWorkers.reduce((s, w) => s + w.stats.strength, 0);
        return str > 0 ? `+${(str * 2.5).toFixed(1)}% к статам крафта` : 'Ковка брони и оружия';
      }
      case 'smelter':
        return `Переплавка руды • Ур. ${plot.level}`;
      case 'tavern':
        return 'Еда, зелья и найм';
      case 'guild':
        return `Добыча +${3 * plot.level} руды/мин`;
      case 'barracks':
        return `Вместимость: +${plot.level * 3} жителей`;
      case 'watchtower':
        return `Защита городка и шахты`;
      case 'workshop':
        return `Модули тележки`;
      default:
        return '';
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onOpenPlot(plot)}
      className={`h-36 rounded-2xl border ${theme.borderColor} ${theme.glowColor} bg-gradient-to-br ${theme.bgGradient} p-3 flex flex-col justify-between cursor-pointer relative overflow-hidden transition-all shadow-md group`}
    >
      {/* Background Room Grid Texture (Shelter feel) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

      {/* Top Bar: Icon, Title, Level Badge */}
      <div className="flex items-start justify-between gap-2 z-10">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-8 h-8 rounded-lg bg-black/40 border border-slate-700/80 flex items-center justify-center ${theme.accentColor} flex-shrink-0 shadow-sm`}>
            <IconComponent size={18} />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-black text-slate-100 truncate group-hover:text-white transition-colors">
              {bInfo.name.split('«')[0]}
            </h4>
            <span className="text-[10px] text-slate-400 font-medium block truncate">
              {theme.ambientEffect}
            </span>
          </div>
        </div>

        <div className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${theme.badgeBg} flex-shrink-0 shadow-sm`}>
          Ур. {plot.level}
        </div>
      </div>

      {/* Middle: Workers Slot Container (Fallout Shelter Dwellers inside room) */}
      <div className="bg-black/40 border border-slate-800/80 rounded-xl p-1.5 flex items-center justify-between gap-1 z-10">
        <div className="flex items-center gap-1.5 overflow-hidden">
          {maxWorkers > 0 ? (
            Array.from({ length: maxWorkers }).map((_, idx) => {
              const worker = assignedWorkers[idx];
              if (worker) {
                return (
                  <div
                    key={worker.id}
                    title={`${worker.name} (${worker.title})`}
                    className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-600 flex items-center justify-center text-sm relative group/dweller shadow-sm"
                  >
                    <span>{worker.avatar}</span>
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-900" />
                  </div>
                );
              }
              return (
                <div
                  key={`empty_${idx}`}
                  title="Свободный рабочий слот"
                  className="w-7 h-7 rounded-lg border border-dashed border-slate-700/90 flex items-center justify-center text-slate-600 text-[10px]"
                >
                  <Users size={12} />
                </div>
              );
            })
          ) : (
            <div className="flex items-center gap-1 text-[10px] text-emerald-400/90 px-1 py-0.5">
              <Home size={12} />
              <span>Спальные места городка</span>
            </div>
          )}
        </div>

        <div className="text-[9px] font-bold text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/60">
          {maxWorkers > 0 ? `${assignedWorkers.length}/${maxWorkers}` : `+${plot.level * 3} жит.`}
        </div>
      </div>

      {/* Bottom Bar: Output & Action Hint */}
      <div className="flex items-center justify-between text-[10px] text-slate-300 font-medium z-10 pt-0.5 border-t border-white/5">
        <span className="truncate text-amber-300/90 font-bold">{getQuickEffect()}</span>
        <span className="flex items-center gap-0.5 text-slate-400 group-hover:text-amber-300 font-bold flex-shrink-0 transition-colors">
          Открыть <ChevronRight size={12} />
        </span>
      </div>
    </motion.div>
  );
}
