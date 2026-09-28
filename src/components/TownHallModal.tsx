import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Landmark, 
  Hammer, 
  Flame, 
  Coffee, 
  Warehouse, 
  Home, 
  Shield, 
  Wrench, 
  Pickaxe, 
  X, 
  Users, 
  Sparkles, 
  Check, 
  AlertCircle,
  Coins,
  MapPin,
  ChevronRight,
  Award,
  Crown,
  Swords,
  Heart,
  Crosshair,
  UserPlus
} from 'lucide-react';
import { GameState, TownPlot, BuildingType } from '../types';
import { GameAction } from '../store';
import { BUILDINGS_CONFIG, getMaxDwellers, getBuildingDefenseStats } from '../game/townConfig';
import { sound } from '../game/audio';

const ICONS: Record<BuildingType, React.ElementType> = {
  town_hall: Landmark,
  forge: Hammer,
  smelter: Flame,
  tavern: Coffee,
  guild: Warehouse,
  barracks: Home,
  workshop: Wrench,
  watchtower: Shield
};

const BUILDABLE_TYPES: BuildingType[] = [
  'forge', 
  'smelter', 
  'tavern', 
  'guild', 
  'barracks', 
  'workshop', 
  'watchtower'
];

interface TownHallModalProps {
  plot: TownPlot;
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  onStartPlacement: (type: BuildingType) => void;
  onOpenDwellersRoster: () => void;
  onClose: () => void;
}

