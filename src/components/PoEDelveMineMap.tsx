import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Pickaxe, Gem, Shield, Skull, Sparkles, Flame, Wrench, 
  Crown, Eye, Crosshair, Magnet, Check, ChevronRight, 
  Home, RefreshCw, AlertTriangle, Zap, Radio, Layers,
  Compass, ZoomIn, ZoomOut, ArrowRight, ArrowDown, HelpCircle,
  LocateFixed, Lock, Volume2, Navigation, X
} from 'lucide-react';
import { 
  DelveGridGraph, 
  DelveNode, 
  DelveNodeType, 
  DelvePath, 
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

// Spacing between grid intersections in SVG coordinate space
const CELL_SIZE_X = 140;
const CELL_SIZE_Y = 130;
// Base origin offsets
const ORIGIN_X = 1600;
const ORIGIN_Y = 160;

// Helper component for SVG icons inside nodes
const NodeIconSvg: React.FC<{ type: DelveNodeType; color: string; opacity?: number; size?: number }> = ({ 
  type, 
  color, 
  opacity = 1, 
  size = 18 
}) => {
  switch (type) {
    case 'ore':
      return <Pickaxe size={size} color={color} strokeWidth={2.2} style={{ opacity }} />;
    case 'azurite':
      return <Gem size={size} color={color} strokeWidth={2.2} style={{ opacity }} />;
    case 'currency':
      return <Sparkles size={size} color={color} strokeWidth={2.2} style={{ opacity }} />;
    case 'items':
      return <Shield size={size} color={color} strokeWidth={2.2} style={{ opacity }} />;
    case 'boss':
      return <Crown size={size} color={color} strokeWidth={2.2} style={{ opacity }} />;
    default:
      return <Pickaxe size={size} color={color} strokeWidth={2.2} style={{ opacity }} />;
  }
};

export const PoEDelveMineMap: React.FC<PoEDelveMineMapProps> = ({
  state,
  onSelectNodeAndStart,
  onReturnToTown,
  onBuyModule,
  canAffordModule,
  savedGrid,
  onUpdateGrid
}) => {
  // 1. Grid Graph state (PoE Delve matrix)
  const [grid, setGrid] = useState<DelveGridGraph>(() => {
    if (savedGrid && Object.keys(savedGrid.nodes).length > 0) return savedGrid;
    return generateDelveGrid(0, 0, 5, 5);
  });

  // Selected target node for expedition
  const [selectedNodeId, setSelectedNodeId] = useState<string>(() => {
    const current = grid.nodes[grid.currentCartNodeId];
    if (current && current.connectedNodes.length > 0) {
      // Prefer an unvisited reachable neighbor
      const reachableNeighbor = current.connectedNodes.find(id => {
        const n = grid.nodes[id];
        return n && (n.state === 'reachable' || (!n.visited && n.gridY >= current.gridY));
      });
      if (reachableNeighbor) return reachableNeighbor;
    }
    return grid.currentCartNodeId;
  });

  // Help modal toggle
  const [showLegend, setShowLegend] = useState(false);

  // Viewport Pan & Zoom state
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1.0);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Selected node & Current cart node
  const selectedNode: DelveNode = grid.nodes[selectedNodeId] || grid.nodes[grid.currentCartNodeId] || grid.nodes[getDelveNodeId(0, 0)];
  const currentCartNode: DelveNode = grid.nodes[grid.currentCartNodeId] || grid.nodes[getDelveNodeId(0, 0)];

  // Synchronize onUpdateGrid if state changes
  useEffect(() => {
    if (onUpdateGrid) {
      onUpdateGrid(grid);
    }
  }, [grid, onUpdateGrid]);

  // Center pan on the crawler cart initially
  useEffect(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      const cartX = ORIGIN_X + (currentCartNode?.gridX ?? 0) * CELL_SIZE_X;
      const cartY = ORIGIN_Y + (currentCartNode?.gridY ?? 0) * CELL_SIZE_Y;
      setPan({
        x: clientWidth / 2 - cartX * zoom,
        y: clientHeight / 2 - cartY * zoom
      });
    }
  }, []);

  const handleCenterOnCart = useCallback(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      const cartX = ORIGIN_X + (currentCartNode?.gridX ?? 0) * CELL_SIZE_X;
      const cartY = ORIGIN_Y + (currentCartNode?.gridY ?? 0) * CELL_SIZE_Y;
      setPan({
        x: clientWidth / 2 - cartX * zoom,
        y: clientHeight / 2 - cartY * zoom
      });
      sound.playClick();
    }
  }, [currentCartNode, zoom]);

  // Expand grid dynamically when selecting nodes near edges
  const handleSelectNode = (node: DelveNode) => {
    if (node.state === 'hidden') return;
    setSelectedNodeId(node.id);
    sound.playClick();

    // Check if we should expand the chart around this node
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

  // Find active route from current cart node to selected node
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

  // Mouse / Touch Drag & Pan Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch (_) {}
    }
  };

  // Wheel Zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    setZoom(prev => Math.min(1.8, Math.max(0.45, prev * zoomFactor)));
  };

  // Node position helper in world coordinates
  const getNodePos = (gx: number, gy: number) => ({
    x: ORIGIN_X + gx * CELL_SIZE_X,
    y: ORIGIN_Y + gy * CELL_SIZE_Y
  });

  // Calculate cart screen coordinates
  const cartPos = getNodePos(currentCartNode.gridX, currentCartNode.gridY);
  const targetPos = getNodePos(selectedNode.gridX, selectedNode.gridY);

  // Compute angle for crawler headlight towards target node
  const angleToTarget = Math.atan2(targetPos.y - cartPos.y, targetPos.x - cartPos.x) * (180 / Math.PI);

  const canStartExpedition = selectedNode.state === 'reachable' && !selectedNode.visited;
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
      {/* ATMOSPHERIC BACKGROUND WITH SUBTERRANEAN GRID */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 30%, rgba(30, 58, 138, 0.4) 0%, transparent 70%),
            linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 35px 35px, 35px 35px'
        }}
      />

      {/* TOP HEADER: SUBTERRANEAN CHART NAVIGATION & HUD */}
      <header className="relative z-30 flex items-center justify-between px-4 py-3 bg-[#090d16]/90 border-b border-amber-500/20 backdrop-blur-md shadow-lg">
        {/* Left: Brand and Depth Info */}
        <div className="flex items-center gap-3">
          {onReturnToTown && (
            <button
              onClick={() => {
                sound.playClick();
                onReturnToTown();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-600/50 rounded-lg text-xs font-bold transition shadow-sm"
              title="Вернуться в Поверхностный город"
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
                <span className="text-[9px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded">
                  Бесконечная сеть
                </span>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-2 font-mono">
                <span>Горизонт: <b className="text-slate-100">{currentCartNode.gridY}</b></span>
                <span>•</span>
                <span>Сектор: <b className="text-slate-100">{currentCartNode.gridX >= 0 ? `+${currentCartNode.gridX}E` : `${currentCartNode.gridX}W`}</b></span>
                <span>•</span>
                <span>Зачищено узлов: <b className="text-amber-300">{grid.clearedCount}</b></span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Sulphite & Cart Modules Quick Indicator */}
        <div className="hidden md:flex items-center gap-4 px-3 py-1 bg-slate-900/80 border border-slate-700/60 rounded-xl text-xs font-mono">
          <div className="flex items-center gap-1.5 text-yellow-400" title="Сульфит для вагонетки">
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
            <span className="font-bold">Сульфит: 100%</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-slate-400">Модули вагонетки:</span>
            <span className={state.cartModules?.searchlight ? "text-amber-400 font-bold" : "text-slate-600 line-through"}>
              💡 Прожектор
            </span>
            <span className={state.cartModules?.turret ? "text-emerald-400 font-bold" : "text-slate-600 line-through"}>
              🎯 Турель
            </span>
            <span className={state.cartModules?.magnet ? "text-cyan-400 font-bold" : "text-slate-600 line-through"}>
              🧲 Магнит
            </span>
          </div>
        </div>

        {/* Right: Zoom Controls & Center Button */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoom(z => Math.max(0.45, z - 0.15))}
            className="p-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
            title="Отдалить"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="text-[10px] font-mono text-slate-400 w-10 text-center">
            {Math.round(zoom * 100)}%
          </div>
          <button
            onClick={() => setZoom(z => Math.min(1.8, z + 0.15))}
            className="p-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
            title="Приблизить"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleCenterOnCart}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-xs font-bold ml-1 transition"
            title="Центрировать на вагонетке"
          >
            <LocateFixed className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">К вагонетке</span>
          </button>
          <button
            onClick={() => setShowLegend(v => !v)}
            className="p-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 ml-1"
            title="Справка по карте"
          >
            <HelpCircle className="w-4 h-4 text-sky-400" />
          </button>
        </div>
      </header>

      {/* SVG INTERACTIVE DELVE CHART CANVAS */}
      <div className="relative flex-1 w-full h-full overflow-hidden cursor-grab active:cursor-grabbing">
        <svg 
          className="w-full h-full block"
          style={{ width: '100%', height: '100%' }}
        >
          <defs>
            {/* Glowing filter for neon cables and active rails */}
            <filter id="goldGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            <filter id="cyanGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            <filter id="crimsonGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            {/* Radial gradient for illuminated cleared zones */}
            <radialGradient id="clearedAura" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
              <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#030712" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="crawlerHeadlight" cx="0%" cy="50%" r="100%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#fde047" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#030712" stopOpacity="0" />
            </radialGradient>

            {/* Fog of war gradient */}
            <radialGradient id="fogMaskGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#000" stopOpacity="0" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.85" />
            </radialGradient>
          </defs>

          {/* WORLD TRANSFORM CONTAINER (PAN & ZOOM) */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            
            {/* 1. TUNNEL GRID BACKGROUND TRACKS & BEDDING */}
            <g className="delve-paths-background">
              {grid.paths.map(path => {
                const n1 = grid.nodes[path.fromId];
                const n2 = grid.nodes[path.toId];
                if (!n1 || !n2) return null;
                if (n1.state === 'hidden' && n2.state === 'hidden') return null;

                const p1 = getNodePos(n1.gridX, n1.gridY);
                const p2 = getNodePos(n2.gridX, n2.gridY);

                return (
                  <g key={`bg_${path.id}`}>
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke="#0f172a"
                      strokeWidth="24"
                      strokeLinecap="round"
                    />
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke="#1e293b"
                      strokeWidth="10"
                      strokeDasharray="3 7"
                    />
                  </g>
                );
              })}
            </g>

            {/* 2. ILLUMINATED & CLEARED PATHS (GOLDEN DELVE CABLES) */}
            <g className="delve-paths-cleared">
              {grid.paths.map(path => {
                const n1 = grid.nodes[path.fromId];
                const n2 = grid.nodes[path.toId];
                if (!n1 || !n2) return null;

                const p1 = getNodePos(n1.gridX, n1.gridY);
                const p2 = getNodePos(n2.gridX, n2.gridY);
                const isCleared = path.cleared || (n1.visited && n2.visited);
                const isReachableTunnel = (n1.visited && n2.state === 'reachable') || (n2.visited && n1.state === 'reachable');

                if (isCleared) {
                  return (
                    <g key={`cleared_${path.id}`}>
                      <line
                        x1={p1.x}
                        y1={p1.y}
                        x2={p2.x}
                        y2={p2.y}
                        stroke="#f59e0b"
                        strokeWidth="8"
                        strokeOpacity="0.3"
                        strokeLinecap="round"
                        filter="url(#goldGlow)"
                      />
                      <line
                        x1={p1.x}
                        y1={p1.y}
                        x2={p2.x}
                        y2={p2.y}
                        stroke="#facc15"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                      <line
                        x1={p1.x}
                        y1={p1.y}
                        x2={p2.x}
                        y2={p2.y}
                        stroke="#ffffff"
                        strokeWidth="1"
                        strokeDasharray="6 12"
                      />
                    </g>
                  );
                } else if (isReachableTunnel) {
                  return (
                    <g key={`reachable_${path.id}`}>
                      <line
                        x1={p1.x}
                        y1={p1.y}
                        x2={p2.x}
                        y2={p2.y}
                        stroke="#38bdf8"
                        strokeWidth="3"
                        strokeOpacity="0.6"
                        strokeDasharray="5 5"
                        className="animate-pulse"
                      />
                    </g>
                  );
                } else if (n1.state !== 'hidden' || n2.state !== 'hidden') {
                  return (
                    <line
                      key={`dim_${path.id}`}
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke="#334155"
                      strokeWidth="2"
                    />
                  );
                }
                return null;
              })}
            </g>

            {/* 3. ACTIVE ROUTE HIGHLIGHTING */}
            <g className="delve-active-route">
              {grid.paths.map(path => {
                const isPart = activeRoutePathKeys.has(path.id);
                if (!isPart) return null;
                const n1 = grid.nodes[path.fromId];
                const n2 = grid.nodes[path.toId];
                if (!n1 || !n2) return null;

                const p1 = getNodePos(n1.gridX, n1.gridY);
                const p2 = getNodePos(n2.gridX, n2.gridY);

                return (
                  <g key={`route_${path.id}`}>
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke="#38bdf8"
                      strokeWidth="9"
                      strokeOpacity="0.4"
                      filter="url(#cyanGlow)"
                    />
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke="#0284c7"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke="#bae6fd"
                      strokeWidth="2"
                      strokeDasharray="8 6"
                      strokeDashoffset="0"
                      className="animate-[dash_1s_linear_infinite]"
                    />
                  </g>
                );
              })}
            </g>

            {/* 4. LIGHT ILLUMINATION CONE */}
            {state.cartModules?.searchlight && (
              <g 
                transform={`translate(${cartPos.x}, ${cartPos.y}) rotate(${angleToTarget})`}
                className="pointer-events-none opacity-80"
              >
                <polygon
                  points="0,0 280,-70 280,70"
                  fill="url(#crawlerHeadlight)"
                />
              </g>
            )}

            {/* 5. DELVE NODES */}
            <g className="delve-nodes">
              {(Object.values(grid.nodes) as DelveNode[]).map(node => {
                const pos = getNodePos(node.gridX, node.gridY);
                const isSelected = selectedNodeId === node.id;
                const isCurrentCart = currentCartNode.id === node.id;
                const theme = DELVE_NODE_THEMES[node.type] || DELVE_NODE_THEMES.ore;

                if (node.state === 'hidden') {
                  return (
                    <g 
                      key={node.id} 
                      transform={`translate(${pos.x}, ${pos.y})`}
                      className="opacity-25 pointer-events-none"
                    >
                      <circle r="14" fill="#090d16" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="3 3" />
                      <circle r="4" fill="#334155" />
                    </g>
                  );
                }

                if (node.state === 'visible') {
                  return (
                    <g
                      key={node.id}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      onClick={() => handleSelectNode(node)}
                      className="cursor-pointer transition-transform hover:scale-110"
                    >
                      <circle r="22" fill="#090d16" stroke="#334155" strokeWidth="2" strokeDasharray="4 3" />
                      <circle r="16" fill={theme.bgHex} fillOpacity="0.5" stroke={theme.borderHex} strokeWidth="1.5" strokeOpacity="0.5" />
                      <g transform="translate(-9, -9)">
                        <NodeIconSvg type={node.type} color={theme.color} opacity={0.65} size={18} />
                      </g>
                      <text
                        y="34"
                        textAnchor="middle"
                        fill="#64748b"
                        fontSize="9"
                        fontWeight="bold"
                        className="font-mono pointer-events-none"
                      >
                        {theme.badge}
                      </text>
                    </g>
                  );
                }

                if (node.visited || node.state === 'cleared') {
                  return (
                    <g
                      key={node.id}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      onClick={() => handleSelectNode(node)}
                      className="cursor-pointer group"
                    >
                      <circle r="36" fill="url(#clearedAura)" />
                      <circle
                        r="20"
                        fill="#1c1917"
                        stroke={isCurrentCart ? "#fbbf24" : "#eab308"}
                        strokeWidth={isCurrentCart ? "3.5" : "2"}
                        filter={isCurrentCart ? "url(#goldGlow)" : undefined}
                      />
                      <circle r="15" fill={theme.bgHex} stroke={theme.borderHex} strokeWidth="1.5" />
                      <g transform="translate(-9, -9)">
                        <NodeIconSvg type={node.type} color="#fef08a" size={18} />
                      </g>
                      
                      {!isCurrentCart && (
                        <g transform="translate(10, -10)">
                          <circle r="6" fill="#15803d" stroke="#22c55e" strokeWidth="1.5" />
                          <path d="M-3 0 L-1 2 L3 -2" fill="none" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
                        </g>
                      )}

                      <text
                        y="34"
                        textAnchor="middle"
                        fill="#cbd5e1"
                        fontSize="9"
                        fontWeight="bold"
                        className="font-mono pointer-events-none"
                      >
                        {theme.badge}
                      </text>
                    </g>
                  );
                }

                if (node.state === 'reachable') {
                  return (
                    <g
                      key={node.id}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      onClick={() => handleSelectNode(node)}
                      className="cursor-pointer group"
                    >
                      <circle
                        r="28"
                        fill="none"
                        stroke={theme.borderHex}
                        strokeWidth="1.5"
                        strokeOpacity="0.4"
                        className="animate-ping"
                      />

                      {isSelected && (
                        <circle
                          r="26"
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="2.5"
                          filter="url(#cyanGlow)"
                        />
                      )}

                      <circle
                        r="22"
                        fill={theme.bgHex}
                        stroke={isSelected ? "#38bdf8" : theme.borderHex}
                        strokeWidth={isSelected ? "3" : "2"}
                        filter={node.type === 'boss' ? "url(#crimsonGlow)" : "url(#goldGlow)"}
                      />

                      <g transform="translate(-9, -9)">
                        <NodeIconSvg type={node.type} color={theme.color} size={18} />
                      </g>

                      <g transform="translate(12, 12)">
                        <rect x="-10" y="-7" width="20" height="14" rx="4" fill="#0f172a" stroke={theme.borderHex} strokeWidth="1" />
                        <text x="0" y="3" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">
                          x{node.rewardMultiplier}
                        </text>
                      </g>

                      <text
                        y="36"
                        textAnchor="middle"
                        fill={isSelected ? "#38bdf8" : "#f1f5f9"}
                        fontSize="10"
                        fontWeight="bold"
                        className="font-mono tracking-wide pointer-events-none shadow"
                      >
                        {theme.badge}
                      </text>
                    </g>
                  );
                }

                return null;
              })}
            </g>

            {/* 6. CRAWLER WAGON */}
            <g 
              transform={`translate(${cartPos.x}, ${cartPos.y})`}
              className="pointer-events-none"
            >
              <circle r="28" fill="#f59e0b" fillOpacity="0.2" className="animate-pulse" />
              <rect
                x="-16"
                y="-13"
                width="32"
                height="26"
                rx="6"
                fill="#1e293b"
                stroke="#f59e0b"
                strokeWidth="2.5"
                filter="url(#goldGlow)"
              />
              <rect x="-11" y="-8" width="22" height="16" rx="3" fill="#451a03" stroke="#d97706" strokeWidth="1" />
              <circle cx="-5" cy="0" r="3" fill="#facc15" />
              <circle cx="5" cy="0" r="3" fill="#38bdf8" />
              <circle cx="-13" cy="13" r="4.5" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.5" />
              <circle cx="13" cy="13" r="4.5" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.5" />
              <circle cx="0" cy="-14" r="5" fill="#fef08a" stroke="#f59e0b" strokeWidth="1.5" filter="url(#goldGlow)" />
            </g>

          </g>
        </svg>

        {/* FOG OF WAR AMBIENT VIGNETTE OVERLAY */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 120px 50px rgba(2, 6, 23, 0.85)'
          }}
        />

        {/* DRAG & ZOOM HINT TOOLTIP (TOP RIGHT) */}
        <div className="absolute top-3 right-3 pointer-events-none hidden sm:flex items-center gap-2 px-2.5 py-1 bg-slate-900/80 border border-slate-700/60 rounded-md text-[10px] text-slate-400 font-mono">
          <Navigation className="w-3 h-3 text-amber-400" />
          <span>Перетаскивайте карту • Колесико: Зум</span>
        </div>
      </div>

      {/* BOTTOM CONTROL DOCK: SELECTED NODE DETAILS & EXPEDITION LAUNCH */}
      <div className="relative z-30 p-4 bg-[#090d16]/95 border-t border-amber-500/20 backdrop-blur-md shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Selected Node Details */}
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner shrink-0"
            style={{ 
              backgroundColor: currentTheme.bgHex, 
              borderColor: currentTheme.borderHex 
            }}
          >
            <NodeIconSvg type={selectedNode.type} color={currentTheme.color} size={26} />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-100">{currentTheme.badge}</span>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-slate-800 text-amber-400 border border-amber-500/30">
                x{selectedNode.rewardMultiplier} Награда
              </span>
              {selectedNode.visited && (
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                  Зачищено
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 max-w-md">
              {currentTheme.description || 'Узел подземной шахты. Запустите вагонетку для начала экспедиции.'}
            </p>
          </div>
        </div>

        {/* Modules & Action Button */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {/* Quick Buy Modules Buttons */}
          <div className="hidden lg:flex items-center gap-1.5 border-r border-slate-800 pr-3 mr-1">
            {!state.cartModules?.searchlight && (
              <button
                onClick={() => onBuyModule('searchlight')}
                disabled={!canAffordModule('searchlight')}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-semibold text-slate-300 rounded border border-slate-700 flex items-center gap-1"
                title="Купить Прожектор"
              >
                <span>💡 Прожектор</span>
              </button>
            )}
            {!state.cartModules?.turret && (
              <button
                onClick={() => onBuyModule('turret')}
                disabled={!canAffordModule('turret')}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-semibold text-slate-300 rounded border border-slate-700 flex items-center gap-1"
                title="Купить Турель"
              >
                <span>🎯 Турель</span>
              </button>
            )}
            {!state.cartModules?.magnet && (
              <button
                onClick={() => onBuyModule('magnet')}
                disabled={!canAffordModule('magnet')}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-semibold text-slate-300 rounded border border-slate-700 flex items-center gap-1"
                title="Купить Магнит"
              >
                <span>🧲 Магнит</span>
              </button>
            )}
          </div>

          {/* Start Expedition Launch Button */}
          <button
            onClick={() => {
              if (canStartExpedition) {
                sound.playClick();
                onSelectNodeAndStart(selectedNode);
              }
            }}
            disabled={!canStartExpedition}
            className={`w-full md:w-auto px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg ${
              canStartExpedition
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-amber-500/20 active:scale-95'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
            }`}
          >
            <span>В путь на вагонетке</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* HELP & LEGEND MODAL */}
      <AnimatePresence>
        {showLegend && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowLegend(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl text-slate-200 relative"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setShowLegend(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                <span>Справка по Шахте Недр (Delve Map)</span>
              </h3>

              <div className="space-y-3 text-xs text-slate-300">
                <p>
                  <b>Сетка Недр:</b> Бесконечная подземная карта. Чем глубже вы спускаетесь по вертикали (Горизонт), тем опаснее становятся враги и тем ценнее награды.
                </p>
                <div className="grid grid-cols-2 gap-2 my-2">
                  <div className="flex items-center gap-2 p-2 bg-slate-800/60 rounded-lg border border-slate-700/50">
                    <Pickaxe className="w-4 h-4 text-amber-400" />
                    <span><b>Руда:</b> Ресурсы</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-slate-800/60 rounded-lg border border-slate-700/50">
                    <Gem className="w-4 h-4 text-cyan-400" />
                    <span><b>Азурит:</b> Апгрейды</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-slate-800/60 rounded-lg border border-slate-700/50">
                    <Sparkles className="w-4 h-4 text-yellow-300" />
                    <span><b>Валюта:</b> Сокровища</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-slate-800/60 rounded-lg border border-slate-700/50">
                    <Crown className="w-4 h-4 text-rose-500" />
                    <span><b>Босс:</b> Элитный узел</span>
                  </div>
                </div>
                <p>
                  <b>Пути вагонетки:</b> Синий пунктир обозначает выбранный маршрут экспедиции. Золотые линии — уже зачищенные и освещенные тоннели.
                </p>
              </div>

              <button
                onClick={() => setShowLegend(false)}
                className="w-full mt-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs border border-slate-600 transition"
              >
                Понятно
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
