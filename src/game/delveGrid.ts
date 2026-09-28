/**
 * PoE Subterranean Chart (Delve) Infinite Grid Generator
 * Procedural orthogonal 2D grid matrix with fog-of-war and rail conduits.
 */

export type DelveNodeType = 
  | 'entrance'        // Вход в шахту / Поверхность
  | 'ore'             // Рудная жила (Азурит / Медная руда)
  | 'metal'           // Металлургический пласт (Тяжелые металлы)
  | 'shards'          // Кристальная жеода (Древние осколки)
  | 'treasure'        // Забытое хранилище / Тайник шахтеров
  | 'monster_nest'    // Логово тварей бездны (Высокий риск/награда)
  | 'secret_cache'    // Скрытый тайник за разрушаемой стеной
  | 'boss';           // Чертог Владыки Глубин (Первобытный босс)

export type DelveNodeState = 'cleared' | 'reachable' | 'visible' | 'hidden';

export interface DelveNode {
  id: string;
  gridX: number;           // Lateral coordinate on grid (... -2, -1, 0, 1, 2 ...)
  gridY: number;           // Depth coordinate on grid (0 = surface, 1, 2, ... infinity)
  type: DelveNodeType;
  name: string;
  description: string;
  depth: number;
  rewardMultiplier: number;
  difficultyMultiplier: number;
  riskRating: 'safe' | 'low' | 'medium' | 'high' | 'deadly' | 'boss';
  state: DelveNodeState;
  visited: boolean;
  connectedNodes: string[]; // Adjacent connected node IDs on the grid
}

export interface DelvePath {
  id: string;
  fromId: string;
  toId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  cleared: boolean;
  activeRoute: boolean;
}

export interface DelveGridGraph {
  nodes: Record<string, DelveNode>;
  paths: DelvePath[];
  currentCartNodeId: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  clearedCount: number;
}

export const DELVE_NODE_THEMES: Record<DelveNodeType, {
  name: string;
  description: string;
  badge: string;
  baseReward: number;
  baseRisk: 'safe' | 'low' | 'medium' | 'high' | 'deadly' | 'boss';
  color: string;
  glowColor: string;
  bgHex: string;
  borderHex: string;
}> = {
  entrance: {
    name: 'Поверхностный ствол Нико',
    description: 'Начало пути. Здесь вагонетка заправляется и готова к спуску в бездну.',
    badge: 'СТАРТ',
    baseReward: 1.0,
    baseRisk: 'safe',
    color: '#94a3b8',
    glowColor: '#64748b',
    bgHex: '#1e293b',
    borderHex: '#475569'
  },
  ore: {
    name: 'Богатая рудная жила',
    description: 'Плотный массив медных и железных рудников. Высокий выход ресурсов.',
    badge: 'РУДА',
    baseReward: 1.2,
    baseRisk: 'low',
    color: '#facc15',
    glowColor: '#eab308',
    bgHex: '#422006',
    borderHex: '#eab308'
  },
  metal: {
    name: 'Металлургический пласт',
    description: 'Обогащенные залежи чистого титана и стали для кузнечного ремесла.',
    badge: 'МЕТАЛЛ',
    baseReward: 1.35,
    baseRisk: 'medium',
    color: '#cbd5e1',
    glowColor: '#94a3b8',
    bgHex: '#1e293b',
    borderHex: '#cbd5e1'
  },
  shards: {
    name: 'Кристальная жеода',
    description: 'Энергетические скопления древних осколков. Ценнейший материал зачарования.',
    badge: 'ОСКОЛКИ',
    baseReward: 1.5,
    baseRisk: 'medium',
    color: '#38bdf8',
    glowColor: '#0ea5e9',
    bgHex: '#082f49',
    borderHex: '#38bdf8'
  },
  treasure: {
    name: 'Хранилище погибших шахтеров',
    description: 'Запечатанный склад с древними сундуками, металлом и редким снаряжением.',
    badge: 'ТАЙНИК',
    baseReward: 1.7,
    baseRisk: 'low',
    color: '#fbbf24',
    glowColor: '#f59e0b',
    bgHex: '#451a03',
    borderHex: '#fbbf24'
  },
  monster_nest: {
    name: 'Гнездо подземных тварей',
    description: 'Рассадник свирепых чудовищ тьмы. Экстремальный риск, но трофеи +80%!',
    badge: 'ЛОГОВО',
    baseReward: 1.8,
    baseRisk: 'high',
    color: '#ef4444',
    glowColor: '#dc2626',
    bgHex: '#450a0a',
    borderHex: '#ef4444'
  },
  secret_cache: {
    name: 'Тайник за разрушаемой стеной',
    description: 'Скрытая каверна за монолитной стеной. Реликтовое оружие и сокровища.',
    badge: 'СЕКРЕТ',
    baseReward: 2.0,
    baseRisk: 'medium',
    color: '#a855f7',
    glowColor: '#9333ea',
    bgHex: '#3b0764',
    borderHex: '#a855f7'
  },
  boss: {
    name: 'Чертог Владыки Бездны',
    description: 'Эпицентр тьмы. Битва с первобытным ужасом недр за легендарный трофей.',
    badge: 'БОСС',
    baseReward: 2.6,
    baseRisk: 'boss',
    color: '#ec4899',
    glowColor: '#db2777',
    bgHex: '#500724',
    borderHex: '#f43f5e'
  }
};

