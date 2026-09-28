import React, { useEffect } from 'react';
import { BuildingType, Resources } from '../types';
import { BUILDINGS_CONFIG } from '../game/townConfig';
import { 
  Hammer, 
  Flame, 
  Coffee, 
  Warehouse, 
  Home, 
  Shield, 
  Wrench, 
  X, 
  Check, 
  BicepsFlexed, 
  Pickaxe, 
  HeartHandshake, 
  ShieldAlert,
  ChevronLeft
} from 'lucide-react';
import { motion } from 'motion/react';
import { sound } from '../game/audio';

interface BuildNewModalProps {
  plotId: number;
  resources: Resources;
  onBuild: (plotId: number, buildingType: BuildingType) => void;
  onClose: () => void;
}

const BUILDING_TYPES: BuildingType[] = [
  'forge',
  'smelter',
  'tavern',
  'guild',
  'barracks',
  'watchtower',
  'workshop'
];

const ICONS: Record<BuildingType, React.ElementType> = {
  forge: Hammer,
  smelter: Flame,
  tavern: Coffee,
  guild: Warehouse,
  barracks: Home,
  watchtower: Shield,
  workshop: Wrench
};

export function BuildNewModal({ plotId, resources, onBuild, onClose }: BuildNewModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const canAfford = (cost: { ore: number; metal: number; shards: number }) => {
    return resources.ore >= cost.ore &&
           resources.metal >= cost.metal &&
           resources.shards >= cost.shards;
  };

  const handleSelectBuild = (type: BuildingType) => {
    const bInfo = BUILDINGS_CONFIG[type];
    const cost = bInfo.getCost(0);
    if (!canAfford(cost)) return;
    sound.playLevelUp();
    onBuild(plotId, type);
    onClose();
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
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 transition-colors"
            >
              <ChevronLeft size={16} />
              <span>В городок</span>
            </button>
            <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <span>🏗️</span> Участок #{plotId + 1}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            title="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        {/* Resources indicator */}
        <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Ваши запасы:</span>
          <div className="flex items-center gap-3 font-mono font-bold">
            <span className="text-amber-300">⛏️ {resources.ore} руды</span>
            <span className="text-slate-300">🔩 {resources.metal} металла</span>
            <span className="text-sky-400">💎 {resources.shards} осколков</span>
          </div>
        </div>

        {/* Buildings Blueprint List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {BUILDING_TYPES.map((type) => {
            const bInfo = BUILDINGS_CONFIG[type];
            const cost = bInfo.getCost(0);
            const affordable = canAfford(cost);
            const IconComponent = ICONS[type];

            return (
              <div 
                key={type}
                className={`p-3.5 rounded-xl border ${affordable ? 'border-slate-700/80 bg-slate-800/60 hover:border-amber-500/60' : 'border-slate-800/50 bg-slate-900/40 opacity-70'} flex flex-col gap-2.5 transition-all`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center text-amber-400 flex-shrink-0 shadow-inner">
                      <IconComponent size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-100">{bInfo.name}</h4>
                      <p className="text-xs text-slate-400 leading-snug">{bInfo.shortDesc}</p>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-amber-300/90 bg-black/40 px-2.5 py-1.5 rounded-lg border border-slate-800 flex items-center gap-1.5">
                  <span className="font-bold">⭐ Бонус жителя:</span>
                  <span>{bInfo.primaryStatDesc}</span>
                </div>

                {/* Cost and Build Button */}
                <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800/80">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold">
                    <span className={resources.ore >= cost.ore ? 'text-amber-300' : 'text-red-400'}>
                      {cost.ore} руды
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className={resources.metal >= cost.metal ? 'text-slate-300' : 'text-red-400'}>
                      {cost.metal} мет.
                    </span>
                    {cost.shards > 0 && (
                      <>
                        <span className="text-slate-500">•</span>
                        <span className={resources.shards >= cost.shards ? 'text-sky-300' : 'text-red-400'}>
                          {cost.shards} оск.
                        </span>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => handleSelectBuild(type)}
                    disabled={!affordable}
                    className={`py-1.5 px-4 rounded-xl text-xs font-bold transition-all shadow ${
                      affordable 
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black cursor-pointer' 
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                    }`}
                  >
                    Построить
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Back Button */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-center">
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ChevronLeft size={16} />
            <span>Вернуться к карте городка</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
