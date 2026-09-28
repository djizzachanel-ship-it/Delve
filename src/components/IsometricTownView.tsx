import React, { useState, useEffect, useMemo } from 'react';
import { GameState, TownPlot, BuildingType } from '../types';
import { GameAction } from '../store';
import { BUILDINGS_CONFIG, getMaxDwellers } from '../game/townConfig';
import { Dweller } from '../game/dwellers';
import { 
  Hammer, 
  Flame, 
  Coffee, 
  Warehouse, 
  Home, 
  Shield, 
  Wrench, 
  Pickaxe, 
  Plus, 
  Sun, 
  Moon, 
  Sunset, 
  Sunrise, 
  Users, 
  Sparkles, 
  ChevronRight, 
  Smile, 
  Zap, 
  Compass,
  Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sound } from '../game/audio';

export type TimeOfDay = 'dawn' | 'day' | 'sunset' | 'night';

interface IsometricTownViewProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  onOpenPlot: (plot: TownPlot) => void;
  onOpenBuild: (plotId: number) => void;
  onOpenDwellers: () => void;
  onOpenMineExpedition: () => void;
  timeOfDay: TimeOfDay;
  setTimeOfDay: (time: TimeOfDay) => void;
}

// Plot spatial configuration on the isometric map around the central mine
// Coordinates are in percentage of the map canvas (50% is center)
interface PlotSpatialConfig {
  id: number;
  title: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  elevation: number;
  directionLabel: string;
}

const PLOT_COORDINATES: PlotSpatialConfig[] = [
  { id: 0, title: 'Северо-Западный Склон', x: 22, y: 22, elevation: 12, directionLabel: 'СЗ • У скал' },
  { id: 1, title: 'Северная Опушка', x: 50, y: 15, elevation: 16, directionLabel: 'С • У бора' },
  { id: 2, title: 'Северо-Восточный Берег', x: 78, y: 22, elevation: 12, directionLabel: 'СВ • У ручья' },
  { id: 3, title: 'Юго-Западные Ворота', x: 18, y: 64, elevation: 4, directionLabel: 'ЮЗ • У заставы' },
  { id: 4, title: 'Передний Двор Шахты', x: 50, y: 76, elevation: 0, directionLabel: 'Ю • Плац' },
  { id: 5, title: 'Юго-Восточная Терраса', x: 82, y: 64, elevation: 6, directionLabel: 'ЮВ • Терраса' },
];

// Waypoints for roaming dwellers around town
const TOWN_WAYPOINTS = [
  { x: 50, y: 46, name: 'Вход в шахту' },
  { x: 26, y: 32, name: 'Кузнечный переулок' },
  { x: 50, y: 24, name: 'Северный тракт' },
  { x: 74, y: 32, name: 'Ручейная тропа' },
  { x: 32, y: 62, name: 'Главная площадь' },
  { x: 50, y: 70, name: 'Южные рельсы' },
  { x: 68, y: 62, name: 'Восточный спуск' },
  { x: 50, y: 90, name: 'Городские ворота' },
];

const QUOTES_POOL = [
  'В шахте сегодня богатая рудная жила!',
  'Пора наточить кирку перед спуском.',
  'Эль в таверне пахнет горным мёдом.',
  'Кузнец сковал отменный доспех!',
  'Слышали вой из глубины 30 метров?',
  'Ночью в шахте монстры свирепеют...',
  'Наш городок растёт не по дням!',
  'Дозорные заметили движение троллей.',
  'Плавильня греет даже в мороз.'
];

