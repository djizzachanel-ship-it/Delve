export type MineNodeType = 
  | 'entrance'      // Поверхностная станция / Вход
  | 'ore'           // Обычная рудная жила
  | 'metal'         // Богатая металлическая жила
  | 'shards'        // Кристальная жеода (осколки)
  | 'monster_nest'  // Логово монстров (высокий риск/награда)
  | 'treasure'      // Ресурсный склад / Забытый тайник
  | 'rest'          // Аванпост / Ремонт вагонетки
  | 'boss';         // Чертог Босса Недр

export type NodeVisibility = 'cleared' | 'visible' | 'scouted' | 'fog';

export interface MineMapNode {
  id: string;
  depth: number;       // Y coordinate (0, 1, 2, ... infinite depth)
  col: number;         // X coordinate (-inf ... +inf, 0 is central)
  type: MineNodeType;
  name: string;
  description: string;
  sectorName: string;  // e.g. "Западный штрек (W-2)", "Центральный ствол", "Восточная штольня (E+3)"
  rewardMultiplier: number;
  difficultyMultiplier: number;
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'boss';
  connectedTo: string[]; // IDs of reachable connected nodes
  visited: boolean;
  available: boolean;
  visibility: NodeVisibility;
}

export interface MineMapGraph {
  nodes: Record<string, MineMapNode>;
  minCol: number;
  maxCol: number;
  minDepth: number;
  maxDepth: number;
  currentNodeId: string;
  visitedCount: number;
}

export const NODE_CONFIGS: Record<MineNodeType, {
  name: string;
  description: string;
  badge: string;
  baseReward: number;
  baseRisk: 'safe' | 'low' | 'medium' | 'high' | 'boss';
  color: string;
  bgClass: string;
  borderClass: string;
}> = {
  entrance: {
    name: 'Главный ствол (Вход)',
    description: 'Начальная отметка спуска. Здесь рельсы ведут вглубь недр.',
    badge: 'СТАРТ',
    baseReward: 1.0,
    baseRisk: 'safe',
    color: '#94a3b8',
    bgClass: 'bg-slate-800',
    borderClass: 'border-slate-500'
  },
  ore: {
    name: 'Обычная рудная жила',
    description: 'Плотные залежи медной и железной руды. Стабильная добыча.',
    badge: 'РУДА',
    baseReward: 1.15,
    baseRisk: 'low',
    color: '#facc15',
    bgClass: 'bg-amber-950/80',
    borderClass: 'border-amber-400'
  },
  metal: {
    name: 'Титановый пласт',
    description: 'Богатая жила очищенных металлов и слитков для ковки снаряжения.',
    badge: 'МЕТАЛЛ',
    baseReward: 1.25,
    baseRisk: 'medium',
    color: '#cbd5e1',
    bgClass: 'bg-slate-800/90',
    borderClass: 'border-slate-300'
  },
  shards: {
    name: 'Кристальная жеода',
    description: 'Светящиеся друзы древних кристаллов. Источник редких осколков.',
    badge: 'ОСКОЛКИ',
    baseReward: 1.35,
    baseRisk: 'medium',
    color: '#38bdf8',
    bgClass: 'bg-sky-950/80',
    borderClass: 'border-sky-400'
  },
  monster_nest: {
    name: 'Логово подземных тварей',
    description: 'Опасный рассадник монстров. Усиленные засады, но трофеи увеличены на +65%!',
    badge: 'ОПАСНОСТЬ',
    baseReward: 1.65,
    baseRisk: 'high',
    color: '#ef4444',
    bgClass: 'bg-red-950/90',
    borderClass: 'border-red-500'
  },
  treasure: {
    name: 'Забытый склад шахтёров',
    description: 'Тайник с древними сундуками и ценной экипировкой.',
    badge: 'ТАЙНИК',
    baseReward: 1.5,
    baseRisk: 'low',
    color: '#fbbf24',
    bgClass: 'bg-yellow-950/90',
    borderClass: 'border-yellow-400'
  },
  rest: {
    name: 'Подземный аванпост',
    description: 'Безопасная стоянка. Ремонт обшивки вагонетки и передышка.',
    badge: 'ОТДЫХ',
    baseReward: 1.0,
    baseRisk: 'safe',
    color: '#10b981',
    bgClass: 'bg-emerald-950/90',
    borderClass: 'border-emerald-400'
  },
  boss: {
    name: 'Чертог Владыки Шахты',
    description: 'Глубинный эпицентр. Битва с боссом горизонта за легендарный трофей.',
    badge: 'БОСС',
    baseReward: 2.2,
    baseRisk: 'boss',
    color: '#c084fc',
    bgClass: 'bg-purple-950/90',
    borderClass: 'border-purple-400'
  }
};

