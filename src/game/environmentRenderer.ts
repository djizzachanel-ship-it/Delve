/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TILE_SIZE, MAP_COLS, MAP_ROWS } from './config';
import { project } from './mine';

export const TILE_SPRITES: Record<string, any> = {};
export function registerTileSprite(id: string, src: string) {
  const img = new Image();
  img.src = src;
  TILE_SPRITES[id] = { id, image: img, src, isLoaded: false };
  img.onload = () => { if (TILE_SPRITES[id]) TILE_SPRITES[id].isLoaded = true; };
}

// ============================================================================
// 1. PROCEDURAL ORGANIC ENVIRONMENT RENDERING (Cavern Cave System)
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

const hash2D = (x: number, y: number) => {
  const val = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return val - Math.floor(val);
};

/**
 * Renders an organic cavern rock wall using smooth Bezier curves, natural rock strata,
 * ambient occlusion, timber bracing, and embedded luminescent mineral crystals.
 */
export function renderWallTile(ctx: CanvasRenderingContext2D, p: WallRenderParams) {
  ctx.globalAlpha = p.alpha;

  const isWall = (rr: number, cc: number) => {
    if (rr < 0 || rr >= MAP_ROWS || cc < 0 || cc >= MAP_COLS) return true;
    return p.grid[rr] && p.grid[rr][cc] === 1;
  };

  const openS = !isWall(p.r + 1, p.c);
  const openE = !isWall(p.r, p.c + 1);
  const openW = !isWall(p.r, p.c - 1);
  const openN = !isWall(p.r - 1, p.c);
  const openSE = !isWall(p.r + 1, p.c + 1);
  const openSW = !isWall(p.r + 1, p.c - 1);
  const isDeepInterior = !openS && !openE && !openW && !openN && !openSE && !openSW;

  const s = TILE_SIZE / 2;
  const { x: ix, y: iy } = project(p.cx, p.cy);

  // Organic deterministic displacement for natural rock curvature
  const h0 = hash2D(p.c * 17.3 + 11, p.r * 31.7 + 19);
  const h1 = hash2D(p.c * 53.9 + 23, p.r * 13.1 + 47);
  const h2 = hash2D(p.c * 79.1 + 37, p.r * 67.3 + 83);

  const wallH = p.h + (h2 - 0.5) * 12;

  // Curving ground footing coordinates
  const pTop = { x: ix, y: iy - s + (h0 - 0.5) * 4 };
  const pRight = { x: ix + 2 * s + (h1 - 0.5) * 8, y: iy + (h2 - 0.5) * 4 };
  const pBottom = { x: ix + (h0 - 0.5) * 8, y: iy + s + (h1 - 0.5) * 6 };
  const pLeft = { x: ix - 2 * s + (h2 - 0.5) * 8, y: iy + (h0 - 0.5) * 4 };

  // Elevated cavern dome roof coordinates (undulating rock crests)
  const cTop = { x: pTop.x + (h1 - 0.5) * 6, y: pTop.y - wallH };
  const cRight = { x: pRight.x - 3 + (h0 - 0.5) * 6, y: pRight.y - wallH };
  const cBottom = { x: pBottom.x + (h2 - 0.5) * 6, y: pBottom.y - wallH };
  const cLeft = { x: pLeft.x + 3 + (h1 - 0.5) * 6, y: pLeft.y - wallH };

  // -------------------------------------------------------------
  // A. WALL-TO-FLOOR AMBIENT OCCLUSION
  // -------------------------------------------------------------
  if (openS || openSW || openW || openSE || openE) {
    ctx.save();
    if (openS || openSW || openW) {
      const gradSW = ctx.createLinearGradient(pLeft.x, pLeft.y, pBottom.x, pBottom.y + 16);
      gradSW.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
      gradSW.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.beginPath();
      ctx.moveTo(pLeft.x, pLeft.y);
      ctx.bezierCurveTo(
        pLeft.x * 0.6 + pBottom.x * 0.4 + (h0 - 0.5) * 12, (pLeft.y + pBottom.y) * 0.5 - 2,
        pLeft.x * 0.4 + pBottom.x * 0.6 + (h1 - 0.5) * 12, (pLeft.y + pBottom.y) * 0.5 + 4,
        pBottom.x, pBottom.y
      );
      ctx.bezierCurveTo(
        pBottom.x * 0.6 + pLeft.x * 0.4 - 8, pBottom.y + 14,
        pLeft.x * 0.6 + pBottom.x * 0.4 - 8, pLeft.y + 14,
        pLeft.x - 6, pLeft.y + 12
      );
      ctx.closePath();
      ctx.fillStyle = gradSW;
      ctx.fill();
    }
    if (openS || openSE || openE) {
      const gradSE = ctx.createLinearGradient(pBottom.x, pBottom.y, pRight.x + 8, pRight.y + 16);
      gradSE.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
      gradSE.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.beginPath();
      ctx.moveTo(pBottom.x, pBottom.y);
      ctx.bezierCurveTo(
        pBottom.x * 0.6 + pRight.x * 0.4 + (h1 - 0.5) * 12, (pBottom.y + pRight.y) * 0.5 + 4,
        pBottom.x * 0.4 + pRight.x * 0.6 + (h2 - 0.5) * 12, (pBottom.y + pRight.y) * 0.5 - 2,
        pRight.x, pRight.y
      );
      ctx.bezierCurveTo(
        pRight.x * 0.6 + pBottom.x * 0.4 + 8, pRight.y + 14,
        pBottom.x * 0.6 + pRight.x * 0.4 + 8, pBottom.y + 14,
        pBottom.x + 6, pBottom.y + 12
      );
      ctx.closePath();
      ctx.fillStyle = gradSE;
      ctx.fill();
    }
    ctx.restore();
  }

  // -------------------------------------------------------------
  // B. ORGANIC SOUTH-WEST CLIFF FACE
  // -------------------------------------------------------------
  if (openS || openSW || openW) {
    const strataLayers = 3;
    const bulgeX = (h0 - 0.5) * 16;
    const bulgeY = (h1 - 0.5) * 10;
    const ctrlX = (pLeft.x + pBottom.x) * 0.5 + bulgeX;
    const ctrlY = (pLeft.y + pBottom.y) * 0.5 + bulgeY;

    for (let l = 0; l < strataLayers; l++) {
      const t1 = l / strataLayers;
      const t2 = (l + 1) / strataLayers;
      const y1L = pLeft.y - wallH * (1 - t1);
      const y2L = pLeft.y - wallH * (1 - t2);
      const y1B = pBottom.y - wallH * (1 - t1);
      const y2B = pBottom.y - wallH * (1 - t2);
      const y1Mid = ctrlY - wallH * (1 - t1);
      const y2Mid = ctrlY - wallH * (1 - t2);

      ctx.beginPath();
      ctx.moveTo(pLeft.x, y1L);
      ctx.bezierCurveTo(
        pLeft.x * 0.6 + ctrlX * 0.4, y1L * 0.6 + y1Mid * 0.4 - 4,
        ctrlX * 0.4 + pBottom.x * 0.6, y1Mid * 0.4 + y1B * 0.6 + 3,
        pBottom.x, y1B
      );
      ctx.bezierCurveTo(
        ctrlX * 0.4 + pBottom.x * 0.6, y2Mid * 0.4 + y2B * 0.6 + 3,
        pLeft.x * 0.6 + ctrlX * 0.4, y2L * 0.6 + y2Mid * 0.4 - 4,
        pLeft.x, y2L
      );
      ctx.closePath();

      const gradLayer = ctx.createLinearGradient(pLeft.x, y1L, pBottom.x, y2B);
      if (l === 0) {
        gradLayer.addColorStop(0, '#3e526a');
        gradLayer.addColorStop(0.5, '#304155');
        gradLayer.addColorStop(1, '#253446');
      } else if (l === 1) {
        gradLayer.addColorStop(0, '#2d3b4d');
        gradLayer.addColorStop(0.5, '#202b3a');
        gradLayer.addColorStop(1, '#17222f');
      } else {
        gradLayer.addColorStop(0, '#1c2635');
        gradLayer.addColorStop(0.5, '#131b26');
        gradLayer.addColorStop(1, '#0b111a');
      }
      ctx.fillStyle = gradLayer;
      ctx.fill();

      ctx.strokeStyle = '#090e16';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(pLeft.x, y2L);
      ctx.bezierCurveTo(
        pLeft.x * 0.6 + ctrlX * 0.4, y2L * 0.6 + y2Mid * 0.4 - 4,
        ctrlX * 0.4 + pBottom.x * 0.6, y2Mid * 0.4 + y2B * 0.6 + 3,
        pBottom.x, y2B
      );
      ctx.stroke();

      ctx.strokeStyle = l === 0 ? '#5d7596' : '#3c4f65';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(pLeft.x, y1L + 0.5);
      ctx.bezierCurveTo(
        pLeft.x * 0.6 + ctrlX * 0.4, y1L * 0.6 + y1Mid * 0.4 - 3.5,
        ctrlX * 0.4 + pBottom.x * 0.6, y1Mid * 0.4 + y1B * 0.6 + 3.5,
        pBottom.x, y1B + 0.5
      );
      ctx.stroke();
    }
  }

  // -------------------------------------------------------------
  // C. ORGANIC SOUTH-EAST CLIFF FACE
  // -------------------------------------------------------------
  if (openS || openSE || openE) {
    const strataLayers = 3;
    const bulgeX = (h1 - 0.5) * 16;
    const bulgeY = (h2 - 0.5) * 10;
    const ctrlX = (pBottom.x + pRight.x) * 0.5 + bulgeX;
    const ctrlY = (pBottom.y + pRight.y) * 0.5 + bulgeY;

    for (let l = 0; l < strataLayers; l++) {
      const t1 = l / strataLayers;
      const t2 = (l + 1) / strataLayers;
      const y1B = pBottom.y - wallH * (1 - t1);
      const y2B = pBottom.y - wallH * (1 - t2);
      const y1R = pRight.y - wallH * (1 - t1);
      const y2R = pRight.y - wallH * (1 - t2);
      const y1Mid = ctrlY - wallH * (1 - t1);
      const y2Mid = ctrlY - wallH * (1 - t2);

      ctx.beginPath();
      ctx.moveTo(pBottom.x, y1B);
      ctx.bezierCurveTo(
        pBottom.x * 0.6 + ctrlX * 0.4, y1B * 0.6 + y1Mid * 0.4 + 3,
        ctrlX * 0.4 + pRight.x * 0.6, y1Mid * 0.4 + y1R * 0.6 - 4,
        pRight.x, y1R
      );
      ctx.bezierCurveTo(
        ctrlX * 0.4 + pRight.x * 0.6, y2Mid * 0.4 + y2R * 0.6 - 4,
        pBottom.x * 0.6 + ctrlX * 0.4, y2B * 0.6 + y2Mid * 0.4 + 3,
        pBottom.x, y2B
      );
      ctx.closePath();

      const gradLayer = ctx.createLinearGradient(pBottom.x, y1B, pRight.x, y2R);
      if (l === 0) {
        gradLayer.addColorStop(0, '#263342');
        gradLayer.addColorStop(0.5, '#1d2733');
        gradLayer.addColorStop(1, '#131b24');
      } else if (l === 1) {
        gradLayer.addColorStop(0, '#1b232e');
        gradLayer.addColorStop(0.5, '#131922');
        gradLayer.addColorStop(1, '#0c1117');
      } else {
        gradLayer.addColorStop(0, '#10161f');
        gradLayer.addColorStop(0.5, '#0a0e14');
        gradLayer.addColorStop(1, '#05070a');
      }
      ctx.fillStyle = gradLayer;
      ctx.fill();

      ctx.strokeStyle = '#05070a';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(pBottom.x, y2B);
      ctx.bezierCurveTo(
        pBottom.x * 0.6 + ctrlX * 0.4, y2B * 0.6 + y2Mid * 0.4 + 3,
        ctrlX * 0.4 + pRight.x * 0.6, y2Mid * 0.4 + y2R * 0.6 - 4,
        pRight.x, y2R
      );
      ctx.stroke();

      ctx.strokeStyle = '#304054';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(pBottom.x, y1B + 0.5);
      ctx.bezierCurveTo(
        pBottom.x * 0.6 + ctrlX * 0.4, y1B * 0.6 + y1Mid * 0.4 + 3.5,
        ctrlX * 0.4 + pRight.x * 0.6, y1Mid * 0.4 + y1R * 0.6 - 3.5,
        pRight.x, y1R + 0.5
      );
      ctx.stroke();
    }
  }

  // -------------------------------------------------------------
  // D. ORGANIC TOP PLATEAU (Cavern Roof)
  // -------------------------------------------------------------
  const topCtrlN = { x: (cTop.x + cRight.x) * 0.5 + (h0 - 0.5) * 8, y: (cTop.y + cRight.y) * 0.5 + (h1 - 0.5) * 6 };
  const topCtrlE = { x: (cRight.x + cBottom.x) * 0.5 + (h1 - 0.5) * 8, y: (cRight.y + cBottom.y) * 0.5 + (h2 - 0.5) * 6 };
  const topCtrlS = { x: (cBottom.x + cLeft.x) * 0.5 + (h2 - 0.5) * 8, y: (cBottom.y + cLeft.y) * 0.5 + (h0 - 0.5) * 6 };
  const topCtrlW = { x: (cLeft.x + cTop.x) * 0.5 + (h0 - 0.5) * 8, y: (cLeft.y + cTop.y) * 0.5 + (h1 - 0.5) * 6 };

  ctx.beginPath();
  ctx.moveTo(cTop.x, cTop.y);
  ctx.quadraticCurveTo(topCtrlN.x, topCtrlN.y, cRight.x, cRight.y);
  ctx.quadraticCurveTo(topCtrlE.x, topCtrlE.y, cBottom.x, cBottom.y);
  ctx.quadraticCurveTo(topCtrlS.x, topCtrlS.y, cLeft.x, cLeft.y);
  ctx.quadraticCurveTo(topCtrlW.x, topCtrlW.y, cTop.x, cTop.y);
  ctx.closePath();

  const capGrad = ctx.createLinearGradient(cLeft.x, cTop.y, cRight.x, cBottom.y);
  if (isDeepInterior) {
    capGrad.addColorStop(0, '#192231');
    capGrad.addColorStop(0.5, '#131b26');
    capGrad.addColorStop(1, '#0c121a');
  } else {
    capGrad.addColorStop(0, '#3d4f66');
    capGrad.addColorStop(0.45, '#303f52');
    capGrad.addColorStop(1, '#212d3d');
  }
  ctx.fillStyle = capGrad;
  ctx.fill();

  ctx.strokeStyle = isDeepInterior ? '#0e1520' : '#495d77';
  ctx.lineWidth = 1.1;
  ctx.stroke();

  // -------------------------------------------------------------
  // E. LUMINESCENT MINERAL CRYSTALS & TIMBER BRACING
  // -------------------------------------------------------------
  if (h0 > 0.72 && (openS || openSW || openSE)) {
    const gemX = (openS || openSW) 
      ? (cLeft.x * 0.4 + cBottom.x * 0.6 + (h1 - 0.5) * 8)
      : (cBottom.x * 0.4 + cRight.x * 0.6 + (h2 - 0.5) * 8);
    const gemY = (openS || openSW)
      ? (cLeft.y * 0.4 + cBottom.y * 0.6 + wallH * 0.35 + (h2 - 0.5) * 6)
      : (cBottom.y * 0.4 + cRight.y * 0.6 + wallH * 0.35 + (h1 - 0.5) * 6);

    const isAzure = h1 > 0.5;
    const glowColor = isAzure ? 'rgba(56, 189, 248, 0.45)' : 'rgba(192, 132, 252, 0.45)';
    const gemCoreColor = isAzure ? '#38bdf8' : '#c084fc';

    ctx.save();
    ctx.beginPath();
    ctx.arc(gemX, gemY, 9, 0, Math.PI * 2);
    ctx.fillStyle = glowColor;
    ctx.fill();

    ctx.fillStyle = gemCoreColor;
    ctx.beginPath();
    ctx.moveTo(gemX - 3, gemY + 3);
    ctx.lineTo(gemX, gemY - 6);
    ctx.lineTo(gemX + 3, gemY + 3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.globalAlpha = 1;
}

/**
 * Renders an organic textured cavern floor tile with puddle glints, pebbles,
 * and volumetric 3D railways.
 */
export function renderFloorTile(ctx: CanvasRenderingContext2D, p: FloorRenderParams) {
  const { x: ix, y: iy } = project(p.cx, p.cy);
  const s = TILE_SIZE / 2;

  const h0 = hash2D(p.cx * 1.37 + 17, p.cy * 1.73 + 29);
  const h1 = hash2D(p.cx * 2.91 + 43, p.cy * 3.19 + 71);
  const h2 = hash2D(p.cx * 5.63 + 89, p.cy * 4.41 + 13);

  const pTop = { x: ix, y: iy - s };
  const pRight = { x: ix + 2 * s, y: iy };
  const pBottom = { x: ix, y: iy + s };
  const pLeft = { x: ix - 2 * s, y: iy };

  ctx.beginPath();
  ctx.moveTo(pTop.x, pTop.y);
  ctx.quadraticCurveTo((pTop.x + pRight.x) * 0.5, (pTop.y + pRight.y) * 0.5, pRight.x, pRight.y);
  ctx.quadraticCurveTo((pRight.x + pBottom.x) * 0.5, (pRight.y + pBottom.y) * 0.5, pBottom.x, pBottom.y);
  ctx.quadraticCurveTo((pBottom.x + pLeft.x) * 0.5, (pBottom.y + pLeft.y) * 0.5, pLeft.x, pLeft.y);
  ctx.quadraticCurveTo((pLeft.x + pTop.x) * 0.5, (pLeft.y + pTop.y) * 0.5, pTop.x, pTop.y);
  ctx.closePath();

  const floorBaseColor = h0 > 0.65 ? '#1a202c' : h0 > 0.3 ? '#161b26' : '#121620';
  ctx.fillStyle = floorBaseColor;
  ctx.fill();

  ctx.strokeStyle = '#0b0f17';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Puddles & pebbles
  if (h1 > 0.72) {
    ctx.save();
    ctx.beginPath();
    const pudX = ix + (h0 - 0.5) * 24;
    const pudY = iy + (h2 - 0.5) * 12;
    ctx.ellipse(pudX, pudY, 9 + h0 * 6, 4.5 + h0 * 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(7, 12, 22, 0.75)';
    ctx.fill();
    ctx.restore();
  }

  // 3D Volumetric Railway System
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
     const pCenter = { x: ix, y: iy };
     const pOut = project(p.cx + outX * 0.5, p.cy + outY * 0.5);

     const tDx = pOut.x - pIn.x;
     const tDy = pOut.y - pIn.y;
     const tLen = Math.hypot(tDx, tDy) || 1;
     const dirX = tDx / tLen;
     const dirY = tDy / tLen;
     const normX = -dirY;
     const normY = dirX;

     const ballastW = 21;
     ctx.beginPath();
     ctx.moveTo(pIn.x + normX * ballastW, pIn.y + normY * ballastW);
     ctx.lineTo(pCenter.x + normX * (ballastW + 1), pCenter.y + normY * (ballastW + 1));
     ctx.lineTo(pOut.x + normX * ballastW, pOut.y + normY * ballastW);
     ctx.lineTo(pOut.x - normX * ballastW, pOut.y - normY * ballastW);
     ctx.lineTo(pCenter.x - normX * (ballastW + 1), pCenter.y - normY * (ballastW + 1));
     ctx.lineTo(pIn.x - normX * ballastW, pIn.y - normY * ballastW);
     ctx.closePath();
     ctx.fillStyle = '#0f141d';
     ctx.fill();

     const sleeperOffsets = [-0.62, -0.22, 0.22, 0.62];
     const sleeperHalfLen = 17;

     sleeperOffsets.forEach((tOffset, sIdx) => {
        const stX = ix + dirX * (tOffset * (tLen * 0.45));
        const stY = iy + dirY * (tOffset * (tLen * 0.45));

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
     });

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
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 3;
        ctx.stroke();
     });
  }
}