export const getDelveNodeId = (gx: number, gy: number) => `delve_${gx}_${gy}`;

/**
 * Procedurally creates deterministic node data for coordinate (gx, gy)
 */
export function createDelveNodeAt(gx: number, gy: number): DelveNode {
  const id = getDelveNodeId(gx, gy);

  // Entrance node at (0, 0)
  if (gx === 0 && gy === 0) {
    return {
      id,
      gridX: 0,
      gridY: 0,
      depth: 0,
      type: 'entrance',
      name: DELVE_NODE_THEMES.entrance.name,
      description: DELVE_NODE_THEMES.entrance.description,
      rewardMultiplier: 1.0,
      difficultyMultiplier: 1.0,
      riskRating: 'safe',
      state: 'cleared',
      visited: true,
      connectedNodes: []
    };
  }

  // Boss chambers spawn on depth intervals (every 5 levels) near central lanes
  const isBossChamber = gy > 0 && gy % 5 === 0 && Math.abs(gx) <= 1;

  let type: DelveNodeType = 'ore';
  if (isBossChamber) {
    type = 'boss';
  } else {
    // Deterministic pseudo-random seed based on coordinate hash
    const seed = Math.abs(Math.sin(gx * 12.9898 + gy * 78.233) * 43758.5453) % 1;

    // West lanes (gx < 0) are richer in heavy metals and secret vaults
    // East lanes (gx > 0) are richer in abyssal crystal shards and monster dens
    if (gx <= -2 && seed < 0.38) {
      type = 'metal';
    } else if (gx >= 2 && seed < 0.38) {
      type = 'shards';
    } else if (seed < 0.26) {
      type = 'ore';
    } else if (seed < 0.46) {
      type = 'metal';
    } else if (seed < 0.66) {
      type = 'shards';
    } else if (seed < 0.80) {
      type = 'monster_nest';
    } else if (seed < 0.92) {
      type = 'treasure';
    } else {
      type = 'secret_cache';
    }
  }

  const theme = DELVE_NODE_THEMES[type];
  const diffMultiplier = Number((1.0 + gy * 0.22 + (type === 'monster_nest' ? 0.35 : 0) + (type === 'boss' ? 0.65 : 0)).toFixed(2));
  const rewMultiplier = Number((theme.baseReward * (1.0 + gy * 0.12 + Math.abs(gx) * 0.05)).toFixed(2));

  let risk = theme.baseRisk;
  if (gy >= 4 && risk === 'low') risk = 'medium';
  if (gy >= 7 && risk === 'medium') risk = 'high';
  if (gy >= 10 && risk === 'high') risk = 'deadly';

  return {
    id,
    gridX: gx,
    gridY: gy,
    depth: gy,
    type,
    name: theme.name,
    description: theme.description,
    rewardMultiplier: rewMultiplier,
    difficultyMultiplier: diffMultiplier,
    riskRating: risk,
    state: 'hidden',
    visited: false,
    connectedNodes: []
  };
}

/**
 * Deterministically checks if an orthogonal tunnel connection exists between two adjacent cells.
 * Guarantees full connectivity downward and laterally so the graph has no impassable dead ends.
 */
