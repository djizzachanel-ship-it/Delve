/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export type AssetCategory = 'monster' | 'boss' | 'hero' | 'node' | 'tower' | 'prop';

export type AssetType = 'image' | 'canvas' | 'svg' | 'model_3d' | 'component';

export interface CanvasRenderContext {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  scale?: number;
  time?: number;
  inLight?: boolean;
  state?: any; // entity data (hp, maxHp, attackTimer, etc.)
  colorTint?: string;
  isAttacking?: boolean;
  direction?: 'left' | 'right';
}

export type CanvasRenderFn = (params: CanvasRenderContext) => void;

export interface BaseEntityAsset {
  id: string;
  name: string;
  category: AssetCategory;
  scale?: number;
  anchorX?: number; // 0..1 (default 0.5)
  anchorY?: number; // 0..1 (default 1.0 = bottom-center)
  shadow?: {
    radiusX: number;
    radiusY: number;
    opacity: number;
    color?: string;
  };
}

export interface ImageEntityAsset extends BaseEntityAsset {
  type: 'image';
  src: string;
  frameWidth?: number;
  frameHeight?: number;
  frameCount?: number;
  fps?: number;
  fallbackCanvas?: CanvasRenderFn;
}

export interface CanvasEntityAsset extends BaseEntityAsset {
  type: 'canvas';
  render: CanvasRenderFn;
}

export interface SvgEntityAsset extends BaseEntityAsset {
  type: 'svg';
  svgPath?: string;
  viewBox?: string;
  color?: string;
  component?: React.ComponentType<{ className?: string; size?: number; color?: string }>;
}

export interface Model3DEntityAsset extends BaseEntityAsset {
  type: 'model_3d';
  modelSrc: string; // e.g. '/assets/models/goblin.glb'
  textureSrc?: string;
  wireframeColor?: string;
  fallbackCanvas?: CanvasRenderFn;
}

export interface ComponentEntityAsset extends BaseEntityAsset {
  type: 'component';
  component: React.ComponentType<any>;
}

export type EntityAsset = 
  | ImageEntityAsset 
  | CanvasEntityAsset 
  | SvgEntityAsset 
  | Model3DEntityAsset 
  | ComponentEntityAsset;

// ==========================================
// 2. IMAGE PRELOADER & RUNTIME CACHE
// ==========================================

const imageCache: Map<string, HTMLImageElement> = new Map();
const imageLoadStatus: Map<string, 'loading' | 'loaded' | 'error'> = new Map();

export function preloadImage(src: string): HTMLImageElement | null {
  if (typeof window === 'undefined') return null;
  
  if (imageCache.has(src)) {
    return imageCache.get(src)!;
  }

  const img = new Image();
  img.src = src;
  imageLoadStatus.set(src, 'loading');
  
  img.onload = () => {
    imageLoadStatus.set(src, 'loaded');
  };
  
  img.onerror = () => {
    imageLoadStatus.set(src, 'error');
  };

  imageCache.set(src, img);
  return img;
}

export function getImageStatus(src: string): 'loading' | 'loaded' | 'error' | 'not_requested' {
  return imageLoadStatus.get(src) || 'not_requested';
}

// ==========================================
// 3. DEFAULT PROCEDURAL CANVAS RENDERS
// ==========================================

