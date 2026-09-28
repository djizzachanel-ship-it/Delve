const fs = require('fs');
const code = fs.readFileSync('src/components/MineTab.tsx', 'utf-8');

const drawStart = `    const draw = (ctx: CanvasRenderingContext2D) => {`;
const idx3 = code.indexOf(drawStart);
if (idx3 !== -1) {
  let sub = code.substring(idx3);
  let loopStart = sub.indexOf(`      animId = requestAnimationFrame(loop);`);
  if (loopStart !== -1) {
     let drawCode = sub.substring(0, loopStart);
     fs.writeFileSync('extracted_draw.txt', drawCode);
     console.log("Extracted draw function");
  } else {
     console.log("Could not find loop start");
  }
}