export const getNodeId = (depth: number, col: number) => `node_${depth}_${col}`;

/**
 * Creates sector label based on horizontal col and depth
 */
export function getSectorName(depth: number, col: number): string {
  let lateralStr = 'Центральный ствол';
  if (col < 0) lateralStr = `Западный штрек (W${col})`;
  else if (col > 0) lateralStr = `Восточная штольня (E+${col})`;

  if (depth === 0) return `${lateralStr} • Поверхность`;
  if (depth % 5 === 0 && Math.abs(col) <= 1) return `${lateralStr} • Врата Босса (${depth}F)`;
  return `${lateralStr} • Горизонт ${depth}F`;
}

/**
 * Procedurally creates a single node at coordinates (depth, col)
 */
function createNodeAt(depth: number, col: number): MineMapNode {
  const id = getNodeId(depth, col);
  
  // Starting node
  if (depth === 0 && col === 0) {
    return {
      id,
      depth: 0,
      col: 0,
      type: 'entrance',
      name: NODE_CONFIGS.entrance.name,
      description: NODE_CONFIGS.entrance.description,
      sectorName: getSectorName(0, 0),
      rewardMultiplier: 1.0,
      difficultyMultiplier: 1.0,
      riskLevel: 'safe',
      connectedTo: [],
      visited: true,
      available: false,
      visibility: 'cleared'
    };
  }

  // Boss rooms occur at depth intervals (e.g. 5, 10, 15) near center
  const isBossRoom = depth > 0 && depth % 5 === 0 && Math.abs(col) <= 1;

  let type: MineNodeType = 'ore';
  if (isBossRoom) {
    type = 'boss';
  } else {
    // Semi-deterministic pseudo-random based on coordinates
    const pseudoSeed = Math.abs(Math.sin(depth * 37.19 + col * 91.53) * 10000) % 1;

    // West side (col < 0) has richer metal veins; East side (col > 0) has richer crystal shards
    if (col <= -2 && pseudoSeed < 0.45) {
      type = 'metal';
    } else if (col >= 2 && pseudoSeed < 0.45) {
      type = 'shards';
    } else if (pseudoSeed < 0.28) {
      type = 'ore';
    } else if (pseudoSeed < 0.50) {
      type = 'metal';
    } else if (pseudoSeed < 0.70) {
      type = 'shards';
    } else if (pseudoSeed < 0.82) {
      type = 'monster_nest';
    } else if (pseudoSeed < 0.92) {
      type = 'treasure';
    } else {
      type = 'rest';
    }
  }

  const cfg = NODE_CONFIGS[type];
  const diffMult = Number((1.0 + depth * 0.22 + (type === 'monster_nest' ? 0.35 : 0)).toFixed(2));
  const rewMult = Number((cfg.baseReward * (1.0 + depth * 0.15 + Math.abs(col) * 0.05)).toFixed(2));

  return {
    id,
    depth,
    col,
    type,
    name: cfg.name,
    description: cfg.description,
    sectorName: getSectorName(depth, col),
    rewardMultiplier: rewMult,
    difficultyMultiplier: diffMult,
    riskLevel: cfg.baseRisk,
    connectedTo: [],
    visited: false,
    available: false,
    visibility: 'fog'
  };
}

/**
 * Expands the graph infinitely around a center point (depth, col) through fog of war.
 * Connects both downwards (into deeper horizons) and laterally (left/right along adits & shafts).
 */
