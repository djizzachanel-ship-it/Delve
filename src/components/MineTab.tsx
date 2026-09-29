import React, { useEffect, useRef, useState } from 'react';
import { GameState, Item } from '../types';
import { GameAction, CART_MODULE_COSTS } from '../store';
import { calculatePlayerStats } from '../game/player';
import { 
  Heart, Flame, ChevronLeft, ChevronRight, Pickaxe, 
  Sparkles, Check, Eye, Crosshair, Magnet, Radio, Shield,
  Home, LogOut, Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { GameEngineState, Enemy, Loot, Slash, FloatingText, MiningNode, Torch, PerkDef } from '../game/types';
import { generateMineTrack, project } from '../game/mine';
import { updateGame } from '../game/engine';
import { drawGame } from '../game/renderer';
import { createEnemyInstance } from '../game/combat';
import { PoEDelveMineMap } from './PoEDelveMineMap';
import { DelveGridGraph, DelveNode, markDelveNodeCleared } from '../game/delveGrid';
import { TILE_SIZE, MAP_COLS, MAP_ROWS } from '../game/config';
import { sound } from '../game/audio';

const ALL_BLESSINGS: PerkDef[] = [
  {
    id: 'volatile_crystals',
    name: 'Взрывные Кристаллы',
    description: 'Убийство мобов и раскалывание жил взрывает осколки (умеренный урон 8 по площади).',
    icon: '💥'
  },
  {
    id: 'tesla_torches',
    name: 'Тесла-Факелы',
    description: 'Брошенные факелы раз в 2.2с бьют током одного ближайшего монстра (7 урона).',
    icon: '⚡'
  },
  {
    id: 'whirlwind_scavenger',
    name: 'Вихревой Сборщик',
    description: 'Каждый подбор руды или металла производит легкий рассекающий взмах (6 урона в радиусе 65).',
    icon: '🌀'
  },
  {
    id: 'shadow_hunter',
    name: 'Теневой Охотник',
    description: '+15% к урону, а каждое убийство монстра лечит +2 HP (Вампиризм).',
    icon: '🩸'
  },
  {
    id: 'light_shield',
    name: 'Световой Оплот',
    description: 'В свете вагонетки и факелов броня шахтёра повышается на +3.',
    icon: '🛡️'
  }
];

export interface MineTabProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  isActive: boolean;
  onReturnToTown?: () => void;
  autoStartTrigger?: { depth: number; focus: 'ore' | 'metal' | 'shards'; timestamp: number } | null;
}

