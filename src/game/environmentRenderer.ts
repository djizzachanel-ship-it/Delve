/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TILE_SIZE, MAP_COLS, MAP_ROWS } from './config';
import { project } from './mine';

// ============================================================================
// 1. SPRITE REGISTRY FOR FUTURE PNG TILES (Variant 1 hook)
// ============================================================================
export interface TileSpriteAsset {
  id: string;
  image?: HTMLImageElement;
  src?: string;
  isLoaded?: boolean;
}

export const TILE_SPRITES: Record<string, TileSpriteAsset> = {
  wall_straight_sw: { id: 'wall_straight_sw' },
  wall_straight_se: { id: 'wall_straight_se' },
  wall_corner_outer: { id: 'wall_corner_outer' },
  wall_corner_inner: { id: 'wall_corner_inner' },
  floor_stone: { id: 'floor_stone' },
  floor_dirt: { id: 'floor_dirt' },
  rail_straight: { id: 'rail_straight' },
  rail_curve: { id: 'rail_curve' }
};

/**
 * Helper to register and preload custom tile PNGs in the future.
 */
export function registerTileSprite(id: string, src: string) {
  const img = new Image();
  img.src = src;
  const asset: TileSpriteAsset = { id, image: img, src, isLoaded: false };
  img.onload = () => { asset.isLoaded = true; };
  TILE_SPRITES[id] = asset;
}

// ============================================================================
// 2. PROCEDURAL ORGANIC ENVIRONMENT RENDERING (Variant 2)
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
 * ambient occlusion, and embedded luminescent accents.
 * 
 * If a PNG sprite is registered in TILE_SPRITES, it automatically draws the sprite.
 */
