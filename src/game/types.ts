import { GameState, Item } from '../types';

export type EnemyKind = 
  | 'corridor_goblin' 
  | 'shadow_stalker' 
  | 'crystal_crawler';

export type BossKind = 
  | 'foreman' 
  | 'shadow_lord' 
  | 'crystal_colossus';

export interface Enemy { 
  id: string; 
  x: number; 
  y: number; 
  hp: number; 
  maxHp: number; 
  speed: number; 
  damage: number; 
  boss: boolean; 
  aggro: boolean; 
  attackTimer: number; 
  chargeX?: number; 
  chargeY?: number;
  kind?: EnemyKind;
  bossKind?: BossKind;
  name?: string;
  inLight?: boolean;
  telegraphTimer?: number;
  maxTelegraph?: number;
  telegraphType?: 'shadow_blink' | 'ground_slam' | 'nova';
  targetX?: number;
  targetY?: number;
  telegraphRadius?: number;
  preparingStrike?: boolean;
  strikeTimer?: number;
  stunTimer?: number;
  strikeAngle?: number;
}

export interface CartModules {
  searchlight: boolean;
  turret: boolean;
  magnet: boolean;
}

export interface PerkDef {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface Loot { id: string; x: number; y: number; type: 'ore'|'metal'|'shards'; vx: number; vy: number; magnet: boolean; }
export interface Slash { id: string; x: number; y: number; angle: number; life: number; color?: string; radius?: number; }
export interface FloatingText { id: string; x: number; y: number; text: string; color: string; life: number; floatY: number; }
export interface MiningNode { 
  id: string; 
  x: number; 
  y: number; 
  hp: number; 
  maxHp: number; 
  mobSpawned?: boolean;
  kind?: 'normal' | 'volatile' | 'chest';
  exploding?: boolean;
  fuseTimer?: number;
  opened?: boolean;
}
export interface Torch { id: string; x: number; y: number; life: number; }

export interface GameEngineState {
    player: { x: number, y: number, hp: number, attackTimer: number, miningTimer: number, inLight: boolean, moving: boolean, invulnTimer?: number };
    joystick: { active: boolean, originX: number, originY: number, currX: number, currY: number };
    cart: { x: number, y: number, pathIndex: number, turretAngle?: number, speed?: number, isCatchingUp?: boolean };
    grid: number[][];
    rails: {x:number, y:number}[];
    nodes: MiningNode[];
    torches: Torch[];
    enemies: Enemy[];
    loots: Loot[];
    slashes: Slash[];
    texts: FloatingText[];
    width: number;
    height: number;
    lastTime: number;
    waveStarted: boolean;
    torchCooldown: number;
    winTimer: number;
    screenShake: number;
    accumulatedLoot: { ore: number, metal: number, shards: number };
    lightCanvas: HTMLCanvasElement | null;
    cartModules: CartModules;
    activePerk: string | null;
    turretCooldown: number;
    teslaCooldown: number;
    dynamiteCooldown: number;
    bossDefeated: boolean;
    accumulatedItems?: Item[];
    ambientAmbushTimer?: number;
    cartMilestonesTriggered?: { p25?: boolean; p50?: boolean; p75?: boolean };
    darknessTimer?: number;
}
