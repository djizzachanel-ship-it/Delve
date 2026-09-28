/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TILE_SIZE, MAP_COLS, MAP_ROWS } from './config';
import { project } from './mine';
import wallPngUrl from '../assets/images/wall.png';
import floorPngUrl from '../assets/images/floor.png';

// ============================================================================
// 1. SPRITE REGISTRY & IMAGE PRELOADERS
// ============================================================================
export const wallImage = typeof window !== 'undefined' ? new Image() : ({} as HTMLImageElement);
if (typeof window !== 'undefined') {
  wallImage.src = wallPngUrl;
}

export const floorImage = typeof window !== 'undefined' ? new Image() : ({} as HTMLImageElement);
if (typeof window !== 'undefined') {
  floorImage.src = floorPngUrl;
}

export interface TileSpriteAsset {
  id: string;
  image?: HTMLImageElement;
  src?: string;
  isLoaded?: boolean;
}

export const TILE_SPRITES: Record<string, TileSpriteAsset> = {
  wall: { id: 'wall', image: wallImage, src: wallPngUrl, isLoaded: true },
  floor: { id: 'floor', image: floorImage, src: floorPngUrl, isLoaded: true }
};

export function registerTileSprite(id: string, src: string) {
  const img = new Image();
  img.src = src;
  const asset: TileSpriteAsset = { id, image: img, src, isLoaded: false };
  img.onload = () => { asset.isLoaded = true; };
  TILE_SPRITES[id] = asset;
}

// ============================================================================
// 2. PARAMS & PROJECTION HELPERS
// ============================================================================

export interface WallRenderParams {
  cx: number;
  cy: number;
  r: number;
  c: number;
  h: number;
  alpha: number;
  grid: number[][];
}

export interface FloorRenderParams {
  cx: number;
  cy: number;
  r: number;
  c: number;
  isRail: boolean;
  grid: number[][];
}

const TILE_W = TILE_SIZE * 2; // 160
const TILE_H = TILE_SIZE;     // 80
const HALF_W = TILE_SIZE;     // 80
const HALF_H = TILE_SIZE / 2; // 40
export const WALL_HEIGHT = 68; // Height of the wall cliff plateau

const hash2D = (x: number, y: number) => {
  const val = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return val - Math.floor(val);
};

// ============================================================================
// 3. SEAMLESS FLAT ISOMETRIC FLOOR (No vertical drop, monolithic plane)
// ============================================================================