export function IsometricTownView({
  state,
  dispatch,
  onOpenPlot,
  onOpenBuild,
  onOpenDwellers,
  onOpenMineExpedition,
  timeOfDay,
  setTimeOfDay
}: IsometricTownViewProps) {
  // Selected dweller for speech or inspector popup
  const [selectedDweller, setSelectedDweller] = useState<Dweller | null>(null);
  const [dwellerSpeech, setDwellerSpeech] = useState<{ id: string; text: string } | null>(null);

  // Animated dwellers roaming state
  const [roamingPositions, setRoamingPositions] = useState<
    Array<{ id: string; avatar: string; name: string; x: number; y: number; targetWp: number }>
  >([]);

  const dwellers = state.dwellers || [];
  const maxDwellers = getMaxDwellers(state.townPlots);

  // Initialize roaming dwellers
  useEffect(() => {
    if (dwellers.length === 0) {
      setRoamingPositions([]);
      return;
    }

    const initial = dwellers.slice(0, 6).map((d, index) => {
      const wpIdx = index % TOWN_WAYPOINTS.length;
      const wp = TOWN_WAYPOINTS[wpIdx];
      return {
        id: d.id,
        avatar: d.avatar,
        name: d.name,
        x: wp.x + (Math.random() * 4 - 2),
        y: wp.y + (Math.random() * 4 - 2),
        targetWp: (wpIdx + 1) % TOWN_WAYPOINTS.length
      };
    });
    setRoamingPositions(initial);
  }, [dwellers.length]);

  // Roaming motion timer
  useEffect(() => {
    if (roamingPositions.length === 0) return;

    const moveTimer = setInterval(() => {
      setRoamingPositions(prev =>
        prev.map(p => {
          const target = TOWN_WAYPOINTS[p.targetWp];
          const dx = target.x - p.x;
          const dy = target.y - p.y;
          const dist = Math.hypot(dx, dy);

          if (dist < 3) {
            // Arrived at waypoint, pick new random waypoint
            const nextWp = Math.floor(Math.random() * TOWN_WAYPOINTS.length);
            return { ...p, targetWp: nextWp };
          } else {
            // Step towards waypoint
            const speed = 0.8;
            return {
              ...p,
              x: p.x + (dx / dist) * speed,
              y: p.y + (dy / dist) * speed
            };
          }
        })
      );
    }, 120);

    return () => clearInterval(moveTimer);
  }, [roamingPositions.length]);

  // Occasional random speech bubble from a dweller
  useEffect(() => {
    const bubbleTimer = setInterval(() => {
      if (dwellers.length > 0) {
        const randomDweller = dwellers[Math.floor(Math.random() * dwellers.length)];
        const randomQuote = QUOTES_POOL[Math.floor(Math.random() * QUOTES_POOL.length)];
        setDwellerSpeech({ id: randomDweller.id, text: randomQuote });

        setTimeout(() => {
          setDwellerSpeech(null);
        }, 5000);
      }
    }, 14000);

    return () => clearInterval(bubbleTimer);
  }, [dwellers]);

  // Lighting overlay configuration based on time of day
  const lightStyles = useMemo(() => {
    switch (timeOfDay) {
      case 'dawn':
        return {
          sky: 'from-amber-950/60 via-purple-950/40 to-slate-900',
          tint: 'rgba(251, 146, 60, 0.12)',
          shadow: 'rgba(15, 23, 42, 0.4)',
          sunMoonIcon: Sunrise,
          label: 'Рассвет • 06:00',
          windowGlow: false
        };
      case 'day':
        return {
          sky: 'from-sky-900/30 via-emerald-950/20 to-[#0c1424]',
          tint: 'transparent',
          shadow: 'rgba(0, 0, 0, 0.35)',
          sunMoonIcon: Sun,
          label: 'Полдень • 12:00',
          windowGlow: false
        };
      case 'sunset':
        return {
          sky: 'from-amber-950/80 via-rose-950/60 to-slate-950',
          tint: 'rgba(244, 63, 94, 0.18)',
          shadow: 'rgba(15, 23, 42, 0.6)',
          sunMoonIcon: Sunset,
          label: 'Закат • 19:00',
          windowGlow: true
        };
      case 'night':
        return {
          sky: 'from-[#030712] via-[#080d1f] to-[#050914]',
          tint: 'rgba(15, 23, 42, 0.55)',
          shadow: 'rgba(0, 0, 0, 0.85)',
          sunMoonIcon: Moon,
          label: 'Полночь • 00:00',
          windowGlow: true
        };
    }
  }, [timeOfDay]);

  const cycleTimeOfDay = () => {
    sound.playEquip();
    if (timeOfDay === 'dawn') setTimeOfDay('day');
    else if (timeOfDay === 'day') setTimeOfDay('sunset');
    else if (timeOfDay === 'sunset') setTimeOfDay('night');
    else setTimeOfDay('dawn');
  };

  const SunMoonComp = lightStyles.sunMoonIcon;

  return (
    <div className="relative w-full h-full flex flex-col bg-[#070b14] overflow-hidden select-none">
      
      {/* ================= ATMOSPHERIC TOP CONTROLS & HUD ================= */}
      <div className="absolute top-2 left-3 right-3 z-30 flex items-center justify-between pointer-events-auto">
        {/* Day / Night cycle button */}
        <button
          onClick={cycleTimeOfDay}
          className="py-1.5 px-3 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-700/70 text-slate-200 text-xs font-bold flex items-center gap-2 backdrop-blur-md shadow-lg transition-all active:scale-95 cursor-pointer"
          title="Сменить время суток (День / Ночь)"
        >
          <SunMoonComp 
            size={16} 
            className={timeOfDay === 'night' ? 'text-indigo-300' : timeOfDay === 'sunset' ? 'text-amber-400' : 'text-amber-300'} 
          />
          <span className="font-mono text-[11px]">{lightStyles.label}</span>
        </button>

        {/* Population & Town status badge */}
        <button
          onClick={onOpenDwellers}
          className="py-1.5 px-3 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-700/70 text-slate-200 text-xs font-bold flex items-center gap-1.5 backdrop-blur-md shadow-lg transition-all active:scale-95"
        >
          <Users size={14} className="text-amber-400" />
          <span>Жители:</span>
          <span className="font-mono text-amber-300 font-black">{dwellers.length}/{maxDwellers}</span>
          {state.candidateDwellers && state.candidateDwellers.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping ml-1" />
          )}
        </button>
      </div>

      {/* ================= ISOMETRIC 2.5D CANVAS / WORLD CONTAINER ================= */}
      <div className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center">
        
        {/* Dynamic Sky Gradient according to Day/Night */}
        <div className={`absolute inset-0 bg-gradient-to-b ${lightStyles.sky} transition-colors duration-1000`} />

        {/* Night Stars / Fireflies */}
        {timeOfDay === 'night' && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-6 left-12 w-1 h-1 bg-white rounded-full animate-ping opacity-75" />
            <div className="absolute top-16 right-16 w-1 h-1 bg-amber-200 rounded-full animate-pulse opacity-80" />
            <div className="absolute top-24 left-1/3 w-1.5 h-1.5 bg-blue-200 rounded-full animate-pulse opacity-60" />
            <div className="absolute top-10 right-1/3 w-1 h-1 bg-amber-100 rounded-full animate-ping opacity-70" />
            {/* Soft fireflies */}
            <div className="absolute bottom-28 left-20 w-2 h-2 rounded-full bg-emerald-400 blur-[1px] animate-bounce opacity-70" />
            <div className="absolute bottom-36 right-24 w-1.5 h-1.5 rounded-full bg-amber-300 blur-[1px] animate-pulse opacity-80" />
          </div>
        )}

        {/* Ambient Color Overlay Filter */}
        <div 
          className="absolute inset-0 pointer-events-none transition-colors duration-1000"
          style={{ backgroundColor: lightStyles.tint }}
        />

        {/* ---------------- ISOMETRIC GROUND MAP STAGE ---------------- */}
        <div className="relative w-full max-w-[430px] aspect-[4/5] mx-auto overflow-hidden">
          
          {/* SVG Terrain Background with mountain rocks, pine woods, and winding roads */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 500" fill="none">
            <defs>
              {/* Ground Gradients */}
              <radialGradient id="minePitGlow" cx="50%" cy="45%" r="35%">
                <stop offset="0%" stopColor="#050811" stopOpacity="0.95" />
                <stop offset="60%" stopColor="#0f172a" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#1e293b" stopOpacity="0" />
              </radialGradient>

              <linearGradient id="grassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#14281d" />
                <stop offset="50%" stopColor="#0f1f16" />
                <stop offset="100%" stopColor="#09140e" />
              </linearGradient>

              <linearGradient id="rockGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="100%" stopColor="#1e293b" />
              </linearGradient>

              {/* Torch Glow Filter */}
              <filter id="torchGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Base Mountain Plateau Polygon */}
            <path
              d="M 200,40 L 370,140 L 380,360 L 200,470 L 20,360 L 30,140 Z"
              fill="url(#grassGrad)"
              stroke="#1e3a29"
              strokeWidth="3"
            />

            {/* Mountain Rock Cliffs & Rims */}
            <path
              d="M 20,140 L 20,165 L 200,265 L 200,240 Z"
              fill="url(#rockGrad)"
              opacity="0.7"
            />
            <path
              d="M 20,360 L 200,470 L 200,485 L 20,375 Z"
              fill="#0b1320"
            />
            <path
              d="M 380,360 L 200,470 L 200,485 L 380,375 Z"
              fill="#060c16"
            />

            {/* Cobblestone Trails connecting plots to the Central Mine */}
            {/* Trail from Northwest to Mine */}
            <path
              d="M 100,140 Q 150,180 200,225"
              stroke="#2c3b2e"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray="3 4"
            />
            {/* Trail from North to Mine */}
            <path
              d="M 200,110 L 200,225"
              stroke="#2c3b2e"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray="3 4"
            />
            {/* Trail from Northeast to Mine */}
            <path
              d="M 300,140 Q 250,180 200,225"
              stroke="#2c3b2e"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray="3 4"
            />
            {/* Trail from Southwest to Mine */}
            <path
              d="M 100,340 Q 150,290 200,255"
              stroke="#2c3b2e"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray="3 4"
            />
            {/* Trail from South to Mine */}
            <path
              d="M 200,400 L 200,255"
              stroke="#3b4d3e"
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray="4 4"
            />
            {/* Trail from Southeast to Mine */}
            <path
              d="M 300,340 Q 250,290 200,255"
              stroke="#2c3b2e"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray="3 4"
            />

            {/* Central Mine Pit Depth Glow */}
            <circle cx="200" cy="235" r="70" fill="url(#minePitGlow)" />

            {/* Railway tracks coming out of the mine pit down to the south */}
            <path
              d="M 194,240 L 194,360"
              stroke="#475569"
              strokeWidth="2.5"
            />
            <path
              d="M 206,240 L 206,360"
              stroke="#475569"
              strokeWidth="2.5"
            />
            {/* Rail Ties */}
            {[250, 265, 280, 295, 310, 325, 340, 355].map((y) => (
              <line key={y} x1="190" y1={y} x2="210" y2={y} stroke="#78350f" strokeWidth="2.5" />
            ))}

            {/* Decorative Mountain Pines & Rocks */}
            {/* Top Pines */}
            <g transform="translate(135, 55)">
              <polygon points="10,0 0,22 20,22" fill="#0d2b1a" />
              <polygon points="10,6 2,28 18,28" fill="#091f13" />
            </g>
            <g transform="translate(245, 55)">
              <polygon points="10,0 0,22 20,22" fill="#0d2b1a" />
              <polygon points="10,6 2,28 18,28" fill="#091f13" />
            </g>
            {/* Left Ridge Pines */}
            <g transform="translate(38, 180)">
              <polygon points="8,0 0,18 16,18" fill="#0a2215" />
              <polygon points="8,5 2,24 14,24" fill="#06160d" />
            </g>
            <g transform="translate(48, 260)">
              <polygon points="8,0 0,18 16,18" fill="#0a2215" />
            </g>
            {/* Right Ridge Pines & River */}
            <g transform="translate(340, 180)">
              <polygon points="8,0 0,18 16,18" fill="#0a2215" />
              <polygon points="8,5 2,24 14,24" fill="#06160d" />
            </g>
            <g transform="translate(330, 270)">
              <polygon points="8,0 0,18 16,18" fill="#0a2215" />
            </g>
            {/* Mountain stream on North-East */}
            <path
              d="M 320,60 Q 345,110 370,160"
              stroke="#0284c7"
              strokeWidth="4"
              strokeOpacity="0.4"
              strokeLinecap="round"
            />

            {/* Night Lantern Lamp Posts & Torch Halos */}
            {timeOfDay === 'night' && (
              <>
                <circle cx="178" cy="235" r="14" fill="#f59e0b" opacity="0.45" filter="url(#torchGlow)" />
                <circle cx="222" cy="235" r="14" fill="#f59e0b" opacity="0.45" filter="url(#torchGlow)" />
                <circle cx="200" cy="380" r="18" fill="#fbbf24" opacity="0.4" filter="url(#torchGlow)" />
              </>
            )}
          </svg>

          {/* ---------------- CENTRAL MINE SHAFT (ШАХТНЫЙ СТВОЛ) ---------------- */}
          {/* Positioned right in the middle at (50%, 46%) */}
          <div 
            onClick={onOpenMineExpedition}
            className="absolute top-[46%] left-[50%] -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group flex flex-col items-center"
          >
            {/* Mine Portal Structure */}
            <div className="relative flex flex-col items-center">
              {/* Glowing Banner on top of mine */}
              <div className="bg-slate-950/90 border border-emerald-500/60 group-hover:border-emerald-400 group-hover:bg-slate-900 text-emerald-300 px-3 py-1 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.35)] flex items-center gap-1.5 transition-all group-hover:scale-105 mb-1 backdrop-blur-sm">
                <Pickaxe size={13} className="text-emerald-400 animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-wider">Шахта «Бездна»</span>
                <span className="font-mono text-[10px] text-amber-300 font-bold">{(state.unlockedDepth || 0) * 10 + 10}м</span>
              </div>

              {/* Wooden Portal Arch & Dark Pit */}
              <div className="w-24 h-20 bg-gradient-to-b from-[#111827] to-[#030712] border-4 border-[#78350f] rounded-t-2xl shadow-[0_10px_25px_rgba(0,0,0,0.9)] relative flex items-center justify-center overflow-hidden">
                {/* Internal Pit Darkness with smoke/fumes */}
                <div className="w-16 h-14 bg-black rounded-t-xl relative overflow-hidden flex flex-col items-center justify-end">
                  {/* Glowing red monster eyes lurking inside */}
                  <div className="absolute top-3 left-3 w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping opacity-75" />
                  <div className="absolute top-4 right-3 w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping opacity-60" />
                  {/* Rails running into darkness */}
                  <div className="w-8 h-8 border-x-2 border-slate-600 mb-0 opacity-80" />
                </div>

                {/* Left & Right Torches */}
                <div className="absolute bottom-2 left-1 text-xs animate-bounce">
                  🔥
                </div>
                <div className="absolute bottom-2 right-1 text-xs animate-bounce" style={{ animationDelay: '0.2s' }}>
                  🔥
                </div>

                {/* Steam rising */}
                <div className="absolute top-1 w-6 h-6 rounded-full bg-slate-400/20 blur-sm animate-ping pointer-events-none" />
              </div>

              {/* Minecart filled with ore on tracks */}
              <div className="w-14 h-8 -mt-2 bg-gradient-to-r from-amber-900 to-stone-800 border border-amber-600/70 rounded shadow-lg flex items-center justify-center text-xs relative group-hover:scale-110 transition-transform">
                <span>💎⛏️</span>
                {/* Wheels */}
                <div className="absolute -bottom-1.5 left-1.5 w-3 h-3 rounded-full bg-slate-900 border border-slate-600" />
                <div className="absolute -bottom-1.5 right-1.5 w-3 h-3 rounded-full bg-slate-900 border border-slate-600" />
              </div>

              {/* Action Prompt */}
              <div className="mt-1.5 py-1 px-3 bg-emerald-600 group-hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.5)] flex items-center gap-1 transition-all">
                <span>Спуститься в шахту</span>
                <ChevronRight size={12} />
              </div>
            </div>
          </div>

          {/* ---------------- 6 ISOMETRIC CONSTRUCTION PLOTS ---------------- */}
          {PLOT_COORDINATES.map((pos) => {
            const plot = state.townPlots?.find(p => p.id === pos.id) || {
              id: pos.id,
              buildingType: null,
              level: 1,
              assignedDwellerIds: []
            };

            const bType = plot.buildingType;
            const bInfo = bType ? BUILDINGS_CONFIG[bType] : null;
            const assignedCount = plot.assignedDwellerIds?.length || 0;

            return (
              <div
                key={pos.id}
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className="absolute z-10 cursor-pointer"
                onClick={() => {
                  if (bType) {
                    sound.playHit();
                    onOpenPlot(plot);
                  } else {
                    sound.playEquip();
                    onOpenBuild(plot.id);
                  }
                }}
              >
                {/* Plot Building or Empty Foundation */}
                {bType && bInfo ? (
                  /* ================= BUILT BUILDING ================= */
                  <motion.div 
                    whileHover={{ scale: 1.08, y: -4 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative flex flex-col items-center group"
                  >
                    {/* Floating Building Level & Name Badge */}
                    <div className="bg-slate-950/90 border border-amber-500/50 group-hover:border-amber-400 group-hover:bg-slate-900 text-slate-100 px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1 mb-1 transition-all backdrop-blur-sm">
                      <span className="text-[10px] font-bold text-amber-300">
                        {bType === 'forge' ? '⚒️' : bType === 'smelter' ? '🔥' : bType === 'tavern' ? '🍻' : bType === 'guild' ? '⛏️' : bType === 'barracks' ? '🛏️' : bType === 'watchtower' ? '🛡️' : '🔧'}
                      </span>
                      <span className="text-[10px] font-black truncate max-w-[85px]">{bInfo.name.split('«')[0]}</span>
                      <span className="text-[9px] font-mono font-black text-amber-400">★{plot.level}</span>
                    </div>

                    {/* 2.5D Isometric Building Model */}
                    <div className="relative w-18 h-18 sm:w-20 sm:h-20 flex items-center justify-center">
                      
                      {/* Night Window Glow / Light Cast */}
                      {lightStyles.windowGlow && (
                        <div className="absolute inset-0 rounded-2xl bg-amber-400/20 blur-md pointer-events-none" />
                      )}

                      {/* Building Body Representation */}
                      {bType === 'forge' && (
                        /* Forge: Stone house with chimney, sparks, anvil outside */
                        <div className="w-16 h-16 bg-gradient-to-b from-stone-700 to-stone-900 border-2 border-stone-600 rounded-xl shadow-xl flex flex-col items-center justify-between p-1 relative overflow-hidden">
                          {/* Roof */}
                          <div className="w-full h-4 bg-gradient-to-r from-red-950 to-stone-800 rounded-t border-b border-red-800 flex justify-center items-center">
                            <span className="text-[8px] text-amber-400 font-bold">ГОРН</span>
                          </div>
                          {/* Chimney smoke */}
                          <div className="absolute -top-3 right-1 text-xs animate-bounce">
                            💨
                          </div>
                          {/* Glowing forge door */}
                          <div className="w-6 h-7 bg-amber-500 border border-amber-300 rounded-t shadow-[0_0_12px_rgba(245,158,11,0.8)] flex items-center justify-center text-xs animate-pulse">
                            🔥
                          </div>
                          {/* Anvil outside */}
                          <div className="absolute -bottom-1 -left-1 text-xs">
                            🔨
                          </div>
                        </div>
                      )}

                      {bType === 'smelter' && (
                        /* Smelter: Brick cylindrical furnace with molten lava channel */
                        <div className="w-16 h-16 bg-gradient-to-b from-orange-950 to-stone-900 border-2 border-orange-700 rounded-2xl shadow-xl flex flex-col items-center justify-between p-1 relative overflow-hidden">
                          <div className="w-full h-3 bg-stone-800 rounded-t flex justify-center text-[7px] text-orange-400 font-bold">
                            ТИГЕЛЬ
                          </div>
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-400 shadow-[0_0_15px_rgba(245,158,11,0.9)] flex items-center justify-center text-xs animate-pulse">
                            ⚡
                          </div>
                          {/* Double pipes */}
                          <div className="absolute -top-2 left-2 text-[10px] animate-pulse">💨</div>
                          <div className="absolute -top-2 right-2 text-[10px] animate-pulse">💨</div>
                        </div>
                      )}

                      {bType === 'tavern' && (
                        /* Tavern: Wooden cozy lodge with mug sign & warm windows */
                        <div className="w-16 h-16 bg-gradient-to-b from-amber-950 to-yellow-950 border-2 border-amber-700 rounded-xl shadow-xl flex flex-col items-center justify-between p-1.5 relative overflow-hidden">
                          <div className="w-full h-4 bg-amber-900 rounded-t border-b border-amber-600 flex justify-center items-center text-[8px] text-amber-200 font-bold">
                            ПРИВАЛ
                          </div>
                          <div className="flex gap-2">
                            <div className="w-4 h-4 bg-amber-400 rounded-sm shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                            <div className="w-4 h-4 bg-amber-400 rounded-sm shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                          </div>
                          {/* Beer mug sign */}
                          <div className="absolute -top-1 -right-1 text-xs">🍻</div>
                        </div>
                      )}

                      {bType === 'barracks' && (
                        /* Barracks: 2-floor wooden home with beds */
                        <div className="w-16 h-16 bg-gradient-to-b from-stone-800 to-slate-900 border-2 border-stone-600 rounded-xl shadow-xl flex flex-col items-center justify-between p-1.5 relative overflow-hidden">
                          <div className="w-full h-4 bg-sky-950 rounded-t border-b border-sky-700 flex justify-center items-center text-[8px] text-sky-300 font-bold">
                            КАЗАРМА
                          </div>
                          <div className="flex gap-1.5">
                            <div className="w-3.5 h-3.5 bg-yellow-300/80 rounded-sm shadow" />
                            <div className="w-3.5 h-3.5 bg-yellow-300/80 rounded-sm shadow" />
                            <div className="w-3.5 h-3.5 bg-yellow-300/80 rounded-sm shadow" />
                          </div>
                          <div className="text-[10px] text-slate-300 font-mono">🛏️ +{plot.level * 3} мест</div>
                        </div>
                      )}

                      {bType === 'guild' && (
                        /* Guild: Warehouse depot with crates and crane */
                        <div className="w-16 h-16 bg-gradient-to-b from-yellow-950 to-stone-900 border-2 border-amber-800 rounded-xl shadow-xl flex flex-col items-center justify-between p-1.5 relative overflow-hidden">
                          <div className="w-full h-4 bg-stone-800 rounded-t flex justify-center items-center text-[8px] text-amber-400 font-bold">
                            ГИЛЬДИЯ
                          </div>
                          <div className="text-sm">📦 ⛏️</div>
                          <div className="text-[9px] text-amber-300 font-bold">Склад руды</div>
                        </div>
                      )}

                      {bType === 'watchtower' && (
                        /* Watchtower: Tall observation post with shield & beacon */
                        <div className="w-12 h-18 bg-gradient-to-b from-stone-800 to-slate-950 border-2 border-slate-500 rounded-t-2xl shadow-xl flex flex-col items-center justify-between p-1 relative overflow-hidden">
                          <div className="text-xs animate-bounce">🚩</div>
                          <div className="w-8 h-4 bg-stone-700 rounded flex items-center justify-center text-[8px] text-slate-200">
                            ВЫШКА
                          </div>
                          <div className="text-xs">🛡️</div>
                        </div>
                      )}

                      {bType === 'workshop' && (
                        /* Workshop: Cart depot with wheels and wrenches */
                        <div className="w-16 h-16 bg-gradient-to-b from-slate-800 to-stone-900 border-2 border-cyan-700 rounded-xl shadow-xl flex flex-col items-center justify-between p-1.5 relative overflow-hidden">
                          <div className="w-full h-4 bg-cyan-950 rounded-t flex justify-center items-center text-[8px] text-cyan-300 font-bold">
                            ВАГОНЕТКИ
                          </div>
                          <div className="text-sm">🛒 ⚙️</div>
                          <div className="text-[9px] text-cyan-400 font-bold">Модули</div>
                        </div>
                      )}

                      {/* Dweller Workers Count Pill */}
                      {assignedCount > 0 && (
                        <div className="absolute -bottom-2 right-0 bg-emerald-950 border border-emerald-500/80 text-emerald-300 rounded-full px-1.5 py-0.5 text-[9px] font-bold flex items-center gap-0.5 shadow">
                          <span>👤</span>
                          <span>{assignedCount}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  /* ================= EMPTY PLOT ================= */
                  <motion.div
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative flex flex-col items-center group"
                  >
                    {/* Plot Label */}
                    <div className="bg-slate-950/80 border border-slate-700 text-slate-400 group-hover:text-amber-300 group-hover:border-amber-500 px-2 py-0.5 rounded-full text-[10px] font-bold mb-1 shadow transition-colors">
                      Участок #{pos.id + 1}
                    </div>

                    {/* Surveyor Stakes & Blueprint Platform */}
                    <div className="w-15 h-15 rounded-2xl bg-slate-950/70 border-2 border-dashed border-slate-600 group-hover:border-amber-400/80 flex flex-col items-center justify-center p-2 shadow-inner group-hover:shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all">
                      <Plus size={20} className="text-slate-500 group-hover:text-amber-400 transition-colors" />
                      <span className="text-[9px] font-bold text-slate-400 group-hover:text-amber-300 transition-colors mt-0.5">
                        Построить
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>
            );
          })}

          {/* ---------------- ROAMING DWELLERS (NPCS ON MAP) ---------------- */}
          {roamingPositions.map((dw) => {
            const isSpeaking = dwellerSpeech && dwellerSpeech.id === dw.id;
            return (
              <div
                key={dw.id}
                style={{
                  left: `${dw.x}%`,
                  top: `${dw.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className="absolute z-20 cursor-pointer pointer-events-auto transition-all duration-100 ease-linear flex flex-col items-center"
                onClick={(e) => {
                  e.stopPropagation();
                  sound.playHit();
                  const fullDw = dwellers.find(d => d.id === dw.id);
                  if (fullDw) setSelectedDweller(fullDw);
                }}
              >
                {/* Speech Bubble */}
                <AnimatePresence>
                  {isSpeaking && (
                    <motion.div
                      initial={{ opacity: 0, y: 5, scale: 0.8 }}
                      animate={{ opacity: 1, y: -12, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute -top-7 bg-slate-950/95 border border-amber-400/80 text-amber-200 px-2 py-1 rounded-xl text-[10px] font-bold shadow-xl whitespace-nowrap z-30 pointer-events-none"
                    >
                      💬 {dwellerSpeech.text}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Mini Dweller Sprite / Avatar */}
                <div className="relative group">
                  <div className="w-6 h-6 rounded-full bg-slate-900 border border-slate-600 shadow flex items-center justify-center text-xs group-hover:scale-125 transition-transform">
                    {dw.avatar}
                  </div>
                  {/* Small shadow underneath */}
                  <div className="w-4 h-1 bg-black/60 rounded-full mx-auto mt-0.5 blur-[0.5px]" />
                </div>
              </div>
            );
          })}

        </div>

      </div>

      {/* ================= BOTTOM QUICK ACTION DOCK ================= */}
      <div className="p-3 bg-slate-950/95 border-t border-slate-800 flex items-center justify-between gap-2 z-30 shadow-[0_-5px_20px_rgba(0,0,0,0.8)] backdrop-blur-md">
        {/* Mine Launch Button */}
        <button
          onClick={onOpenMineExpedition}
          className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all active:scale-98 cursor-pointer"
        >
          <Pickaxe size={16} />
          <span>Спуск в шахту</span>
          <span className="font-mono text-[10px] bg-emerald-950/80 px-1.5 py-0.5 rounded text-emerald-300 font-bold">
            {(state.unlockedDepth || 0) * 10 + 10}м
          </span>
        </button>

        {/* Dwellers Registry Button */}
        <button
          onClick={onOpenDwellers}
          className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors shadow"
        >
          <Users size={16} className="text-amber-400" />
          <span>Жители ({dwellers.length})</span>
        </button>
      </div>

      {/* ================= DWELLER INSPECTOR POPUP ================= */}
      {selectedDweller && (
        <div 
          onClick={() => setSelectedDweller(null)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center text-2xl shadow-inner">
                  {selectedDweller.avatar}
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-100">{selectedDweller.name}</h4>
                  <p className="text-[11px] text-amber-400">{selectedDweller.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                <Smile size={13} className="text-emerald-400" />
                <span className="font-mono text-emerald-400 font-bold">{selectedDweller.happiness}%</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-1.5 bg-slate-950/80 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Сила</span>
                <span className="font-mono font-bold text-amber-300">💪 {selectedDweller.stats.strength}</span>
              </div>
              <div className="p-1.5 bg-slate-950/80 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Шахтёрство</span>
                <span className="font-mono font-bold text-emerald-300">⛏️ {selectedDweller.stats.mining}</span>
              </div>
              <div className="p-1.5 bg-slate-950/80 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Ремесло</span>
                <span className="font-mono font-bold text-sky-300">⚒️ {selectedDweller.stats.crafting}</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 italic bg-slate-950/40 p-2 rounded-xl border border-slate-800/60">
              «{selectedDweller.quote}»
            </div>

            <button
              onClick={() => {
                setSelectedDweller(null);
                onOpenDwellers();
              }}
              className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors"
            >
              Управление жителем в реестре
            </button>
          </motion.div>
        </div>
      )}

    </div>
  );
}