export function ensureInfiniteMineNodes(
  graph: MineMapGraph, 
  centerDepth: number, 
  centerCol: number, 
  depthRadius = 3, 
  colRadius = 3
): MineMapGraph {
  const nodes = { ...graph.nodes };

  const minD = Math.max(0, centerDepth - 1);
  const maxD = centerDepth + depthRadius;
  const minC = centerCol - colRadius;
  const maxC = centerCol + colRadius;

  // 1. Generate any missing nodes in the exploration bounds
  for (let d = minD; d <= maxD; d++) {
    for (let c = minC; c <= maxC; c++) {
      const id = getNodeId(d, c);
      if (!nodes[id]) {
        nodes[id] = createNodeAt(d, c);
      }
    }
  }

  // 2. Build / Update bidirectional connections
  // Each node connects:
  // - Downwards: (d+1, c), (d+1, c-1), (d+1, c+1)
  // - Laterally: (d, c-1), (d, c+1) (allowing infinite left/right exploration!)
  Object.values(nodes).forEach(node => {
    const d = node.depth;
    const c = node.col;
    const connSet = new Set(node.connectedTo);

    // Lateral connections (horizontal side tunnels)
    const leftId = getNodeId(d, c - 1);
    const rightId = getNodeId(d, c + 1);
    if (nodes[leftId]) connSet.add(leftId);
    if (nodes[rightId]) connSet.add(rightId);

    // Downward connections (descending tunnels)
    const downCenter = getNodeId(d + 1, c);
    const downLeft = getNodeId(d + 1, c - 1);
    const downRight = getNodeId(d + 1, c + 1);

    if (nodes[downCenter]) connSet.add(downCenter);
    if (nodes[downLeft]) connSet.add(downLeft);
    if (nodes[downRight]) connSet.add(downRight);

    node.connectedTo = Array.from(connSet);
  });

  // 3. Compute Fog of War (Visibility) based on visited nodes & current position
  const current = nodes[graph.currentNodeId] || nodes[getNodeId(0, 0)];
  if (current) current.visited = true;

  // Mark visibility and availability
  Object.values(nodes).forEach(node => {
    // If visited, always cleared
    if (node.visited) {
      node.visibility = 'cleared';
      node.available = false;
      return;
    }

    // Check distance to visited nodes and current position
    let isDirectNeighbor = false;
    let isScouted = false;

    // Check if directly connected to current position
    if (current && current.connectedTo.includes(node.id)) {
      isDirectNeighbor = true;
    }

    // Check distance to any visited node
    if (!isDirectNeighbor) {
      for (const vId of Object.keys(nodes)) {
        if (nodes[vId].visited) {
          const v = nodes[vId];
          const distD = Math.abs(node.depth - v.depth);
          const distC = Math.abs(node.col - v.col);
          if (distD <= 1 && distC <= 1) {
            isDirectNeighbor = true;
            break;
          } else if (distD <= 2 && distC <= 2) {
            isScouted = true;
          }
        }
      }
    }

    if (isDirectNeighbor) {
      node.visibility = 'visible';
      // If directly connected to current position, it's available to move to!
      node.available = Boolean(current && current.connectedTo.includes(node.id));
    } else if (isScouted) {
      node.visibility = 'scouted';
      node.available = false;
    } else {
      node.visibility = 'fog';
      node.available = false;
    }
  });

  // Calculate new bounds
  let minCol = graph.minCol;
  let maxCol = graph.maxCol;
  let minDepth = graph.minDepth;
  let maxDepth = graph.maxDepth;

  Object.values(nodes).forEach(n => {
    if (n.visibility !== 'fog') {
      if (n.col < minCol) minCol = n.col;
      if (n.col > maxCol) maxCol = n.col;
      if (n.depth < minDepth) minDepth = n.depth;
      if (n.depth > maxDepth) maxDepth = n.depth;
    }
  });

  return {
    nodes,
    minCol: Math.min(minCol, centerCol - 2),
    maxCol: Math.max(maxCol, centerCol + 2),
    minDepth: 0,
    maxDepth: Math.max(maxDepth, centerDepth + 2),
    currentNodeId: graph.currentNodeId,
    visitedCount: Object.values(nodes).filter(n => n.visited).length
  };
}

/**
 * Initializes a new infinite procedural mine graph starting at entrance (0, 0)
 */
export function generateInfiniteMineMap(): MineMapGraph {
  const rootNode = createNodeAt(0, 0);
  const initialGraph: MineMapGraph = {
    nodes: { [rootNode.id]: rootNode },
    minCol: -2,
    maxCol: 2,
    minDepth: 0,
    maxDepth: 3,
    currentNodeId: rootNode.id,
    visitedCount: 1
  };

  // Expand around the surface entrance
  return ensureInfiniteMineNodes(initialGraph, 0, 0, 3, 3);
}

// Backwards-compatible export
export function generateMineMap(): MineMapGraph {
  return generateInfiniteMineMap();
}