export function renderFloorTile(ctx: CanvasRenderingContext2D, p: FloorRenderParams) {
  const { x: drawX, y: drawY } = project(p.cx, p.cy);

  // Exact 2:1 Isometric Diamond Vertices
  const pTop = { x: drawX, y: drawY - HALF_H };
  const pRight = { x: drawX + HALF_W, y: drawY };
  const pBottom = { x: drawX, y: drawY + HALF_H };
  const pLeft = { x: drawX - HALF_W, y: drawY };

  // 1. Draw Flat Floor Diamond
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pTop.x, pTop.y);
  ctx.lineTo(pRight.x, pRight.y);
  ctx.lineTo(pBottom.x, pBottom.y);
  ctx.lineTo(pLeft.x, pLeft.y);
  ctx.closePath();

  if (floorImage && floorImage.complete && floorImage.naturalWidth > 0) {
    ctx.save();
    ctx.clip();
    ctx.drawImage(floorImage, drawX - HALF_W, drawY - HALF_H, TILE_W, TILE_H);
    ctx.restore();
  } else {
    // Monolithic subterranean slate color with subtle variation
    const h = hash2D(p.c * 13.7, p.r * 19.3);
    ctx.fillStyle = h > 0.6 ? '#1b222d' : h > 0.3 ? '#161d27' : '#121820';
    ctx.fill();
  }

  // Seamless subtle mortar border
  ctx.strokeStyle = '#0d131a';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();

  // 2. Volumetric Railway Tracks (Rendered directly on top of floor)
  if (p.isRail) {
     const isN = p.grid[p.r - 1] && p.grid[p.r - 1][p.c] === 2;
     const isNW = p.grid[p.r - 1] && p.grid[p.r - 1][p.c - 1] === 2;
     const isNE = p.grid[p.r - 1] && p.grid[p.r - 1][p.c + 1] === 2;
     const isS = p.grid[p.r + 1] && p.grid[p.r + 1][p.c] === 2;
     const isSW = p.grid[p.r + 1] && p.grid[p.r + 1][p.c - 1] === 2;
     const isSE = p.grid[p.r + 1] && p.grid[p.r + 1][p.c + 1] === 2;
     const isW = p.grid[p.r] && p.grid[p.r][p.c - 1] === 2;
     const isE = p.grid[p.r] && p.grid[p.r][p.c + 1] === 2;

     let inX = 0, inY = -TILE_SIZE;
     if (isN) { inX = 0; inY = -TILE_SIZE; }
     else if (isNW) { inX = -TILE_SIZE; inY = -TILE_SIZE; }
     else if (isNE) { inX = TILE_SIZE; inY = -TILE_SIZE; }
     else if (isW) { inX = -TILE_SIZE; inY = 0; }

     let outX = 0, outY = TILE_SIZE;
     if (isS) { outX = 0; outY = TILE_SIZE; }
     else if (isSW) { outX = -TILE_SIZE; outY = TILE_SIZE; }
     else if (isSE) { outX = TILE_SIZE; outY = TILE_SIZE; }
     else if (isE) { outX = TILE_SIZE; outY = 0; }

     const pIn = project(p.cx + inX * 0.5, p.cy + inY * 0.5);
     const pCenter = { x: drawX, y: drawY };
     const pOut = project(p.cx + outX * 0.5, p.cy + outY * 0.5);

     const tDx = pOut.x - pIn.x;
     const tDy = pOut.y - pIn.y;
     const tLen = Math.hypot(tDx, tDy) || 1;
     const dirX = tDx / tLen;
     const dirY = tDy / tLen;
     const normX = -dirY;
     const normY = dirX;

     // Ballast shadow & gravel bed
     const ballastW = 20;
     ctx.beginPath();
     ctx.moveTo(pIn.x + normX * ballastW, pIn.y + normY * ballastW);
     ctx.lineTo(pCenter.x + normX * (ballastW + 1), pCenter.y + normY * (ballastW + 1));
     ctx.lineTo(pOut.x + normX * ballastW, pOut.y + normY * ballastW);
     ctx.lineTo(pOut.x - normX * ballastW, pOut.y - normY * ballastW);
     ctx.lineTo(pCenter.x - normX * (ballastW + 1), pCenter.y - normY * (ballastW + 1));
     ctx.lineTo(pIn.x - normX * ballastW, pIn.y - normY * ballastW);
     ctx.closePath();
     ctx.fillStyle = '#0f151e';
     ctx.fill();

     // Wooden sleepers
     const sleeperOffsets = [-0.62, -0.22, 0.22, 0.62];
     const sleeperHalfLen = 16;

     sleeperOffsets.forEach((tOffset, sIdx) => {
        const stX = drawX + dirX * (tOffset * (tLen * 0.45));
        const stY = drawY + dirY * (tOffset * (tLen * 0.45));

        const pL = { x: stX + normX * sleeperHalfLen, y: stY + normY * sleeperHalfLen };
        const pR = { x: stX - normX * sleeperHalfLen, y: stY - normY * sleeperHalfLen };
        const tThickX = dirX * 3.5;
        const tThickY = dirY * 3.5;

        ctx.beginPath();
        ctx.moveTo(pL.x - tThickX, pL.y - tThickY);
        ctx.lineTo(pL.x + tThickX, pL.y + tThickY);
        ctx.lineTo(pR.x + tThickX, pR.y + tThickY);
        ctx.lineTo(pR.x - tThickX, pR.y - tThickY);
        ctx.closePath();
        ctx.fillStyle = (sIdx % 2 === 0) ? '#3c1d09' : '#321807';
        ctx.fill();
        ctx.strokeStyle = '#180a02';
        ctx.lineWidth = 0.8;
        ctx.stroke();
     });

     // Volumetric Dual Steel Rails
     const railGauge = 10.5;
     [-railGauge, railGauge].forEach(gaugeOffset => {
        const rInX = pIn.x + normX * gaugeOffset;
        const rInY = pIn.y + normY * gaugeOffset;
        const rMidX = pCenter.x + normX * gaugeOffset;
        const rMidY = pCenter.y + normY * gaugeOffset;
        const rOutX = pOut.x + normX * gaugeOffset;
        const rOutY = pOut.y + normY * gaugeOffset;

        ctx.beginPath();
        ctx.moveTo(rInX, rInY);
        ctx.quadraticCurveTo(rMidX, rMidY, rOutX, rOutY);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(rInX, rInY - 2.5);
        ctx.quadraticCurveTo(rMidX, rMidY - 2.5, rOutX, rOutY - 2.5);
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.2;
        ctx.stroke();
     });
  }
}