export function renderWallTile(ctx: CanvasRenderingContext2D, p: WallRenderParams) {
  // Check for future PNG sprite override
  if (TILE_SPRITES['wall_straight_sw']?.isLoaded && TILE_SPRITES['wall_straight_sw'].image) {
    const { x: sx, y: sy } = project(p.cx, p.cy);
    ctx.globalAlpha = p.alpha;
    ctx.drawImage(TILE_SPRITES['wall_straight_sw'].image, sx - TILE_SIZE, sy - p.h - TILE_SIZE / 2);
    ctx.globalAlpha = 1;
    return;
  }

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

  // Curving ground footing coordinates (no straight 90 degree corners)
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
  // A. WALL-TO-FLOOR AMBIENT OCCLUSION (Soft grounding base shadow)
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
  // B. ORGANIC SOUTH-WEST CLIFF FACE (Natural Cavern Rock Strata)
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
      // Double bezier curve for natural rounded cavern boulder contour
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

      // Stratified stone gradient (top-lit basalt)
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

      // Rock strata cleft seam
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

      // Highlight top ridge shelf
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

    // Natural curved outer perimeter (curved rocky slope, no straight box lines)
    ctx.strokeStyle = '#0a1017';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cLeft.x, cLeft.y);
    ctx.bezierCurveTo(
      cLeft.x * 0.6 + (cLeft.x + cBottom.x) * 0.2 + (h0 - 0.5) * 12, (cLeft.y + cBottom.y) * 0.5 - 4,
      cBottom.x * 0.6 + (cLeft.x + cBottom.x) * 0.2 + (h1 - 0.5) * 12, (cLeft.y + cBottom.y) * 0.5 + 3,
      cBottom.x, cBottom.y
    );
    ctx.bezierCurveTo(
      cBottom.x * 0.5 + pBottom.x * 0.5 + (h2 - 0.5) * 8, (cBottom.y + pBottom.y) * 0.5,
      pBottom.x + (h0 - 0.5) * 4, pBottom.y - 4,
      pBottom.x, pBottom.y
    );
    ctx.bezierCurveTo(
      ctrlX * 0.4 + pBottom.x * 0.6, ctrlY * 0.4 + pBottom.y * 0.6 + 3,
      pLeft.x * 0.6 + ctrlX * 0.4, pLeft.y * 0.6 + ctrlY * 0.4 - 4,
      pLeft.x, pLeft.y
    );
    ctx.bezierCurveTo(
      pLeft.x * 0.5 + cLeft.x * 0.5 + (h1 - 0.5) * 8, (pLeft.y + cLeft.y) * 0.5,
      cLeft.x - (h2 - 0.5) * 4, cLeft.y + 4,
      cLeft.x, cLeft.y
    );
    ctx.closePath();
    ctx.stroke();
  }

  // -------------------------------------------------------------
  // C. ORGANIC SOUTH-EAST CLIFF FACE (Curved Shaded Rock Face)
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

      // Deeper basalt shadow tones
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

      // Strata seam curve
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

      // Subtle edge highlight
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

    // Rocky outer perimeter
    ctx.strokeStyle = '#05070a';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cBottom.x, cBottom.y);
    ctx.bezierCurveTo(
      cBottom.x * 0.6 + (cBottom.x + cRight.x) * 0.2 + (h1 - 0.5) * 12, (cBottom.y + cRight.y) * 0.5 + 3,
      cRight.x * 0.6 + (cBottom.x + cRight.x) * 0.2 + (h2 - 0.5) * 12, (cBottom.y + cRight.y) * 0.5 - 4,
      cRight.x, cRight.y
    );
    ctx.bezierCurveTo(
      cRight.x * 0.5 + pRight.x * 0.5 + (h0 - 0.5) * 8, (cRight.y + pRight.y) * 0.5,
      pRight.x + (h1 - 0.5) * 4, pRight.y - 4,
      pRight.x, pRight.y
    );
    ctx.bezierCurveTo(
      ctrlX * 0.4 + pRight.x * 0.6, ctrlY * 0.4 + pRight.y * 0.6 - 4,
      pBottom.x * 0.6 + ctrlX * 0.4, pBottom.y * 0.6 + ctrlY * 0.4 + 3,
      pBottom.x, pBottom.y
    );
    ctx.bezierCurveTo(
      pBottom.x * 0.5 + cBottom.x * 0.5 + (h2 - 0.5) * 8, (pBottom.y + cBottom.y) * 0.5,
      cBottom.x - (h0 - 0.5) * 4, cBottom.y + 4,
      cBottom.x, cBottom.y
    );
    ctx.closePath();
    ctx.stroke();
  }

  // -------------------------------------------------------------
  // D. ORGANIC TOP PLATEAU (Curved Cave Roof / Cavern Ridge)
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

  // Natural surface stone ripples and cracks
  if (!isDeepInterior && h0 > 0.4) {
    const crackX = cLeft.x * 0.4 + cRight.x * 0.6;
    const crackY = cTop.y * 0.4 + cBottom.y * 0.6;
    ctx.strokeStyle = '#141c26';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(crackX - 5, crackY - 3);
    ctx.lineTo(crackX + 1, crackY + 1);
    ctx.lineTo(crackX + 6, crackY - 2);
    ctx.stroke();
  }

  // -------------------------------------------------------------
  // E. GLOWING ACCENTS & LUMINESCENT MINERALS
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
    const gemShineColor = isAzure ? '#e0f2fe' : '#faf5ff';

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

    ctx.beginPath();
    ctx.moveTo(gemX + 1, gemY + 2);
    ctx.lineTo(gemX + 5, gemY - 3);
    ctx.lineTo(gemX + 6, gemY + 4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = gemShineColor;
    ctx.fillRect(gemX - 1, gemY - 4, 1.5, 2.5);
    ctx.restore();
  }

  // -------------------------------------------------------------
  // F. MINE TIMBER BRACING
  // -------------------------------------------------------------
  if (h1 > 0.76 && (openS || openE) && !isDeepInterior) {
    const tx = cBottom.x;
    const ty = cBottom.y;
    ctx.fillStyle = '#3a1f10';
    ctx.fillRect(tx - 3.5, ty, 7, wallH);
    ctx.fillStyle = '#542d17';
    ctx.fillRect(tx - 2, ty, 3.5, wallH);
    ctx.fillStyle = '#221107';
    ctx.fillRect(tx - 3.5, ty, 7, 1.5);
    ctx.fillRect(tx - 3.5, ty + wallH - 1.5, 7, 1.5);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(tx - 4.5, ty + 6, 9, 4);
    ctx.fillRect(tx - 4.5, ty + wallH - 10, 9, 4);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(tx - 3, ty + 7.5, 1.5, 1.5);
    ctx.fillRect(tx + 1.5, ty + 7.5, 1.5, 1.5);
    ctx.fillRect(tx - 3, ty + wallH - 8.5, 1.5, 1.5);
    ctx.fillRect(tx + 1.5, ty + wallH - 8.5, 1.5, 1.5);
  }

  ctx.globalAlpha = 1;
}