function hasOrthogonalTunnel(gx1: number, gy1: number, gx2: number, gy2: number): boolean {
  // All vertical connections exist to guarantee downward and upward passage
  if (gx1 === gx2 && Math.abs(gy1 - gy2) === 1) {
    return true;
  }
  // Lateral connections: deterministic check with high connectivity (~85%)
  if (gy1 === gy2 && Math.abs(gx1 - gy2) !== 0) {
    const minX = Math.min(gx1, gx2);
    const hash = Math.abs(Math.sin(minX * 37.17 + gy1 * 91.53) * 12345.67) % 1;
    // 85% of lateral connections are open tunnels
    return hash > 0.15;
  }
  return true;
}

/**
 * Infinite Delve Grid Matrix Generator (PoE Style).
 * Overloaded to support both `generateDelveGrid(x, y)` and `generateDelveGrid(existingGraph, x, y, radiusX, radiusY)`.
 */
export function generateDelveGrid(
  arg1?: DelveGridGraph | number,
  arg2?: number,
  arg3?: number,
  arg4: number = 4,
  arg5: number = 4
): DelveGridGraph {
  let existingGraph: DelveGridGraph | undefined;
  let centerGX = 0;
  let centerGY = 0;
  let radiusX = 4;
  let radiusY = 4;

  if (typeof arg1 === 'number') {
    centerGX = arg1;
    centerGY = typeof arg2 === 'number' ? arg2 : 0;
    radiusX = typeof arg3 === 'number' ? arg3 : 4;
    radiusY = typeof arg4 === 'number' ? arg4 : 4;
  } else if (typeof arg1 === 'object' && arg1 !== null) {
    existingGraph = arg1;
    centerGX = typeof arg2 === 'number' ? arg2 : (existingGraph.nodes[existingGraph.currentCartNodeId]?.gridX ?? 0);
    centerGY = typeof arg3 === 'number' ? arg3 : (existingGraph.nodes[existingGraph.currentCartNodeId]?.gridY ?? 0);
    radiusX = typeof arg4 === 'number' ? arg4 : 4;
    radiusY = typeof arg5 === 'number' ? arg5 : 4;
  }

  const nodes: Record<string, DelveNode> = existingGraph ? { ...existingGraph.nodes } : {};
  const currentCartId = existingGraph?.currentCartNodeId || getDelveNodeId(0, 0);

  // Guarantee entrance (0, 0)
  if (!nodes[getDelveNodeId(0, 0)]) {
    nodes[getDelveNodeId(0, 0)] = createDelveNodeAt(0, 0);
  }

  const minGY = Math.max(0, centerGY - 2);
  const maxGY = centerGY + radiusY + 2;
  const minGX = centerGX - radiusX - 1;
  const maxGX = centerGX + radiusX + 1;

  // 1. Generate grid nodes in region
  for (let gy = minGY; gy <= maxGY; gy++) {
    for (let gx = minGX; gx <= maxGX; gx++) {
      const id = getDelveNodeId(gx, gy);
      if (!nodes[id]) {
        nodes[id] = createDelveNodeAt(gx, gy);
      }
    }
  }

  // 2. Build strictly orthogonal grid paths between adjacent nodes
  const pathSet = new Map<string, DelvePath>();
  const addPath = (n1: DelveNode, n2: DelveNode) => {
    const key = [n1.id, n2.id].sort().join('<->');
    if (!pathSet.has(key)) {
      const bothCleared = n1.visited && n2.visited;
      pathSet.set(key, {
        id: key,
        fromId: n1.id,
        toId: n2.id,
        x1: n1.gridX,
        y1: n1.gridY,
        x2: n2.gridX,
        y2: n2.gridY,
        cleared: bothCleared,
        activeRoute: false
      });
    }
    if (!n1.connectedNodes.includes(n2.id)) n1.connectedNodes.push(n2.id);
    if (!n2.connectedNodes.includes(n1.id)) n2.connectedNodes.push(n1.id);
  };

  Object.values(nodes).forEach(node => {
    const rightId = getDelveNodeId(node.gridX + 1, node.gridY);
    const downId = getDelveNodeId(node.gridX, node.gridY + 1);

    if (nodes[rightId] && hasOrthogonalTunnel(node.gridX, node.gridY, node.gridX + 1, node.gridY)) {
      addPath(node, nodes[rightId]);
    }
    if (nodes[downId] && hasOrthogonalTunnel(node.gridX, node.gridY, node.gridX, node.gridY + 1)) {
      addPath(node, nodes[downId]);
    }
  });

  // Guarantee that every node has at least one connected neighbor downward or sideways
  Object.values(nodes).forEach(node => {
    if (node.connectedNodes.length === 0) {
      const downId = getDelveNodeId(node.gridX, node.gridY + 1);
      if (nodes[downId]) addPath(node, nodes[downId]);
      else {
        const rightId = getDelveNodeId(node.gridX + 1, node.gridY);
        if (nodes[rightId]) addPath(node, nodes[rightId]);
      }
    }
  });

  // 3. Fog of War & Reachability System
  // - 'cleared': Node visited by crawler
  // - 'reachable': Directly connected to a cleared node (available for expedition click!)
  // - 'visible': Within vision distance of cleared network (scouted through mist)
  // - 'hidden': Subterranean dark fog
  const clearedNodeIds = new Set<string>();
  Object.values(nodes).forEach(n => {
    if (n.visited) clearedNodeIds.add(n.id);
  });

  // Guarantee current cart node is marked visited
  if (nodes[currentCartId]) {
    nodes[currentCartId].visited = true;
    clearedNodeIds.add(currentCartId);
  }

  Object.values(nodes).forEach(node => {
    if (node.visited) {
      node.state = 'cleared';
      return;
    }

    // Check if connected directly to ANY cleared node
    const isAdjacentToCleared = node.connectedNodes.some(neighborId => clearedNodeIds.has(neighborId));

    if (isAdjacentToCleared) {
      node.state = 'reachable';
      return;
    }

    // Check distance to cleared network
    let isClose = false;
    for (const cId of clearedNodeIds) {
      const c = nodes[cId];
      if (c) {
        const d = Math.abs(node.gridX - c.gridX) + Math.abs(node.gridY - c.gridY);
        if (d <= 2) {
          isClose = true;
          break;
        }
      }
    }

    node.state = isClose ? 'visible' : 'hidden';
  });

  // Update cleared status on paths
  pathSet.forEach(path => {
    const n1 = nodes[path.fromId];
    const n2 = nodes[path.toId];
    path.cleared = Boolean(n1?.visited && n2?.visited);
  });

  // Compute bounding box
  let minX = 0, maxX = 0, minY = 0, maxY = 3;
  Object.values(nodes).forEach(n => {
    if (n.state !== 'hidden') {
      if (n.gridX < minX) minX = n.gridX;
      if (n.gridX > maxX) maxX = n.gridX;
      if (n.gridY < minY) minY = n.gridY;
      if (n.gridY > maxY) maxY = n.gridY;
    }
  });

  return {
    nodes,
    paths: Array.from(pathSet.values()),
    currentCartNodeId: currentCartId,
    minX,
    maxX,
    minY,
    maxY,
    clearedCount: clearedNodeIds.size
  };
}