// ============================================================================
// 4. MONOLITHIC WALL AUTO-TILING & FACADES (No isolated boxes, solid plateau)
// ============================================================================

export function renderWallTile(ctx: CanvasRenderingContext2D, p: WallRenderParams) {
  const { x: drawX, y: drawY } = project(p.cx, p.cy);
  ctx.globalAlpha = p.alpha;

  const isWall = (rr: number, cc: number) => {
    if (rr < 0 || rr >= MAP_ROWS || cc < 0 || cc >= MAP_COLS) return true;
    return p.grid[rr] && p.grid[rr][cc] === 1;
  };

  // Check neighbor occupancy
  const openW = !isWall(p.r, p.c - 1);       // Open to the West
  const openS = !isWall(p.r + 1, p.c);       // Open to the South
  const openSW = !isWall(p.r + 1, p.c - 1);  // Open to the South-West
  const openE = !isWall(p.r, p.c + 1);       // Open to the East
  const openSE = !isWall(p.r + 1, p.c + 1);  // Open to the South-East
  const openN = !isWall(p.r - 1, p.c);       // Open to the North
  const isDeepInterior = !openS && !openE && !openW && !openN && !openSE && !openSW;

  const wallH = WALL_HEIGHT;

  // Ground base diamond vertices (at floor elevation)
  const gTop = { x: drawX, y: drawY - HALF_H };
  const gRight = { x: drawX + HALF_W, y: drawY };
  const gBottom = { x: drawX, y: drawY + HALF_H };
  const gLeft = { x: drawX - HALF_W, y: drawY };

  // Elevated roof plateau diamond vertices (at ceiling/mountain elevation)
  const rTop = { x: gTop.x, y: gTop.y - wallH };
  const rRight = { x: gRight.x, y: gRight.y - wallH };
  const rBottom = { x: gBottom.x, y: gBottom.y - wallH };
  const rLeft = { x: gLeft.x, y: gLeft.y - wallH };

  // -------------------------------------------------------------
  // A. SOUTH-WEST CLIFF FACADE (Front-Left Vertical Stone Drop)
  // -------------------------------------------------------------
  // Only drawn if the terrain to the South-West / West is OPEN floor
  if (openW || openSW || openS) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(rLeft.x, rLeft.y);
    ctx.lineTo(rBottom.x, rBottom.y);
    ctx.lineTo(gBottom.x, gBottom.y);
    ctx.lineTo(gLeft.x, gLeft.y);
    ctx.closePath();

    if (wallImage && wallImage.complete && wallImage.naturalWidth > 0) {
      ctx.save();
      ctx.clip();
      ctx.drawImage(wallImage, drawX - HALF_W, drawY - wallH - HALF_H, TILE_W, wallH + TILE_H);
      ctx.restore();
    } else {
      const gradSW = ctx.createLinearGradient(rLeft.x, rLeft.y, gBottom.x, gBottom.y);
      gradSW.addColorStop(0, '#334155');
      gradSW.addColorStop(0.5, '#24303f');
      gradSW.addColorStop(1, '#18212c');
      ctx.fillStyle = gradSW;
      ctx.fill();
    }

    ctx.strokeStyle = '#0e1520';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Soft grounding contact shadow on floor
    const shadowSW = ctx.createLinearGradient(gLeft.x, gLeft.y, gBottom.x, gBottom.y + 10);
    shadowSW.addColorStop(0, 'rgba(0,0,0,0.5)');
    shadowSW.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.moveTo(gLeft.x, gLeft.y);
    ctx.lineTo(gBottom.x, gBottom.y);
    ctx.lineTo(gBottom.x - 4, gBottom.y + 8);
    ctx.lineTo(gLeft.x - 4, gLeft.y + 8);
    ctx.closePath();
    ctx.fillStyle = shadowSW;
    ctx.fill();

    ctx.restore();
  }

  // -------------------------------------------------------------
  // B. SOUTH-EAST CLIFF FACADE (Front-Right Vertical Stone Drop)
  // -------------------------------------------------------------
  // Only drawn if the terrain to the South / South-East / East is OPEN floor
  if (openS || openSE || openE) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(rBottom.x, rBottom.y);
    ctx.lineTo(rRight.x, rRight.y);
    ctx.lineTo(gRight.x, gRight.y);
    ctx.lineTo(gBottom.x, gBottom.y);
    ctx.closePath();

    if (wallImage && wallImage.complete && wallImage.naturalWidth > 0) {
      ctx.save();
      ctx.clip();
      ctx.drawImage(wallImage, drawX - HALF_W, drawY - wallH - HALF_H, TILE_W, wallH + TILE_H);
      ctx.restore();
    } else {
      const gradSE = ctx.createLinearGradient(rBottom.x, rBottom.y, gRight.x, gRight.y);
      gradSE.addColorStop(0, '#1e2632');
      gradSE.addColorStop(0.5, '#151c26');
      gradSE.addColorStop(1, '#0e141c');
      ctx.fillStyle = gradSE;
      ctx.fill();
    }

    ctx.strokeStyle = '#0a0e16';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Soft grounding contact shadow on floor
    const shadowSE = ctx.createLinearGradient(gBottom.x, gBottom.y, gRight.x + 4, gRight.y + 10);
    shadowSE.addColorStop(0, 'rgba(0,0,0,0.5)');
    shadowSE.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.moveTo(gBottom.x, gBottom.y);
    ctx.lineTo(gRight.x, gRight.y);
    ctx.lineTo(gRight.x + 4, gRight.y + 8);
    ctx.lineTo(gBottom.x + 4, gBottom.y + 8);
    ctx.closePath();
    ctx.fillStyle = shadowSE;
    ctx.fill();

    ctx.restore();
  }

  // -------------------------------------------------------------
  // C. ROOF PLATEAU DIAMOND (Continuous Mountain Top / Plateau)
  // -------------------------------------------------------------
  // Rendered for EVERY wall tile, seamlessly connecting adjacent roofs
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(rTop.x, rTop.y);
  ctx.lineTo(rRight.x, rRight.y);
  ctx.lineTo(rBottom.x, rBottom.y);
  ctx.lineTo(rLeft.x, rLeft.y);
  ctx.closePath();

  if (isDeepInterior) {
    ctx.fillStyle = '#141b25';
  } else {
    const capGrad = ctx.createLinearGradient(rLeft.x, rTop.y, rRight.x, rBottom.y);
    capGrad.addColorStop(0, '#38485e');
    capGrad.addColorStop(0.5, '#2e3c4e');
    capGrad.addColorStop(1, '#232f3f');
    ctx.fillStyle = capGrad;
  }
  ctx.fill();

  ctx.strokeStyle = isDeepInterior ? '#101620' : '#475a74';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();

  ctx.globalAlpha = 1;
}
