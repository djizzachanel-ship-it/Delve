import React, { useEffect, useRef, useState, useMemo } from 'react';
import { GameState, TownPlot, BuildingType } from '../types';
import { GameAction } from '../store';
import { BUILDINGS_CONFIG, getMaxDwellers } from '../game/townConfig';
import { 
  Hammer, 
  Flame, 
  Coffee, 
  Warehouse, 
  Home, 
  Shield, 
  Wrench, 
  Pickaxe, 
  X, 
  Sun, 
  Moon, 
  Sunset, 
  Sunrise, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Sparkles, 
  Check, 
  AlertCircle,
  Coins,
  ChevronDown,
  ChevronUp,
  Move,
  MapPin,
  Image as ImageIcon,
  Upload,
  CheckCircle2,
  Trash2,
  Landmark,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sound } from '../game/audio';

export type TimeOfDay = 'dawn' | 'day' | 'sunset' | 'night';

export interface SurfaceWorldViewProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  relocatingPlot?: TownPlot | null;
  onClearRelocate?: () => void;
  onOpenPlot: (plot: TownPlot) => void;
  onOpenTownHall?: (plot: TownPlot) => void;
  onOpenDwellers: () => void;
  onStartExpedition: (depth: number, focus: 'ore' | 'metal' | 'shards') => void;
  externalPlacementType?: BuildingType | null;
  onClearPlacement?: () => void;
  timeOfDay?: TimeOfDay;
  setTimeOfDay?: (time: TimeOfDay) => void;
  showGridLines?: boolean;
}

// Map Dimensions
const GRID_SIZE = 22;
const TILE_W = 64;
const TILE_H = 32;

// Isometric projection helpers
function gridToIso(gx: number, gy: number): { x: number; y: number } {
  return {
    x: (gx - gy) * (TILE_W / 2),
    y: (gx + gy) * (TILE_H / 2)
  };
}

