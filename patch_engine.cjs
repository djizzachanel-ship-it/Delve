const fs = require('fs');

const code = fs.readFileSync('src/components/MineTab.tsx', 'utf-8');

const updateStart = `    const update = (dt: number) => {`;
const updateEnd = `    const draw = (ctx: CanvasRenderingContext2D) => {`;

const idx1 = code.indexOf(updateStart);
const idx2 = code.indexOf(updateEnd);

if (idx1 !== -1 && idx2 !== -1) {
  let updateCode = code.substring(idx1, idx2);
  fs.writeFileSync('extracted_update.txt', updateCode);
  console.log("Extracted update function");
} else {
  console.log("Could not find update bounds");
}

const drawStart = `    const draw = (ctx: CanvasRenderingContext2D) => {`;
const drawEnd = `        animId = requestAnimationFrame(loop);`; // end of draw block roughly
const idx3 = code.indexOf(drawStart);
const idx4 = code.indexOf(drawEnd, idx3);

if (idx3 !== -1 && idx4 !== -1) {
  let drawCode = code.substring(idx3, idx4);
  fs.writeFileSync('extracted_draw.txt', drawCode);
  console.log("Extracted draw function");
}
