const fs = require('fs');
let code = fs.readFileSync('src/components/MineTab.tsx', 'utf-8');

const searchImports = `import { Heart, ChevronDown, Flame } from 'lucide-react';`;
const replaceImports = `import { Heart, ChevronDown, Flame, ChevronLeft, ChevronRight, Pickaxe } from 'lucide-react';`;
code = code.replace(searchImports, replaceImports);

const searchState = `  const stats = calculatePlayerStats(state.player, state.equipment);
  const [inWave, setInWave] = useState(false);
  const [uiState, setUiState] = useState({ hp: stats.maxHealth, ore: 0, metal: 0, shards: 0 });`;
const replaceState = `  const stats = calculatePlayerStats(state.player, state.equipment);
  const [inWave, setInWave] = useState(false);
  const [uiState, setUiState] = useState({ hp: stats.maxHealth, ore: 0, metal: 0, shards: 0 });
  const [selectedDepth, setSelectedDepth] = useState(state.unlockedDepth || 0);
  const [focus, setFocus] = useState<'ore'|'metal'|'shards'>('ore');`;
code = code.replace(searchState, replaceState);

const searchStart = `const startWave = () => {
    const { grid, rails, nodes, enemiesToSpawn, spawnPos } = generateMineTrack(state.depth);`;
const replaceStart = `const startWave = () => {
    dispatch({ type: 'SET_DEPTH', payload: selectedDepth });
    const { grid, rails, nodes, enemiesToSpawn, spawnPos } = generateMineTrack(selectedDepth, focus);`;
code = code.replace(searchStart, replaceStart);

const searchGen = `function generateMineTrack(depth: number) {`;
const replaceGen = `function generateMineTrack(depth: number, focus: 'ore'|'metal'|'shards' = 'ore') {`;
code = code.replace(searchGen, replaceGen);

const searchLoot = `                    type: Math.random() > 0.8 ? 'metal' : 'ore',`;
const replaceLoot = `                    type: Math.random() < (focus==='shards' ? 0.3 : 0.05) ? 'shards' : Math.random() < (focus==='metal' ? 0.6 : 0.2) ? 'metal' : 'ore',`;
code = code.replace(searchLoot, replaceLoot);

const searchBossLoot = `              let type: 'ore'|'metal'|'shards' = 'ore';
              const r = Math.random();
              if (r > 0.9) type = 'shards';
              else if (r > 0.6) type = 'metal';`;
const replaceBossLoot = `              let type: 'ore'|'metal'|'shards' = 'ore';
              const r = Math.random();
              if (focus === 'shards') {
                 if (r > 0.6) type = 'shards';
                 else if (r > 0.4) type = 'metal';
              } else if (focus === 'metal') {
                 if (r > 0.9) type = 'shards';
                 else if (r > 0.4) type = 'metal';
              } else {
                 if (r > 0.9) type = 'shards';
                 else if (r > 0.6) type = 'metal';
              }`;
code = code.replace(searchBossLoot, replaceBossLoot);

const searchWin = `    if (!died) {
       dispatch({ type: 'SET_DEPTH', payload: state.depth + 1 });
    }`;
const replaceWin = `    if (!died) {
       dispatch({ type: 'UNLOCK_DEPTH', payload: state.depth + 1 });
    }`;
code = code.replace(searchWin, replaceWin);

const searchMenu = `        {!inWave && (
          <motion.div 
             initial={{ opacity: 0, scale: 0.9 }} 
             animate={{ opacity: 1, scale: 1 }} 
             className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none"
          >
            <div className="w-32 h-32 mb-8 rounded-full bg-[#1f2937] border-4 border-[#374151] shadow-[0_0_40px_rgba(0,0,0,0.5)] flex items-center justify-center">
              <ChevronDown size={64} className="text-[#4b5563]" />
            </div>
            <button 
              onClick={startWave}
              className="px-8 py-4 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold rounded-xl shadow-[0_0_30px_rgba(59,130,246,0.3)] transition-all active:scale-95 pointer-events-auto"
            >
              Спуститься глубже (Ур. {state.depth})
            </button>
            <p className="mt-6 text-[#9ca3af] max-w-xs text-center text-sm leading-relaxed">
              Сопровождайте тележку. Остерегайтесь тьмы в карманах с рудой.
            </p>
          </motion.div>
        )}`;
const replaceMenu = `        {!inWave && (
          <motion.div 
             initial={{ opacity: 0, scale: 0.9 }} 
             animate={{ opacity: 1, scale: 1 }} 
             className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-auto bg-[#020617]/80 backdrop-blur-md"
          >
            <h2 className="text-2xl font-bold text-[#facc15] mb-8 uppercase tracking-widest flex items-center gap-2"><Pickaxe /> Карта Шахты</h2>
            
            <div className="bg-[#111827] border border-[#1f2937] p-6 rounded-2xl mb-8 flex flex-col items-center min-w-[300px]">
                <h3 className="text-sm font-bold text-[#9ca3af] uppercase mb-4">Выбор этажа</h3>
                <div className="flex items-center gap-6 mb-6">
                    <button 
                        onClick={() => setSelectedDepth(Math.max(0, selectedDepth - 1))}
                        disabled={selectedDepth === 0}
                        className="p-2 bg-[#374151] rounded-full disabled:opacity-30 hover:bg-[#4b5563]"
                    ><ChevronLeft /></button>
                    <div className="text-4xl font-black font-mono text-white w-20 text-center">{selectedDepth}</div>
                    <button 
                        onClick={() => setSelectedDepth(Math.min(state.unlockedDepth, selectedDepth + 1))}
                        disabled={selectedDepth >= state.unlockedDepth}
                        className="p-2 bg-[#374151] rounded-full disabled:opacity-30 hover:bg-[#4b5563]"
                    ><ChevronRight /></button>
                </div>
                
                <h3 className="text-sm font-bold text-[#9ca3af] uppercase mb-4">Цель экспедиции</h3>
                <div className="flex gap-2 w-full">
                    <button onClick={() => setFocus('ore')} className={\`flex-1 py-2 text-xs font-bold rounded border \${focus==='ore' ? 'bg-[#ca8a04] border-[#facc15] text-white' : 'bg-[#1f2937] border-[#374151] text-[#9ca3af]'}\`}>
                        ОБЫЧНАЯ
                    </button>
                    <button onClick={() => setFocus('metal')} className={\`flex-1 py-2 text-xs font-bold rounded border \${focus==='metal' ? 'bg-[#475569] border-[#94a3b8] text-white' : 'bg-[#1f2937] border-[#374151] text-[#9ca3af]'}\`}>
                        МЕТАЛЛ
                    </button>
                    <button onClick={() => setFocus('shards')} className={\`flex-1 py-2 text-xs font-bold rounded border \${focus==='shards' ? 'bg-[#0284c7] border-[#38bdf8] text-white' : 'bg-[#1f2937] border-[#374151] text-[#9ca3af]'}\`}>
                        ОСКОЛКИ
                    </button>
                </div>
            </div>

            <button 
              onClick={startWave}
              className="px-10 py-5 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-black rounded-xl shadow-[0_0_30px_rgba(59,130,246,0.3)] transition-all active:scale-95 text-xl tracking-widest"
            >
              ОТПРАВИТЬСЯ
            </button>
            <p className="mt-6 text-[#9ca3af] max-w-xs text-center text-sm leading-relaxed font-bold">
              Спуск на низкие этажи усиливает монстров.
            </p>
          </motion.div>
        )}`;
code = code.replace(searchMenu, replaceMenu);
fs.writeFileSync('src/components/MineTab.tsx', code);