function isoToGrid(isoX: number, isoY: number): { gx: number; gy: number } {
  const normX = isoX / (TILE_W / 2);
  const normY = isoY / (TILE_H / 2);
  return {
    gx: Math.floor((normY + normX) / 2),
    gy: Math.floor((normY - normX) / 2)
  };
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

interface DwellerWalker {
  id: string;
  name: string;
  avatar: string;
  gx: number;
  gy: number;
  targetGx: number;
  targetGy: number;
  progress: number;
  speed: number;
  role: 'woodcutter' | 'blacksmith' | 'miner' | 'patrol' | 'citizen';
  tunicColor: string;
  pantsColor: string;
  hairColor: string;
  beardColor?: string;
  hasHat?: boolean;
  tool: 'axe' | 'pickaxe' | 'hammer' | 'torch' | 'beer' | 'staff';
  actionState: 'walk' | 'chop' | 'hammer' | 'warm_hands' | 'idle';
  actionTimer: number;
  dir: number;
  walkCycle: number;
  currentNodeId?: string;
  thought?: string;
  thoughtTimer: number;
}

// Building types available
const BUILDABLE_TYPES: BuildingType[] = [
  'forge',
  'smelter',
  'tavern',
  'barracks',
  'watchtower',
  'guild',
  'workshop'
];

const ICONS: Record<BuildingType, React.ElementType> = {
  town_hall: Landmark,
  forge: Hammer,
  smelter: Flame,
  tavern: Coffee,
  barracks: Home,
  guild: Warehouse,
  watchtower: Shield,
  workshop: Wrench
};

const CATEGORIES = [
  { id: 'all', name: 'Все' },
  { id: 'production', name: 'Производство' },
  { id: 'settlement', name: 'Поселение' },
  { id: 'defense', name: 'Оборона и Склад' }
];

// Meadow path network waypoints (matching dirt roads, bridges, campfire, and mine)
interface MeadowWaypoint {
  id: string;
  gx: number;
  gy: number;
  name: string;
  action?: 'chop' | 'hammer' | 'warm_hands' | 'idle';
}

const MEADOW_WAYPOINTS: Record<string, MeadowWaypoint> = {
  campfire: { id: 'campfire', gx: 10, gy: 10, name: 'Костёр', action: 'warm_hands' },
  woodcut: { id: 'woodcut', gx: 11.5, gy: 10.5, name: 'Брёвна у костра', action: 'chop' },
  mine_track: { id: 'mine_track', gx: 4.5, gy: 5, name: 'Спуск в шахту', action: 'idle' },
  rail_bend: { id: 'rail_bend', gx: 5.5, gy: 7.5, name: 'Вагонетка', action: 'idle' },
  path_north: { id: 'path_north', gx: 8.5, gy: 7, name: 'Северная тропа', action: 'idle' },
  meadow_ne: { id: 'meadow_ne', gx: 13, gy: 6.5, name: 'Восточная поляна', action: 'idle' },
  path_east: { id: 'path_east', gx: 12.5, gy: 9.5, name: 'Перекрёсток', action: 'idle' },
  waterfall_bridge: { id: 'waterfall_bridge', gx: 15, gy: 15.5, name: 'Мост у водопада', action: 'idle' },
  path_south: { id: 'path_south', gx: 11, gy: 13, name: 'Южная тропинка', action: 'idle' },
  west_bridge: { id: 'west_bridge', gx: 4.5, gy: 14.5, name: 'Западный мост', action: 'idle' },
  clearing_west: { id: 'clearing_west', gx: 7, gy: 11, name: 'Западная поляна', action: 'idle' },
  clearing_south: { id: 'clearing_south', gx: 10, gy: 15, name: 'Южная поляна', action: 'idle' }
};

const WAYPOINT_GRAPH: Record<string, string[]> = {
  campfire: ['woodcut', 'path_north', 'path_east', 'path_south', 'clearing_west'],
  woodcut: ['campfire', 'path_east'],
  mine_track: ['rail_bend'],
  rail_bend: ['mine_track', 'path_north', 'clearing_west'],
  path_north: ['rail_bend', 'campfire', 'meadow_ne'],
  meadow_ne: ['path_north', 'path_east'],
  path_east: ['meadow_ne', 'campfire', 'woodcut', 'path_south'],
  path_south: ['campfire', 'waterfall_bridge', 'clearing_south'],
  waterfall_bridge: ['path_south'],
  clearing_south: ['path_south', 'campfire'],
  clearing_west: ['rail_bend', 'campfire', 'west_bridge'],
  west_bridge: ['clearing_west']
};

export function SurfaceWorldView({
  state,
  dispatch,
  relocatingPlot,
  onClearRelocate,
  onOpenPlot,
  onOpenTownHall,
  onOpenDwellers,
  onStartExpedition,
  externalPlacementType,
  onClearPlacement,
  timeOfDay: propTimeOfDay,
  setTimeOfDay: propSetTimeOfDay,
  showGridLines = false
}: SurfaceWorldViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Time of Day
  const [localTimeOfDay, setLocalTimeOfDay] = useState<TimeOfDay>('day');
  const timeOfDay = propTimeOfDay || localTimeOfDay;
  const setTimeOfDay = propSetTimeOfDay || setLocalTimeOfDay;
  const [autoCycle, setAutoCycle] = useState(false);

  // Construction Drawer expansion & category filter
  const [isMenuExpanded, setIsMenuExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Placement mode state
  const [placementType, setPlacementType] = useState<BuildingType | null>(externalPlacementType || null);
  const [activeRelocatePlot, setActiveRelocatePlot] = useState<TownPlot | null>(null);
  const [hoveredTile, setHoveredTile] = useState<{ gx: number; gy: number } | null>(null);
  const [placementValidity, setPlacementValidity] = useState<{ valid: boolean; reason: string }>({ valid: true, reason: '' });

  useEffect(() => {
    if (externalPlacementType !== undefined) {
      setPlacementType(externalPlacementType);
    }
  }, [externalPlacementType]);

  // Camera state: offset and zoom
  const [camera, setCamera] = useState({ x: -10, y: -90, zoom: 1.0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, camX: 0, camY: 0 });

  // Particles
  const particlesRef = useRef<Particle[]>([]);

  // Roaming Dwellers
  const walkersRef = useRef<DwellerWalker[]>([]);

  // Player hero on the map
  const heroRef = useRef({
    gx: 7.2,
    gy: 6.8,
    targetGx: 8.5,
    targetGy: 7.5,
    progress: 0,
    dir: 1
  });

  // Background image state (custom uploaded or default pre-rendered 3D diorama)
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [bgSource, setBgSource] = useState<'custom' | 'default' | 'none'>('default');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isBgMenuOpen, setIsBgMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [localShowGridLines, setLocalShowGridLines] = useState(showGridLines);
  const [bgNotification, setBgNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalShowGridLines(showGridLines);
  }, [showGridLines]);

  // Load initial background (custom from localStorage or pre-rendered default /town_surface.jpg)
  useEffect(() => {
    const customBg = localStorage.getItem('town_custom_bg');
    if (customBg) {
      const img = new Image();
      img.src = customBg;
      img.onload = () => {
        setBgImage(img);
        setBgSource('custom');
      };
      img.onerror = () => {
        loadDefaultBg();
      };
    } else {
      loadDefaultBg();
    }

    function loadDefaultBg() {
      const defaultImg = new Image();
      defaultImg.src = '/town_surface.jpg';
      defaultImg.onload = () => {
        setBgImage(defaultImg);
        setBgSource('default');
      };
      defaultImg.onerror = () => {
        setBgSource('none');
      };
    }
  }, []);

  // Handle uploaded background image file
  const handleLoadImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        try {
          localStorage.setItem('town_custom_bg', dataUrl);
        } catch (err) {
          console.warn('LocalStorage limit for custom background image:', err);
        }
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
          setBgImage(img);
          setBgSource('custom');
          setBgNotification('✅ Фон локации городка успешно установлен!');
          setTimeout(() => setBgNotification(null), 3500);
          sound.playLevelUp();
        };
      }
    };
    reader.readAsDataURL(file);
  };

  // Reset to default pre-rendered diorama
  const handleResetBg = () => {
    localStorage.removeItem('town_custom_bg');
    const defaultImg = new Image();
    defaultImg.src = '/town_surface.jpg';
    defaultImg.onload = () => {
      setBgImage(defaultImg);
      setBgSource('default');
      setBgNotification('Фон сброшен на стандартную 3D диораму');
      setTimeout(() => setBgNotification(null), 3000);
      sound.playMining();
    };
    defaultImg.onerror = () => {
      setBgSource('none');
      setBgImage(null);
    };
  };

  // Watch relocatingPlot prop from parent
  useEffect(() => {
    if (relocatingPlot && relocatingPlot.buildingType) {
      setActiveRelocatePlot(relocatingPlot);
      setPlacementType(relocatingPlot.buildingType);
      setIsMenuExpanded(false);
      sound.playMining();
    }
  }, [relocatingPlot]);

  // River geometry: continuous Bezier path points (gx, gy)
  const riverSpine = useMemo(() => [
    { gx: 18.5, gy: 0.0 },
    { gx: 17.8, gy: 3.5 },
    { gx: 17.0, gy: 7.0 },
    { gx: 16.5, gy: 10.5 },
    { gx: 17.2, gy: 14.0 },
    { gx: 18.0, gy: 17.5 },
    { gx: 18.5, gy: 21.5 }
  ], []);

  // Dirt road spine connecting Mine Entrance (gx 4, gy 4) down through village
  const roadSpine = useMemo(() => [
    { gx: 4.0, gy: 4.0 },
    { gx: 5.5, gy: 4.8 },
    { gx: 7.2, gy: 6.2 },
    { gx: 9.0, gy: 8.0 },
    { gx: 11.5, gy: 8.8 },
    { gx: 14.0, gy: 9.2 },
    { gx: 16.5, gy: 9.2 }, // crosses river here with bridge
    { gx: 18.8, gy: 9.2 }
  ], []);

  // Road branch into south village clearing
  const southRoadSpine = useMemo(() => [
    { gx: 9.0, gy: 8.0 },
    { gx: 9.2, gy: 11.0 },
    { gx: 9.5, gy: 14.5 },
    { gx: 9.8, gy: 18.0 }
  ], []);

  // Nature props: Stylized low-poly trees and rocks
  const natureProps = useMemo(() => {
    const trees: { gx: number; gy: number; type: 'pine' | 'deciduous'; size: number }[] = [
      // Mountain ridge pines
      { gx: 1.5, gy: 1.5, type: 'pine', size: 1.2 },
      { gx: 2.2, gy: 3.0, type: 'pine', size: 1.0 },
      { gx: 3.0, gy: 1.8, type: 'pine', size: 1.1 },
      { gx: 5.5, gy: 1.5, type: 'pine', size: 1.3 },
      { gx: 7.0, gy: 2.0, type: 'pine', size: 1.1 },
      { gx: 9.0, gy: 1.5, type: 'pine', size: 1.2 },
      { gx: 11.5, gy: 1.8, type: 'pine', size: 1.0 },
      { gx: 13.5, gy: 1.5, type: 'pine', size: 1.2 },

      // Deciduous round trees along meadows (like in screenshot)
      { gx: 2.8, gy: 6.5, type: 'deciduous', size: 1.1 },
      { gx: 3.5, gy: 8.5, type: 'deciduous', size: 1.0 },
      { gx: 2.5, gy: 12.0, type: 'deciduous', size: 1.2 },
      { gx: 3.0, gy: 15.5, type: 'deciduous', size: 1.0 },
      { gx: 13.0, gy: 4.5, type: 'deciduous', size: 1.1 },
      { gx: 14.5, gy: 6.0, type: 'deciduous', size: 1.2 },
      { gx: 12.5, gy: 13.0, type: 'deciduous', size: 1.0 },
      { gx: 14.0, gy: 15.0, type: 'deciduous', size: 1.1 },

      // Southern border pines (like in screenshot foreground)
      { gx: 12.0, gy: 19.5, type: 'pine', size: 1.1 },
      { gx: 13.2, gy: 18.5, type: 'pine', size: 1.2 },
      { gx: 14.5, gy: 19.0, type: 'pine', size: 1.3 },
      { gx: 15.8, gy: 18.5, type: 'pine', size: 1.0 },
      { gx: 11.0, gy: 18.0, type: 'deciduous', size: 1.0 },
      { gx: 5.5, gy: 18.5, type: 'deciduous', size: 1.1 }
    ];

    const rocks: { gx: number; gy: number; size: number }[] = [
      { gx: 5.8, gy: 7.2, size: 0.8 },
      { gx: 6.2, gy: 7.6, size: 0.6 },
      { gx: 8.2, gy: 6.5, size: 0.7 },
      { gx: 11.8, gy: 10.2, size: 0.9 },
      { gx: 14.5, gy: 11.0, size: 0.8 },
      { gx: 8.5, gy: 15.2, size: 0.7 }
    ];

    return { trees, rocks };
  }, []);

  // Initialize roaming dwellers with realistic 3D appearance and roles
  useEffect(() => {
    const dwellers = state.dwellers || [];
    if (dwellers.length === 0) return;

    const ROLES_CONFIG: {
      role: DwellerWalker['role'];
      tool: DwellerWalker['tool'];
      tunicColor: string;
      pantsColor: string;
      hairColor: string;
      beardColor?: string;
      hasHat?: boolean;
      startNode: string;
      quotes: string[];
    }[] = [
      {
        role: 'woodcutter',
        tool: 'axe',
        tunicColor: '#166534',
        pantsColor: '#451a03',
        hairColor: '#b45309',
        beardColor: '#b45309',
        startNode: 'woodcut',
        quotes: ['Сухое бревно — отличные дрова для костра!', 'Ещё пару взмахов и дрова готовы.', 'Держись подальше от лезвия!']
      },
      {
        role: 'miner',
        tool: 'pickaxe',
        tunicColor: '#0369a1',
        pantsColor: '#1e293b',
        hairColor: '#334155',
        hasHat: true,
        startNode: 'mine_track',
        quotes: ['В шахте нашли богатую жилу титана!', 'Кирка наточена — пора на смену.', 'Свет фонаря разгоняет тьму глубин.']
      },
      {
        role: 'blacksmith',
        tool: 'hammer',
        tunicColor: '#9a3412',
        pantsColor: '#292524',
        hairColor: '#1c1917',
        beardColor: '#292524',
        startNode: 'campfire',
        quotes: ['Металл должен быть раскалён добела!', 'Выкую броню, которую не пробьёт ни один тролль.', 'Искры летят — работа спорится!']
      },
      {
        role: 'citizen',
        tool: 'beer',
        tunicColor: '#b91c1c',
        pantsColor: '#374151',
        hairColor: '#ca8a04',
        startNode: 'path_east',
        quotes: ['За процветание нашего поселения!', 'В таверне сегодня лучший эль в горах!', 'Хороший денёк для славных подвигов.']
      },
      {
        role: 'patrol',
        tool: 'staff',
        tunicColor: '#475569',
        pantsColor: '#1e293b',
        hairColor: '#4b5563',
        hasHat: true,
        startNode: 'path_south',
        quotes: ['На мосту и тропах всё спокойно.', 'Дозорные не дремлют!', 'Границы поселения под надёжной защитой.']
      }
    ];

    walkersRef.current = dwellers.slice(0, 5).map((d, index) => {
      const config = ROLES_CONFIG[index % ROLES_CONFIG.length];
      const startWp = MEADOW_WAYPOINTS[config.startNode] || MEADOW_WAYPOINTS.campfire;
      return {
        id: d.id,
        name: d.name,
        avatar: d.avatar,
        gx: startWp.gx,
        gy: startWp.gy,
        targetGx: startWp.gx,
        targetGy: startWp.gy,
        progress: 1,
        speed: 0.005 + (index % 3) * 0.002,
        role: config.role,
        tunicColor: config.tunicColor,
        pantsColor: config.pantsColor,
        hairColor: config.hairColor,
        beardColor: config.beardColor,
        hasHat: config.hasHat,
        tool: config.tool,
        actionState: startWp.action || 'idle',
        actionTimer: Math.random() * 200 + 100,
        dir: 1,
        walkCycle: Math.random() * 10,
        currentNodeId: config.startNode,
        thought: config.quotes[0],
        thoughtTimer: Math.random() * 300 + 120
      };
    });
  }, [state.dwellers?.length]);

  // Day / Night automated cycle
  useEffect(() => {
    if (!autoCycle) return;
    const interval = setInterval(() => {
      setTimeOfDay(prev => {
        if (prev === 'dawn') return 'day';
        if (prev === 'day') return 'sunset';
        if (prev === 'sunset') return 'night';
        return 'dawn';
      });
    }, 45000);
    return () => clearInterval(interval);
  }, [autoCycle]);

  // Cancel placement on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (placementType) {
          setPlacementType(null);
          setActiveRelocatePlot(null);
          onClearRelocate?.();
          sound.playHit();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [placementType, onClearRelocate]);

  // Validate free placement at footprint [gx..gx+1, gy..gy+1]
  const validatePlacement = (gx: number, gy: number, bType: BuildingType): { valid: boolean; reason: string } => {
    const bInfo = BUILDINGS_CONFIG[bType];
    if (!bInfo) return { valid: false, reason: 'Неизвестное здание' };

    // If new construction, check resource costs
    if (!activeRelocatePlot) {
      const cost = bInfo.getCost(0);
      if (
        state.resources.ore < cost.ore ||
        state.resources.metal < cost.metal ||
        state.resources.shards < cost.shards
      ) {
        return { 
          valid: false, 
          reason: `Недостаточно ресурсов (нужно: ${cost.ore} руды, ${cost.metal} металла)` 
        };
      }
    }

    // Bounds check
    if (gx < 2 || gx + 1 >= GRID_SIZE - 2 || gy < 2 || gy + 1 >= GRID_SIZE - 2) {
      return { valid: false, reason: 'Слишком близко к границе карты' };
    }

    // Mountain rock ridge check (top-left background where cliffs are)
    if (gx + gy <= 7 || (gx <= 4 && gy <= 5)) {
      return { valid: false, reason: 'Горный хребет! Строительство невозможно' };
    }

    // River distance check (river is around gx 16.5..18.5)
    for (let dx = 0; dx < 2; dx++) {
      for (let dy = 0; dy < 2; dy++) {
        const curX = gx + dx;
        const curY = gy + dy;

        // River corridor
        if (curX >= 16 && curX <= 19) {
          return { valid: false, reason: 'Берег горной реки! Нельзя строить на воде' };
        }

        // Mine entrance and rails area (around gx <= 6, gy <= 7)
        if (curX <= 5 && curY <= 8) {
          return { valid: false, reason: 'Шахтный ствол и пути вагонетки! Строительство запрещено' };
        }

        // Central campfire and log seating
        if (curX >= 9 && curX <= 11 && curY >= 9 && curY <= 11) {
          return { valid: false, reason: 'Центральный костёр поселения!' };
        }
      }
    }

    // Overlap with existing buildings
    const plots = state.townPlots || [];
    for (const plot of plots) {
      if (plot.buildingType && plot.tileX !== undefined && plot.tileY !== undefined) {
        // Skip current plot if we are relocating it
        if (activeRelocatePlot && plot.id === activeRelocatePlot.id) continue;

        const pX = plot.tileX;
        const pY = plot.tileY;
        const overlaps = !(gx + 1 < pX || gx > pX + 1 || gy + 1 < pY || gy > pY + 1);
        if (overlaps) {
          const name = BUILDINGS_CONFIG[plot.buildingType]?.name.split('«')[0] || 'Здание';
          return { valid: false, reason: `Место занято: ${name}` };
        }
      }
    }

    return { valid: true, reason: 'Место свободно — кликните для установки!' };
  };

  // Spawn dust particles
  const spawnBuildParticles = (gx: number, gy: number) => {
    const iso = gridToIso(gx + 1, gy + 1);
    const colors = ['#f59e0b', '#fbbf24', '#78716c', '#a8a29e', '#e2e8f0', '#67e8f9'];
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 4.0;
      particlesRef.current.push({
        x: iso.x + (Math.random() - 0.5) * 50,
        y: iso.y + (Math.random() - 0.5) * 25,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.0,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.random() * 5,
        life: 0,
        maxLife: 35 + Math.random() * 25
      });
    }
  };

  // Handle building placement on click
  const handleConfirmPlacement = (gx: number, gy: number) => {
    if (!placementType) return;
    const validity = validatePlacement(gx, gy, placementType);
    if (!validity.valid) {
      sound.playHit();
      return;
    }

    sound.playLevelUp();
    spawnBuildParticles(gx, gy);

    if (activeRelocatePlot) {
      // Relocate existing building
      dispatch({
        type: 'MOVE_BUILDING',
        plotId: activeRelocatePlot.id,
        tileX: gx,
        tileY: gy
      });
      setActiveRelocatePlot(null);
      onClearRelocate?.();
    } else {
      // Place new building
      dispatch({
        type: 'PLACE_BUILDING',
        buildingType: placementType,
        tileX: gx,
        tileY: gy
      });
    }

    setPlacementType(null);
  };

  // Canvas Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let tick = 0;

    const render = () => {
      tick++;

      // Canvas dimensions & DPR
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const targetW = Math.floor(rect.width * dpr);
      const targetH = Math.floor(rect.height * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      const width = rect.width;
      const height = rect.height;

      // ================= 1. SKY & HORIZON GRADIENT =================
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      if (timeOfDay === 'dawn') {
        bgGrad.addColorStop(0, '#1e1b4b');
        bgGrad.addColorStop(0.45, '#7c2d12');
        bgGrad.addColorStop(0.8, '#fdba74');
        bgGrad.addColorStop(1, '#1e293b');
      } else if (timeOfDay === 'day') {
        bgGrad.addColorStop(0, '#0c4a6e');
        bgGrad.addColorStop(0.35, '#38bdf8');
        bgGrad.addColorStop(0.65, '#bae6fd');
        bgGrad.addColorStop(1, '#0f172a');
      } else if (timeOfDay === 'sunset') {
        bgGrad.addColorStop(0, '#2e1065');
        bgGrad.addColorStop(0.4, '#9a3412');
        bgGrad.addColorStop(0.75, '#fb923c');
        bgGrad.addColorStop(1, '#0f172a');
      } else {
        // Night
        bgGrad.addColorStop(0, '#020617');
        bgGrad.addColorStop(0.5, '#090d1f');
        bgGrad.addColorStop(1, '#020617');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Apply camera transform
      ctx.save();
      ctx.translate(width / 2 + camera.x, height / 2 + camera.y);
      ctx.scale(camera.zoom, camera.zoom);

      // ================= 2. TERRAIN & ENVIRONMENT =================
      if (bgImage && bgSource !== 'none') {
        // Draw pre-rendered high-quality 3D diorama background
        const imgW = 1600;
        const imgH = imgW * (bgImage.height / bgImage.width);
        const imgX = -imgW / 2;
        const imgY = 352 - imgH / 2;

        ctx.drawImage(bgImage, imgX, imgY, imgW, imgH);

        // Animated Campfire at center crossroads (gx: 10.5, gy: 10.5)
        const campIso = gridToIso(10.5, 10.5);
        const campFlicker = Math.sin(tick * 0.15) * 3;
        
        // Warm flickering campsite light
        ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
        ctx.beginPath();
        ctx.arc(campIso.x, campIso.y + 4, 38 + campFlicker, 0, Math.PI * 2);
        ctx.fill();

        // Animated flames
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(campIso.x, campIso.y - 2, 7 + campFlicker * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(campIso.x, campIso.y - 4, 4 + campFlicker * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Rising embers from campfire
        if (tick % 7 === 0) {
          particlesRef.current.push({
            x: campIso.x + (Math.random() - 0.5) * 12,
            y: campIso.y - 4,
            vx: (Math.random() - 0.5) * 0.8,
            vy: -1.2 - Math.random() * 1.5,
            color: Math.random() > 0.4 ? '#fbbf24' : '#ef4444',
            size: 1.5 + Math.random() * 2,
            life: 0,
            maxLife: 25 + Math.random() * 15
          });
        }

        // Clickable Mine Shaft Entrance Highlight & Sign at (gx: 4, gy: 4)
        const mIso = gridToIso(4.0, 4.0);
        const isHoveringMine = hoveredTile && (hoveredTile.gx >= 2 && hoveredTile.gx <= 6) && (hoveredTile.gy >= 2 && hoveredTile.gy <= 6);

        if (isHoveringMine) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(mIso.x, mIso.y + 10, 56, 30, 0, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
          ctx.fill();
        }

        // Floating wooden sign above mine entrance
        ctx.fillStyle = isHoveringMine ? '#0284c7' : 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        ctx.roundRect(mIso.x - 56, mIso.y - 40, 112, 22, 6);
        ctx.fill();
        ctx.strokeStyle = isHoveringMine ? '#38bdf8' : '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⛏️ СПУСК В ШАХТУ', mIso.x, mIso.y - 25);
      } else {
        // Fallback procedural mountain range & faceted terrain
        const mountainPeaks = [
        { x: -380, y: -240, w: 260, h: 220, snowH: 70 },
        { x: -180, y: -280, w: 300, h: 260, snowH: 85 },
        { x: 60, y: -300, w: 320, h: 280, snowH: 95 },
        { x: 300, y: -260, w: 280, h: 240, snowH: 75 },
        { x: 520, y: -220, w: 250, h: 200, snowH: 60 }
      ];

      for (const m of mountainPeaks) {
        // Left facet (illuminated)
        ctx.fillStyle = timeOfDay === 'night' ? '#1e293b' : '#64748b';
        ctx.beginPath();
        ctx.moveTo(m.x, m.y - m.h);
        ctx.lineTo(m.x - m.w / 2, m.y);
        ctx.lineTo(m.x, m.y);
        ctx.closePath();
        ctx.fill();

        // Right facet (shaded)
        ctx.fillStyle = timeOfDay === 'night' ? '#0f172a' : '#475569';
        ctx.beginPath();
        ctx.moveTo(m.x, m.y - m.h);
        ctx.lineTo(m.x, m.y);
        ctx.lineTo(m.x + m.w / 2, m.y);
        ctx.closePath();
        ctx.fill();

        // Snow Cap: Left facet
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(m.x, m.y - m.h);
        ctx.lineTo(m.x - (m.w / 2) * (m.snowH / m.h), m.y - m.h + m.snowH);
        ctx.lineTo(m.x, m.y - m.h + m.snowH * 0.85);
        ctx.closePath();
        ctx.fill();

        // Snow Cap: Right facet
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(m.x, m.y - m.h);
        ctx.lineTo(m.x, m.y - m.h + m.snowH * 0.85);
        ctx.lineTo(m.x + (m.w / 2) * (m.snowH / m.h), m.y - m.h + m.snowH);
        ctx.closePath();
        ctx.fill();
      }

      // ================= 3. CONTINUOUS LOW-POLY FACETED MEADOW (NO BLACK GRID LINES!) =================
      // Split each cell into 2 triangles with subtle directional low-poly shading
      for (let gx = 0; gx < GRID_SIZE; gx++) {
        for (let gy = 0; gy < GRID_SIZE; gy++) {
          const p0 = gridToIso(gx, gy);
          const p1 = gridToIso(gx + 1, gy);
          const p2 = gridToIso(gx + 1, gy + 1);
          const p3 = gridToIso(gx, gy + 1);

          // Check if cliff rock area (upper-left)
          const isCliff = (gx + gy <= 5);

          if (isCliff) {
            // Rocky cliff terrace
            ctx.fillStyle = '#475569';
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#334155';
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p3.x, p3.y);
            ctx.closePath();
            ctx.fill();
          } else {
            // Lush low-poly meadow grass (faceted sunlight)
            // Triangle 1 (faces top-left / sunlight)
            const altLight = (gx * 3 + gy * 7) % 5;
            const greenLight = altLight === 0 ? '#7fc43a' : altLight === 1 ? '#76be32' : '#6fb52b';
            ctx.fillStyle = greenLight;
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.closePath();
            ctx.fill();

            // Triangle 2 (faces bottom-right / shaded)
            const greenShade = altLight === 0 ? '#5d9c22' : altLight === 1 ? '#56931d' : '#62a227';
            ctx.fillStyle = greenShade;
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p3.x, p3.y);
            ctx.closePath();
            ctx.fill();
          }
        }
      }

      // ================= 4. CONTINUOUS ORGANIC DIRT ROADS =================
      // Smooth spline drawing for paths
      const drawSmoothRoad = (points: { gx: number; gy: number }[], baseW: number) => {
        if (points.length < 2) return;
        const isoPts = points.map(p => gridToIso(p.gx, p.gy));

        // 1. Soft shaded border
        ctx.strokeStyle = '#c48946';
        ctx.lineWidth = baseW + 6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(isoPts[0].x, isoPts[0].y);
        for (let i = 1; i < isoPts.length; i++) {
          const prev = isoPts[i - 1];
          const curr = isoPts[i];
          const mx = (prev.x + curr.x) / 2;
          const my = (prev.y + curr.y) / 2;
          ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
        }
        ctx.lineTo(isoPts[isoPts.length - 1].x, isoPts[isoPts.length - 1].y);
        ctx.stroke();

        // 2. Warm dirt road core
        ctx.strokeStyle = '#dca766';
        ctx.lineWidth = baseW;
        ctx.beginPath();
        ctx.moveTo(isoPts[0].x, isoPts[0].y);
        for (let i = 1; i < isoPts.length; i++) {
          const prev = isoPts[i - 1];
          const curr = isoPts[i];
          const mx = (prev.x + curr.x) / 2;
          const my = (prev.y + curr.y) / 2;
          ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
        }
        ctx.lineTo(isoPts[isoPts.length - 1].x, isoPts[isoPts.length - 1].y);
        ctx.stroke();
      };

      drawSmoothRoad(roadSpine, 24);
      drawSmoothRoad(southRoadSpine, 20);

      // ================= 5. NATURAL CURVED MOUNTAIN RIVER (NOT SQUARES!) =================
      const riverIsoPts = riverSpine.map(p => gridToIso(p.gx, p.gy));

      // River bank shore (sand/clay)
      ctx.strokeStyle = '#b48347';
      ctx.lineWidth = 36;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(riverIsoPts[0].x, riverIsoPts[0].y);
      for (let i = 1; i < riverIsoPts.length; i++) {
        const prev = riverIsoPts[i - 1];
        const curr = riverIsoPts[i];
        const mx = (prev.x + curr.x) / 2;
        const my = (prev.y + curr.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
      }
      ctx.lineTo(riverIsoPts[riverIsoPts.length - 1].x, riverIsoPts[riverIsoPts.length - 1].y);
      ctx.stroke();

      // Crystal mountain blue water
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 26;
      ctx.beginPath();
      ctx.moveTo(riverIsoPts[0].x, riverIsoPts[0].y);
      for (let i = 1; i < riverIsoPts.length; i++) {
        const prev = riverIsoPts[i - 1];
        const curr = riverIsoPts[i];
        const mx = (prev.x + curr.x) / 2;
        const my = (prev.y + curr.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
      }
      ctx.lineTo(riverIsoPts[riverIsoPts.length - 1].x, riverIsoPts[riverIsoPts.length - 1].y);
      ctx.stroke();

      // Radiant turquoise water surface
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.moveTo(riverIsoPts[0].x, riverIsoPts[0].y);
      for (let i = 1; i < riverIsoPts.length; i++) {
        const prev = riverIsoPts[i - 1];
        const curr = riverIsoPts[i];
        const mx = (prev.x + curr.x) / 2;
        const my = (prev.y + curr.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
      }
      ctx.lineTo(riverIsoPts[riverIsoPts.length - 1].x, riverIsoPts[riverIsoPts.length - 1].y);
      ctx.stroke();

      // Animated white water ripples and foam crests
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 2;
      for (let w = 0; w < riverIsoPts.length - 1; w++) {
        const pA = riverIsoPts[w];
        const pB = riverIsoPts[w + 1];
        const waveOffset = Math.sin(tick * 0.08 + w * 1.5) * 4;
        ctx.beginPath();
        ctx.moveTo((pA.x + pB.x) / 2 - 8 + waveOffset, (pA.y + pB.y) / 2 - 2);
        ctx.lineTo((pA.x + pB.x) / 2 + 8 + waveOffset, (pA.y + pB.y) / 2 + 2);
        ctx.stroke();
      }

      // Low-poly Wooden Bridge across river (at gx 16.5, gy 9.2)
      {
        const bIso = gridToIso(16.5, 9.2);
        // Bridge wooden floor deck
        ctx.fillStyle = '#78350f';
        ctx.fillRect(bIso.x - 22, bIso.y - 12, 44, 24);
        ctx.fillStyle = '#92400e';
        for (let s = -20; s <= 20; s += 5) {
          ctx.fillRect(bIso.x + s, bIso.y - 12, 3, 24);
        }
        // Bridge side railings
        ctx.fillStyle = '#451a03';
        ctx.fillRect(bIso.x - 24, bIso.y - 14, 48, 4);
        ctx.fillRect(bIso.x - 24, bIso.y + 10, 48, 4);
        // Support posts
        ctx.fillRect(bIso.x - 20, bIso.y - 14, 4, 28);
        ctx.fillRect(bIso.x + 16, bIso.y - 14, 4, 28);
      }

      // ================= 6. MINE SHAFT ENTRANCE CARVED INTO CLIFF ("ШАХТНЫЙ СТВОЛ") =================
      {
        const mIso = gridToIso(4.0, 4.0);

        // Rocky cliff arch around entrance
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(mIso.x, mIso.y - 10, 36, Math.PI, 0);
        ctx.lineTo(mIso.x + 36, mIso.y + 16);
        ctx.lineTo(mIso.x - 36, mIso.y + 16);
        ctx.closePath();
        ctx.fill();

        // Dark tunnel abyss
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.arc(mIso.x, mIso.y - 6, 24, Math.PI, 0);
        ctx.lineTo(mIso.x + 24, mIso.y + 14);
        ctx.lineTo(mIso.x - 24, mIso.y + 14);
        ctx.closePath();
        ctx.fill();

        // Heavy wooden framing timbers
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(mIso.x - 22, mIso.y + 14);
        ctx.lineTo(mIso.x - 22, mIso.y - 12);
        ctx.lineTo(mIso.x + 22, mIso.y - 12);
        ctx.lineTo(mIso.x + 22, mIso.y + 14);
        ctx.stroke();

        // Cross timber lintel
        ctx.fillStyle = '#92400e';
        ctx.fillRect(mIso.x - 26, mIso.y - 18, 52, 7);

        // Mine cart rails emerging from entrance
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(mIso.x - 8, mIso.y + 2);
        ctx.lineTo(mIso.x - 14, mIso.y + 24);
        ctx.moveTo(mIso.x + 8, mIso.y + 2);
        ctx.lineTo(mIso.x + 14, mIso.y + 24);
        ctx.stroke();

        // Warm flickering lantern on timber post
        const torchFlicker = Math.sin(tick * 0.2) * 2;
        ctx.fillStyle = 'rgba(245, 158, 11, 0.4)';
        ctx.beginPath();
        ctx.arc(mIso.x + 25, mIso.y - 8, 16 + torchFlicker, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(mIso.x + 25, mIso.y - 8, 4, 0, Math.PI * 2);
        ctx.fill();

        // Crisp wooden signpost: "ШАХТНЫЙ СТВОЛ" (matching reference image!)
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(mIso.x - 44, mIso.y - 36, 88, 16);
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(mIso.x - 44, mIso.y - 36, 88, 16);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⛏️ ШАХТНЫЙ СТВОЛ', mIso.x, mIso.y - 24);
      }

      // ================= 7. NATURE PROPS: LOW-POLY TREES AND STONES =================
      for (const tree of natureProps.trees) {
        const tIso = gridToIso(tree.gx, tree.gy);
        const s = tree.size;

        // Tree trunk
        ctx.fillStyle = '#52341b';
        ctx.fillRect(tIso.x - 3 * s, tIso.y - 12 * s, 6 * s, 14 * s);

        if (tree.type === 'pine') {
          // 3-tiered conical faceted pine (like in screenshot)
          const tiers = [
            { yOff: -10, w: 28 * s, h: 18 * s },
            { yOff: -22, w: 22 * s, h: 16 * s },
            { yOff: -34, w: 16 * s, h: 14 * s }
          ];
          for (const tier of tiers) {
            // Left facet (illuminated)
            ctx.fillStyle = '#166534';
            ctx.beginPath();
            ctx.moveTo(tIso.x, tIso.y + tier.yOff - tier.h);
            ctx.lineTo(tIso.x - tier.w / 2, tIso.y + tier.yOff);
            ctx.lineTo(tIso.x, tIso.y + tier.yOff);
            ctx.closePath();
            ctx.fill();

            // Right facet (shaded)
            ctx.fillStyle = '#14532d';
            ctx.beginPath();
            ctx.moveTo(tIso.x, tIso.y + tier.yOff - tier.h);
            ctx.lineTo(tIso.x, tIso.y + tier.yOff);
            ctx.lineTo(tIso.x + tier.w / 2, tIso.y + tier.yOff);
            ctx.closePath();
            ctx.fill();
          }
        } else {
          // Round deciduous tree with faceted low-poly polyhedron canopy (like in screenshot!)
          const cY = tIso.y - 28 * s;
          const r = 16 * s;

          // Facet 1 (top-left illuminated)
          ctx.fillStyle = '#84cc16';
          ctx.beginPath();
          ctx.moveTo(tIso.x - r * 0.4, cY - r * 0.7);
          ctx.lineTo(tIso.x - r, cY);
          ctx.lineTo(tIso.x, cY + r * 0.3);
          ctx.closePath();
          ctx.fill();

          // Facet 2 (top-center bright)
          ctx.fillStyle = '#a3e635';
          ctx.beginPath();
          ctx.moveTo(tIso.x - r * 0.4, cY - r * 0.7);
          ctx.lineTo(tIso.x + r * 0.6, cY - r * 0.8);
          ctx.lineTo(tIso.x, cY + r * 0.3);
          ctx.closePath();
          ctx.fill();

          // Facet 3 (right shaded)
          ctx.fillStyle = '#65a30d';
          ctx.beginPath();
          ctx.moveTo(tIso.x + r * 0.6, cY - r * 0.8);
          ctx.lineTo(tIso.x + r, cY);
          ctx.lineTo(tIso.x, cY + r * 0.3);
          ctx.closePath();
          ctx.fill();

          // Facet 4 (bottom shaded)
          ctx.fillStyle = '#4d7c0f';
          ctx.beginPath();
          ctx.moveTo(tIso.x - r, cY);
          ctx.lineTo(tIso.x, cY + r);
          ctx.lineTo(tIso.x + r, cY);
          ctx.lineTo(tIso.x, cY + r * 0.3);
          ctx.closePath();
          ctx.fill();
        }
      }

      // Small stones & pebbles
      for (const rock of natureProps.rocks) {
        const rIso = gridToIso(rock.gx, rock.gy);
        const s = rock.size;
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.arc(rIso.x, rIso.y, 6 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(rIso.x - 2 * s, rIso.y - 2 * s, 3.5 * s, 0, Math.PI * 2);
        ctx.fill();
      }
    }

      // ================= CITY GRID SYSTEM OVERLAY =================
      const shouldDrawGrid = showGridLines || localShowGridLines || state.isSiegeMode || Boolean(placementType);
      if (shouldDrawGrid) {
        ctx.save();
        ctx.strokeStyle = state.isSiegeMode 
          ? 'rgba(239, 68, 68, 0.3)' 
          : placementType 
          ? 'rgba(56, 189, 248, 0.35)' 
          : 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 1;
        for (let gx = 0; gx < GRID_SIZE; gx++) {
          for (let gy = 0; gy < GRID_SIZE; gy++) {
            const p0 = gridToIso(gx, gy);
            const p1 = gridToIso(gx + 1, gy);
            const p2 = gridToIso(gx + 1, gy + 1);
            const p3 = gridToIso(gx, gy + 1);
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p3.x, p3.y);
            ctx.closePath();
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      // ================= 8. DRAW PLACED BUILDINGS (SORTED BY DEPTH) =================
      const plots = state.townPlots || [];
      const sortedPlots = [...plots].sort((a, b) => {
        const aDepth = (a.tileX || 0) + (a.tileY || 0);
        const bDepth = (b.tileX || 0) + (b.tileY || 0);
        return aDepth - bDepth;
      });

      for (const plot of sortedPlots) {
        if (!plot.buildingType || plot.tileX === undefined || plot.tileY === undefined) continue;

        const bType = plot.buildingType;
        const bInfo = BUILDINGS_CONFIG[bType];
        const gx = plot.tileX;
        const gy = plot.tileY;
        const bIso = gridToIso(gx + 1, gy + 1);
        const isTownHall = bType === 'town_hall';

        // Tower Defense: Range Circles for defensive buildings
        if ((state.isSiegeMode || hoveredTile?.gx === gx) && (plot.isDefensive || isTownHall || bType === 'watchtower' || bType === 'workshop')) {
          const rTiles = plot.attackRange || (isTownHall ? 5 : bType === 'watchtower' ? 6 : 4);
          const rangePx = rTiles * (TILE_W / 2);
          ctx.save();
          ctx.strokeStyle = isTownHall ? 'rgba(245, 158, 11, 0.55)' : 'rgba(56, 189, 248, 0.55)';
          ctx.fillStyle = isTownHall ? 'rgba(245, 158, 11, 0.08)' : 'rgba(56, 189, 248, 0.08)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.ellipse(bIso.x, bIso.y, rangePx, rangePx * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }

        // Building Ground Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(bIso.x, bIso.y + 12, isTownHall ? 52 : 42, isTownHall ? 24 : 20, 0, 0, Math.PI * 2);
        ctx.fill();

        const wallH = isTownHall ? (50 + plot.level * 4) : (36 + plot.level * 3);
        const bW = isTownHall ? 56 : 48;

        // Front-Left Wall
        ctx.fillStyle = isTownHall 
          ? '#1e293b' 
          : bType === 'forge' 
          ? '#451a03' 
          : bType === 'smelter' 
          ? '#3b0764' 
          : bType === 'tavern' 
          ? '#78350f' 
          : bType === 'watchtower'
          ? '#334155'
          : '#1e293b';
        ctx.beginPath();
        ctx.moveTo(bIso.x, bIso.y + 10);
        ctx.lineTo(bIso.x - bW / 2, bIso.y - 2);
        ctx.lineTo(bIso.x - bW / 2, bIso.y - wallH);
        ctx.lineTo(bIso.x, bIso.y - wallH + 12);
        ctx.closePath();
        ctx.fill();

        // Front-Right Wall
        ctx.fillStyle = isTownHall 
          ? '#334155' 
          : bType === 'forge' 
          ? '#7c2d12' 
          : bType === 'smelter' 
          ? '#581c87' 
          : bType === 'tavern' 
          ? '#92400e' 
          : bType === 'watchtower'
          ? '#475569'
          : '#334155';
        ctx.beginPath();
        ctx.moveTo(bIso.x, bIso.y + 10);
        ctx.lineTo(bIso.x + bW / 2, bIso.y - 2);
        ctx.lineTo(bIso.x + bW / 2, bIso.y - wallH);
        ctx.lineTo(bIso.x, bIso.y - wallH + 12);
        ctx.closePath();
        ctx.fill();

        // Roof: Gabled Timber / Stone Roof with ridge
        const roofExtraH = isTownHall ? 28 : 22;
        // Left Roof Slope
        ctx.fillStyle = isTownHall 
          ? '#1d4ed8' 
          : bType === 'forge' 
          ? '#b45309' 
          : bType === 'smelter' 
          ? '#7e22ce' 
          : bType === 'tavern' 
          ? '#b45309' 
          : bType === 'watchtower'
          ? '#0284c7'
          : '#0284c7';
        ctx.beginPath();
        ctx.moveTo(bIso.x, bIso.y - wallH + 12);
        ctx.lineTo(bIso.x - bW / 2, bIso.y - wallH);
        ctx.lineTo(bIso.x, bIso.y - wallH - roofExtraH);
        ctx.closePath();
        ctx.fill();

        // Right Roof Slope
        ctx.fillStyle = isTownHall 
          ? '#2563eb' 
          : bType === 'forge' 
          ? '#d97706' 
          : bType === 'smelter' 
          ? '#9333ea' 
          : bType === 'tavern' 
          ? '#d97706' 
          : bType === 'watchtower'
          ? '#38bdf8'
          : '#0ea5e9';
        ctx.beginPath();
        ctx.moveTo(bIso.x, bIso.y - wallH + 12);
        ctx.lineTo(bIso.x, bIso.y - wallH - roofExtraH);
        ctx.lineTo(bIso.x + bW / 2, bIso.y - wallH);
        ctx.closePath();
        ctx.fill();

        // Warm Glowing Windows
        const windowColor = timeOfDay === 'night' || timeOfDay === 'sunset' ? '#fef08a' : '#fed7aa';
        ctx.fillStyle = windowColor;
        ctx.fillRect(bIso.x + 8, bIso.y - wallH / 2 - 2, 7, 7);
        ctx.fillRect(bIso.x - 16, bIso.y - wallH / 2 - 2, 7, 7);

        // Special visual accessories per building
        if (isTownHall) {
          // Central Grand Portico Doorway with Arch
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(bIso.x - 6, bIso.y - 4, 12, 14);
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(bIso.x - 4.5, bIso.y - 2, 9, 12);

          // Tower Bell / Clock Spire atop roof
          const spireX = bIso.x;
          const spireY = bIso.y - wallH - roofExtraH;
          ctx.fillStyle = '#475569';
          ctx.fillRect(spireX - 8, spireY - 14, 16, 14);
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.moveTo(spireX, spireY - 26);
          ctx.lineTo(spireX - 9, spireY - 14);
          ctx.lineTo(spireX + 9, spireY - 14);
          ctx.closePath();
          ctx.fill();

          // Animated City Flag / Banner fluttering in wind
          const bannerWave = Math.sin(tick * 0.12) * 3;
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.moveTo(spireX, spireY - 26);
          ctx.lineTo(spireX + 13 + bannerWave, spireY - 22);
          ctx.lineTo(spireX, spireY - 18);
          ctx.closePath();
          ctx.fill();

          // Fortress Ballista Mount (Tower Defense Ready)
          ctx.fillStyle = '#78350f';
          ctx.fillRect(bIso.x + 10, bIso.y - wallH - 8, 12, 6);
          ctx.fillStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.moveTo(bIso.x + 12, bIso.y - wallH - 5);
          ctx.lineTo(bIso.x + 22, bIso.y - wallH - 12);
          ctx.stroke();
        } else if (bType === 'forge') {
          // Open Forge fire pit glowing orange
          ctx.fillStyle = '#ea580c';
          ctx.beginPath();
          ctx.arc(bIso.x + 14, bIso.y + 2, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(bIso.x + 14, bIso.y + 2, 3, 0, Math.PI * 2);
          ctx.fill();

          // Anvil
          ctx.fillStyle = '#334155';
          ctx.fillRect(bIso.x + 18, bIso.y + 6, 8, 5);
        } else if (bType === 'smelter') {
          // Molten furnace glow
          ctx.fillStyle = '#c026d3';
          ctx.beginPath();
          ctx.arc(bIso.x, bIso.y + 4, 8, 0, Math.PI * 2);
          ctx.fill();
        }

        // Stone Chimney & Soft Animated Smoke Puffs
        if (bType === 'forge' || bType === 'smelter' || bType === 'tavern') {
          const chX = bIso.x - 12;
          const chY = bIso.y - wallH - 12;
          ctx.fillStyle = '#475569';
          ctx.fillRect(chX - 4, chY - 8, 8, 14);

          // Puffs of smoke
          for (let p = 0; p < 3; p++) {
            const sY = chY - 14 - p * 8 - (tick % 28) * 0.35;
            const sX = chX + Math.sin((tick + p * 20) * 0.08) * 5;
            const alpha = 0.5 - p * 0.15;
            ctx.fillStyle = `rgba(226, 232, 240, ${alpha})`;
            ctx.beginPath();
            ctx.arc(sX, sY, 4 + p * 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Tower Defense: Building HP Bar & Battle stats
        if (state.isSiegeMode) {
          const curHp = plot.hp !== undefined ? plot.hp : (plot.maxHp || 1000);
          const maxHp = plot.maxHp || 1000;
          const hpPct = Math.max(0, Math.min(1, curHp / maxHp));
          const barW = isTownHall ? 64 : 52;
          const barH = 5;
          const barX = bIso.x - barW / 2;
          const barY = bIso.y - wallH - (isTownHall ? 66 : 50);

          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
          ctx.fillStyle = hpPct > 0.5 ? '#10b981' : hpPct > 0.25 ? '#f59e0b' : '#ef4444';
          ctx.fillRect(barX, barY, barW * hpPct, barH);

          if (plot.isDefensive || isTownHall || bType === 'watchtower') {
            ctx.fillStyle = '#fde047';
            ctx.font = 'bold 8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`⚔️ ${plot.damage || 25} ATK`, bIso.x, barY - 3);
          }
        }

        // Floating Dark Pill Label
        const shortName = isTownHall ? 'Ратуша' : bInfo?.name ? bInfo.name.split('«')[0].trim() : bType;
        const pillY = bIso.y - wallH - (isTownHall ? 54 : 36);
        const pillW = isTownHall ? 92 : 84;

        ctx.fillStyle = isTownHall ? 'rgba(15, 23, 42, 0.95)' : 'rgba(15, 23, 42, 0.88)';
        ctx.beginPath();
        ctx.roundRect(bIso.x - pillW / 2, pillY, pillW, 18, 6);
        ctx.fill();
        ctx.strokeStyle = isTownHall ? '#fbbf24' : '#f59e0b';
        ctx.lineWidth = isTownHall ? 1.8 : 1.2;
        ctx.stroke();

        ctx.fillStyle = isTownHall ? '#fef08a' : '#f8fafc';
        ctx.font = isTownHall ? 'bold 9.5px sans-serif' : 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(isTownHall ? `🏛️ ${shortName} (Ур.${plot.level || 1})` : `${shortName}`, bIso.x, pillY + 12);
      }

      // ================= 9. WALKING ADVENTURER (PLAYER HERO) =================
      {
        const hero = heroRef.current;
        // Walk along the meadow roads between campfire, mine, and crossways
        if (hero.progress < 1) {
          hero.progress += 0.007;
          if (hero.progress >= 1) {
            hero.gx = hero.targetGx;
            hero.gy = hero.targetGy;
            // Pick next destination along meadow path
            const keyNodes = ['campfire', 'mine_track', 'rail_bend', 'path_north', 'path_east', 'path_south', 'clearing_west'];
            const nextKey = keyNodes[Math.floor(Math.random() * keyNodes.length)];
            const targetWp = MEADOW_WAYPOINTS[nextKey] || MEADOW_WAYPOINTS.campfire;
            hero.targetGx = targetWp.gx + (Math.random() - 0.5) * 0.4;
            hero.targetGy = targetWp.gy + (Math.random() - 0.5) * 0.4;
            hero.progress = 0;
            hero.dir = hero.targetGx >= hero.gx ? 1 : -1;
          }
        }
        const curGx = hero.gx + (hero.targetGx - hero.gx) * hero.progress;
        const curGy = hero.gy + (hero.targetGy - hero.gy) * hero.progress;
        const hIso = gridToIso(curGx, curGy);

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(hIso.x, hIso.y + 12, 10, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Hero figure (blonde hair, blue tunic, sword - like in screenshot!)
        const bounce = Math.sin(tick * 0.2) * 2;
        // Boots
        ctx.fillStyle = '#78350f';
        ctx.fillRect(hIso.x - 4, hIso.y + 6 + bounce, 3, 5);
        ctx.fillRect(hIso.x + 1, hIso.y + 6 + bounce, 3, 5);
        // Blue Tunic
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(hIso.x - 5, hIso.y - 2 + bounce, 10, 9);
        // Belt
        ctx.fillStyle = '#b45309';
        ctx.fillRect(hIso.x - 5, hIso.y + 3 + bounce, 10, 2);
        // Head / Face
        ctx.fillStyle = '#fed7aa';
        ctx.beginPath();
        ctx.arc(hIso.x, hIso.y - 7 + bounce, 5, 0, Math.PI * 2);
        ctx.fill();
        // Blonde Hair
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(hIso.x, hIso.y - 9 + bounce, 5.5, Math.PI, 0);
        ctx.fill();
        // Sword in hand
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(hIso.x + 6 * hero.dir, hIso.y + bounce);
        ctx.lineTo(hIso.x + 12 * hero.dir, hIso.y - 6 + bounce);
        ctx.stroke();
      }

      // ================= 10. REALISTIC 3D MINIATURE DWELLERS & WORKERS =================
      for (const walker of walkersRef.current) {
        // --- 1. Movement & Waypoint Navigation along meadow roads ---
        if (walker.progress < 1) {
          walker.progress += walker.speed;
          walker.walkCycle += 0.22;
          if (walker.progress >= 1) {
            walker.gx = walker.targetGx;
            walker.gy = walker.targetGy;
            walker.progress = 1;

            // Arrived at target waypoint
            const arrivedWp = MEADOW_WAYPOINTS[walker.currentNodeId || ''] || MEADOW_WAYPOINTS.campfire;
            if (arrivedWp.action && arrivedWp.action !== 'idle') {
              walker.actionState = arrivedWp.action;
              walker.actionTimer = 180 + Math.random() * 140;
            } else if (walker.role === 'woodcutter') {
              walker.actionState = 'chop';
              walker.actionTimer = 220;
            } else {
              walker.actionState = 'idle';
              walker.actionTimer = 60 + Math.random() * 80;
            }
          }
        } else {
          // Dweller is at waypoint doing action or waiting to walk
          walker.actionTimer--;

          if (walker.actionTimer <= 0) {
            // Pick next connected waypoint along the dirt road network
            const currentId = walker.currentNodeId || 'campfire';
            const connected = WAYPOINT_GRAPH[currentId] || ['campfire'];
            const nextNodeId = connected[Math.floor(Math.random() * connected.length)];
            const targetWp = MEADOW_WAYPOINTS[nextNodeId] || MEADOW_WAYPOINTS.campfire;

            walker.currentNodeId = nextNodeId;
            walker.targetGx = targetWp.gx + (Math.random() - 0.5) * 0.5;
            walker.targetGy = targetWp.gy + (Math.random() - 0.5) * 0.5;
            walker.progress = 0;
            walker.actionState = 'walk';
            walker.dir = walker.targetGx >= walker.gx ? 1 : -1;
          }
        }

        // Current world coordinates
        const curGx = walker.gx + (walker.targetGx - walker.gx) * walker.progress;
        const curGy = walker.gy + (walker.targetGy - walker.gy) * walker.progress;
        const wIso = gridToIso(curGx, curGy);

        // Ground shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
        ctx.beginPath();
        ctx.ellipse(wIso.x, wIso.y + 11, 11, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Walking bounce & leg swing
        const isWalking = walker.progress < 1;
        const walkBounce = isWalking ? Math.sin(walker.walkCycle * 2) * 1.5 : 0;
        const legSwing = isWalking ? Math.sin(walker.walkCycle) * 3 : 0;

        // --- 2. Action Animations (Chopping Wood, Hammering Anvil) ---
        let armAngle = isWalking ? Math.sin(walker.walkCycle) * 0.6 : 0;

        if (walker.actionState === 'chop') {
          // Woodchopping overhead swing cycle
          const chopCycle = (tick * 0.08) % Math.PI;
          armAngle = Math.sin(chopCycle) > 0.85 ? 1.1 : -1.2 + Math.sin(chopCycle) * 2.3;
          
          // Spawn flying wood chips when axe impacts the log
          if (tick % 38 === 0) {
            for (let c = 0; c < 4; c++) {
              particlesRef.current.push({
                x: wIso.x + 10 * walker.dir,
                y: wIso.y + 5,
                vx: (Math.random() - 0.5) * 2.5 + walker.dir * 1.5,
                vy: -2.0 - Math.random() * 2.5,
                color: Math.random() > 0.5 ? '#b45309' : '#d97706',
                size: 2 + Math.random() * 2,
                life: 0,
                maxLife: 20 + Math.random() * 12
              });
            }
          }
        } else if (walker.actionState === 'hammer') {
          // Blacksmith hammer strike
          const hammerCycle = (tick * 0.12) % Math.PI;
          armAngle = Math.sin(hammerCycle) > 0.8 ? 1.0 : -0.9 + Math.sin(hammerCycle) * 1.9;

          // Forge sparks
          if (tick % 26 === 0) {
            for (let s = 0; s < 5; s++) {
              particlesRef.current.push({
                x: wIso.x + 8 * walker.dir,
                y: wIso.y + 6,
                vx: (Math.random() - 0.5) * 3.5,
                vy: -1.8 - Math.random() * 2.2,
                color: Math.random() > 0.4 ? '#f59e0b' : '#ef4444',
                size: 1.5 + Math.random() * 2,
                life: 0,
                maxLife: 18 + Math.random() * 10
              });
            }
          }
        }

        const yOff = wIso.y + walkBounce;

        // --- 3. Draw 3D Miniature Character Model ---
        ctx.save();

        // Boots
        ctx.fillStyle = '#292524';
        ctx.fillRect(wIso.x - 4 - legSwing * 0.5, yOff + 6, 3.5, 5);
        ctx.fillRect(wIso.x + 1 + legSwing * 0.5, yOff + 6, 3.5, 5);

        // Trousers
        ctx.fillStyle = walker.pantsColor || '#334155';
        ctx.fillRect(wIso.x - 4, yOff + 2, 3.5, 5);
        ctx.fillRect(wIso.x + 1, yOff + 2, 3.5, 5);

        // Tunic (Body)
        ctx.fillStyle = walker.tunicColor;
        ctx.fillRect(wIso.x - 5.5, yOff - 6, 11, 9);

        // Leather Apron (for blacksmith & woodcutter)
        if (walker.role === 'blacksmith' || walker.role === 'woodcutter') {
          ctx.fillStyle = '#78350f';
          ctx.fillRect(wIso.x - 3.5, yOff - 3, 7, 7);
        }

        // Leather Belt with Brass Buckle
        ctx.fillStyle = '#451a03';
        ctx.fillRect(wIso.x - 5.5, yOff, 11, 2);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(wIso.x - 1.5, yOff, 3, 2);

        // Head / Face
        ctx.fillStyle = '#fed7aa';
        ctx.beginPath();
        ctx.arc(wIso.x, yOff - 10, 4.8, 0, Math.PI * 2);
        ctx.fill();

        // Beard (Dwarf style)
        if (walker.beardColor) {
          ctx.fillStyle = walker.beardColor;
          ctx.beginPath();
          ctx.moveTo(wIso.x - 4, yOff - 9);
          ctx.lineTo(wIso.x + 4, yOff - 9);
          ctx.lineTo(wIso.x, yOff - 3);
          ctx.closePath();
          ctx.fill();
        }

        // Hair or Miner Helmet / Chainmail Cap
        if (walker.hasHat) {
          if (walker.role === 'miner') {
            // Miner Helmet with Glowing Headlamp
            ctx.fillStyle = '#b45309';
            ctx.fillRect(wIso.x - 5, yOff - 15, 10, 4);
            // Lamp
            ctx.fillStyle = '#fde047';
            ctx.beginPath();
            ctx.arc(wIso.x + 4 * walker.dir, yOff - 13, 2.5, 0, Math.PI * 2);
            ctx.fill();
            // Glow beam
            ctx.fillStyle = 'rgba(254, 240, 138, 0.25)';
            ctx.beginPath();
            ctx.arc(wIso.x + 4 * walker.dir, yOff - 13, 8, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Guard / Patrol Iron Helm
            ctx.fillStyle = '#64748b';
            ctx.beginPath();
            ctx.arc(wIso.x, yOff - 12, 5.2, Math.PI, 0);
            ctx.fill();
            ctx.fillRect(wIso.x - 5, yOff - 12, 10, 2);
          }
        } else {
          // Hair
          ctx.fillStyle = walker.hairColor || '#78350f';
          ctx.beginPath();
          ctx.arc(wIso.x, yOff - 12, 5, Math.PI, 0);
          ctx.fill();
        }

        // --- 4. Render 3D Tool in Hand ---
        const toolHandX = wIso.x + 5 * walker.dir;
        const toolHandY = yOff - 2;

        ctx.save();
        ctx.translate(toolHandX, toolHandY);
        ctx.rotate(armAngle * walker.dir);

        if (walker.tool === 'axe') {
          // Wooden handle
          ctx.strokeStyle = '#92400e';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, 4);
          ctx.lineTo(0, -14);
          ctx.stroke();

          // Steel double-bladed axe head
          ctx.fillStyle = '#94a3b8';
          ctx.beginPath();
          ctx.moveTo(0, -12);
          ctx.lineTo(7 * walker.dir, -15);
          ctx.lineTo(7 * walker.dir, -9);
          ctx.closePath();
          ctx.fill();
        } else if (walker.tool === 'hammer') {
          // Sledgehammer handle
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, 3);
          ctx.lineTo(0, -12);
          ctx.stroke();

          // Iron hammer head
          ctx.fillStyle = '#475569';
          ctx.fillRect(-3, -16, 8, 5);
        } else if (walker.tool === 'pickaxe') {
          // Miner Pickaxe
          ctx.strokeStyle = '#92400e';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, 3);
          ctx.lineTo(0, -14);
          ctx.stroke();

          // Curved pick head
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, -12, 6, -Math.PI * 0.8, -Math.PI * 0.2);
          ctx.stroke();
        } else if (walker.tool === 'beer') {
          // Wooden Beer Tankard with foam
          ctx.fillStyle = '#b45309';
          ctx.fillRect(0, -8, 6, 7);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(0, -10, 6, 2);
          // Foam
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(3, -10, 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (walker.tool === 'staff') {
          // Patrol Spear / Staff
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(0, 6);
          ctx.lineTo(0, -20);
          ctx.stroke();
          // Steel spear tip
          ctx.fillStyle = '#cbd5e1';
          ctx.beginPath();
          ctx.moveTo(-2, -20);
          ctx.lineTo(2, -20);
          ctx.lineTo(0, -26);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
        ctx.restore();

        // --- 5. Name Banner Tag Above Head ---
        const isHoveredWalker = hoveredTile && (Math.abs(curGx - hoveredTile.gx) < 1.2 && Math.abs(curGy - hoveredTile.gy) < 1.2);
        
        ctx.fillStyle = isHoveredWalker ? 'rgba(2, 132, 199, 0.92)' : 'rgba(15, 23, 42, 0.78)';
        ctx.beginPath();
        ctx.roundRect(wIso.x - 30, yOff - 28, 60, 13, 4);
        ctx.fill();
        ctx.strokeStyle = isHoveredWalker ? '#38bdf8' : '#64748b';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(walker.name, wIso.x, yOff - 19);

        // --- 6. Thought Speech Balloon ---
        walker.thoughtTimer--;
        if (walker.thought && (walker.thoughtTimer > 0 || isHoveredWalker)) {
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.roundRect(wIso.x - 50, yOff - 46, 100, 16, 5);
          ctx.fill();
          ctx.stroke();

          // Tail pointing down to speaker
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(wIso.x - 4, yOff - 30);
          ctx.lineTo(wIso.x + 4, yOff - 30);
          ctx.lineTo(wIso.x, yOff - 26);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 7.5px sans-serif';
          ctx.fillText(walker.thought, wIso.x, yOff - 35);
        } else if (walker.thoughtTimer <= -220) {
          walker.thoughtTimer = 280;
        }
      }

      // ================= 11. HOLOGRAPHIC CYAN WIREFRAME BLUEPRINT GHOST (EXACTLY LIKE SCREENSHOT!) =================
      if (placementType && hoveredTile) {
        const { gx, gy } = hoveredTile;
        const isValid = placementValidity.valid;
        const gIso = gridToIso(gx + 1, gy + 1);

        const cyanColor = isValid ? '#22d3ee' : '#f43f5e';
        const cyanGlow = isValid ? 'rgba(34, 211, 238, 0.22)' : 'rgba(244, 63, 94, 0.22)';
        const beamColor = isValid ? 'rgba(34, 211, 238, 0.08)' : 'rgba(244, 63, 94, 0.08)';

        ctx.save();

        // 1. Downward holographic projection beam cone from sky
        ctx.fillStyle = beamColor;
        ctx.beginPath();
        ctx.moveTo(gIso.x, gIso.y - 120);
        ctx.lineTo(gIso.x - 45, gIso.y + 14);
        ctx.lineTo(gIso.x + 45, gIso.y + 14);
        ctx.closePath();
        ctx.fill();

        // 2. 2x2 footprint base polygon on the ground
        const p0 = gridToIso(gx, gy);
        const p1 = gridToIso(gx + 2, gy);
        const p2 = gridToIso(gx + 2, gy + 2);
        const p3 = gridToIso(gx, gy + 2);

        ctx.fillStyle = cyanGlow;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = cyanColor;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // 3. Volumetric 3D Holographic Wireframe House (Foundation, 4 columns, roof trusses, chimney)
        const wallH = 36;
        const bW = 46;

        // Translucent volume
        ctx.fillStyle = cyanGlow;
        ctx.beginPath();
        ctx.moveTo(gIso.x, gIso.y + 10);
        ctx.lineTo(gIso.x - bW / 2, gIso.y - 2);
        ctx.lineTo(gIso.x - bW / 2, gIso.y - wallH);
        ctx.lineTo(gIso.x, gIso.y - wallH - 20);
        ctx.lineTo(gIso.x + bW / 2, gIso.y - wallH);
        ctx.lineTo(gIso.x + bW / 2, gIso.y - 2);
        ctx.closePath();
        ctx.fill();

        // Crisp 3D Wireframe Lines
        ctx.strokeStyle = cyanColor;
        ctx.lineWidth = 2.0;

        // Foundation lines
        ctx.beginPath();
        ctx.moveTo(gIso.x, gIso.y + 10);
        ctx.lineTo(gIso.x - bW / 2, gIso.y - 2);
        ctx.moveTo(gIso.x, gIso.y + 10);
        ctx.lineTo(gIso.x + bW / 2, gIso.y - 2);
        ctx.stroke();

        // 4 Vertical Corner Columns
        ctx.beginPath();
        ctx.moveTo(gIso.x, gIso.y + 10);
        ctx.lineTo(gIso.x, gIso.y - wallH + 12);

        ctx.moveTo(gIso.x - bW / 2, gIso.y - 2);
        ctx.lineTo(gIso.x - bW / 2, gIso.y - wallH);

        ctx.moveTo(gIso.x + bW / 2, gIso.y - 2);
        ctx.lineTo(gIso.x + bW / 2, gIso.y - wallH);
        ctx.stroke();

        // Roof A-Frames & Ridge Beam
        ctx.beginPath();
        ctx.moveTo(gIso.x, gIso.y - wallH + 12);
        ctx.lineTo(gIso.x - bW / 2, gIso.y - wallH);
        ctx.lineTo(gIso.x, gIso.y - wallH - 20);
        ctx.lineTo(gIso.x + bW / 2, gIso.y - wallH);
        ctx.lineTo(gIso.x, gIso.y - wallH + 12);
        ctx.stroke();

        // Central ridge line
        ctx.beginPath();
        ctx.moveTo(gIso.x, gIso.y - wallH + 12);
        ctx.lineTo(gIso.x, gIso.y - wallH - 20);
        ctx.stroke();

        // Door frame wireframe
        ctx.strokeRect(gIso.x - 6, gIso.y - 12, 12, 18);

        // Chimney wireframe
        ctx.strokeRect(gIso.x - 14, gIso.y - wallH - 16, 7, 12);

        ctx.restore();

        // Holographic Status Badge Floating Above
        ctx.fillStyle = isValid ? 'rgba(6, 78, 59, 0.92)' : 'rgba(127, 29, 29, 0.92)';
        ctx.beginPath();
        ctx.roundRect(gIso.x - 80, gIso.y - wallH - 46, 160, 22, 6);
        ctx.fill();
        ctx.strokeStyle = cyanColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9.5px sans-serif';
        ctx.textAlign = 'center';
        if (isValid) {
          ctx.fillText(`✨ Кликните для постройки`, gIso.x, gIso.y - wallH - 31);
        } else {
          ctx.fillText(placementValidity.reason.slice(0, 28), gIso.x, gIso.y - wallH - 31);
        }
      }

      // ================= 12. DUST PARTICLES =================
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.life++;

        const alpha = 1 - p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        if (p.life >= p.maxLife) {
          particlesRef.current.splice(i, 1);
        }
      }

      ctx.restore(); // camera restore

      // Atmospheric Night tint
      if (timeOfDay === 'night') {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
        ctx.fillRect(0, 0, width, height);

        // Night fireflies
        ctx.fillStyle = '#fef08a';
        for (let f = 0; f < 10; f++) {
          const fx = ((tick * 0.4 + f * 95) % width);
          const fy = ((height * 0.4 + Math.sin(tick * 0.05 + f) * 110) % height);
          ctx.beginPath();
          ctx.arc(fx, fy, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [timeOfDay, state.townPlots, placementType, hoveredTile, placementValidity, camera, natureProps, riverSpine, roadSpine, southRoadSpine, activeRelocatePlot]);

  // Mouse & Touch Pointer handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      camX: camera.x,
      camY: camera.y
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (isDraggingRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setCamera(prev => ({
        ...prev,
        x: dragStartRef.current.camX + dx,
        y: dragStartRef.current.camY + dy
      }));
    }

    const mouseX = e.clientX - rect.left - (rect.width / 2 + camera.x);
    const mouseY = e.clientY - rect.top - (rect.height / 2 + camera.y);
    const unscaledX = mouseX / camera.zoom;
    const unscaledY = mouseY / camera.zoom;

    const { gx, gy } = isoToGrid(unscaledX, unscaledY);
    setHoveredTile({ gx, gy });

    if (placementType) {
      const validity = validatePlacement(gx, gy, placementType);
      setPlacementValidity(validity);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const dist = Math.hypot(e.clientX - dragStartRef.current.x, e.clientY - dragStartRef.current.y);
    isDraggingRef.current = false;

    if (dist < 8 && hoveredTile) {
      const { gx, gy } = hoveredTile;

      // 1. Placement / relocation confirmation
      if (placementType) {
        handleConfirmPlacement(gx, gy);
        return;
      }

      // 2. Mine entrance click (around gx 4, gy 4)
      if ((gx >= 3 && gx <= 5) && (gy >= 3 && gy <= 5)) {
        sound.playMining();
        onStartExpedition(state.unlockedDepth || 0, 'ore');
        return;
      }

      // 3. Click on existing building
      const plots = state.townPlots || [];
      for (const plot of plots) {
        if (plot.buildingType && plot.tileX !== undefined && plot.tileY !== undefined) {
          if (
            (gx === plot.tileX || gx === plot.tileX + 1) &&
            (gy === plot.tileY || gy === plot.tileY + 1)
          ) {
            sound.playHit();
            if (plot.buildingType === 'town_hall' && onOpenTownHall) {
              onOpenTownHall(plot);
            } else {
              onOpenPlot(plot);
            }
            return;
          }
        }
      }
    }
  };

  const handleZoom = (delta: number) => {
    setCamera(prev => ({
      ...prev,
      zoom: Math.max(0.65, Math.min(1.85, prev.zoom + delta))
    }));
  };

  const handleResetCamera = () => {
    setCamera({ x: -10, y: -90, zoom: 1.0 });
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.12 : -0.12;
    handleZoom(zoomDelta);
  };

  // Filtered buildings for construction drawer
  const filteredBuildings = useMemo(() => {
    return BUILDABLE_TYPES.filter(type => {
      if (selectedCategory === 'all') return true;
      if (selectedCategory === 'production') return type === 'forge' || type === 'smelter' || type === 'workshop';
      if (selectedCategory === 'settlement') return type === 'tavern' || type === 'barracks';
      if (selectedCategory === 'defense') return type === 'watchtower' || type === 'guild';
      return true;
    });
  }, [selectedCategory]);

  const activePlacementInfo = placementType ? BUILDINGS_CONFIG[placementType] : null;

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full flex flex-col overflow-hidden select-none bg-[#0a0f1d]"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingFile(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDraggingFile(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingFile(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleLoadImageFile(file);
      }}
    >
      {/* Hidden file input for uploading town background */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleLoadImageFile(file);
        }}
      />

      {/* Drag & Drop Visual Overlay */}
      {isDraggingFile && (
        <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 border-4 border-dashed border-cyan-400 pointer-events-none animate-pulse">
          <Upload size={54} className="text-cyan-400 mb-3" />
          <h3 className="text-lg font-black text-white mb-1">Отпустите изображение здесь</h3>
          <p className="text-xs text-cyan-200">Файл сразу установится как фон городка</p>
        </div>
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {bgNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-emerald-950/95 border border-emerald-500/60 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-2 text-xs font-bold text-emerald-200"
          >
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>{bgNotification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= TOP RIGHT COMPACT VIEW SETTINGS ICON ================= */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-2 pointer-events-auto">
        <div className="relative">
          <button
            onClick={() => setIsSettingsOpen(prev => !prev)}
            className={`p-2.5 rounded-2xl border backdrop-blur-md shadow-xl transition-all flex items-center justify-center cursor-pointer ${
              isSettingsOpen 
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]' 
                : 'bg-slate-950/85 hover:bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
            title="Настройки вида и карты"
          >
            <Settings size={18} className={isSettingsOpen ? 'rotate-90 transition-transform duration-300' : 'transition-transform duration-300'} />
          </button>

          {/* View Settings Dropdown */}
          <AnimatePresence>
            {isSettingsOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="absolute right-0 top-12 w-72 p-3 bg-slate-950/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl z-50 flex flex-col gap-3"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Settings size={14} className="text-amber-400" />
                    Настройки карты
                  </span>
                  <button
                    onClick={() => setIsSettingsOpen(false)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* 1. Time of Day */}
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                    Время суток
                  </span>
                  <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900/90 border border-slate-800 rounded-xl">
                    <button
                      onClick={() => setTimeOfDay('dawn')}
                      className={`p-1.5 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        timeOfDay === 'dawn' ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Рассвет"
                    >
                      <Sunrise size={14} />
                      <span className="text-[9px]">Рассвет</span>
                    </button>
                    <button
                      onClick={() => setTimeOfDay('day')}
                      className={`p-1.5 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        timeOfDay === 'day' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="День"
                    >
                      <Sun size={14} />
                      <span className="text-[9px]">День</span>
                    </button>
                    <button
                      onClick={() => setTimeOfDay('sunset')}
                      className={`p-1.5 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        timeOfDay === 'sunset' ? 'bg-orange-500/25 text-orange-300 border border-orange-500/40' : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Закат"
                    >
                      <Sunset size={14} />
                      <span className="text-[9px]">Закат</span>
                    </button>
                    <button
                      onClick={() => setTimeOfDay('night')}
                      className={`p-1.5 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        timeOfDay === 'night' ? 'bg-indigo-900/80 text-indigo-200 border border-indigo-500/40' : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Ночь"
                    >
                      <Moon size={14} />
                      <span className="text-[9px]">Ночь</span>
                    </button>
                  </div>
                </div>

                {/* 2. Zoom & Camera */}
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                    Камера и Масштаб
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleZoom(0.15)}
                      className="flex-1 py-1.5 px-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                    >
                      <ZoomIn size={14} /> +
                    </button>
                    <button
                      onClick={() => handleZoom(-0.15)}
                      className="flex-1 py-1.5 px-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                    >
                      <ZoomOut size={14} /> -
                    </button>
                    <button
                      onClick={handleResetCamera}
                      className="flex-1 py-1.5 px-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                      title="Центрировать камеру"
                    >
                      <RotateCcw size={14} /> Центр
                    </button>
                  </div>
                </div>

                {/* 3. City Grid System & Tower Defense Toggles */}
                <div className="space-y-1.5 pt-1 border-t border-slate-800">
                  {/* Grid Toggle */}
                  <button
                    onClick={() => setLocalShowGridLines(prev => !prev)}
                    className="w-full py-1.5 px-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-bold flex items-center justify-between text-slate-200 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <span>📐</span> Координатная сетка
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                      localShowGridLines ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {localShowGridLines ? 'ВКЛ' : 'ВЫКЛ'}
                    </span>
                  </button>

                  {/* Tower Defense Toggle */}
                  <button
                    onClick={() => dispatch({ type: 'TOGGLE_SIEGE_MODE' })}
                    className={`w-full py-1.5 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                      state.isSiegeMode 
                        ? 'bg-rose-950/60 border-rose-500/60 text-rose-300' 
                        : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span>🛡️</span> Режим осады (TD)
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                      state.isSiegeMode ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {state.isSiegeMode ? 'БОЙ' : 'МИР'}
                    </span>
                  </button>
                </div>

                {/* 4. Background Art */}
                <div className="pt-1 border-t border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Фон поверхности
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      {bgSource === 'custom' ? 'Пользовательский' : '3D Диорама'}
                    </span>
                  </div>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Upload size={13} />
                    Загрузить свой арт (PNG/JPG)
                  </button>

                  {bgSource === 'custom' && (
                    <button
                      onClick={handleResetBg}
                      className="w-full py-1 px-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-rose-400 hover:text-rose-300 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 size={12} />
                      Сбросить фон на 3D арт
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ================= TOP TACTICAL SIEGE MODE BANNER ================= */}
      {state.isSiegeMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
          <div className="px-4 py-2 bg-gradient-to-r from-rose-950/90 via-slate-900/90 to-rose-950/90 border border-rose-500/70 rounded-2xl shadow-[0_0_25px_rgba(244,63,94,0.35)] backdrop-blur-md flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping flex-shrink-0" />
            <div className="text-xs font-black text-rose-200 flex items-center gap-1.5">
              <span>🛡️ РЕЖИМ ОСАДЫ (Tower Defense)</span>
              <span className="text-slate-400 font-normal">|</span>
              <span className="text-[11px] text-amber-300 font-mono">Башни и баллиста активны</span>
            </div>
            <button
              onClick={() => dispatch({ type: 'TOGGLE_SIEGE_MODE', enabled: false })}
              className="ml-2 py-0.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
            >
              Выключить
            </button>
          </div>
        </div>
      )}

      {/* ================= ACTIVE PLACEMENT BANNER ================= */}
      <AnimatePresence>
        {placementType && activePlacementInfo && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-3 left-4 right-16 z-30 p-2.5 rounded-2xl bg-slate-950/95 border border-amber-500/70 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 pointer-events-auto"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyan-400 flex-shrink-0">
                {activeRelocatePlot ? <Move size={16} /> : React.createElement(ICONS[placementType] || Hammer, { size: 16 })}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-100 flex items-center gap-1.5 truncate">
                  <span>{activeRelocatePlot ? 'Перемещение:' : 'Постройка:'}</span>
                  <span className="text-amber-300">{activePlacementInfo.name.split('«')[0]}</span>
                </div>
                <div className="text-[11px] text-slate-300 truncate">
                  {placementValidity.valid 
                    ? 'Наведите на свободную ячейку сетки и кликните для установки' 
                    : <span className="text-rose-400 font-bold">{placementValidity.reason}</span>}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setPlacementType(null);
                setActiveRelocatePlot(null);
                onClearRelocate?.();
                onClearPlacement?.();
                sound.playHit();
              }}
              className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-colors flex-shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <X size={14} /> Отмена (ESC)
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MAIN INTERACTIVE CANVAS WORLD (100% HEIGHT) ================= */}
      <div 
        ref={containerRef}
        className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
          onContextMenu={(e) => {
            e.preventDefault();
            if (placementType) {
              setPlacementType(null);
              setActiveRelocatePlot(null);
              onClearRelocate?.();
              onClearPlacement?.();
            }
          }}
          className="w-full h-full block touch-none"
        />
      </div>
    </div>
  );
}