export const TownHallModal: React.FC<TownHallModalProps> = ({
  plot,
  state,
  dispatch,
  onStartPlacement,
  onOpenDwellersRoster,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'build' | 'develop' | 'defense' | 'dwellers'>('build');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'production' | 'settlement' | 'defense'>('all');

  const townHallLevel = plot.level || 1;
  const bInfo = BUILDINGS_CONFIG.town_hall;
  const nextUpgradeCost = bInfo.getCost(townHallLevel);
  const canAffordUpgrade = 
    state.resources.ore >= nextUpgradeCost.ore &&
    state.resources.metal >= nextUpgradeCost.metal &&
    state.resources.shards >= nextUpgradeCost.shards;

  const dwellers = state.dwellers || [];
  const candidates = state.candidateDwellers || [];
  const maxDwellers = getMaxDwellers(state.townPlots);
  const builtPlots = (state.townPlots || []).filter(p => p.buildingType !== null);
  const defensivePlots = (state.townPlots || []).filter(p => p.isDefensive || p.buildingType === 'town_hall' || p.buildingType === 'watchtower');

  const filteredBuildings = BUILDABLE_TYPES.filter(type => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'production') return type === 'forge' || type === 'smelter' || type === 'workshop';
    if (selectedCategory === 'settlement') return type === 'tavern' || type === 'barracks';
    if (selectedCategory === 'defense') return type === 'watchtower' || type === 'guild';
    return true;
  });

  const handleUpgradeTownHall = () => {
    if (!canAffordUpgrade || townHallLevel >= bInfo.maxLevel) return;
    sound.playLevelUp();
    dispatch({ type: 'UPGRADE_PLOT', plotId: plot.id });
  };

  const handleToggleSiege = () => {
    sound.playHit();
    dispatch({ type: 'TOGGLE_SIEGE_MODE' });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md select-none animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-[#0e1424] border border-amber-500/40 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* ================= HEADER ================= */}
        <div className="p-4 bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-950 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-inner">
              <Landmark size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-100 uppercase tracking-wider">
                  Ратуша Поселения
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Ур. {townHallLevel}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Чертог Старейшин • Градостроительство и Оборона
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* ================= NAVIGATION TABS ================= */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/80 px-3 pt-2 gap-1 overflow-x-auto scrollbar-none">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('build');
            }}
            className={`py-2 px-3 rounded-t-xl text-xs font-black tracking-wide flex items-center gap-1.5 transition-all border-b-2 ${
              activeTab === 'build'
                ? 'border-amber-400 text-amber-300 bg-slate-900/90'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Hammer size={14} />
            <span>Строительство</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('develop');
            }}
            className={`py-2 px-3 rounded-t-xl text-xs font-black tracking-wide flex items-center gap-1.5 transition-all border-b-2 ${
              activeTab === 'develop'
                ? 'border-amber-400 text-amber-300 bg-slate-900/90'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Crown size={14} />
            <span>Развитие города</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('defense');
            }}
            className={`py-2 px-3 rounded-t-xl text-xs font-black tracking-wide flex items-center gap-1.5 transition-all border-b-2 ${
              activeTab === 'defense'
                ? 'border-amber-400 text-amber-300 bg-slate-900/90'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield size={14} />
            <span>Оборона (TD)</span>
            {state.isSiegeMode && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('dwellers');
            }}
            className={`py-2 px-3 rounded-t-xl text-xs font-black tracking-wide flex items-center gap-1.5 transition-all border-b-2 ${
              activeTab === 'dwellers'
                ? 'border-amber-400 text-amber-300 bg-slate-900/90'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users size={14} />
            <span>Жители ({dwellers.length})</span>
            {candidates.length > 0 && (
              <span className="text-[9px] px-1 bg-amber-500 text-slate-950 font-bold rounded-full">
                +{candidates.length}
              </span>
            )}
          </button>
        </div>

        {/* ================= TAB CONTENT ================= */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* 1. CONSTRUCTION CATALOG */}
          {activeTab === 'build' && (
            <div className="space-y-3">
              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { id: 'all', name: 'Все здания' },
                  { id: 'production', name: 'Производство' },
                  { id: 'settlement', name: 'Поселение' },
                  { id: 'defense', name: 'Оборона' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      sound.playClick();
                      setSelectedCategory(cat.id as any);
                    }}
                    className={`py-1 px-3 rounded-xl text-xs font-bold transition-all flex-shrink-0 cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-amber-500 text-slate-950 shadow font-black'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Buildings List */}
              <div className="grid grid-cols-1 gap-2.5">
                {filteredBuildings.map(type => {
                  const info = BUILDINGS_CONFIG[type];
                  const cost = info.getCost(0);
                  const canAfford = 
                    state.resources.ore >= cost.ore &&
                    state.resources.metal >= cost.metal &&
                    state.resources.shards >= cost.shards;
                  const IconComp = ICONS[type] || Hammer;
                  const count = builtPlots.filter(p => p.buildingType === type).length;
                  const defStats = getBuildingDefenseStats(type, 1);

                  return (
                    <div
                      key={type}
                      className="p-3.5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800 hover:border-slate-700 shadow-md flex flex-col gap-2.5 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0 shadow-inner">
                          <IconComp size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-sm font-black text-slate-100 truncate">
                              {info.name.split('«')[0]}
                            </h4>
                            {count > 0 && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 shrink-0">
                                Построено: {count}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                            {info.shortDesc}
                          </p>
                          {defStats.isDefensive && (
                            <div className="flex items-center gap-2 text-[10px] text-amber-400 font-mono mt-1">
                              <span>🎯 Урон: <b>{defStats.damage}</b></span>
                              <span>•</span>
                              <span>Радиус: <b>{defStats.attackRange} кл.</b></span>
                              <span>•</span>
                              <span>HP: <b>{defStats.hp}</b></span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Cost and Build Button */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-mono text-xs font-bold">
                          <span className={state.resources.ore >= cost.ore ? 'text-amber-300' : 'text-rose-400'}>
                            ⛏️ {cost.ore}
                          </span>
                          <span className={state.resources.metal >= cost.metal ? 'text-slate-200' : 'text-rose-400'}>
                            🔩 {cost.metal}
                          </span>
                          {cost.shards > 0 && (
                            <span className={state.resources.shards >= cost.shards ? 'text-sky-300' : 'text-rose-400'}>
                              💎 {cost.shards}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            sound.playMining();
                            onClose();
                            onStartPlacement(type);
                          }}
                          disabled={!canAfford}
                          className={`py-1.5 px-3.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow cursor-pointer ${
                            canAfford
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-95'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                          }`}
                        >
                          <MapPin size={13} />
                          <span>Разместить на карте</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. TOWN DEVELOPMENT & UPGRADES */}
          {activeTab === 'develop' && (
            <div className="space-y-4">
              {/* Town Hall Status Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-400" />
                    <span className="text-sm font-black text-amber-300 uppercase">
                      Цитадель Уровня {townHallLevel}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-400">
                    Макс: {bInfo.maxLevel}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {bInfo.getLevelDesc(townHallLevel)}
                </p>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 font-mono text-xs">
                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Прочность Ратуши</span>
                    <span className="text-emerald-400 font-bold text-sm">
                      {plot.hp || 1500} / {plot.maxHp || 1500} HP
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Оборонительная баллиста</span>
                    <span className="text-amber-400 font-bold text-sm">
                      {plot.damage || 25} урона (Дальн: 5)
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Вместимость жителей</span>
                    <span className="text-sky-300 font-bold text-sm">
                      {maxDwellers} мест
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Построек в городе</span>
                    <span className="text-slate-200 font-bold text-sm">
                      {builtPlots.length} зданий
                    </span>
                  </div>
                </div>
              </div>

              {/* Next Upgrade Card */}
              {townHallLevel < bInfo.maxLevel ? (
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-400" />
                    <span>Следующий уровень: {townHallLevel + 1}</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    {bInfo.getNextUpgradeDesc(townHallLevel)}
                  </p>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-mono text-xs font-bold">
                      <span className={state.resources.ore >= nextUpgradeCost.ore ? 'text-amber-300' : 'text-rose-400'}>
                        ⛏️ {nextUpgradeCost.ore}
                      </span>
                      <span className={state.resources.metal >= nextUpgradeCost.metal ? 'text-slate-200' : 'text-rose-400'}>
                        🔩 {nextUpgradeCost.metal}
                      </span>
                      {nextUpgradeCost.shards > 0 && (
                        <span className={state.resources.shards >= nextUpgradeCost.shards ? 'text-sky-300' : 'text-rose-400'}>
                          💎 {nextUpgradeCost.shards}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={handleUpgradeTownHall}
                      disabled={!canAffordUpgrade}
                      className={`py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition ${
                        canAffordUpgrade
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg cursor-pointer active:scale-95'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <Sparkles size={14} />
                      <span>Улучшить Ратушу</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-center">
                  <Check className="w-8 h-8 text-emerald-400 mx-auto mb-1" />
                  <div className="text-sm font-bold text-emerald-300">Ратуша достигла максимального величия!</div>
                  <div className="text-xs text-slate-400 mt-0.5">Все технологии и привилегии столицы открыты.</div>
                </div>
              )}
            </div>
          )}

          {/* 3. TOWER DEFENSE PREPARATION */}
          {activeTab === 'defense' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-950 border border-red-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Swords className="w-5 h-5 text-rose-400" />
                    <span className="text-sm font-black text-rose-300 uppercase">
                      Оборонный рубеж поселения (TD)
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    state.isSiegeMode 
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {state.isSiegeMode ? 'РЕЖИМ ОСАДЫ ВКЛЮЧЕН' : 'МИРНЫЙ РЕЖИМ'}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  При включении режима Осады город переходит в режим авто-боя против подземных волн чудовищ. Каждое построенное оборонительное сооружение работает как боевая башня.
                </p>

                {/* Siege Toggle Button */}
                <button
                  onClick={handleToggleSiege}
                  className={`w-full py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg ${
                    state.isSiegeMode
                      ? 'bg-gradient-to-r from-rose-600 to-red-700 text-white shadow-rose-900/50'
                      : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-amber-900/30'
                  }`}
                >
                  <Shield size={16} />
                  <span>{state.isSiegeMode ? 'Отключить боевую тревогу' : 'Включить учебную тревогу (Режим Осады)'}</span>
                </button>
              </div>

              {/* Defensive Towers Roster */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Crosshair size={14} className="text-amber-400" />
                  <span>Боевые башни и цитадели ({defensivePlots.length})</span>
                </h4>

                <div className="space-y-2">
                  {defensivePlots.map(p => {
                    const info = BUILDINGS_CONFIG[p.buildingType || 'watchtower'];
                    const defStats = getBuildingDefenseStats(p.buildingType || 'watchtower', p.level);
                    return (
                      <div 
                        key={p.id}
                        className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-amber-400 border border-slate-700">
                            {React.createElement(ICONS[p.buildingType || 'watchtower'] || Shield, { size: 16 })}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-100">{info?.name || 'Башня'}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Урон: <b className="text-rose-400">{defStats.damage || 20}</b> • Радиус: <b className="text-amber-400">{defStats.attackRange || 5} кл.</b>
                            </div>
                          </div>
                        </div>

                        <div className="text-right font-mono text-xs">
                          <span className="text-emerald-400 font-bold">{defStats.hp} HP</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 4. DWELLERS HUB */}
          {activeTab === 'dwellers' && (
            <div className="space-y-4">
              {/* Candidates at the gates */}
              {candidates.length > 0 ? (
                <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/50 space-y-2.5">
                  <div className="text-xs font-black text-amber-300 uppercase flex items-center gap-1.5">
                    <UserPlus size={14} />
                    <span>Странники у городских ворот ({candidates.length})</span>
                  </div>

                  <div className="space-y-2">
                    {candidates.map(candidate => (
                      <div 
                        key={candidate.id}
                        className="p-2.5 rounded-xl bg-slate-900 border border-amber-500/30 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xl">{candidate.avatar}</span>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-100 truncate">{candidate.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">{candidate.title}</div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            if (dwellers.length >= maxDwellers) {
                              alert('Не хватает жилых мест в бараках!');
                              return;
                            }
                            sound.playLevelUp();
                            dispatch({ type: 'ACCEPT_DWELLER', dwellerId: candidate.id });
                          }}
                          className="py-1 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow"
                        >
                          Принять
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 text-center">
                  У ворот сейчас нет странников. Новые жители прибывают со временем!
                </div>
              )}

              {/* Roster shortcut */}
              <button
                onClick={() => {
                  onClose();
                  onOpenDwellersRoster();
                }}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <Users size={15} className="text-amber-400" />
                <span>Открыть полный реестр жителей поселения</span>
                <ChevronRight size={14} />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
