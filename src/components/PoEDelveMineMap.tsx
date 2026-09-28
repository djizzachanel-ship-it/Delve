import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Pickaxe, Gem, Shield, Crown, Sparkles, Flame, Home, 
  ZoomIn, ZoomOut, HelpCircle, LocateFixed, Navigation, X, ArrowRight
} from 'lucide-react';
import { 
  DelveGridGraph, 
  DelveNode, 
  DelveNodeType, 
  DELVE_NODE_THEMES,
  generateDelveGrid,
  findDelveRoute,
  getDelveNodeId
} from '../game/delveGrid';
import { GameState } from '../types';
import { sound } from '../game/audio';

export interface PoEDelveMineMapProps {
  state: GameState;
  onSelectNodeAndStart: (node: DelveNode) => void;
  onReturnToTown?: () => void;
  onBuyModule: (mod: 'searchlight' | 'turret' | 'magnet') => void;
  canAffordModule: (mod: 'searchlight' | 'turret' | 'magnet') => boolean;
  savedGrid?: DelveGridGraph;
  onUpdateGrid?: (grid: DelveGridGraph) => void;
}

const CELL_SIZE_X = 150;
const CELL_SIZE_Y = 140;
const ORIGIN_X = 1600;
const ORIGIN_Y = 160;

// Хеш-функция для стабильного смещения узлов
const getNodeJitter = (gx: number, gy: number) => {
  if (gx === 0 && gy === 0) return { offsetX: 0, offsetY: 0 };
  const hashX = Math.sin(gx * 12.9898 + gy * 78.233) * 43758.5453;
  const offsetX = ((Math.abs(hashX) % 1) - 0.5) * 45; 
  const hashY = Math.cos(gx * 35.123 + gy * 19.456) * 21941.1234;
  const offsetY = ((Math.abs(hashY) % 1) - 0.5) * 35;
  return { offsetX, offsetY };
};

const getNodePos = (gx: number, gy: number) => {
  const { offsetX, offsetY } = getNodeJitter(gx, gy);
  return {
    x: ORIGIN_X + gx * CELL_SIZE_X + offsetX,
    y: ORIGIN_Y + gy * CELL_SIZE_Y + offsetY
  };
};

// Генерация плавных кривых тоннелей Безье
const createCurvedPath = (p1: { x: number; y: number }, p2: { x: number; y: number }, seed: string) => {
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  
  const normX = -dy / dist;
  const normY = dx / dist;

  let charCodeSum = 0;
  for (let i = 0; i < seed.length; i++) charCodeSum += seed.charCodeAt(i);
  const bendAmount = (((charCodeSum % 30) - 15) * 1.2);

  const ctrlX = midX + normX * bendAmount;
  const ctrlY = midY + normY * bendAmount;

  return `M ${p1.x} ${p1.y} Q ${ctrlX} ${ctrlY} ${p2.x} ${p2.y}`;
};

const NodeIconSvg: React.FC<{ type: DelveNodeType; color: string; opacity?: number; size?: number }> = ({ 
  type, color, opacity = 1, size = 18 
}) => {
  switch (type) {
    case 'ore': return <Pickaxe size={size} color={color} strokeWidth={2.2} style={{ opacity }} />;
    case 'metal': return <Shield size={size} color={color} strokeWidth={2.2} style={{ opacity }} />;
    case 'shards': return <Gem size={size} color={color} strokeWidth={2.2} style={{ opacity }} />;
    case 'treasure': return <Sparkles size={size} color={color} strokeWidth={2.2} style={{ opacity }} />;
    case 'monster_nest': return <Flame size={size} color={color} strokeWidth={2.2} style={{ opacity }} />;
    case 'secret_cache': return <Pickaxe size={size} color={color} strokeWidth={2.2} style={{ opacity }} />;
    case 'boss': return <Crown size={size} color={color} strokeWidth={2.2} style={{ opacity }} />;
    default: return <Pickaxe size={size} color={color} strokeWidth={2.2} style={{ opacity }} />;
  }
};

