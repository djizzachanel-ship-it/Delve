const fs = require('fs');

const code = fs.readFileSync('src/components/MineTab.tsx', 'utf-8');

// We'll just read the whole MineTab.tsx so we can see its structure properly.
// I will output the file with line numbers to a text file and read it in parts.
const lines = code.split('\n');
let out = '';
for(let i=0; i<lines.length; i++) {
   out += `${i+1}: ${lines[i]}\n`;
}
fs.writeFileSync('minetab_lines.txt', out);