export function MineTab({ state, dispatch, isActive, onReturnToTown, autoStartTrigger }: MineTabProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const torchCdRef = useRef<HTMLSpanElement>(null);
  
  const stats = calculatePlayerStats(state.player, state.equipment, state.activeTownBuff);
  const [inWave, setInWave] = useState(false);
  const [uiState, setUiState] = useState({ hp: stats.maxHealth, ore: 0, metal: 0, shards: 0 });
  const [selectedDepth, setSelectedDepth] = useState(state.unlockedDepth || 0);
  const [focus, setFocus] = useState<'ore'|'metal'|'shards'>('ore');

  // Perks state
  const [showPerkModal, setShowPerkModal] = useState(false);
  const [currentPerks, setCurrentPerks] = useState<PerkDef[]>([]);
  const [activePerk, setActivePerk] = useState<PerkDef | null>(null);

  // Post-wave result modal state
  const [waveResult, setWaveResult] = useState<{
    victory: boolean;
    loot: { ore: number; metal: number; shards: number };
    items: Item[];
    depth: number;
  } | null>(null);

  // PoE Delve Subterranean Chart state
  const [delveGrid, setDelveGrid] = useState<DelveGridGraph | undefined>(state.delveGrid || undefined);
  const [activeDelveNode, setActiveDelveNode] = useState<DelveNode | null>(null);

  useEffect(() => {
    if (state.delveGrid) {
      setDelveGrid(state.delveGrid);
    }
  }, [state.delveGrid]);

  const handleUpdateGrid = (newGrid: DelveGridGraph) => {
    setDelveGrid(newGrid);
    dispatch({ type: 'SET_DELVE_GRID', payload: newGrid });
  };

  const handleSelectNodeAndStart = (node: DelveNode) => {
    setActiveDelveNode(node);
    setSelectedDepth(node.depth);

    let nodeFocus: 'ore' | 'metal' | 'shards' = 'ore';
    if (node.type === 'metal') nodeFocus = 'metal';
    else if (node.type === 'shards' || node.type === 'secret_cache' || node.type === 'boss') nodeFocus = 'shards';
    else if (node.type === 'monster_nest') nodeFocus = Math.random() > 0.5 ? 'metal' : 'shards';
    else if (node.type === 'treasure') nodeFocus = 'metal';
    setFocus(nodeFocus);

    openPerkSelection();
  };

  useEffect(() => {
    if (autoStartTrigger && autoStartTrigger.timestamp > 0) {
      setSelectedDepth(autoStartTrigger.depth);
      setFocus(autoStartTrigger.focus);
      openPerkSelection();
    }
  }, [autoStartTrigger?.timestamp]);

  const gameRef = useRef({
    player: { x: 0, y: 0, hp: stats.maxHealth, attackTimer: 0, miningTimer: 0, inLight: true, moving: false },
    joystick: { active: false, originX: 0, originY: 0, currX: 0, currY: 0 },
    cart: { x: 0, y: 0, pathIndex: 0 },
    grid: [] as number[][],
    rails: [] as {x:number, y:number}[],
    nodes: [] as MiningNode[],
    torches: [] as Torch[],
    enemies: [] as Enemy[],
    loots: [] as Loot[],
    slashes: [] as Slash[],
    texts: [] as FloatingText[],
    width: 0,
    height: 0,
    lastTime: 0,
    waveStarted: false,
    torchCooldown: 0,
    winTimer: 0,
    screenShake: 0,
    accumulatedLoot: { ore: 0, metal: 0, shards: 0 },
    lightCanvas: null as HTMLCanvasElement | null,
    cartModules: state.cartModules || { searchlight: false, turret: false, magnet: false },
    activePerk: undefined as string | undefined,
    turretCooldown: 0,
    teslaCooldown: 0,
    bossDefeated: false,
    accumulatedItems: []
  });

  // Sync gameRef stats to UI
  useEffect(() => {
    if (!inWave) return;
    const interval = setInterval(() => {
      setUiState({
        hp: gameRef.current.player.hp,
        ore: gameRef.current.accumulatedLoot.ore,
        metal: gameRef.current.accumulatedLoot.metal,
        shards: gameRef.current.accumulatedLoot.shards,
      });
    }, 100);
    return () => clearInterval(interval);
  }, [inWave]);

  const openPerkSelection = () => {
    const shuffled = [...ALL_BLESSINGS].sort(() => 0.5 - Math.random());
    setCurrentPerks(shuffled.slice(0, 3));
    setShowPerkModal(true);
  };

  const startWave = (perkId?: string) => {
    sound.playDescent();
    dispatch({ type: 'SET_DEPTH', payload: selectedDepth });
    const { grid, rails, nodes, enemiesToSpawn, spawnPos } = generateMineTrack(selectedDepth, focus);
    gameRef.current.grid = grid;
    gameRef.current.rails = rails;
    gameRef.current.nodes = nodes;
    
    gameRef.current.player.x = spawnPos.x;
    gameRef.current.player.y = spawnPos.y;
    gameRef.current.player.hp = stats.maxHealth; // Full heal on enter
    gameRef.current.cart.x = spawnPos.x;
    gameRef.current.cart.y = spawnPos.y;
    gameRef.current.cart.pathIndex = 0;
    
    gameRef.current.joystick.active = false;
    gameRef.current.torches = [];
    gameRef.current.torchCooldown = 0;
    gameRef.current.cartModules = { ...(state.cartModules || { searchlight: false, turret: false, magnet: false }) };
    gameRef.current.activePerk = perkId;
    gameRef.current.bossDefeated = false;
    gameRef.current.ambientAmbushTimer = Math.max(6, 16 - selectedDepth * 2);
    gameRef.current.cartMilestonesTriggered = { p25: false, p50: false, p75: false };
    gameRef.current.darknessTimer = 0;
    
    const newEnemies: Enemy[] = [];
    enemiesToSpawn.forEach(e => {
        if (e.type === 'boss') {
            newEnemies.push(createEnemyInstance(
                'corridor_goblin', 
                selectedDepth, 
                e.x, 
                e.y, 
                { isBoss: true, bossKind: e.bossKind }
            ));
        } else {
            const kind = e.kind || 'corridor_goblin';
            newEnemies.push(createEnemyInstance(
                kind, 
                selectedDepth, 
                e.x, 
                e.y, 
                { isBoss: false }
            ));
        }
    });

    gameRef.current.enemies = newEnemies;
    gameRef.current.loots = [];
    gameRef.current.slashes = [];
    gameRef.current.texts = [];
    gameRef.current.accumulatedLoot = { ore: 0, metal: 0, shards: 0 };
    gameRef.current.accumulatedItems = [];
    gameRef.current.winTimer = 0;
    gameRef.current.screenShake = 0;
    gameRef.current.waveStarted = true;
    
    setUiState({ hp: stats.maxHealth, ore: 0, metal: 0, shards: 0 });
    setInWave(true);
  };

  const endWave = (died: boolean) => {
    gameRef.current.waveStarted = false;
    setInWave(false);
    
    const finalLoot = { ...gameRef.current.accumulatedLoot };
    const finalItems = [...(gameRef.current.accumulatedItems || [])];

    if (!died) {
      gameRef.current.loots.forEach(l => {
         finalLoot[l.type]++;
      });

      // Apply Node Reward Multiplier
      if (activeDelveNode && activeDelveNode.rewardMultiplier > 1.0) {
        finalLoot.ore = Math.round(finalLoot.ore * activeDelveNode.rewardMultiplier);
        finalLoot.metal = Math.round(finalLoot.metal * activeDelveNode.rewardMultiplier);
        finalLoot.shards = Math.round(finalLoot.shards * activeDelveNode.rewardMultiplier);
      }

      if (finalItems.length > 0) {
        finalItems.forEach(item => {
          dispatch({ type: 'ADD_ITEM', item });
        });
      }
      dispatch({ type: 'ADD_RESOURCES', payload: finalLoot });
      const nextUnlocked = Math.max(state.depth + 1, (activeDelveNode?.depth || 0) + 1);
      dispatch({ type: 'UNLOCK_DEPTH', payload: nextUnlocked });
      sound.playWin();

      // Progress delve chart on victory and expand fog of war in all directions
      if (activeDelveNode && delveGrid) {
        const updated = markDelveNodeCleared(delveGrid, activeDelveNode.id);
        setDelveGrid(updated);
        dispatch({ type: 'SET_DELVE_GRID', payload: updated });
      }
    } else {
      dispatch({ type: 'DIE', payload: { maxHealth: stats.maxHealth } });
      sound.playDeath();
    }

    gameRef.current.loots = [];
    dispatch({ type: 'HEAL' });

    setWaveResult({
      victory: !died,
      loot: died ? { ore: 0, metal: 0, shards: 0 } : finalLoot,
      items: died ? [] : finalItems,
      depth: state.depth
    });
  };

  useEffect(() => {
    if (!isActive) return;
    let animId: number;
    
    const resizeObserver = new ResizeObserver(entries => {
      if (containerRef.current && canvasRef.current) {
        const { width, height } = entries[0].contentRect;
        canvasRef.current.width = width;
        canvasRef.current.height = height;
        gameRef.current.width = width;
        gameRef.current.height = height;
        if (gameRef.current.lightCanvas) {
           gameRef.current.lightCanvas.width = width;
           gameRef.current.lightCanvas.height = height;
        }
      }
    });
    if (containerRef.current) resizeObserver.observe(containerRef.current);

    const moveWithCollisions = (entity: any, vx: number, vy: number, radius: number, dt: number, grid: number[][]) => {
      const isBlocked = (cx: number, cy: number) => {
        const c = Math.floor(cx / TILE_SIZE);
        const r = Math.floor(cy / TILE_SIZE);
        return grid[r]?.[c] === 1; 
      };

      let testX = entity.x + vx * dt;
      let testY = entity.y + vy * dt;

      const hitX = isBlocked(testX + radius, entity.y) || isBlocked(testX - radius, entity.y);
      const hitY = isBlocked(entity.x, testY + radius) || isBlocked(entity.x, testY - radius);

      if (!hitX) entity.x = testX;
      if (!hitY) entity.y = testY;
    };

    const spawnText = (x: number, y: number, text: string, color: string) => {
      gameRef.current.texts.push({ id: Math.random().toString(), x, y, text, color, life: 1, floatY: 0 });
    };

    // The main loop
    const loop = (time: number) => {
        const g = gameRef.current;
        if (g.lastTime === 0) g.lastTime = time;
        const dt = Math.min((time - g.lastTime) / 1000, 0.1);
        g.lastTime = time;
        
        if (g.waveStarted && canvasRef.current) {
            updateGame(g, dt, stats, state.depth, endWave, torchCdRef);
            drawGame(canvasRef.current.getContext('2d')!, g, stats);
        } else if (!g.waveStarted && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d')!;
            ctx.clearRect(0, 0, g.width, g.height);
            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            ctx.lineWidth = 1;
            for(let i = 0; i < g.width; i+=40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, g.height); ctx.stroke(); }
            for(let i = 0; i < g.height; i+=40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(g.width, i); ctx.stroke(); }
        }
        animId = requestAnimationFrame(loop);
    };
    
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isActive, stats.damage, stats.maxHealth, stats.armor, state.depth]);

  const getScreenCoords = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!inWave) return;
    if ((e.target as HTMLElement).closest('button')) return;
    
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = getScreenCoords(e.clientX, e.clientY);
    gameRef.current.joystick = { active: true, originX: x, originY: y, currX: x, currY: y };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (gameRef.current.joystick.active) {
      const { x, y } = getScreenCoords(e.clientX, e.clientY);
      gameRef.current.joystick.currX = x;
      gameRef.current.joystick.currY = y;
    }
  };

  const handlePointerUp = () => {
    gameRef.current.joystick.active = false;
  };

  const dropTorch = () => {
    const g = gameRef.current;
    if (g.torchCooldown <= 0) {
       sound.playTorch();
       g.torches.push({ id: Math.random().toString(), x: g.player.x, y: g.player.y, life: 30 });
       g.torchCooldown = 15;
    }
  };

  const handleBuyModule = (mod: 'searchlight' | 'turret' | 'magnet') => {
    sound.playEquip();
    dispatch({ type: 'UNLOCK_CART_MODULE', module: mod });
  };

  const canAfford = (mod: 'searchlight' | 'turret' | 'magnet') => {
    const cost = CART_MODULE_COSTS[mod];
    return state.resources.ore >= cost.ore &&
           state.resources.metal >= cost.metal &&
           state.resources.shards >= cost.shards;
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0f19] text-slate-100 relative overflow-hidden" ref={containerRef}>
      
      {/* TOP STATUS BAR */}
      <div className="p-3 bg-[#111827] border-b border-[#1f2937] shadow-[0_4px_20px_rgba(0,0,0,0.5)] z-20 flex justify-between items-center pointer-events-none">
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-widest text-[#9ca3af] font-bold">Шахтёр ур. {state.player.level}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <Heart size={14} className="text-[#ef4444]" />
            <span className="font-bold font-mono text-sm">{Math.floor(inWave ? uiState.hp : state.player.health)} / {stats.maxHealth}</span>
          </div>
          <div className="w-28 mt-1 h-1.5 bg-black rounded overflow-hidden">
            <div className="h-full bg-[#ef4444]" style={{ width: `${Math.max(0, (inWave ? uiState.hp : state.player.health) / stats.maxHealth * 100)}%` }} />
          </div>
        </div>

        {/* ACTIVE BLESSING HUD BADGE */}
        {inWave && activePerk && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold">
            <span>{activePerk.icon}</span>
            <span className="hidden sm:inline">{activePerk.name}</span>
          </div>
        )}

        {/* CART MODULES ACTIVE ICONS */}
        {inWave && (
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase mr-0.5">Вагонетка:</span>
            {state.cartModules?.searchlight && (
              <span title="Прожектор активен" className="text-yellow-400 text-xs">🔦</span>
            )}
            {state.cartModules?.turret && (
              <span title="Авто-турель активна" className="text-cyan-400 text-xs">🎯</span>
            )}
            {state.cartModules?.magnet && (
              <span title="Магнит активен" className="text-blue-400 text-xs">🧲</span>
            )}
            {!state.cartModules?.searchlight && !state.cartModules?.turret && !state.cartModules?.magnet && (
              <span className="text-slate-500 text-[10px]">Базовая</span>
            )}
          </div>
        )}
        
        <div className="flex items-center gap-2 pointer-events-auto">
          {inWave && (
            <button
              onClick={() => endWave(false)}
              className="px-2.5 py-1.5 bg-amber-600/90 hover:bg-amber-500 active:scale-95 text-slate-950 font-black text-xs rounded-lg flex items-center gap-1 border border-amber-400/80 shadow"
              title="Завершить экспедицию и эвакуировать ресурсы"
            >
              <LogOut size={13} />
              <span className="text-[10px] font-black uppercase">Эвакуация</span>
            </button>
          )}

          <div className="flex flex-col items-end gap-0.5 text-xs font-mono">
            <span className="text-[#facc15] font-semibold">Руда: {state.resources.ore + (inWave ? uiState.ore : 0)}</span>
            <span className="text-[#9ca3af]">Металл: {state.resources.metal + (inWave ? uiState.metal : 0)}</span>
            <span className="text-[#38bdf8]">Осколки: {state.resources.shards + (inWave ? uiState.shards : 0)}</span>
          </div>
        </div>
      </div>

      <div 
        className="flex-1 relative touch-none select-none bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]"
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="absolute inset-0 bg-[#020617] pointer-events-none" />
        
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block touch-none pointer-events-none" />

        {/* EXPEDITION PREPARATION SCREEN: INTERACTIVE PROCEDURAL MINE MAP TREE */}
        {!inWave && (
          <div className="absolute inset-0 z-10 pointer-events-auto">
            <PoEDelveMineMap
              state={state}
              savedGrid={delveGrid}
              onUpdateGrid={handleUpdateGrid}
              onSelectNodeAndStart={handleSelectNodeAndStart}
              onReturnToTown={onReturnToTown}
              onBuyModule={handleBuyModule}
              canAffordModule={canAfford}
            />
          </div>
        )}

        {/* ROGUELITE BLESSING / PERK CHOICE MODAL */}
        <AnimatePresence>
          {showPerkModal && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }} 
                animate={{ scale: 1, y: 0 }} 
                exit={{ scale: 0.9, y: 20 }}
                className="bg-[#111827] border border-amber-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col items-center"
              >
                <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-2xl mb-2">
                  ✨
                </div>
                <h3 className="text-xl font-black text-amber-400 uppercase tracking-widest text-center">
                  Благословение Глубин
                </h3>
                <p className="text-xs text-slate-400 text-center mb-5 font-semibold">
                  Выберите 1 реликвию для этого спуска в шахту:
                </p>

                <div className="w-full space-y-3 mb-5">
                  {currentPerks.map((perk) => (
                    <button
                      key={perk.id}
                      onClick={() => {
                        sound.playPerk();
                        setActivePerk(perk);
                        setShowPerkModal(false);
                        startWave(perk.id);
                      }}
                      className="w-full text-left p-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-amber-400 hover:bg-slate-800 transition-all flex items-start gap-3.5 group active:scale-[0.98]"
                    >
                      <div className="text-3xl p-1 bg-slate-800 rounded-lg group-hover:scale-110 transition-transform">
                        {perk.icon}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-black text-amber-300 group-hover:text-amber-200">
                          {perk.name}
                        </div>
                        <div className="text-xs text-slate-300 leading-relaxed mt-0.5">
                          {perk.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setShowPerkModal(false);
                    startWave();
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200 underline font-semibold"
                >
                  Пропустить выбор перка и начать
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* WAVE COMPLETION / DEFEAT RESULT MODAL */}
        <AnimatePresence>
          {waveResult && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }} 
                animate={{ scale: 1, y: 0 }} 
                exit={{ scale: 0.9, y: 20 }}
                className="bg-[#0f172a] border border-amber-500/50 rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 rounded-full bg-slate-900 border-2 border-amber-400 flex items-center justify-center text-3xl mb-3 shadow-lg">
                  {waveResult.victory ? '🏆' : '💀'}
                </div>

                <h3 className="text-xl font-black text-white uppercase tracking-wider mb-1">
                  {waveResult.victory ? 'Экспедиция Завершена!' : 'Шахтёр Ранен!'}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  {waveResult.victory 
                    ? `Горизонт ${waveResult.depth} пройден! Все добытые ресурсы благополучно подняты на поверхность.`
                    : 'Монстры вытеснили вас из забоя. Спасатели доставили вас на поверхность.'}
                </p>

                {waveResult.victory && (
                  <div className="w-full grid grid-cols-3 gap-2 bg-slate-900/90 p-3 rounded-2xl border border-slate-800 mb-4 text-xs font-mono font-bold">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-400 font-sans">РУДА</span>
                      <span className="text-amber-300">+{waveResult.loot.ore}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-400 font-sans">МЕТАЛЛ</span>
                      <span className="text-slate-200">+{waveResult.loot.metal}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-400 font-sans">ОСКОЛКИ</span>
                      <span className="text-cyan-400">+{waveResult.loot.shards}</span>
                    </div>
                  </div>
                )}

                {waveResult.items.length > 0 && (
                  <div className="w-full mb-4 text-left bg-slate-900/90 p-3 rounded-2xl border border-slate-800 text-xs">
                    <span className="text-[10px] text-slate-400 uppercase font-black">Найдены трофеи:</span>
                    {waveResult.items.map(item => (
                      <div key={item.id} className="text-amber-300 font-bold truncate mt-1 flex items-center gap-1.5">
                        <Award size={13} /> {item.name}
                      </div>
                    ))}
                  </div>
                )}

                <div className="w-full space-y-2">
                  {onReturnToTown && (
                    <button
                      onClick={() => {
                        setWaveResult(null);
                        onReturnToTown();
                      }}
                      className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 active:scale-95 text-slate-950 font-black rounded-xl text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2"
                    >
                      <Home size={16} />
                      <span>В Городок к постройкам</span>
                    </button>
                  )}
                  <button
                    onClick={() => setWaveResult(null)}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-bold rounded-xl text-xs"
                  >
                    Остаться у шахты
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* IN-WAVE TORCH BUTTON */}
        {inWave && (
          <div className="absolute inset-0 pointer-events-none z-20">
            <button 
              onClick={dropTorch} 
              className="pointer-events-auto absolute bottom-8 right-8 w-16 h-16 rounded-full bg-orange-600 border-2 border-orange-400 flex items-center justify-center shadow-[0_0_30px_rgba(234,88,12,0.6)] active:scale-90 transition-transform"
              title="Бросить факел"
            >
              <Flame size={28} className="text-white" />
              <span ref={torchCdRef} className="absolute inset-0 bg-black/70 rounded-full items-center justify-center font-bold text-lg hidden"></span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