// Goblin procedural render
export const renderGoblinCanvas: CanvasRenderFn = ({ ctx, x, y, scale = 1, time = 0, inLight = true, state }) => {
  const s = scale;
  const bob = Math.sin(time * 0.008) * 1.5;
  const iy = y + bob;

  // Body
  ctx.fillStyle = inLight ? '#16a34a' : '#14532d';
  ctx.beginPath();
  ctx.moveTo(x - 9 * s, iy);
  ctx.lineTo(x, iy - 22 * s);
  ctx.lineTo(x + 9 * s, iy);
  ctx.closePath();
  ctx.fill();

  // Dark shading
  ctx.fillStyle = '#166534';
  ctx.beginPath();
  ctx.moveTo(x, iy);
  ctx.lineTo(x, iy - 22 * s);
  ctx.lineTo(x + 9 * s, iy);
  ctx.closePath();
  ctx.fill();

  // Miner lamp on forehead
  ctx.fillStyle = '#ca8a04';
  ctx.beginPath();
  ctx.arc(x, iy - 21 * s, 4 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(x, iy - 21 * s, 2 * s, 0, Math.PI * 2);
  ctx.fill();

  // Glowing lamp beam if in light
  if (inLight) {
    ctx.save();
    ctx.fillStyle = 'rgba(254, 240, 138, 0.15)';
    ctx.beginPath();
    ctx.moveTo(x, iy - 21 * s);
    ctx.lineTo(x + 14 * s, iy - 26 * s);
    ctx.lineTo(x + 16 * s, iy - 16 * s);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
};

// Shadow stalker procedural render
export const renderShadowStalkerCanvas: CanvasRenderFn = ({ ctx, x, y, scale = 1, time = 0, inLight = false }) => {
  const s = scale;
  const floatBob = Math.sin(time * 0.006) * 3;
  const iy = y + floatBob;

  // Dark spectral cloak
  ctx.fillStyle = inLight ? '#3b0764' : '#1e0836';
  ctx.beginPath();
  ctx.moveTo(x - 10 * s, iy);
  ctx.lineTo(x, iy - 25 * s);
  ctx.lineTo(x + 10 * s, iy);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#581c87';
  ctx.beginPath();
  ctx.moveTo(x, iy);
  ctx.lineTo(x, iy - 25 * s);
  ctx.lineTo(x + 10 * s, iy);
  ctx.closePath();
  ctx.fill();

  // Glowing ethereal eyes
  ctx.fillStyle = inLight ? '#ec4899' : '#a855f7';
  ctx.beginPath();
  ctx.arc(x - 3 * s, iy - 14 * s, 2 * s, 0, Math.PI * 2);
  ctx.arc(x + 3 * s, iy - 14 * s, 2 * s, 0, Math.PI * 2);
  ctx.fill();

  // Shadow trail particles
  const pulse = Math.sin(time * 0.01) * 2;
  ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
  ctx.beginPath();
  ctx.arc(x, iy - 5 * s, (4 + pulse) * s, 0, Math.PI * 2);
  ctx.fill();
};

// Crystal crawler procedural render
export const renderCrystalCrawlerCanvas: CanvasRenderFn = ({ ctx, x, y, scale = 1, time = 0 }) => {
  const s = scale;
  const step = Math.sin(time * 0.01) * 2;
  const iy = y + step;

  // Sharp crystalline carapace
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.moveTo(x - 12 * s, iy);
  ctx.lineTo(x, iy - 19 * s);
  ctx.lineTo(x + 12 * s, iy);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.moveTo(x, iy);
  ctx.lineTo(x, iy - 19 * s);
  ctx.lineTo(x + 12 * s, iy);
  ctx.closePath();
  ctx.fill();

  // Bright core eye
  ctx.fillStyle = '#e0f2fe';
  ctx.beginPath();
  ctx.arc(x, iy - 11 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();

  // Crystal facets
  ctx.strokeStyle = '#bae6fd';
  ctx.lineWidth = 1 * s;
  ctx.beginPath();
  ctx.moveTo(x - 6 * s, iy - 6 * s);
  ctx.lineTo(x, iy - 14 * s);
  ctx.lineTo(x + 6 * s, iy - 6 * s);
  ctx.stroke();
};

// Boss: Foreman (Бригадир)
export const renderForemanCanvas: CanvasRenderFn = ({ ctx, x, y, scale = 2.1, time = 0 }) => {
  const s = scale;
  const iy = y;

  // Massive horned helmet and pickaxe
  ctx.fillStyle = '#78350f';
  ctx.beginPath();
  ctx.moveTo(x - 14 * s, iy);
  ctx.lineTo(x, iy - 32 * s);
  ctx.lineTo(x + 14 * s, iy);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#92400e';
  ctx.beginPath();
  ctx.moveTo(x, iy);
  ctx.lineTo(x, iy - 32 * s);
  ctx.lineTo(x + 14 * s, iy);
  ctx.closePath();
  ctx.fill();

  // Horned mining helmet
  ctx.fillStyle = '#451a03';
  ctx.beginPath();
  ctx.arc(x, iy - 26 * s, 7 * s, 0, Math.PI * 2);
  ctx.fill();

  // Burning eyes
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(x - 3 * s, iy - 25 * s, 2 * s, 0, Math.PI * 2);
  ctx.arc(x + 3 * s, iy - 25 * s, 2 * s, 0, Math.PI * 2);
  ctx.fill();

  // Golden belt buckle
  ctx.fillStyle = '#facc15';
  ctx.fillRect(x - 4 * s, iy - 10 * s, 8 * s, 4 * s);
};

// Boss: Shadow Lord (Повелитель Теней)
export const renderShadowLordCanvas: CanvasRenderFn = ({ ctx, x, y, scale = 2.1, time = 0, state }) => {
  const s = scale;
  const isChanneling = state?.telegraphTimer && state.telegraphTimer > 0;
  const iy = y;

  ctx.fillStyle = isChanneling ? '#2e0854' : '#3b0764';
  ctx.beginPath();
  ctx.moveTo(x - 13 * s, iy);
  ctx.lineTo(x, iy - 32 * s);
  ctx.lineTo(x + 13 * s, iy);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#581c87';
  ctx.beginPath();
  ctx.moveTo(x, iy);
  ctx.lineTo(x, iy - 32 * s);
  ctx.lineTo(x + 13 * s, iy);
  ctx.closePath();
  ctx.fill();

  // Crown spikes
  ctx.fillStyle = '#c084fc';
  ctx.beginPath();
  ctx.moveTo(x - 8 * s, iy - 32 * s);
  ctx.lineTo(x, iy - 42 * s);
  ctx.lineTo(x + 8 * s, iy - 32 * s);
  ctx.closePath();
  ctx.fill();

  // Crimson glowing eyes
  ctx.fillStyle = '#f43f5e';
  ctx.beginPath();
  ctx.arc(x - 4 * s, iy - 26 * s, 2 * s, 0, Math.PI * 2);
  ctx.arc(x + 4 * s, iy - 26 * s, 2 * s, 0, Math.PI * 2);
  ctx.fill();

  // Ethereal tendrils
  if (isChanneling) {
    ctx.save();
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const off = Math.sin(time * 0.01 + i * 2) * 8;
      ctx.beginPath();
      ctx.moveTo(x - 10 + i * 10, iy);
      ctx.quadraticCurveTo(x + off, iy - 25, x, iy - 45);
      ctx.stroke();
    }
    ctx.restore();
  }
};

// Boss: Crystal Colossus (Кристальный Колосс)
export const renderCrystalColossusCanvas: CanvasRenderFn = ({ ctx, x, y, scale = 2.1, time = 0 }) => {
  const s = scale;
  const iy = y;

  ctx.fillStyle = '#0369a1';
  ctx.beginPath();
  ctx.moveTo(x - 13 * s, iy);
  ctx.lineTo(x, iy - 29 * s);
  ctx.lineTo(x + 13 * s, iy);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.moveTo(x, iy);
  ctx.lineTo(x, iy - 29 * s);
  ctx.lineTo(x + 13 * s, iy);
  ctx.closePath();
  ctx.fill();

  // Cyan back crystal spikes
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.moveTo(x - 10 * s, iy - 15 * s);
  ctx.lineTo(x - 18 * s, iy - 28 * s);
  ctx.lineTo(x - 4 * s, iy - 24 * s);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x + 10 * s, iy - 15 * s);
  ctx.lineTo(x + 18 * s, iy - 28 * s);
  ctx.lineTo(x + 4 * s, iy - 24 * s);
  ctx.closePath();
  ctx.fill();

  // Crystal core eye
  ctx.fillStyle = '#67e8f9';
  ctx.beginPath();
  ctx.arc(x, iy - 22 * s, 3.5 * s, 0, Math.PI * 2);
  ctx.fill();
};

// Mining Nodes: Ore, Volatile, Chest
export const renderNodeCanvas: CanvasRenderFn = ({ ctx, x, y, scale = 1, state, time = 0 }) => {
  const kind = state?.kind || 'normal';
  const s = scale;

  if (kind === 'chest') {
    // Wooden chest with brass corners
    ctx.fillStyle = state?.opened ? '#334155' : '#78350f';
    ctx.beginPath();
    ctx.roundRect(x - 14 * s, y - 20 * s, 28 * s, 18 * s, 3);
    ctx.fill();
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Lock latch
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(x, y - 11 * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'volatile') {
    // Volatile pulsing red/amber crystal
    const pulse = Math.sin(time * 0.01) * 2;
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.moveTo(x, y - (24 + pulse) * s);
    ctx.lineTo(x + 11 * s, y - 6 * s);
    ctx.lineTo(x, y);
    ctx.lineTo(x - 11 * s, y - 6 * s);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fb7185';
    ctx.beginPath();
    ctx.moveTo(x, y - (24 + pulse) * s);
    ctx.lineTo(x + 11 * s, y - 6 * s);
    ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fill();
  } else {
    // Normal rich ore node
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(x - 14 * s, y);
    ctx.lineTo(x - 10 * s, y - 18 * s);
    ctx.lineTo(x + 4 * s, y - 22 * s);
    ctx.lineTo(x + 14 * s, y - 12 * s);
    ctx.lineTo(x + 12 * s, y);
    ctx.closePath();
    ctx.fill();

    // Gold/copper ore veins inside
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(x - 3 * s, y - 12 * s, 2.5 * s, 0, Math.PI * 2);
    ctx.arc(x + 5 * s, y - 15 * s, 2 * s, 0, Math.PI * 2);
    ctx.arc(x + 2 * s, y - 8 * s, 1.5 * s, 0, Math.PI * 2);
    ctx.fill();
  }
};

// Hero Player in mine
export const renderHeroMinerCanvas: CanvasRenderFn = ({ ctx, x, y, scale = 1, state, time = 0 }) => {
  const s = scale;
  const isMoving = state?.moving;
  const walkBob = isMoving ? Math.sin(time * 0.015) * 1.5 : 0;
  const iy = y + walkBob;

  // Legs & Boots
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(x - 6 * s, iy - 10 * s, 4 * s, 10 * s);
  ctx.fillRect(x + 2 * s, iy - 10 * s, 4 * s, 10 * s);

  // Miner Cloak / Tunic
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.moveTo(x - 8 * s, iy - 10 * s);
  ctx.lineTo(x - 10 * s, iy - 28 * s);
  ctx.lineTo(x + 10 * s, iy - 28 * s);
  ctx.lineTo(x + 8 * s, iy - 10 * s);
  ctx.closePath();
  ctx.fill();

  // Helmet with headlamp
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.arc(x, iy - 32 * s, 7 * s, Math.PI, 0);
  ctx.closePath();
  ctx.fill();

  // Helmet Lamp
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(x, iy - 35 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();

  // Red miner scarf
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.moveTo(x - 6 * s, iy - 26 * s);
  ctx.lineTo(x - 10 * s, iy - 14 * s);
  ctx.lineTo(x - 3 * s, iy - 14 * s);
  ctx.closePath();
  ctx.fill();
};

// ==========================================
// 4. CENTRAL ASSET REGISTRY
// ==========================================

export const ASSET_REGISTRY: Record<string, EntityAsset> = {
  // --- MONSTERS ---
  corridor_goblin: {
    id: 'corridor_goblin',
    name: 'Коридорный Гоблин',
    category: 'monster',
    // Example: Can be swapped to 'image' by setting type: 'image', src: '/assets/monsters/goblin.png', scale: 1.2
    type: 'canvas',
    scale: 1.0,
    render: renderGoblinCanvas,
    shadow: { radiusX: 14, radiusY: 7, opacity: 0.5 },
  },

  goblin: {
    // Alias to corridor_goblin for easy developer reference
    id: 'goblin',
    name: 'Коридорный Гоблин',
    category: 'monster',
    type: 'canvas',
    scale: 1.0,
    render: renderGoblinCanvas,
    shadow: { radiusX: 14, radiusY: 7, opacity: 0.5 },
  },

  shadow_stalker: {
    id: 'shadow_stalker',
    name: 'Теневой Охотник',
    category: 'monster',
    type: 'canvas',
    scale: 1.0,
    render: renderShadowStalkerCanvas,
    shadow: { radiusX: 15, radiusY: 7, opacity: 0.6 },
  },

  crystal_crawler: {
    id: 'crystal_crawler',
    name: 'Кристальный Ползун',
    category: 'monster',
    type: 'canvas',
    scale: 1.0,
    render: renderCrystalCrawlerCanvas,
    shadow: { radiusX: 14, radiusY: 7, opacity: 0.45 },
  },

  // --- BOSSES ---
  foreman: {
    id: 'foreman',
    name: 'Бригадир Карьера',
    category: 'boss',
    type: 'canvas',
    scale: 2.1,
    render: renderForemanCanvas,
    shadow: { radiusX: 24, radiusY: 11, opacity: 0.7 },
  },

  shadow_lord: {
    id: 'shadow_lord',
    name: 'Повелитель Теней',
    category: 'boss',
    type: 'canvas',
    scale: 2.1,
    render: renderShadowLordCanvas,
    shadow: { radiusX: 26, radiusY: 12, opacity: 0.75 },
  },

  crystal_colossus: {
    id: 'crystal_colossus',
    name: 'Кристальный Колосс',
    category: 'boss',
    type: 'canvas',
    scale: 2.1,
    render: renderCrystalColossusCanvas,
    shadow: { radiusX: 25, radiusY: 11, opacity: 0.7 },
  },

  // --- HERO ---
  hero_miner: {
    id: 'hero_miner',
    name: 'Герой Шахтёр',
    category: 'hero',
    type: 'canvas',
    scale: 1.0,
    render: renderHeroMinerCanvas,
    shadow: { radiusX: 16, radiusY: 8, opacity: 0.55 },
  },

  // --- ENVIRONMENT TILES ---
  wall: {
    id: 'wall',
    name: 'Стена Шахты',
    category: 'prop',
    type: 'canvas',
    scale: 1.0,
    render: ({ ctx, x, y, scale = 1 }) => {
      const s = scale;
      // Stone wall block
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(x, y - 24 * s);
      ctx.lineTo(x + 24 * s, y - 12 * s);
      ctx.lineTo(x, y);
      ctx.lineTo(x - 24 * s, y - 12 * s);
      ctx.closePath();
      ctx.fill();

      // Front wall faces
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(x - 24 * s, y - 12 * s);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + 20 * s);
      ctx.lineTo(x - 24 * s, y + 8 * s);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 24 * s, y - 12 * s);
      ctx.lineTo(x + 24 * s, y + 8 * s);
      ctx.lineTo(x, y + 20 * s);
      ctx.closePath();
      ctx.fill();
    },
    shadow: { radiusX: 20, radiusY: 10, opacity: 0.5 }
  },

  floor: {
    id: 'floor',
    name: 'Пол Шахты',
    category: 'prop',
    type: 'canvas',
    scale: 1.0,
    render: ({ ctx, x, y, scale = 1 }) => {
      ctx.fillStyle = '#161d27';
      ctx.fillRect(x - 20 * scale, y - 10 * scale, 40 * scale, 20 * scale);
    }
  },

  // --- MINING NODES ---
  mining_node: {
    id: 'mining_node',
    name: 'Жила Руды',
    category: 'node',
    type: 'canvas',
    scale: 1.0,
    render: renderNodeCanvas,
    shadow: { radiusX: 15, radiusY: 8, opacity: 0.4 },
  },

  // --- TOWERS & DEFENSE ---
  watchtower: {
    id: 'watchtower',
    name: 'Дозорная Вышка',
    category: 'tower',
    type: 'canvas',
    scale: 1.0,
    render: ({ ctx, x, y, scale = 1 }) => {
      const s = scale;
      // Stone tower base
      ctx.fillStyle = '#334155';
      ctx.fillRect(x - 12 * s, y - 36 * s, 24 * s, 36 * s);
      // Battlements
      ctx.fillStyle = '#475569';
      ctx.fillRect(x - 15 * s, y - 42 * s, 30 * s, 7 * s);
      // Tower beacon
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(x, y - 46 * s, 4 * s, 0, Math.PI * 2);
      ctx.fill();
    },
    shadow: { radiusX: 18, radiusY: 9, opacity: 0.6 }
  }
};

// ==========================================
// 5. REGISTRY ACCESS & HOT-SWAP API
// ==========================================

/**
 * Retrieve an asset definition from the registry.
 * Falls back to generic monster or node if not found.
 */
export function getAsset(id: string): EntityAsset {
  if (ASSET_REGISTRY[id]) {
    return ASSET_REGISTRY[id];
  }
  // Fallbacks
  if (id.includes('stalker')) return ASSET_REGISTRY.shadow_stalker;
  if (id.includes('crawler')) return ASSET_REGISTRY.crystal_crawler;
  if (id.includes('colossus')) return ASSET_REGISTRY.crystal_colossus;
  if (id.includes('lord')) return ASSET_REGISTRY.shadow_lord;
  if (id.includes('foreman')) return ASSET_REGISTRY.foreman;
  return ASSET_REGISTRY.corridor_goblin;
}

/**
 * Hot-swap or register a new asset definition at runtime.
 * Enables instant replacement of any 2D sprite, image, or canvas function.
 */
export function registerAsset(id: string, asset: EntityAsset): void {
  ASSET_REGISTRY[id] = asset;
  if (asset.type === 'image' && asset.src) {
    preloadImage(asset.src);
  }
}

/**
 * Convenience method to quickly re-skin an entity to an image in 10 seconds:
 * setEntityImage('goblin', '/assets/monsters/goblin.png', 1.2)
 */
export function setEntityImage(id: string, src: string, scale = 1.0, fallbackCanvas?: CanvasRenderFn): void {
  const current = getAsset(id);
  ASSET_REGISTRY[id] = {
    ...current,
    type: 'image',
    src,
    scale: scale || current.scale || 1.0,
    fallbackCanvas: fallbackCanvas || (current.type === 'canvas' ? current.render : undefined)
  };
  preloadImage(src);
}

// ==========================================
// 6. HIGH PERFORMANCE CANVAS RENDER DISPATCHER
// ==========================================

export interface RenderEntityParams {
  x: number;
  y: number;
  scale?: number;
  time?: number;
  inLight?: boolean;
  state?: any;
  colorTint?: string;
  isAttacking?: boolean;
  direction?: 'left' | 'right';
  showShadow?: boolean;
}

/**
 * Universal entity renderer for high-speed HTML5 Canvas.
 * Automatically checks whether the entity is an Image, Procedural Canvas, or 3D,
 * handles shadow casting, image preloading, and fallback vector graphics.
 */
export function renderEntityCanvas(
  ctx: CanvasRenderingContext2D,
  entityId: string,
  params: RenderEntityParams
): void {
  const asset = getAsset(entityId);
  const { x, y, scale = asset.scale || 1, inLight = true, showShadow = true } = params;

  // 1. Draw Ground Contact Shadow
  if (showShadow && asset.shadow) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(
      x, 
      y, 
      asset.shadow.radiusX * scale, 
      asset.shadow.radiusY * scale, 
      0, 
      0, 
      Math.PI * 2
    );
    ctx.fillStyle = asset.shadow.color || `rgba(0, 0, 0, ${asset.shadow.opacity})`;
    ctx.fill();
    ctx.restore();
  }

  // 2. Dispatch Render based on Asset Type
  if (asset.type === 'image') {
    const img = preloadImage(asset.src);
    const status = getImageStatus(asset.src);

    if (img && status === 'loaded') {
      // Draw loaded image sprite
      ctx.save();
      const ax = asset.anchorX !== undefined ? asset.anchorX : 0.5;
      const ay = asset.anchorY !== undefined ? asset.anchorY : 1.0;
      const w = img.width * scale;
      const h = img.height * scale;
      const drawX = x - w * ax;
      const drawY = y - h * ay;

      if (!inLight) {
        ctx.filter = 'brightness(55%) hue-rotate(20deg)';
      }
      ctx.drawImage(img, drawX, drawY, w, h);
      ctx.restore();
      return;
    }

    // Image loading or failed -> use fallback canvas render if available!
    if (asset.fallbackCanvas) {
      asset.fallbackCanvas({ ctx, ...params, scale });
      return;
    }
    
    // Default fallback to procedural goblin/crawler
    renderGoblinCanvas({ ctx, ...params, scale });
    return;
  }

  if (asset.type === 'canvas') {
    asset.render({ ctx, ...params, scale });
    return;
  }

  if (asset.type === 'model_3d') {
    // 3D Model Wireframe/Silhouette or Fallback
    if (asset.fallbackCanvas) {
      asset.fallbackCanvas({ ctx, ...params, scale });
    } else {
      renderGoblinCanvas({ ctx, ...params, scale });
    }
    return;
  }
}

// ==========================================
// 7. REACT VISUAL COMPONENT
// ==========================================

export interface EntityVisualProps {
  entityId: string;
  size?: number;
  className?: string;
  inLight?: boolean;
}

/**
 * React Component for displaying an entity from the registry inside DOM / UI views.
 * Uses an offscreen canvas or image element to render the registered entity.
 */
export const EntityVisual: React.FC<EntityVisualProps> = ({
  entityId,
  size = 48,
  className = '',
  inLight = true
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const asset = getAsset(entityId);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const centerX = canvas.width / 2;
    const centerY = canvas.height * 0.85;
    const fitScale = (size / 36) * (asset.scale || 1.0);

    renderEntityCanvas(ctx, entityId, {
      x: centerX,
      y: centerY,
      scale: fitScale,
      time: Date.now(),
      inLight,
      showShadow: true
    });
  }, [entityId, size, inLight, asset]);

  return (
    <div 
      className={`inline-flex items-center justify-center relative select-none ${className}`}
      style={{ width: size, height: size }}
      title={asset.name}
    >
      <canvas 
        ref={canvasRef} 
        width={size * 2} 
        height={size * 2} 
        style={{ width: size, height: size }}
      />
    </div>
  );
};