export const PoEDelveMineMap: React.FC<PoEDelveMineMapProps> = ({
  state,
  onSelectNodeAndStart,
  onReturnToTown,
  savedGrid,
  onUpdateGrid
}) => {
  const [grid, setGrid] = useState<DelveGridGraph>(() => {
    if (savedGrid && Object.keys(savedGrid.nodes).length > 0) return savedGrid;
    return generateDelveGrid(0, 0, 5, 5);
  });

  const [selectedNodeId, setSelectedNodeId] = useState<string>(() => {
    const current = grid.nodes[grid.currentCartNodeId];
    if (current && current.connectedNodes.length > 0) {
      const reachableNeighbor = current.connectedNodes.find(id => {
        const n = grid.nodes[id];
        return n && (n.state === 'reachable' || (!n.visited && n.gridY >= current.gridY));
      });
      if (reachableNeighbor) return reachableNeighbor;
    }
    return grid.currentCartNodeId;
  });

  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const currentCartNode: DelveNode = grid.nodes[grid.currentCartNodeId] || grid.nodes[getDelveNodeId(0, 0)] || Object.values(grid.nodes)[0];
  const selectedNode: DelveNode = grid.nodes[selectedNodeId] || currentCartNode;

  useEffect(() => {
    if (onUpdateGrid) onUpdateGrid(grid);
  }, [grid, onUpdateGrid]);

  useEffect(() => {
    if (containerRef.current && currentCartNode) {
      const { clientWidth, clientHeight } = containerRef.current;
      const cartPos = getNodePos(currentCartNode.gridX, currentCartNode.gridY);
      setPan({
        x: clientWidth / 2 - cartPos.x * zoom,
        y: clientHeight / 2 - cartPos.y * zoom
      });
    }
  }, []);

  const handleCenterOnCart = useCallback(() => {
    if (containerRef.current && currentCartNode) {
      const { clientWidth, clientHeight } = containerRef.current;
      const cartPos = getNodePos(currentCartNode.gridX, currentCartNode.gridY);
      setPan({
        x: clientWidth / 2 - cartPos.x * zoom,
        y: clientHeight / 2 - cartPos.y * zoom
      });
      sound.playClick();
    }
  }, [currentCartNode, zoom]);

  const handleSelectNode = (node: DelveNode) => {
    if (node.state === 'hidden') return;
    setSelectedNodeId(node.id);
    sound.playClick();

    const maxGenDist = 4;
    let needsExpand = false;
    for (let dy = -2; dy <= maxGenDist; dy++) {
      for (let dx = -maxGenDist; dx <= maxGenDist; dx++) {
        const checkId = getDelveNodeId(node.gridX + dx, node.gridY + dy);
        if (!grid.nodes[checkId] && (node.gridY + dy >= 0)) {
          needsExpand = true;
          break;
        }
      }
      if (needsExpand) break;
    }

    if (needsExpand) {
      const expanded = generateDelveGrid(grid, node.gridX, node.gridY, 5, 5);
      setGrid(expanded);
    }
  };

  const activeRouteNodeIds = useMemo(() => {
    if (!currentCartNode || !selectedNode) return [];
    return findDelveRoute(grid, currentCartNode.id, selectedNode.id);
  }, [grid, currentCartNode, selectedNode]);

  const activeRoutePathKeys = useMemo(() => {
    const keys = new Set<string>();
    for (let i = 0; i < activeRouteNodeIds.length - 1; i++) {
      const a = activeRouteNodeIds[i];
      const b = activeRouteNodeIds[i + 1];
      keys.add([a, b].sort().join('<->'));
    }
    return keys;
  }, [activeRouteNodeIds]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    setPan({
      x: panStartRef.current.x + (e.clientX - dragStartRef.current.x),
      y: panStartRef.current.y + (e.clientY - dragStartRef.current.y)
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try { (e.target as HTMLElement).releasePointerCapture?.(e.pointerId); } catch (_) {}
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    setZoom(prev => Math.min(1.8, Math.max(0.45, prev * zoomFactor)));
  };

  const cartPos = getNodePos(currentCartNode.gridX, currentCartNode.gridY);
  const targetPos = getNodePos(selectedNode.gridX, selectedNode.gridY);
  
  const dx = targetPos.x - cartPos.x;
  const dy = targetPos.y - cartPos.y;
  const distanceToTarget = Math.sqrt(dx * dx + dy * dy) || 1;
  const beamAngle = Math.atan2(dy, dx) * (180 / Math.PI);
  const beamSpread = Math.min(70, Math.max(25, distanceToTarget * 0.22));

  const isConnected = currentCartNode.connectedNodes.includes(selectedNode.id);
  const canStartExpedition = !selectedNode.visited && (selectedNode.state === 'reachable' || isConnected) && selectedNode.id !== currentCartNode.id;
  const currentTheme = DELVE_NODE_THEMES[selectedNode.type] || DELVE_NODE_THEMES.ore;

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-[#030712] overflow-hidden select-none flex flex-col font-sans"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      style={{ touchAction: 'none' }}
    >
      <header className="relative z-30 flex items-center justify-between px-4 py-3 bg-[#090d16]/90 border-b border-amber-500/20 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-3">
          {onReturnToTown && (
            <button
              onClick={() => { sound.playClick(); onReturnToTown(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-600/50 rounded-lg text-xs font-bold transition shadow-sm"
            >
              <Home className="w-3.5 h-3.5 text-amber-400" />
              <span>В Город</span>
            </button>
          )}
          <div className="flex items-center gap-2 border-l border-slate-700/60 pl-3">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <div>
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <span>Карта Недр (PoE Delve Chart)</span>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-2 font-mono">
                <span>Горизонт: <b className="text-slate-100">{currentCartNode.gridY}</b></span>
                <span>•</span>
                <span>Зачищено: <b className="text-amber-300">{grid.clearedCount}</b></span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={() => setZoom(z => Math.max(0.45, z - 0.15))} className="p-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"><ZoomOut className="w-4 h-4" /></button>
          <div className="text-[10px] font-mono text-slate-400 w-10 text-center">{Math.round(zoom * 100)}%</div>
          <button onClick={() => setZoom(z => Math.min(1.8, z + 0.15))} className="p-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"><ZoomIn className="w-4 h-4" /></button>
          <button onClick={handleCenterOnCart} className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-xs font-bold ml-1 transition">
            <LocateFixed className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">К вагонетке</span>
          </button>
        </div>
      </header>

      <div className="relative flex-1 w-full h-full overflow-hidden cursor-grab active:cursor-grabbing">
        <svg className="w-full h-full block">
          <defs>
            <filter id="goldGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="cyanGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4.5" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <radialGradient id="clearedAura" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#030712" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="crawlerHeadlight" cx="0%" cy="50%" r="100%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#030712" stopOpacity="0" />
            </radialGradient>
          </defs>

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Тоннели */}
            <g className="delve-paths">
              {grid.paths.map(path => {
                const n1 = grid.nodes[path.fromId];
                const n2 = grid.nodes[path.toId];
                if (!n1 || !n2 || (n1.state === 'hidden' && n2.state === 'hidden')) return null;

                const p1 = getNodePos(n1.gridX, n1.gridY);
                const p2 = getNodePos(n2.gridX, n2.gridY);
                const pathD = createCurvedPath(p1, p2, path.id);
                
                const isCleared = path.cleared || (n1.visited && n2.visited);
                const isPartRoute = activeRoutePathKeys.has(path.id);

                if (isPartRoute) {
                  return (
                    <g key={path.id}>
                      <path d={pathD} fill="none" stroke="#38bdf8" strokeWidth="9" strokeOpacity="0.4" filter="url(#cyanGlow)" />
                      <path d={pathD} fill="none" stroke="#0284c7" strokeWidth="4" strokeLinecap="round" />
                    </g>
                  );
                }

                if (isCleared) {
                  return (
                    <g key={path.id}>
                      <path d={pathD} fill="none" stroke="#f59e0b" strokeWidth="7" strokeOpacity="0.3" filter="url(#goldGlow)" />
                      <path d={pathD} fill="none" stroke="#facc15" strokeWidth="3" strokeLinecap="round" />
                    </g>
                  );
                }

                return (
                  <path key={path.id} d={pathD} fill="none" stroke="#1e293b" strokeWidth="4" strokeDasharray="4 4" />
                );
              })}
            </g>

            {/* Освещение прожектора (Изолированное, с pointer-events: none) */}
            {state.cartModules?.searchlight && selectedNode.id !== currentCartNode.id && (
              <g 
                transform={`translate(${cartPos.x}, ${cartPos.y}) rotate(${beamAngle})`} 
                className="pointer-events-none opacity-80"
              >
                <polygon 
                  points={`0,0 ${distanceToTarget},-${beamSpread} ${distanceToTarget},${beamSpread}`} 
                  fill="url(#crawlerHeadlight)" 
                  className="pointer-events-none"
                />
              </g>
            )}

            {/* Узлы (Nodes) */}
            <g className="delve-nodes">
              {(Object.values(grid.nodes) as DelveNode[]).map(node => {
                const pos = getNodePos(node.gridX, node.gridY);
                const isSelected = selectedNodeId === node.id;
                const isCurrentCart = currentCartNode.id === node.id;
                const theme = DELVE_NODE_THEMES[node.type] || DELVE_NODE_THEMES.ore;

                if (node.state === 'hidden') return null;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={() => handleSelectNode(node)}
                    className="cursor-pointer group"
                  >
                    {node.visited && <circle r="36" fill="url(#clearedAura)" className="pointer-events-none" />}
                    
                    <circle
                      r="22"
                      fill={theme.bgHex}
                      stroke={isSelected ? "#38bdf8" : (isCurrentCart ? "#f59e0b" : theme.borderHex)}
                      strokeWidth={isSelected || isCurrentCart ? "3.5" : "2"}
                      filter={isSelected ? "url(#cyanGlow)" : (isCurrentCart ? "url(#goldGlow)" : undefined)}
                      className="transition-colors duration-150 pointer-events-auto"
                    />

                    <g transform="translate(-9, -9)" className="pointer-events-none transition-transform duration-150 origin-center">
                      <NodeIconSvg type={node.type} color={isSelected ? "#38bdf8" : theme.color} size={18} />
                    </g>

                    <text y="34" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontWeight="bold" className="font-mono pointer-events-none select-none">
                      {theme.badge}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* Вагонетка (Crawler Cart) */}
            <g transform={`translate(${cartPos.x}, ${cartPos.y})`} className="pointer-events-none">
              <circle r="26" fill="#f59e0b" fillOpacity="0.2" className="animate-pulse" />
              <rect x="-14" y="-11" width="28" height="22" rx="5" fill="#1e293b" stroke="#f59e0b" strokeWidth="2.5" filter="url(#goldGlow)" />
              <circle cx="0" cy="-12" r="4" fill="#fef08a" filter="url(#goldGlow)" />
            </g>
          </g>
        </svg>
      </div>

      <div className="relative z-30 p-4 bg-[#090d16]/95 border-t border-amber-500/20 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center border shrink-0" style={{ backgroundColor: currentTheme.bgHex, borderColor: currentTheme.borderHex }}>
            <NodeIconSvg type={selectedNode.type} color={currentTheme.color} size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-100">{currentTheme.badge}</span>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-slate-800 text-amber-400 border border-amber-500/30">
                x{selectedNode.rewardMultiplier} Награда
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 max-w-md">{currentTheme.description}</p>
          </div>
        </div>

        <button
          onClick={() => canStartExpedition && onSelectNodeAndStart(selectedNode)}
          disabled={!canStartExpedition}
          className={`w-full md:w-auto px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 transition ${
            canStartExpedition
              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 active:scale-95 shadow-lg shadow-amber-500/20 cursor-pointer'
              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
          }`}
        >
          <span>В путь на вагонетке</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