/**
 * Renders an organic textured cavern floor tile with puddle glints, pebbles,
 * moss speckles, and volumetric 3D railways.
 * 
 * If a PNG sprite is registered in TILE_SPRITES, it draws the sprite.
 */
export function renderFloorTile(ctx: CanvasRenderingContext2D, p: FloorRenderParams) {
  // Check for future PNG sprite override
  if (TILE_SPRITES['floor_stone']?.isLoaded && TILE_SPRITES['floor_stone'].image) {
    const { x: sx, y: sy } = project(p.cx, p.cy);
    ctx.drawImage(TILE_SPRITES['floor_stone'].image, sx - TILE_SIZE, sy - TILE_SIZE / 2);
    if (!p.isRail) return;
  }

  const { x: ix, y: iy } = project(p.cx, p.cy);
  const s = TILE_SIZE / 2;

  const h0 = hash2D(p.cx * 1.37 + 17, p.cy * 1.73 + 29);
  const h1 = hash2D(p.cx * 2.91 + 43, p.cy * 3.19 + 71);
  const h2 = hash2D(p.cx * 5.63 + 89, p.cy * 4.41 + 13);

  // 1. ORGANIC ISOMETRIC FLOOR DIAMOND (Curved softly at vertices)
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

  // 2. FLOOR DETAILS: PUDDLES, PEBBLES, MOSS
  // Wet underground puddle with subtle reflection
  if (h1 > 0.72) {
    ctx.save();
    ctx.beginPath();
    const pudX = ix + (h0 - 0.5) * 24;
    const pudY = iy + (h2 - 0.5) * 12;
    ctx.ellipse(pudX, pudY, 9 + h0 * 6, 4.5 + h0 * 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(7, 12, 22, 0.75)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.fillStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.fillRect(pudX - 3, pudY - 1, 4, 1.2);
    ctx.restore();
  }

  // Flagstone crack
  if (h2 > 0.58) {
    ctx.strokeStyle = 'rgba(10, 15, 24, 0.9)';
    ctx.lineWidth = 1;
    const crkX = ix + (h1 - 0.5) * 22;
    const crkY = iy + (h0 - 0.5) * 12;
    ctx.beginPath();
    ctx.moveTo(crkX - 5, crkY - 2);
    ctx.lineTo(crkX + 1, crkY + 1);
    ctx.lineTo(crkX + 6, crkY - 1);
    ctx.stroke();
  }

  // Small pebble cluster
  if (h0 > 0.45) {
    const pebX = ix + (h2 - 0.5) * 26;
    const pebY = iy + (h1 - 0.5) * 14;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(pebX - 2, pebY + 1, 5, 2);
    ctx.fillStyle = '#334155';
    ctx.fillRect(pebX - 2, pebY - 1, 3, 2);
    ctx.fillStyle = '#475569';
    ctx.fillRect(pebX + 1, pebY, 2.5, 2);
  }

  // Glowing moss speckles
  if (h1 > 0.82) {
    const mossX = ix + (h2 - 0.5) * 20;
    const mossY = iy + (h0 - 0.5) * 10;
    ctx.fillStyle = '#059669';
    ctx.fillRect(mossX, mossY, 1.5, 1.5);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(mossX + 2, mossY - 1, 1.2, 1.2);
  }

  // 3. VOLUMETRIC 3D RAILWAY SYSTEM WITH CONTACT SHADOWS
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

     // 1. Contact shadow under gravel bed
     const ballastW = 21;
     ctx.save();
     ctx.beginPath();
     ctx.moveTo(pIn.x + normX * (ballastW + 4), pIn.y + normY * (ballastW + 4) + 3);
     ctx.lineTo(pOut.x + normX * (ballastW + 4), pOut.y + normY * (ballastW + 4) + 3);
     ctx.lineTo(pOut.x - normX * (ballastW + 4), pOut.y - normY * (ballastW + 4) + 3);
     ctx.lineTo(pIn.x - normX * (ballastW + 4), pIn.y - normY * (ballastW + 4) + 3);
     ctx.closePath();
     ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
     ctx.fill();
     ctx.restore();

     // 2. Crushed basalt ballast bed
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
     ctx.strokeStyle = '#090d14';
     ctx.lineWidth = 1;
     ctx.stroke();

     for (let k = -2; k <= 2; k++) {
        const gx = ix + dirX * (k * 14) + normX * ((hash2D(p.cx + k*7, p.cy) - 0.5) * 26);
        const gy = iy + dirY * (k * 14) + normY * ((hash2D(p.cy + k*9, p.cx) - 0.5) * 26);
        ctx.fillStyle = k % 2 === 0 ? '#080c12' : '#1f2937';
        ctx.fillRect(gx, gy, 2.5, 2);
     }

     // 3. 3D wooden sleepers
     const sleeperOffsets = [-0.62, -0.22, 0.22, 0.62];
     const sleeperHalfLen = 17;
     const sleeperDepth = 3.5;

     sleeperOffsets.forEach((tOffset, sIdx) => {
        const stX = ix + dirX * (tOffset * (tLen * 0.45));
        const stY = iy + dirY * (tOffset * (tLen * 0.45));

        const pL = { x: stX + normX * sleeperHalfLen, y: stY + normY * sleeperHalfLen };
        const pR = { x: stX - normX * sleeperHalfLen, y: stY - normY * sleeperHalfLen };
        const tThickX = dirX * 3.5;
        const tThickY = dirY * 3.5;

        // Drop shadow
        ctx.beginPath();
        ctx.moveTo(pL.x + tThickX, pL.y + tThickY + 2);
        ctx.lineTo(pR.x + tThickX, pR.y + tThickY + 2);
        ctx.lineTo(pR.x - tThickX, pR.y - tThickY + 2);
        ctx.lineTo(pL.x - tThickX, pL.y - tThickY + 2);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fill();

        // Front shadow face
        ctx.beginPath();
        ctx.moveTo(pL.x - tThickX, pL.y - tThickY);
        ctx.lineTo(pR.x - tThickX, pR.y - tThickY);
        ctx.lineTo(pR.x - tThickX, pR.y - tThickY + sleeperDepth);
        ctx.lineTo(pL.x - tThickX, pL.y - tThickY + sleeperDepth);
        ctx.closePath();
        ctx.fillStyle = '#1c0f06';
        ctx.fill();

        // Top face
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

        // Top bevel edge
        ctx.beginPath();
        ctx.moveTo(pL.x + tThickX, pL.y + tThickY);
        ctx.lineTo(pR.x + tThickX, pR.y + tThickY);
        ctx.strokeStyle = '#542d13';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Tie plates & spikes
        [-10, 10].forEach(plateDist => {
           const plX = stX + normX * plateDist;
           const plY = stY + normY * plateDist;
           ctx.fillStyle = '#0f172a';
           ctx.fillRect(plX - 2.5, plY - 2.5, 5, 5);
           ctx.fillStyle = '#64748b';
           ctx.fillRect(plX - 1.5, plY - 1.5, 1.5, 1.5);
           ctx.fillRect(plX + 1, plY + 1, 1.5, 1.5);
        });
     });

     // 4. Volumetric dual rails
     const railGauge = 10.5;
     const railHeight = 4.5;

     [-railGauge, railGauge].forEach(gaugeOffset => {
        const rInX = pIn.x + normX * gaugeOffset;
        const rInY = pIn.y + normY * gaugeOffset;
        const rMidX = pCenter.x + normX * gaugeOffset;
        const rMidY = pCenter.y + normY * gaugeOffset;
        const rOutX = pOut.x + normX * gaugeOffset;
        const rOutY = pOut.y + normY * gaugeOffset;

        ctx.beginPath();
        ctx.moveTo(rInX + 2, rInY + 2);
        ctx.quadraticCurveTo(rMidX + 2, rMidY + 2, rOutX + 2, rOutY + 2);
        ctx.strokeStyle = 'rgba(0,0,0,0.55)';
        ctx.lineWidth = 3.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(rInX, rInY);
        ctx.quadraticCurveTo(rMidX, rMidY, rOutX, rOutY);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(rInX, rInY);
        ctx.quadraticCurveTo(rMidX, rMidY, rOutX, rOutY);
        ctx.lineTo(rOutX, rOutY - railHeight);
        ctx.quadraticCurveTo(rMidX, rMidY - railHeight, rInX, rInY - railHeight);
        ctx.closePath();
        ctx.fillStyle = '#0f172a';
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(rInX, rInY - railHeight);
        ctx.quadraticCurveTo(rMidX, rMidY - railHeight, rOutX, rOutY - railHeight);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(rInX, rInY - railHeight - 0.5);
        ctx.quadraticCurveTo(rMidX, rMidY - railHeight - 0.5, rOutX, rOutY - railHeight - 0.5);
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1.2;
        ctx.stroke();
     });
  }
}