/**
 * Finds shortest route path between startNodeId and targetNodeId on grid.
 * Returns array of node IDs from start to target.
 */
export function findDelveRoute(
  graph: DelveGridGraph,
  startId: string,
  targetId: string
): string[] {
  if (startId === targetId) return [startId];
  if (!graph.nodes[startId] || !graph.nodes[targetId]) return [startId];

  const queue: string[] = [startId];
  const cameFrom: Record<string, string | null> = { [startId]: null };

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === targetId) break;

    const currNode = graph.nodes[current];
    if (!currNode) continue;

    for (const neighborId of currNode.connectedNodes) {
      if (!(neighborId in cameFrom)) {
        cameFrom[neighborId] = current;
        queue.push(neighborId);
      }
    }
  }

  if (!(targetId in cameFrom)) {
    return [startId, targetId]; // Fallback direct segment
  }

  const path: string[] = [];
  let curr: string | null = targetId;
  while (curr !== null) {
    path.unshift(curr);
    curr = cameFrom[curr] ?? null;
  }
  return path;
}

/**
 * Progresses the Delve Graph upon winning an expedition to targetNodeId:
 * - Marks targetNodeId as visited
 * - Moves current cart to targetNodeId
 * - Expands surrounding grid and lifts fog of war
 */
export function markDelveNodeCleared(
  graph: DelveGridGraph,
  nodeId: string
): DelveGridGraph {
  const node = graph.nodes[nodeId];
  if (!node) return graph;

  const updatedNodes = { ...graph.nodes };
  updatedNodes[nodeId] = {
    ...node,
    visited: true,
    state: 'cleared'
  };

  const updatedGraph: DelveGridGraph = {
    ...graph,
    nodes: updatedNodes,
    currentCartNodeId: nodeId
  };

  // Expand grid around newly cleared position
  return generateDelveGrid(updatedGraph, node.gridX, node.gridY, 4, 4);
}

