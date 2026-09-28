import { GameEngineState, Enemy, MiningNode, Loot, Slash, FloatingText, Torch } from './types';
import { project } from './mine';
import { TILE_SIZE, MAP_COLS, MAP_ROWS } from './config';
import { renderEntityCanvas } from '../assetRegistry';

export const drawGame = (ctx: CanvasRenderingContext2D, g: GameEngineState, stats: { maxHealth: number }) => {
  ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, g.width, g.height);
      
      const { x: pIsoX, y: pIsoY } = project(g.player.x, g.player.y);
      const shakeX = g.screenShake ? (Math.random() - 0.5) * g.screenShake : 0;
      const shakeY = g.screenShake ? (Math.random() - 0.5) * g.screenShake : 0;
      const offsetX = g.width / 2 - pIsoX;
      const offsetY = g.height / 2 - pIsoY;

      ctx.save();
      ctx.translate(offsetX + shakeX, offsetY + shakeY);

      const renderList: any[] = [];
      
      const centerC = Math.floor(g.player.x / TILE_SIZE);
      const centerR = Math.floor(g.player.y / TILE_SIZE);
      const RADIUS = Math.ceil(Math.max(g.width, g.height) / TILE_SIZE) + 2;
      
      const startC = Math.max(0, centerC - RADIUS);
      const endC = Math.min(MAP_COLS, centerC + RADIUS);
      const startR = Math.max(0, centerR - RADIUS);
      const endR = Math.min(MAP_ROWS, centerR + RADIUS);
      
      for (let r = startR; r < endR; r++) {
        for (let c = startC; c < endC; c++) {
          const cx = c * TILE_SIZE + TILE_SIZE/2;
          const cy = r * TILE_SIZE + TILE_SIZE/2;
          if (g.grid[r] && (g.grid[r][c] === 0 || g.grid[r][c] === 2)) {
            renderList.push({ type: 'floor', x: cx, y: cy, z: cx + cy - TILE_SIZE, isRail: g.grid[r][c] === 2, data: { r, c } }); 
          } else if (g.grid[r] && g.grid[r][c] === 1) {
            renderList.push({ type: 'wall', x: cx, y: cy, z: cx + cy, data: { r, c } });
          }
        }
      }
      
      renderList.push({ type: 'cart', x: g.cart.x, y: g.cart.y, z: g.cart.x + g.cart.y });
      renderList.push({ type: 'player', x: g.player.x, y: g.player.y, z: g.player.x + g.player.y, data: g.player });
      g.nodes.forEach(n => renderList.push({ type: 'node', x: n.x, y: n.y, z: n.x + n.y, data: n }));
      g.torches.forEach(t => renderList.push({ type: 'torch', x: t.x, y: t.y, z: t.x + t.y }));
      g.enemies.forEach(e => renderList.push({ type: 'enemy', x: e.x, y: e.y, z: e.x + e.y, data: e }));
      g.loots.forEach(l => renderList.push({ type: 'loot', x: l.x, y: l.y, z: l.x + l.y, data: l }));
      g.slashes.forEach(s => renderList.push({ type: 'slash', x: s.x, y: s.y, z: s.x + s.y, data: s }));
      g.texts.forEach(t => renderList.push({ type: 'text', x: t.x, y: t.y, z: Infinity, data: t }));

      renderList.sort((a, b) => a.z - b.z);

      const hash2D = (x: number, y: number) => {
        const val = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        return val - Math.floor(val);
      };

      // LOW-POLY FACETED NATURAL CAVERN WALL RENDERING (Organic, non-blocky, multi-faceted stone)
      const getCavernVertex = (gx: number, gy: number, baseH: number) => {
        const { x: px, y: py } = project(gx * TILE_SIZE, gy * TILE_SIZE);
        // Deterministic vertex displacement and height jitter shared seamlessly by all adjacent wall blocks
        const hx = hash2D(gx * 37.13 + 17.5, gy * 53.71 + 23.3);
        const hy = hash2D(gx * 71.39 + 11.2, gy * 29.57 + 41.7);
        const hz = hash2D(gx * 19.83 + 31.9, gy * 47.91 + 19.4);
        return {
          x: px + (hx - 0.5) * 16,
          y: py + (hy - 0.5) * 11,
          h: baseH + (hz - 0.5) * 22
        };
      };

      const drawRockWall = (cx: number, cy: number, r: number, c: number, h: number, alpha: number) => {
        ctx.globalAlpha = alpha;

        const isWall = (rr: number, cc: number) => {
          if (rr < 0 || rr >= MAP_ROWS || cc < 0 || cc >= MAP_COLS) return true;
          return g.grid[rr] && g.grid[rr][cc] === 1;
        };

        const openS = !isWall(r + 1, c);
        const openE = !isWall(r, c + 1);
        const openW = !isWall(r, c - 1);
        const openN = !isWall(r - 1, c);
        const openSE = !isWall(r + 1, c + 1);
        const openSW = !isWall(r + 1, c - 1);
        const isDeepInterior = !openS && !openE && !openW && !openN && !openSE && !openSW;

        // Shared 4 corner vertices with distinct elevations
        const vTop = getCavernVertex(c, r, h);
        const vRight = getCavernVertex(c + 1, r, h);
        const vBottom = getCavernVertex(c + 1, r + 1, h);
        const vLeft = getCavernVertex(c, r + 1, h);

        const h0 = hash2D(c * 23.7 + 13, r * 41.9 + 29);
        const h1 = hash2D(c * 67.1 + 37, r * 19.3 + 53);
        const h2 = hash2D(c * 83.5 + 47, r * 31.7 + 11);

        // Center mountain crag peak vertex (elevated above corners to form a peaked ridge)
        const vCenter = {
          x: (vTop.x + vRight.x + vBottom.x + vLeft.x) * 0.25 + (h0 - 0.5) * 10,
          y: (vTop.y + vRight.y + vBottom.y + vLeft.y) * 0.25 + (h1 - 0.5) * 8,
          h: h + 14 + (h2 - 0.5) * 18
        };

        // Helper to draw a single low-poly triangular facet
        const drawFacet = (
          p1: { x: number, y: number },
          p2: { x: number, y: number },
          p3: { x: number, y: number },
          fillColor: string,
          strokeColor?: string
        ) => {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineTo(p3.x, p3.y);
          ctx.closePath();
          ctx.fillStyle = fillColor;
          ctx.fill();
          if (strokeColor) {
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        };

        // Mid-edge crest vertices (breaking straight top edges into low-poly facets)
        const vCrestSW = {
          x: (vLeft.x + vBottom.x) * 0.5 + (h2 - 0.5) * 8,
          y: (vLeft.y - vLeft.h + vBottom.y - vBottom.h) * 0.5 + (h0 - 0.5) * 6
        };
        const vCrestSE = {
          x: (vBottom.x + vRight.x) * 0.5 + (h0 - 0.5) * 8,
          y: (vBottom.y - vBottom.h + vRight.y - vRight.h) * 0.5 + (h1 - 0.5) * 6
        };
        const vCrestNE = {
          x: (vRight.x + vTop.x) * 0.5 + (h1 - 0.5) * 8,
          y: (vRight.y - vRight.h + vTop.y - vTop.h) * 0.5 + (h2 - 0.5) * 6
        };
        const vCrestNW = {
          x: (vTop.x + vLeft.x) * 0.5 + (h0 - 0.5) * 8,
          y: (vTop.y - vTop.h + vLeft.y - vLeft.h) * 0.5 + (h1 - 0.5) * 6
        };

        const pTopCrest = { x: vTop.x, y: vTop.y - vTop.h };
        const pRightCrest = { x: vRight.x, y: vRight.y - vRight.h };
        const pBottomCrest = { x: vBottom.x, y: vBottom.y - vBottom.h };
        const pLeftCrest = { x: vLeft.x, y: vLeft.y - vLeft.h };
        const pCenterCrest = { x: vCenter.x, y: vCenter.y - vCenter.h };

        // 1. DEEP INTERIOR BEDROCK: Seamless, multi-faceted mountain terrain (No flat blocks)
        if (isDeepInterior) {
          drawFacet(pTopCrest, vCrestNE, pCenterCrest, '#192231', '#101622');
          drawFacet(vCrestNE, pRightCrest, pCenterCrest, '#151c2a', '#0d131e');
          drawFacet(pRightCrest, vCrestSE, pCenterCrest, '#121825', '#0a0f18');
          drawFacet(vCrestSE, pBottomCrest, pCenterCrest, '#171f2d', '#0d131f');
          drawFacet(pBottomCrest, vCrestSW, pCenterCrest, '#1a2333', '#101623');
          drawFacet(vCrestSW, pLeftCrest, pCenterCrest, '#1e293c', '#121824');
          drawFacet(pLeftCrest, vCrestNW, pCenterCrest, '#233045', '#151d2b');
          drawFacet(vCrestNW, pTopCrest, pCenterCrest, '#202c3f', '#141c29');

          if (h1 > 0.65) {
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(pCenterCrest.x + (h0 - 0.5) * 12, pCenterCrest.y + (h2 - 0.5) * 8, 2, 2);
          }
          ctx.globalAlpha = 1;
          return;
        }

        // 2. EXPOSED CLIFF FACES (Multi-faceted sloping cliffs with chiseled rock shelves)
        // SOUTH-WEST CLIFF FACE (Facing front-left towards player)
        if (openS || openSW || openW) {
          const midH = h * 0.52;
          const pBaseMid = {
            x: (vLeft.x + vBottom.x) * 0.5 + (h1 - 0.5) * 10,
            y: (vLeft.y + vBottom.y) * 0.5 + (h2 - 0.5) * 6
          };
          const pBaseSub1 = {
            x: vLeft.x * 0.65 + pBaseMid.x * 0.35 + (h0 - 0.5) * 6,
            y: vLeft.y * 0.65 + pBaseMid.y * 0.35 + (h1 - 0.5) * 4
          };
          const pBaseSub2 = {
            x: vBottom.x * 0.65 + pBaseMid.x * 0.35 + (h2 - 0.5) * 6,
            y: vBottom.y * 0.65 + pBaseMid.y * 0.35 + (h0 - 0.5) * 4
          };

          const pShelfL = { x: vLeft.x + (h0 - 0.5) * 5, y: vLeft.y - midH + (h1 - 0.5) * 6 };
          const pShelfMid1 = { x: pBaseSub1.x + (h2 - 0.5) * 7, y: pBaseSub1.y - midH + (h0 - 0.5) * 7 };
          const pShelfMid = { x: pBaseMid.x + (h1 - 0.5) * 9, y: pBaseMid.y - midH + (h2 - 0.5) * 7 };
          const pShelfMid2 = { x: pBaseSub2.x + (h0 - 0.5) * 7, y: pBaseSub2.y - midH + (h1 - 0.5) * 7 };
          const pShelfR = { x: vBottom.x + (h2 - 0.5) * 5, y: vBottom.y - midH + (h0 - 0.5) * 6 };

          // LOWER FOOTING FACETS (Sloping down to the cavern floor)
          drawFacet(vLeft, pBaseSub1, pShelfMid1, '#151c27', '#0e141c');
          drawFacet(vLeft, pShelfMid1, pShelfL, '#1a2331', '#101722');
          drawFacet(pBaseSub1, pBaseMid, pShelfMid, '#121822', '#0a0f16');
          drawFacet(pBaseSub1, pShelfMid, pShelfMid1, '#1c2635', '#121924');
          drawFacet(pBaseMid, pBaseSub2, pShelfMid2, '#18212e', '#0f1620');
          drawFacet(pBaseMid, pShelfMid2, pShelfMid, '#222d3d', '#151d27');
          drawFacet(pBaseSub2, vBottom, pShelfR, '#141a25', '#0b1017');
          drawFacet(pBaseSub2, pShelfR, pShelfMid2, '#1e2938', '#131b25');

          // UPPER CHISELED FACETS (Catching the cavern ambient light)
          drawFacet(pShelfL, pShelfMid1, vCrestNW, '#2d3b4e', '#1c2634');
          drawFacet(pShelfMid1, vCrestNW, pLeftCrest, '#37475d', '#222d3c');
          drawFacet(pShelfMid1, pShelfMid, vCrestSW, '#3a4b62', '#263344');
          drawFacet(pShelfMid1, vCrestSW, vCrestNW, '#445670', '#2d3b4e');
          drawFacet(pShelfMid, pShelfMid2, vCrestSW, '#324256', '#212d3b');
          drawFacet(pShelfMid2, pShelfR, pBottomCrest, '#283648', '#192330');
          drawFacet(pShelfMid2, pBottomCrest, vCrestSW, '#3c4e66', '#273445');

          // Natural Talus Scree & Outcrop Boulders at the base (breaks straight floor seam)
          if (h0 > 0.3) {
            const bx = (vLeft.x + pBaseMid.x) * 0.5 + (h1 - 0.5) * 6;
            const by = (vLeft.y + pBaseMid.y) * 0.5 + (h2 - 0.5) * 4;
            drawFacet({ x: bx - 5, y: by + 2 }, { x: bx + 6, y: by + 3 }, { x: bx, y: by - 5 }, '#1f2937', '#111827');
            drawFacet({ x: bx - 5, y: by + 2 }, { x: bx, y: by - 5 }, { x: bx - 7, y: by - 2 }, '#273445', '#161f2b');
          }
          if (h2 > 0.4) {
            const bx = (pBaseMid.x + vBottom.x) * 0.5 + (h0 - 0.5) * 6;
            const by = (pBaseMid.y + vBottom.y) * 0.5 + (h1 - 0.5) * 4;
            drawFacet({ x: bx - 4, y: by + 3 }, { x: bx + 5, y: by + 2 }, { x: bx + 1, y: by - 6 }, '#1c2432', '#0f151e');
          }
        }

        // SOUTH-EAST CLIFF FACE (Facing front-right towards player)
        if (openS || openSE || openE) {
          const midH = h * 0.48;
          const pBaseMid = {
            x: (vBottom.x + vRight.x) * 0.5 + (h2 - 0.5) * 10,
            y: (vBottom.y + vRight.y) * 0.5 + (h0 - 0.5) * 6
          };
          const pBaseSub1 = {
            x: vBottom.x * 0.65 + pBaseMid.x * 0.35 + (h1 - 0.5) * 6,
            y: vBottom.y * 0.65 + pBaseMid.y * 0.35 + (h2 - 0.5) * 4
          };
          const pBaseSub2 = {
            x: vRight.x * 0.65 + pBaseMid.x * 0.35 + (h0 - 0.5) * 6,
            y: vRight.y * 0.65 + pBaseMid.y * 0.35 + (h1 - 0.5) * 4
          };

          const pShelfL = { x: vBottom.x + (h1 - 0.5) * 5, y: vBottom.y - midH + (h2 - 0.5) * 6 };
          const pShelfMid1 = { x: pBaseSub1.x + (h0 - 0.5) * 7, y: pBaseSub1.y - midH + (h1 - 0.5) * 7 };
          const pShelfMid = { x: pBaseMid.x + (h2 - 0.5) * 9, y: pBaseMid.y - midH + (h0 - 0.5) * 7 };
          const pShelfMid2 = { x: pBaseSub2.x + (h1 - 0.5) * 7, y: pBaseSub2.y - midH + (h2 - 0.5) * 7 };
          const pShelfR = { x: vRight.x + (h0 - 0.5) * 5, y: vRight.y - midH + (h1 - 0.5) * 6 };

          // LOWER FOOTING FACETS
          drawFacet(vBottom, pBaseSub1, pShelfMid1, '#111721', '#0a0e15');
          drawFacet(vBottom, pShelfMid1, pShelfL, '#161e2b', '#0e141d');
          drawFacet(pBaseSub1, pBaseMid, pShelfMid, '#0e131b', '#070b10');
          drawFacet(pBaseSub1, pShelfMid, pShelfMid1, '#18212e', '#101620');
          drawFacet(pBaseMid, pBaseSub2, pShelfMid2, '#131a25', '#0c1119');
          drawFacet(pBaseMid, pShelfMid2, pShelfMid, '#1a2432', '#111823');
          drawFacet(pBaseSub2, vRight, pShelfR, '#10151f', '#090d14');
          drawFacet(pBaseSub2, pShelfR, pShelfMid2, '#17202c', '#0f151e');

          // UPPER CHISELED FACETS
          drawFacet(pShelfL, pShelfMid1, vCrestSE, '#253243', '#17202c');
          drawFacet(pShelfMid1, vCrestSE, pBottomCrest, '#2e3d51', '#1d2735');
          drawFacet(pShelfMid1, pShelfMid, vCrestNE, '#29374a', '#1a2432');
          drawFacet(pShelfMid1, vCrestNE, vCrestSE, '#334358', '#212c3b');
          drawFacet(pShelfMid, pShelfMid2, vCrestNE, '#243041', '#17202c');
          drawFacet(pShelfMid2, pShelfR, pRightCrest, '#1e2939', '#131b26');
          drawFacet(pShelfMid2, pRightCrest, vCrestNE, '#2b3a4e', '#1c2633');

          // Natural Talus Scree & Outcrops
          if (h1 > 0.35) {
            const bx = (vBottom.x + pBaseMid.x) * 0.5 + (h2 - 0.5) * 6;
            const by = (vBottom.y + pBaseMid.y) * 0.5 + (h0 - 0.5) * 4;
            drawFacet({ x: bx - 5, y: by + 1 }, { x: bx + 5, y: by + 2 }, { x: bx, y: by - 5 }, '#17202d', '#0d131c');
          }
        }

        // 3. MOUNTAIN CREST PLATEAU (8-Facet Peaked Cap - Replaces flat diamond lids)
        drawFacet(pTopCrest, vCrestNE, pCenterCrest, '#38485e', '#243040');
        drawFacet(vCrestNE, pRightCrest, pCenterCrest, '#2e3d51', '#1d2735');
        drawFacet(pRightCrest, vCrestSE, pCenterCrest, '#273446', '#19222e');
        drawFacet(vCrestSE, pBottomCrest, pCenterCrest, '#324257', '#202b3a');
        drawFacet(pBottomCrest, vCrestSW, pCenterCrest, '#3c4e66', '#263344');
        drawFacet(vCrestSW, pLeftCrest, pCenterCrest, '#475b75', '#2d3b4d');
        drawFacet(vCrestNW, pLeftCrest, pCenterCrest, '#4e627e', '#324155');
        drawFacet(vCrestNW, pTopCrest, pCenterCrest, '#43556e', '#2b3748');

        // Embedded Raw Ore / Gold Vein Flecks inside chiseled crag crevices
        if (h0 > 0.72) {
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(pCenterCrest.x + (h1 - 0.5) * 14, pCenterCrest.y + (h2 - 0.5) * 10, 2.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(pCenterCrest.x + (h1 - 0.5) * 14, pCenterCrest.y + (h2 - 0.5) * 10, 1.2, 1.2);
        } else if (h2 > 0.75) {
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(pCenterCrest.x + (h0 - 0.5) * 12, pCenterCrest.y + (h1 - 0.5) * 8, 2.0, 0, Math.PI * 2);
          ctx.fill();
        }

        // OCCASIONAL MINING TIMBER SUPPORT (Weathered wooden beam and metal straps)
        if (h2 > 0.74 && (openS || openE)) {
          const tx = vBottom.x;
          const ty = vBottom.y;
          ctx.fillStyle = '#3e2010';
          ctx.fillRect(tx - 3, ty - h, 6, h);
          ctx.fillStyle = '#5c3317';
          ctx.fillRect(tx - 1.5, ty - h, 3, h);
          // Iron brace rivets
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(tx - 4, ty - h + 5, 8, 3);
          ctx.fillRect(tx - 4, ty - 6, 8, 3);
        }

        ctx.globalAlpha = 1;
      };

      // EARTHY BROWN MINE DIRT FLOOR & VOLUMETRIC 3D RAILWAY RENDERING
      const drawFloor = (cx: number, cy: number, r: number, c: number, isRail: boolean) => {
        const { x: ix, y: iy } = project(cx, cy);
        const s = TILE_SIZE / 2;
        const h0 = hash2D(cx * 1.3 + 7, cy * 1.7 + 13);
        const h1 = hash2D(cx * 2.9 + 23, cy * 3.1 + 41);
        const h2 = hash2D(cx * 5.7 + 37, cy * 4.3 + 19);

        // 1. EARTHY CAVERN DIRT FLOOR (Diamond tile base)
        ctx.beginPath(); 
        ctx.moveTo(ix, iy - s); 
        ctx.lineTo(ix + 2*s, iy); 
        ctx.lineTo(ix, iy + s); 
        ctx.lineTo(ix - 2*s, iy); 
        ctx.closePath();
        
        // Natural soil tone variation
        ctx.fillStyle = h0 > 0.5 ? '#271911' : '#2f1e15'; 
        ctx.fill();
        ctx.strokeStyle = '#1a100a'; 
        ctx.lineWidth = 1; 
        ctx.stroke();

        // Floor texture: small pebbles, scattered mineral dust
        ctx.fillStyle = '#170e08';
        ctx.fillRect(ix + (h0 - 0.5)*32, iy + (h1 - 0.5)*16, 3, 2);
        ctx.fillStyle = '#3d2518';
        ctx.fillRect(ix + (h1 - 0.5)*28, iy + (h2 - 0.5)*14, 2, 2);
        if (h2 > 0.65) {
          ctx.fillStyle = '#110a05';
          ctx.fillRect(ix + (h2 - 0.5)*30, iy + (h0 - 0.5)*15, 4, 2.5);
        }

        // 2. VOLUMETRIC 3D RAILWAY SYSTEM (Sunken Ballast, 3D Timber Sleepers, Beveled Steel Rails)
        if (isRail) {
           // Detect track orientation through neighboring rail coordinates
           const isN = g.grid[r - 1] && g.grid[r - 1][c] === 2;
           const isNW = g.grid[r - 1] && g.grid[r - 1][c - 1] === 2;
           const isNE = g.grid[r - 1] && g.grid[r - 1][c + 1] === 2;
           const isS = g.grid[r + 1] && g.grid[r + 1][c] === 2;
           const isSW = g.grid[r + 1] && g.grid[r + 1][c - 1] === 2;
           const isSE = g.grid[r + 1] && g.grid[r + 1][c + 1] === 2;
           const isW = g.grid[r] && g.grid[r][c - 1] === 2;
           const isE = g.grid[r] && g.grid[r][c + 1] === 2;

           // Calculate incoming and outgoing local track tangents
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

           const pIn = project(cx + inX * 0.5, cy + inY * 0.5);
           const pCenter = { x: ix, y: iy };
           const pOut = project(cx + outX * 0.5, cy + outY * 0.5);

           // Track direction tangent vector in screen space
           const tDx = pOut.x - pIn.x;
           const tDy = pOut.y - pIn.y;
           const tLen = Math.hypot(tDx, tDy) || 1;
           const dirX = tDx / tLen;
           const dirY = tDy / tLen;
           // Normal perpendicular vector in screen space
           const normX = -dirY;
           const normY = dirX;

           // A. GRAVEL BALLAST BED (Crushed dark rock roadbed under tracks)
           const ballastW = 20;
           ctx.beginPath();
           ctx.moveTo(pIn.x + normX * ballastW, pIn.y + normY * ballastW);
           ctx.lineTo(pCenter.x + normX * (ballastW + 2), pCenter.y + normY * (ballastW + 2));
           ctx.lineTo(pOut.x + normX * ballastW, pOut.y + normY * ballastW);
           ctx.lineTo(pOut.x - normX * ballastW, pOut.y - normY * ballastW);
           ctx.lineTo(pCenter.x - normX * (ballastW + 2), pCenter.y - normY * (ballastW + 2));
           ctx.lineTo(pIn.x - normX * ballastW, pIn.y - normY * ballastW);
           ctx.closePath();
           ctx.fillStyle = '#1c1511';
           ctx.fill();
           ctx.strokeStyle = '#120c08';
           ctx.lineWidth = 1;
           ctx.stroke();

           // Ballast rock pieces & gravel rubble
           for (let k = -2; k <= 2; k++) {
              const gx = ix + dirX * (k * 14) + normX * ((hash2D(cx + k*7, cy) - 0.5) * 26);
              const gy = iy + dirY * (k * 14) + normY * ((hash2D(cy + k*9, cx) - 0.5) * 26);
              ctx.fillStyle = k % 2 === 0 ? '#100a06' : '#2b1f18';
              ctx.fillRect(gx, gy, 2.5, 2);
           }

           // B. VOLUMETRIC 3D WOODEN SLEEPERS (Cross-Ties with depth, bevel, and cast shadow)
           const sleeperOffsets = [-0.62, -0.22, 0.22, 0.62];
           const sleeperHalfLen = 17;
           const sleeperDepth = 3.5; // Vertical 3D thickness

           sleeperOffsets.forEach((tOffset, sIdx) => {
              // Position along track spline
              const stX = ix + dirX * (tOffset * (tLen * 0.45));
              const stY = iy + dirY * (tOffset * (tLen * 0.45));

              // Sleeper corners in 2D
              const pL = { x: stX + normX * sleeperHalfLen, y: stY + normY * sleeperHalfLen };
              const pR = { x: stX - normX * sleeperHalfLen, y: stY - normY * sleeperHalfLen };
              const tThickX = dirX * 3.5;
              const tThickY = dirY * 3.5;

              // 1. Sleeper cast shadow on gravel
              ctx.beginPath();
              ctx.moveTo(pL.x + tThickX, pL.y + tThickY + 2);
              ctx.lineTo(pR.x + tThickX, pR.y + tThickY + 2);
              ctx.lineTo(pR.x - tThickX, pR.y - tThickY + 2);
              ctx.lineTo(pL.x - tThickX, pL.y - tThickY + 2);
              ctx.closePath();
              ctx.fillStyle = 'rgba(0,0,0,0.45)';
              ctx.fill();

              // 2. Sleeper 3D Front / Side shadowed face
              ctx.beginPath();
              ctx.moveTo(pL.x - tThickX, pL.y - tThickY);
              ctx.lineTo(pR.x - tThickX, pR.y - tThickY);
              ctx.lineTo(pR.x - tThickX, pR.y - tThickY + sleeperDepth);
              ctx.lineTo(pL.x - tThickX, pL.y - tThickY + sleeperDepth);
              ctx.closePath();
              ctx.fillStyle = '#200e04';
              ctx.fill();

              // 3. Sleeper Top Face (Weathered dark creosote wood)
              ctx.beginPath();
              ctx.moveTo(pL.x - tThickX, pL.y - tThickY);
              ctx.lineTo(pL.x + tThickX, pL.y + tThickY);
              ctx.lineTo(pR.x + tThickX, pR.y + tThickY);
              ctx.lineTo(pR.x - tThickX, pR.y - tThickY);
              ctx.closePath();
              ctx.fillStyle = (sIdx % 2 === 0) ? '#432009' : '#391b07';
              ctx.fill();
              ctx.strokeStyle = '#1d0c03';
              ctx.lineWidth = 0.8;
              ctx.stroke();

              // 4. Sleeper Top Bevel Edge (Highlights light-facing upper edge)
              ctx.beginPath();
              ctx.moveTo(pL.x + tThickX, pL.y + tThickY);
              ctx.lineTo(pR.x + tThickX, pR.y + tThickY);
              ctx.strokeStyle = '#5a2e10';
              ctx.lineWidth = 1;
              ctx.stroke();

              // 5. Iron Tie-Plates & Spikes (Attaching rail to tie)
              [-10, 10].forEach(plateDist => {
                 const plX = stX + normX * plateDist;
                 const plY = stY + normY * plateDist;
                 // Dark iron plate
                 ctx.fillStyle = '#0f172a';
                 ctx.fillRect(plX - 2.5, plY - 2.5, 5, 5);
                 // Heavy square iron spikes
                 ctx.fillStyle = '#475569';
                 ctx.fillRect(plX - 2, plY - 2, 2, 2);
                 ctx.fillRect(plX + 1, plY + 1, 2, 2);
              });
           });

           // C. VOLUMETRIC 3D DUAL STEEL RAILS (Heavy industrial steel profile)
           const railGauge = 10.5; // Half-gauge distance
           const railHeight = 4.5; // 3D vertical elevation off the sleepers

           [-railGauge, railGauge].forEach(gaugeOffset => {
              const rInX = pIn.x + normX * gaugeOffset;
              const rInY = pIn.y + normY * gaugeOffset;
              const rMidX = pCenter.x + normX * gaugeOffset;
              const rMidY = pCenter.y + normY * gaugeOffset;
              const rOutX = pOut.x + normX * gaugeOffset;
              const rOutY = pOut.y + normY * gaugeOffset;

              // 1. Rail Drop Shadow onto sleepers & gravel
              ctx.beginPath();
              ctx.moveTo(rInX + 2, rInY + 2);
              ctx.quadraticCurveTo(rMidX + 2, rMidY + 2, rOutX + 2, rOutY + 2);
              ctx.strokeStyle = 'rgba(0,0,0,0.5)';
              ctx.lineWidth = 3.5;
              ctx.stroke();

              // 2. Rail Base Flange (Foot of rail resting on tie-plates)
              ctx.beginPath();
              ctx.moveTo(rInX, rInY);
              ctx.quadraticCurveTo(rMidX, rMidY, rOutX, rOutY);
              ctx.strokeStyle = '#1e293b';
              ctx.lineWidth = 4;
              ctx.stroke();

              // 3. Rail Vertical Web (Dark shaded side of the 3D rail)
              ctx.beginPath();
              ctx.moveTo(rInX, rInY);
              ctx.quadraticCurveTo(rMidX, rMidY, rOutX, rOutY);
              ctx.lineTo(rOutX, rOutY - railHeight);
              ctx.quadraticCurveTo(rMidX, rMidY - railHeight, rInX, rInY - railHeight);
              ctx.closePath();
              ctx.fillStyle = '#0f172a';
              ctx.fill();

              // 4. Rail Head Crown (Steel rail top)
              ctx.beginPath();
              ctx.moveTo(rInX, rInY - railHeight);
              ctx.quadraticCurveTo(rMidX, rMidY - railHeight, rOutX, rOutY - railHeight);
              ctx.strokeStyle = '#64748b';
              ctx.lineWidth = 3;
              ctx.stroke();

              // 5. Specular Metallic Glint (High-reflection shine on rail head)
              ctx.beginPath();
              ctx.moveTo(rInX, rInY - railHeight - 0.5);
              ctx.quadraticCurveTo(rMidX, rMidY - railHeight - 0.5, rOutX, rOutY - railHeight - 0.5);
              ctx.strokeStyle = '#f1f5f9';
              ctx.lineWidth = 1.2;
              ctx.stroke();
           });
        }
      };

      // PLAYER WITH SWORD, ATTACK ANIMATION, AND RANGE INDICATOR
      const drawPlayer = (px: number, py: number, player: any) => {
        const { x: ix, y: iy } = project(px, py);
        const now = Date.now();

        // 1. MELEE STRIKE RANGE INDICATOR (Radius 115px projected isometrically)
        const rangeRadius = 115;
        // In isometric projection: Rx = rangeRadius * 1.414, Ry = rangeRadius * 0.707
        const rx = rangeRadius * 1.414;
        const ry = rangeRadius * 0.707;

        // Check if any hostile enemy is in range
        const hasThreatInRange = g.enemies.some(e => e.hp > 0 && Math.hypot(e.x - px, e.y - py) < rangeRadius);

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(ix, iy, rx, ry, 0, 0, Math.PI * 2);
        
        if (hasThreatInRange) {
          // Warning combat pulse when enemies enter strike range
          const pulse = (Math.sin(now * 0.012) + 1) * 0.5;
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.45 + pulse * 0.35})`;
          ctx.lineWidth = 2.5;
          ctx.setLineDash([8, 6]);
          ctx.stroke();
          ctx.fillStyle = `rgba(239, 68, 68, ${0.06 + pulse * 0.05})`;
          ctx.fill();
        } else {
          // Calm tactical ring
          ctx.strokeStyle = 'rgba(250, 204, 21, 0.28)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 8]);
          ctx.stroke();
          ctx.fillStyle = 'rgba(250, 204, 21, 0.03)';
          ctx.fill();
        }
        ctx.setLineDash([]);
        ctx.restore();

        // Subtle range markers at north, south, east, west cardinal tips
        ctx.fillStyle = hasThreatInRange ? '#ef4444' : '#facc15';
        ctx.fillRect(ix - 2, iy - ry - 3, 4, 6);
        ctx.fillRect(ix - 2, iy + ry - 3, 4, 6);
        ctx.fillRect(ix - rx - 3, iy - 2, 6, 4);
        ctx.fillRect(ix + rx - 3, iy - 2, 6, 4);

        // 2. PLAYER SHADOW & INVULNERABILITY EFFECT
        ctx.save();
        if (player.invulnTimer && player.invulnTimer > 0) {
          if (Math.floor(now / 65) % 2 === 0) {
            ctx.globalAlpha = 0.35;
          }
        }

        ctx.beginPath(); 
        ctx.ellipse(ix, iy, 16, 8, 0, 0, Math.PI * 2); 
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; 
        ctx.fill();

        // 3. MINER BODY & LEGS
        // Sturdy work boots
        ctx.fillStyle = '#1e1b18';
        ctx.fillRect(ix - 7, iy - 6, 5, 6);
        ctx.fillRect(ix + 2, iy - 6, 5, 6);

        // Miner rugged tunic/jacket
        ctx.fillStyle = player.inLight ? '#1d4ed8' : '#1e3a8a'; 
        ctx.beginPath(); 
        ctx.moveTo(ix - 12, iy - 6); 
        ctx.lineTo(ix - 9, iy - 30); 
        ctx.lineTo(ix + 9, iy - 30); 
        ctx.lineTo(ix + 12, iy - 6); 
        ctx.arc(ix, iy - 6, 12, 0, Math.PI); 
        ctx.fill();

        // Leather work belt with gold buckle
        ctx.fillStyle = '#78350f';
        ctx.fillRect(ix - 10, iy - 14, 20, 4);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(ix - 3, iy - 15, 6, 6);

        // Miner Head & Hard Hat
        ctx.fillStyle = player.inLight ? '#fed7aa' : '#9a3412'; 
        ctx.beginPath(); ctx.arc(ix, iy - 35, 9, 0, Math.PI * 2); ctx.fill();

        // Hard hat helmet
        ctx.fillStyle = '#eab308';
        ctx.beginPath(); 
        ctx.arc(ix, iy - 38, 10, Math.PI, 0); 
        ctx.lineTo(ix + 12, iy - 36); 
        ctx.lineTo(ix - 12, iy - 36); 
        ctx.closePath(); 
        ctx.fill();
        ctx.strokeStyle = '#ca8a04'; ctx.lineWidth = 1; ctx.stroke();

        // Helmet Lamp
        ctx.fillStyle = '#fef08a';
        ctx.beginPath(); ctx.arc(ix, iy - 37, 3, 0, Math.PI * 2); ctx.fill();

        // Red miner neck scarf
        ctx.fillStyle = player.inLight ? '#ef4444' : '#7f1d1d'; 
        ctx.beginPath(); 
        ctx.moveTo(ix - 7, iy - 28); 
        ctx.lineTo(ix - 15, iy - 8); 
        ctx.lineTo(ix - 3, iy - 8); 
        ctx.fill();

        // 4. SWORD & ATTACK ANIMATION
        // Check attack animation cadence
        const isAttacking = player.attackTimer > 0;
        const attackProgress = isAttacking ? (0.42 - player.attackTimer) / 0.42 : 0;

        ctx.save();
        ctx.translate(ix + 9, iy - 18);

        if (isAttacking) {
          // Dynamic forward slash sweep arc
          const swingAngle = -Math.PI * 0.4 + attackProgress * Math.PI * 1.3;
          ctx.rotate(swingAngle);

          // Glowing blade slash trail
          ctx.beginPath();
          ctx.arc(0, 0, 36, -Math.PI * 0.3, 0.1);
          ctx.strokeStyle = `rgba(250, 204, 21, ${0.8 - attackProgress * 0.6})`;
          ctx.lineWidth = 4;
          ctx.stroke();
        } else {
          // Idle / moving weapon tilt
          const idleBob = player.moving ? Math.sin(now * 0.015) * 0.15 : 0;
          ctx.rotate(-0.35 + idleBob);
        }

        // Sword Hilt & Pommel
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-2, 2, 4, 10); // handle
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-3, 11, 6, 3); // pommel
        ctx.fillRect(-8, 0, 16, 3); // golden guard

        // Steel Forged Blade
        ctx.fillStyle = '#f1f5f9';
        ctx.beginPath();
        ctx.moveTo(-4, 0);
        ctx.lineTo(-3, -32);
        ctx.lineTo(0, -38); // pointed tip
        ctx.lineTo(3, -32);
        ctx.lineTo(4, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Center fuller bloodline
        ctx.strokeStyle = '#64748b';
        ctx.beginPath();
        ctx.moveTo(0, -2);
        ctx.lineTo(0, -30);
        ctx.stroke();

        ctx.restore();

        // 5. HP & MINING BARS
        const hpWidth = 32;
        ctx.fillStyle = '#000'; 
        ctx.fillRect(ix - hpWidth/2, iy - 58, hpWidth, 4);
        ctx.fillStyle = '#ef4444'; 
        ctx.fillRect(ix - hpWidth/2, iy - 58, hpWidth * (player.hp / stats.maxHealth), 4);
        ctx.strokeStyle = '#1e293b';
        ctx.strokeRect(ix - hpWidth/2, iy - 58, hpWidth, 4);
        
        if (player.miningTimer > 0) {
            ctx.fillStyle = '#facc15'; 
            ctx.fillRect(ix - hpWidth/2, iy - 64, hpWidth * player.miningTimer, 3);
        }
        ctx.restore();
      };

      const drawEnemy = (px: number, py: number, enemy: Enemy) => {
        const { x: ix, y: iy } = project(px, py);

        // BOSS RENDERING
        if (enemy.boss) {
          const scale = 2.1;
          const bKind = enemy.bossKind || 'foreman';

          // BOSS TELEGRAPH GROUND MARKERS
          if (enemy.telegraphTimer && enemy.telegraphTimer > 0) {
            const pProg = Math.min(1, Math.max(0, 1 - (enemy.telegraphTimer / (enemy.maxTelegraph || 1))));

            if (bKind === 'shadow_lord' && enemy.targetX !== undefined && enemy.targetY !== undefined) {
              const { x: tx, y: ty } = project(enemy.targetX, enemy.targetY);
              const rad = enemy.telegraphRadius || 72;

              ctx.save();
              // Outer pulsing danger ring
              ctx.beginPath();
              ctx.ellipse(tx, ty, rad * 1.25, rad * 0.65, 0, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(88, 28, 135, 0.3)';
              ctx.fill();
              ctx.strokeStyle = '#c084fc';
              ctx.lineWidth = 2.5;
              ctx.setLineDash([8, 6]);
              ctx.stroke();
              ctx.setLineDash([]);

              // Inner filling attack charge
              ctx.beginPath();
              ctx.ellipse(tx, ty, rad * 1.25 * pProg, rad * 0.65 * pProg, 0, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(236, 72, 153, 0.45)';
              ctx.fill();

              // Warning alert label
              ctx.font = 'bold 12px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillStyle = '#f472b6';
              ctx.fillText('⚠️ ТЕНЕВАЯ ЗАСАДА! УЙДИТЕ ИЗ ЗОНЫ!', tx, ty - rad * 0.75);
              ctx.restore();
            } else if (bKind === 'foreman' && enemy.targetX !== undefined && enemy.targetY !== undefined) {
              const { x: tx, y: ty } = project(enemy.targetX, enemy.targetY);
              ctx.save();
              ctx.strokeStyle = '#ea580c';
              ctx.lineWidth = 3.5;
              ctx.setLineDash([10, 6]);
              ctx.beginPath();
              ctx.moveTo(ix, iy);
              ctx.lineTo(tx, ty);
              ctx.stroke();
              ctx.setLineDash([]);

              // Target impact circle
              ctx.beginPath();
              ctx.ellipse(tx, ty, 40, 20, 0, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(234, 88, 12, 0.35)';
              ctx.fill();
              ctx.strokeStyle = '#f97316';
              ctx.stroke();

              ctx.font = 'bold 12px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillStyle = '#fdba74';
              ctx.fillText('⚠️ ТАРАН!', (ix + tx) / 2, (iy + ty) / 2 - 14);
              ctx.restore();
            } else if (bKind === 'crystal_colossus') {
              const rad = (enemy.telegraphRadius || 85) * pProg;
              ctx.save();
              ctx.beginPath();
              ctx.ellipse(ix, iy, rad * 1.25, rad * 0.65, 0, 0, Math.PI * 2);
              ctx.strokeStyle = '#38bdf8';
              ctx.lineWidth = 3;
              ctx.stroke();
              ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
              ctx.fill();
              ctx.font = 'bold 12px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillStyle = '#67e8f9';
              ctx.fillText('⚠️ ВЗРЫВ КРИСТАЛЛОВ!', ix, iy - 45 * scale);
              ctx.restore();
            }
          }
          
          ctx.beginPath(); ctx.ellipse(ix, iy, 18*scale, 9*scale, 0, 0, Math.PI * 2); 
          ctx.fillStyle = bKind === 'shadow_lord' ? 'rgba(88,28,135,0.6)' : 'rgba(0,0,0,0.6)'; 
          ctx.fill();

          // Boss Entity Rendered via Asset Registry
          renderEntityCanvas(ctx, bKind, {
            x: ix,
            y: iy,
            scale,
            time: Date.now(),
            inLight: enemy.inLight,
            state: enemy,
            showShadow: false
          });

          // Preparing strike attack cone indicator (tells player exactly where the boss will slash!)
          if (enemy.preparingStrike && enemy.strikeAngle !== undefined) {
            const sAngle = enemy.strikeAngle;
            const rLen = 60;
            const p1 = project(enemy.x + Math.cos(sAngle - 0.55) * rLen, enemy.y + Math.sin(sAngle - 0.55) * rLen);
            const pMid = project(enemy.x + Math.cos(sAngle) * rLen, enemy.y + Math.sin(sAngle) * rLen);
            const p2 = project(enemy.x + Math.cos(sAngle + 0.55) * rLen, enemy.y + Math.sin(sAngle + 0.55) * rLen);

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(ix, iy);
            ctx.lineTo(p1.x, p1.y);
            ctx.quadraticCurveTo(pMid.x, pMid.y, p2.x, p2.y);
            ctx.closePath();
            ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
            ctx.fill();
            ctx.strokeStyle = '#f43f5e';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#f87171';
            ctx.fillText('⚔️ ЗАМАХ! УЙДИТЕ В СТОРОНУ!', ix, iy - 58 * scale);
            ctx.restore();
          }

          // Stunned status indicator
          if (enemy.stunTimer && enemy.stunTimer > 0) {
            const nowStun = Date.now();
            for (let s = 0; s < 3; s++) {
              const starAngle = (nowStun * 0.007 + (s * Math.PI * 2) / 3);
              const sx = ix + Math.cos(starAngle) * (18 * scale);
              const sy = iy - 52 * scale + Math.sin(starAngle) * (7 * scale);
              ctx.fillStyle = '#facc15';
              ctx.beginPath();
              ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fef08a';
            ctx.fillText('😵 ОГЛУШЕН! АТАКУЙТЕ!', ix, iy - 62 * scale);
          }

          // Boss Health Bar & Title
          const barW = 55 * scale;
          ctx.fillStyle = '#020617'; ctx.fillRect(ix - barW/2, iy - 44*scale, barW, 6);
          ctx.fillStyle = bKind === 'shadow_lord' ? '#a855f7' : bKind === 'crystal_colossus' ? '#0284c7' : '#ef4444';
          ctx.fillRect(ix - barW/2, iy - 44*scale, barW * (enemy.hp / enemy.maxHp), 6);
          ctx.strokeStyle = '#facc15'; ctx.lineWidth = 1; ctx.strokeRect(ix - barW/2, iy - 44*scale, barW, 6);

          // Boss title
          ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
          ctx.fillStyle = '#fde047';
          ctx.fillText(`👑 ${enemy.name || 'БОСС'}`, ix, iy - 48*scale);
          return;
        }

        // REGULAR MOBS: Rendered via Entity Render Factory (assetRegistry)
        const kind = enemy.kind || 'corridor_goblin';
        renderEntityCanvas(ctx, kind, {
          x: ix,
          y: iy,
          scale: 1.0,
          time: Date.now(),
          inLight: enemy.inLight,
          state: enemy,
          showShadow: true
        });

        const hpBarW = 26;
        ctx.fillStyle = '#000'; ctx.fillRect(ix - hpBarW/2, iy - 32, hpBarW, 3);
        ctx.fillStyle = kind === 'shadow_stalker' ? '#c084fc' : kind === 'crystal_crawler' ? '#38bdf8' : '#ef4444';
        ctx.fillRect(ix - hpBarW/2, iy - 32, hpBarW * (enemy.hp / enemy.maxHp), 3);
      };

      const drawNode = (px: number, py: number, node: MiningNode) => {
         const { x: ix, y: iy } = project(px, py);

         // CHEST RENDERING
         if (node.kind === 'chest') {
             // Wooden chest base
             ctx.fillStyle = '#451a03'; ctx.fillRect(ix - 16, iy - 22, 32, 18);
             ctx.fillStyle = '#78350f'; ctx.fillRect(ix - 14, iy - 20, 28, 14);
             // Gold bands & lock
             ctx.fillStyle = '#facc15';
             ctx.fillRect(ix - 16, iy - 16, 32, 3);
             ctx.fillRect(ix - 4, iy - 14, 8, 8);
             ctx.strokeStyle = '#020617'; ctx.lineWidth = 1; ctx.strokeRect(ix - 16, iy - 22, 32, 18);

             // Health / Unlock bar
             ctx.fillStyle = '#020617'; ctx.fillRect(ix - 16, iy - 32, 32, 4);
             ctx.fillStyle = '#facc15'; ctx.fillRect(ix - 16, iy - 32, 32 * (node.hp / node.maxHp), 4);
             ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fde047';
             ctx.fillText('🔑 ТАЙНИК', ix, iy - 36);
             return;
         }

         // VOLATILE EXPLOSIVE CRYSTAL RENDERING
         if (node.kind === 'volatile') {
             const pulse = Math.sin(Date.now() / 150) * 3;
             ctx.fillStyle = node.exploding ? '#fef08a' : '#ea580c'; 
             ctx.beginPath(); ctx.moveTo(ix - 16, iy); ctx.lineTo(ix, iy - 34 + pulse); ctx.lineTo(ix + 16, iy); ctx.fill();
             ctx.fillStyle = node.exploding ? '#ef4444' : '#f97316'; 
             ctx.beginPath(); ctx.moveTo(ix - 6, iy); ctx.lineTo(ix - 10, iy - 42 + pulse); ctx.lineTo(ix + 8, iy); ctx.fill();

             // Danger glow aura
             ctx.beginPath(); ctx.arc(ix, iy - 20, 24 + pulse, 0, Math.PI * 2);
             ctx.fillStyle = node.exploding ? 'rgba(239,68,68,0.35)' : 'rgba(249,115,22,0.18)'; ctx.fill();

             // Health / Fuse bar
             ctx.fillStyle = '#020617'; ctx.fillRect(ix - 16, iy - 48, 32, 4);
             ctx.fillStyle = node.exploding ? '#ef4444' : '#ea580c'; 
             ctx.fillRect(ix - 16, iy - 48, 32 * (node.hp / node.maxHp), 4);
             ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; 
             ctx.fillStyle = node.exploding ? '#ef4444' : '#fb923c';
             ctx.fillText(node.exploding ? '⚠️ ДЕТОНАЦИЯ!' : '💥 ВЗРЫВ-ЖИЛА', ix, iy - 52);
             return;
         }

         // STANDARD ORE NODE
         ctx.fillStyle = '#0284c7'; ctx.beginPath(); ctx.moveTo(ix-15, iy); ctx.lineTo(ix, iy-30); ctx.lineTo(ix+15, iy); ctx.fill();
         ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.moveTo(ix-5, iy); ctx.lineTo(ix-10, iy-40); ctx.lineTo(ix+5, iy); ctx.fill();
         
         ctx.fillStyle = '#000'; ctx.fillRect(ix - 15, iy - 45, 30, 4);
         ctx.fillStyle = '#eab308'; ctx.fillRect(ix - 15, iy - 45, 30 * (node.hp / node.maxHp), 4);
      };

      const drawLoot = (px: number, py: number, loot: Loot) => {
        const { x: ix, y: iy } = project(px, py);
        const s = 6; const h = 8;
        const cTop = loot.type === 'ore' ? '#fde047' : loot.type === 'metal' ? '#e2e8f0' : '#7dd3fc';
        const cLeft = loot.type === 'ore' ? '#eab308' : loot.type === 'metal' ? '#94a3b8' : '#0ea5e9';
        const cRight = loot.type === 'ore' ? '#a16207' : loot.type === 'metal' ? '#475569' : '#0284c7';
        ctx.fillStyle = cLeft; ctx.beginPath(); ctx.moveTo(ix - 2*s, iy); ctx.lineTo(ix, iy + s); ctx.lineTo(ix, iy + s - h); ctx.lineTo(ix - 2*s, iy - h); ctx.fill();
        ctx.fillStyle = cRight; ctx.beginPath(); ctx.moveTo(ix, iy + s); ctx.lineTo(ix + 2*s, iy); ctx.lineTo(ix + 2*s, iy - h); ctx.lineTo(ix, iy + s - h); ctx.fill();
        ctx.fillStyle = cTop; ctx.beginPath(); ctx.moveTo(ix, iy - s - h); ctx.lineTo(ix + 2*s, iy - h); ctx.lineTo(ix, iy + s - h); ctx.lineTo(ix - 2*s, iy - h); ctx.fill();
      };

      renderList.forEach(item => {
        switch(item.type) {
          case 'floor': 
             drawFloor(item.x, item.y, item.data?.r ?? Math.floor(item.y / TILE_SIZE), item.data?.c ?? Math.floor(item.x / TILE_SIZE), item.isRail); 
             break;
          case 'wall': 
             const pIso = project(g.player.x, g.player.y);
             const wIso = project(item.x, item.y);
             const screenDist = Math.hypot(pIso.x - wIso.x, pIso.y - wIso.y);
             let alpha = 1;
             if (item.z > g.player.x + g.player.y && screenDist < 120) alpha = 0.25;
             
             const r = item.data?.r ?? Math.floor(item.y / TILE_SIZE);
             const c = item.data?.c ?? Math.floor(item.x / TILE_SIZE);
             drawRockWall(item.x, item.y, r, c, TILE_SIZE * 0.9, alpha); 
             break;
          case 'cart': {
             const {x: cx, y: cy} = project(item.x, item.y);
             const nowT = Date.now();
             const isFastCatchup = g.cart.isCatchingUp || ((g.cart.speed || 0) > 110);
             
             // Dynamic Cart Acceleration FX (Steam bursts & steel friction sparks)
             if (isFastCatchup) {
                 // Boiler exhaust steam puffs
                 for (let i = 0; i < 3; i++) {
                     const puffPhase = ((nowT * 0.0035 + i * 0.33) % 1);
                     const puffX = cx - 18 - puffPhase * 28;
                     const puffY = cy - 20 - puffPhase * 16;
                     const puffR = 4 + puffPhase * 9;
                     ctx.fillStyle = `rgba(241, 245, 249, ${0.4 * (1 - puffPhase)})`;
                     ctx.beginPath();
                     ctx.arc(puffX, puffY, puffR, 0, Math.PI * 2);
                     ctx.fill();
                 }
                 // Steel wheel friction sparks
                 for (let i = 0; i < 4; i++) {
                     const spPhase = (nowT * 0.018 + i * 1.5) % 1;
                     const spX = (i % 2 === 0 ? cx - 16 : cx + 16) + (Math.sin(nowT * 0.05 + i) * 6);
                     const spY = cy + 2 + (spPhase * 5);
                     ctx.fillStyle = i % 2 === 0 ? '#facc15' : '#f97316';
                     ctx.fillRect(spX, spY, 2.5, 2.5);
                 }
             }

             // Wood chassis base
             ctx.fillStyle = '#451a03';
             ctx.fillRect(cx - 24, cy - 10, 48, 12);
             ctx.strokeStyle = '#1e120a'; ctx.lineWidth = 1;
             ctx.strokeRect(cx - 24, cy - 10, 48, 12);

             // Steel wheels with iron bolts
             ctx.fillStyle = '#334155';
             ctx.beginPath(); ctx.arc(cx - 16, cy + 2, 6, 0, Math.PI * 2); ctx.fill();
             ctx.beginPath(); ctx.arc(cx + 16, cy + 2, 6, 0, Math.PI * 2); ctx.fill();
             ctx.fillStyle = '#94a3b8';
             ctx.beginPath(); ctx.arc(cx - 16, cy + 2, 2.5, 0, Math.PI * 2); ctx.fill();
             ctx.beginPath(); ctx.arc(cx + 16, cy + 2, 2.5, 0, Math.PI * 2); ctx.fill();

             // Riveted Iron Minecart Hopper Body
             ctx.fillStyle = '#1e293b';
             ctx.beginPath();
             ctx.moveTo(cx - 22, cy - 10);
             ctx.lineTo(cx - 28, cy - 36);
             ctx.lineTo(cx + 28, cy - 36);
             ctx.lineTo(cx + 22, cy - 10);
             ctx.closePath();
             ctx.fill();
             ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.stroke();

             // Iron band ribs & rivets
             ctx.fillStyle = '#334155';
             ctx.fillRect(cx - 3, cy - 36, 6, 26);
             ctx.fillStyle = '#94a3b8';
             ctx.fillRect(cx - 25, cy - 34, 2, 2);
             ctx.fillRect(cx + 23, cy - 34, 2, 2);
             ctx.fillRect(cx - 2, cy - 24, 4, 3);

             // Heaping raw ore inside cart
             ctx.fillStyle = '#facc15';
             ctx.beginPath(); ctx.arc(cx - 8, cy - 38, 7, 0, Math.PI * 2); ctx.fill();
             ctx.fillStyle = '#38bdf8';
             ctx.beginPath(); ctx.arc(cx + 8, cy - 38, 6, 0, Math.PI * 2); ctx.fill();
             ctx.fillStyle = '#fbbf24';
             ctx.beginPath(); ctx.arc(cx, cy - 41, 6, 0, Math.PI * 2); ctx.fill();

             // Cart Brass Lantern (pulsing warmly during speed rush)
             ctx.fillStyle = '#b45309';
             ctx.fillRect(cx - 4, cy - 50, 8, 10);
             ctx.fillStyle = isFastCatchup ? '#fef08a' : '#fef08a';
             ctx.beginPath(); ctx.arc(cx, cy - 45, isFastCatchup ? 5.5 : 4, 0, Math.PI*2); ctx.fill();
             if (isFastCatchup) {
                 ctx.fillStyle = 'rgba(254, 240, 138, 0.28)';
                 ctx.beginPath(); ctx.arc(cx, cy - 45, 14, 0, Math.PI*2); ctx.fill();
             }

             // MODULE 1: Heavy Searchlight
             if (g.cartModules?.searchlight) {
                 ctx.fillStyle = '#fef08a';
                 ctx.beginPath(); ctx.arc(cx, cy - 56, 12, 0, Math.PI*2); ctx.fill();
                 ctx.strokeStyle = '#eab308'; ctx.lineWidth = 2; ctx.stroke();
                 // Glowing cone
                 ctx.fillStyle = 'rgba(254, 240, 138, 0.25)';
                 ctx.beginPath(); ctx.moveTo(cx, cy - 56); ctx.lineTo(cx - 40, cy - 120); ctx.lineTo(cx + 40, cy - 120); ctx.closePath(); ctx.fill();
             }

             // MODULE 2: Auto-Turret
             if (g.cartModules?.turret) {
                 const tAngle = g.cart.turretAngle || 0;
                 ctx.fillStyle = '#0284c7'; ctx.beginPath(); ctx.arc(cx, cy - 36, 8, 0, Math.PI * 2); ctx.fill();
                 ctx.beginPath(); ctx.moveTo(cx, cy - 36); ctx.lineTo(cx + Math.cos(tAngle)*24, cy - 36 + Math.sin(tAngle)*14); 
                 ctx.lineWidth = 4; ctx.strokeStyle = '#0284c7'; ctx.stroke();
                 ctx.fillStyle = '#67e8f9'; ctx.beginPath(); ctx.arc(cx, cy - 36, 3.5, 0, Math.PI * 2); ctx.fill();
             }

             // MODULE 3: Magnet Coils
             if (g.cartModules?.magnet) {
                 ctx.fillStyle = '#ef4444'; ctx.fillRect(cx - 15, cy - 25, 5, 12);
                 ctx.fillStyle = '#3b82f6'; ctx.fillRect(cx + 10, cy - 25, 5, 12);
                 ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1.5;
                 ctx.beginPath(); ctx.arc(cx, cy - 20, 18, Math.PI * 0.8, Math.PI * 2.2); ctx.stroke();
             }
             break;
          }
          case 'torch': {
             const {x: tx, y: ty} = project(item.x, item.y);
             const torchNow = Date.now();
             const flameFlicker = Math.sin(torchNow * 0.012 + item.x) * 2;
             
             // Wooden handle stuck into earth
             ctx.fillStyle = '#451a03'; ctx.fillRect(tx - 2, ty - 16, 4, 16);
             ctx.strokeStyle = '#1e120a'; ctx.lineWidth = 1; ctx.strokeRect(tx - 2, ty - 16, 4, 16);
             
             // Iron torch cage head
             ctx.fillStyle = '#334155'; ctx.fillRect(tx - 4, ty - 20, 8, 5);

             // Outer warm flame
             ctx.fillStyle = '#ea580c'; 
             ctx.beginPath(); 
             ctx.moveTo(tx - 5, ty - 19); 
             ctx.lineTo(tx + flameFlicker, ty - 32 + flameFlicker); 
             ctx.lineTo(tx + 5, ty - 19); 
             ctx.closePath(); 
             ctx.fill();

             // Inner bright yellow flame core
             ctx.fillStyle = '#fef08a'; 
             ctx.beginPath(); 
             ctx.moveTo(tx - 2.5, ty - 19); 
             ctx.lineTo(tx + flameFlicker * 0.5, ty - 27); 
             ctx.lineTo(tx + 2.5, ty - 19); 
             ctx.closePath(); 
             ctx.fill();

             // Rising hot embers
             const ember1 = (torchNow * 0.04) % 18;
             const ember2 = (torchNow * 0.035 + 8) % 22;
             ctx.fillStyle = '#fbbf24';
             ctx.fillRect(tx - 1 + Math.sin(torchNow * 0.01) * 3, ty - 24 - ember1, 2, 2);
             ctx.fillRect(tx + 2 - Math.cos(torchNow * 0.01) * 2, ty - 22 - ember2, 1.5, 1.5);
             break;
          }
          case 'node': drawNode(item.x, item.y, item.data); break;
          case 'player': drawPlayer(item.x, item.y, item.data); break;
          case 'enemy': drawEnemy(item.x, item.y, item.data); break;
          case 'loot': drawLoot(item.x, item.y, item.data); break;
          case 'slash': 
             const { x: sx, y: sy } = project(item.x, item.y);
             ctx.save(); ctx.translate(sx, sy); ctx.transform(1, 0.5, -1, 0.5, 0, 0); 
             ctx.beginPath(); 
             const sRad = item.data.radius || 60;
             ctx.arc(0, 0, sRad, item.data.angle - Math.PI/3, item.data.angle + Math.PI/3);
             ctx.strokeStyle = item.data.color || `rgba(255, 255, 255, ${item.data.life / 0.2})`; 
             ctx.lineWidth = 14 * (item.data.life / 0.2); 
             ctx.stroke();
             ctx.restore();
             break;
          case 'text': 
             const { x: ix, y: iy } = project(item.x, item.y);
             ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
             ctx.fillStyle = item.data.color; ctx.globalAlpha = Math.min(1, item.data.life * 2);
             ctx.fillText(item.data.text, ix, iy - 40 - item.data.floatY); ctx.globalAlpha = 1;
             break;
        }
      });
      
      // WARM TORCH & LANTERN ILLUMINATION PASS (Glowing warm amber on brown earth)
      const drawTorchGlow = (wx: number, wy: number, baseRadius: number, intensity: number = 1) => {
        const { x, y } = project(wx, wy);
        const now = Date.now();
        const flicker = Math.sin(now * 0.009 + wx * 0.1) * 7 + Math.cos(now * 0.021 + wy * 0.1) * 5;
        const rad = Math.max(20, baseRadius + flicker);

        ctx.save();
        ctx.beginPath();
        // Isometric ground ellipse projection
        ctx.ellipse(x, y, rad * 1.3, rad * 0.65, 0, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(x, y, 0, x, y, rad * 1.3);
        grad.addColorStop(0, `rgba(251, 191, 36, ${0.26 * intensity})`); // Warm golden amber center
        grad.addColorStop(0.35, `rgba(245, 158, 11, ${0.14 * intensity})`); // Warm orange
        grad.addColorStop(0.7, `rgba(180, 83, 9, ${0.05 * intensity})`); // Dark amber fringe
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      };

      // Draw warm firelight glow pools on ground
      const cartGlowRad = g.cartModules?.searchlight ? 360 : 250;
      drawTorchGlow(g.cart.x, g.cart.y, cartGlowRad, 1.2);
      g.torches.forEach(t => drawTorchGlow(t.x, t.y, 220, 1.3));
      drawTorchGlow(g.player.x, g.player.y, 110, 0.9);

      ctx.restore();

      // DARKNESS CUTOUT CANVAS WITH ORGANIC FLAME FEATHERING
      if (!g.lightCanvas) g.lightCanvas = document.createElement('canvas');
      g.lightCanvas.width = g.width; g.lightCanvas.height = g.height;
      const lCtx = g.lightCanvas.getContext('2d')!;
      lCtx.fillStyle = 'rgba(2, 6, 23, 0.96)';
      lCtx.fillRect(0, 0, g.width, g.height);
      
      lCtx.globalCompositeOperation = 'destination-out';
      
      const drawLightHole = (wx: number, wy: number, baseRadius: number) => {
         const {x, y} = project(wx, wy);
         const sx = x + offsetX + shakeX;
         const sy = y + offsetY + shakeY;
         const now = Date.now();
         const flicker = Math.sin(now * 0.008 + wx * 0.05) * 8 + Math.cos(now * 0.017 + wy * 0.05) * 5;
         const radius = Math.max(25, baseRadius + flicker);

         const grad = lCtx.createRadialGradient(sx, sy, 0, sx, sy, radius);
         grad.addColorStop(0, 'rgba(255,255,255,1)');
         grad.addColorStop(0.55, 'rgba(255,255,255,0.95)');
         grad.addColorStop(0.85, 'rgba(255,255,255,0.45)');
         grad.addColorStop(1, 'rgba(255,255,255,0)');
         lCtx.fillStyle = grad;
         lCtx.beginPath(); lCtx.arc(sx, sy, radius, 0, Math.PI*2); lCtx.fill();
      };
      
      const cartLightRadius = g.cartModules?.searchlight 
          ? ((g.cart.pathIndex >= g.rails.length - 1) ? 950 : 580) 
          : ((g.cart.pathIndex >= g.rails.length - 1) ? 800 : 400);
      drawLightHole(g.cart.x, g.cart.y, cartLightRadius);
      g.torches.forEach(t => drawLightHole(t.x, t.y, 300));
      drawLightHole(g.player.x, g.player.y, 115);
      
      lCtx.globalCompositeOperation = 'source-over';
      ctx.drawImage(g.lightCanvas, 0, 0);

      // Victory Flourish Overlay
      if (g.winTimer > 0) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
        ctx.fillRect(0, g.height / 2 - 65, g.width, 130);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, g.height / 2 - 65, g.width, 130);

        ctx.font = 'bold 24px sans-serif';
        ctx.fillStyle = '#facc15';
        ctx.textAlign = 'center';
        ctx.fillText('🏆 ПОБЕДА! ЭТАЖ ЗАЧИЩЕН', g.width / 2, g.height / 2 - 12);

        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText('Вагонетка доставила ценную руду на поверхность...', g.width / 2, g.height / 2 + 20);
      }

      const joy = g.joystick;
      if (joy.active) {
        ctx.beginPath(); ctx.arc(joy.originX, joy.originY, 40, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'; ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'; ctx.lineWidth = 2; ctx.stroke();

        let dx = joy.currX - joy.originX;
        let dy = joy.currY - joy.originY;
        const dist = Math.hypot(dx, dy);
        if (dist > 40) { dx = (dx / dist) * 40; dy = (dy / dist) * 40; }

        ctx.beginPath(); ctx.arc(joy.originX + dx, joy.originY + dy, 16, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'; ctx.fill();
      }
    };

