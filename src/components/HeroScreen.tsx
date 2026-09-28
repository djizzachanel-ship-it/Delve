import React, { useState, useMemo } from 'react';
import { GameAction } from '../store';
import { GameState, Item, ItemSlot } from '../types';
import { calculatePlayerStats } from '../game/player';
import { ITEM_SETS, ItemSetInfo } from '../game/affixes';
import { ItemTooltipModal, SLOT_INFO, RARITY_CONFIG } from './ItemTooltipModal';
import { useTheme, ThemedButton, getThemedButtonClass } from '../theme';
import { 
  Shield, 
  Sword, 
  Heart, 
  Zap, 
  Sparkles, 
  Trash2, 
  Crown, 
  Wand2, 
  Plus, 
  Package
} from 'lucide-react';
import { sound } from '../game/audio';

export interface HeroScreenProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  onGoToTown?: () => void;
}

export function HeroScreen({ state, dispatch, onGoToTown }: HeroScreenProps) {
  const { theme } = useTheme();
  const [selectedSlot, setSelectedSlot] = useState<ItemSlot | null>(null);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<Item | null>(null);
  const [inventoryCategory, setInventoryCategory] = useState<'all' | 'weapons' | 'armor' | 'jewelry'>('all');
  const [initialReplaceMode, setInitialReplaceMode] = useState(false);

  // Overall player stats calculation (factoring base stats, equipment, active set bonuses, and town buffs)
  const stats = calculatePlayerStats(state.player, state.equipment, state.activeTownBuff);

  // Equipment contribution breakdown for display
  const equipHealth = Object.values(state.equipment).reduce((acc, it) => acc + (it?.stats?.health || 0), 0);
  const equipDamage = Object.values(state.equipment).reduce((acc, it) => acc + (it?.stats?.damage || 0), 0);
  const equipArmor = Object.values(state.equipment).reduce((acc, it) => acc + (it?.stats?.armor || 0), 0);

  // Detect and tally equipped set bonuses
  const setSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(state.equipment).forEach(item => {
      if (item && item.setId) {
        counts[item.setId] = (counts[item.setId] || 0) + 1;
      }
    });

    const equippedSets: { 
      setInfo: ItemSetInfo; 
      count: number; 
      activeBonuses: string[]; 
      nextBonus?: string 
    }[] = [];

    Object.entries(counts).forEach(([setId, count]) => {
      const setInfo = ITEM_SETS[setId];
      if (setInfo) {
        const activeBonuses = setInfo.bonuses
          .filter(b => count >= b.count)
          .map(b => b.description);
        
        const nextThreshold = setInfo.bonuses.find(b => count < b.count);
        const nextBonus = nextThreshold ? `(${nextThreshold.count}/4): ${nextThreshold.description}` : undefined;

        equippedSets.push({ setInfo, count, activeBonuses, nextBonus });
      }
    });

    return equippedSets;
  }, [state.equipment]);

  // Inventory filtering by category
  const filteredInventory = useMemo(() => {
    return state.inventory.filter(item => {
      if (inventoryCategory === 'all') return true;
      if (inventoryCategory === 'weapons') return item.slot === 'weapon' || item.slot === 'offhand';
      if (inventoryCategory === 'armor') return item.slot === 'head' || item.slot === 'chest' || item.slot === 'legs' || item.slot === 'boots';
      if (inventoryCategory === 'jewelry') return item.slot === 'amulet' || item.slot === 'ring';
      return true;
    });
  }, [state.inventory, inventoryCategory]);

  // Minimum grid size: 16 (4x4) or 20 (5x4) slots for clean inventory aesthetic
  const paddedGridSlots = useMemo(() => {
    const minSlots = 16;
    const remainder = filteredInventory.length % 4;
    const needed = Math.max(
      minSlots - filteredInventory.length,
      remainder === 0 ? 0 : 4 - remainder
    );
    return Array.from({ length: Math.max(0, needed) });
  }, [filteredInventory.length]);

  // Inventory matches for a specific slot
  const getInventoryForSlot = (slot: ItemSlot) => {
    return state.inventory.filter(i => i.slot === slot);
  };

  // Auto-equip best available gear in inventory
  const handleAutoEquip = () => {
    sound.playEquip();
    const allSlots: ItemSlot[] = ['head', 'chest', 'legs', 'boots', 'weapon', 'offhand', 'amulet', 'ring'];
    allSlots.forEach(slot => {
      const candidates = state.inventory.filter(i => i.slot === slot);
      if (candidates.length > 0) {
        candidates.sort((a, b) => {
          const scoreA = (a.stats.damage * 2) + a.stats.armor + (a.stats.health * 0.5);
          const scoreB = (b.stats.damage * 2) + b.stats.armor + (b.stats.health * 0.5);
          return scoreB - scoreA;
        });
        const best = candidates[0];
        const current = state.equipment[slot];
        const currentScore = current ? (current.stats.damage * 2) + current.stats.armor + (current.stats.health * 0.5) : -1;
        const bestScore = (best.stats.damage * 2) + best.stats.armor + (best.stats.health * 0.5);
        if (bestScore > currentScore) {
          dispatch({ type: 'EQUIP', item: best });
        }
      }
    });
  };

  // Salvage all common items in inventory for quick scrap
  const handleSalvageCommons = () => {
    const commons = state.inventory.filter(i => i.rarity === 'common');
    if (commons.length === 0) {
      alert('В рюкзаке нет обычных предметов для разбора');
      return;
    }
    sound.playLoot();
    commons.forEach(item => {
      dispatch({ type: 'SALVAGE', item });
    });
  };

  // Render an individual Paperdoll slot
  const renderSlot = (slot: ItemSlot) => {
    const item = state.equipment[slot];
    const slotInfo = SLOT_INFO[slot] || { name: slot, icon: Shield };
    const SlotIcon = slotInfo.icon;
    const rConfig = item ? RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common : null;
    const isSelected = selectedSlot === slot;

    return (
      <div className="flex flex-col items-center gap-0.5">
        <button
          onClick={() => {
            sound.playClick();
            setSelectedSlot(slot);
            setInitialReplaceMode(false);
          }}
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex flex-col items-center justify-center relative transition-all duration-200 cursor-pointer ${
            item
              ? `bg-gradient-to-b ${rConfig?.bgGrad} border-2 ${rConfig?.border} ${rConfig?.glow} hover:scale-105 active:scale-95`
              : `bg-slate-900/80 border-2 border-dashed border-slate-700/70 hover:border-slate-500 hover:bg-slate-800/80 text-slate-500 hover:text-slate-300`
          } ${isSelected ? 'ring-2 ring-amber-400 scale-105' : ''}`}
          title={`${slotInfo.name}: ${item ? item.name : 'Пустой слот (нажмите для выбора)'}`}
        >
          {item ? (
            <>
              {/* Item Icon */}
              <div className={rConfig?.text}>
                <SlotIcon size={22} />
              </div>

              {/* Set Item indicator dot */}
              {item.setId && (
                <span 
                  className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)] border border-slate-950" 
                  title={`Сет: ${item.setName || item.setId}`}
                />
              )}

              {/* Tier / Level badge */}
              <span className="absolute bottom-1 right-1 font-mono text-[8.5px] font-black text-slate-300 bg-slate-950/80 px-1 rounded">
                Т{item.tier}
              </span>
            </>
          ) : (
            <>
              {/* Ghost icon hint for empty slot */}
              <SlotIcon size={20} className="opacity-35" />
              <Plus size={10} className="absolute bottom-1.5 opacity-50 text-slate-400" />
            </>
          )}
        </button>

        {/* Short Slot Name Label */}
        <span className="text-[9.5px] font-bold text-slate-400 truncate max-w-[56px] text-center">
          {slotInfo.name.split(' ')[0]}
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#080d19] text-slate-100 overflow-hidden select-none relative">
      
      {/* ================= TOP SECTION (FIXED, NOT SCROLLED WITH BACKPACK) ================= */}
      <div className="flex-shrink-0 flex flex-col">
        
        {/* 1. COMPACT FLOATING TOP STATS BAR */}
        <div className="px-3 py-2 bg-[#090e1c]/95 border-b border-slate-800/80 backdrop-blur-md shadow-md">
          <div className="grid grid-cols-4 gap-1.5 text-center">
            {/* Health */}
            <div className="p-1 px-1.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-inner flex flex-col items-center">
              <span className="text-[9px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                <Heart size={10} /> Здоровье
              </span>
              <span className="font-mono text-sm font-black text-emerald-300">
                {stats.maxHealth}
              </span>
              {equipHealth > 0 && (
                <span className="text-[8px] font-mono text-emerald-400/80">+{equipHealth}</span>
              )}
            </div>

            {/* Damage */}
            <div className="p-1 px-1.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-inner flex flex-col items-center">
              <span className="text-[9px] uppercase font-bold text-rose-400 flex items-center gap-1">
                <Sword size={10} /> Урон
              </span>
              <span className="font-mono text-sm font-black text-rose-300">
                {stats.damage}
              </span>
              {equipDamage > 0 && (
                <span className="text-[8px] font-mono text-rose-400/80">+{equipDamage}</span>
              )}
            </div>

            {/* Armor */}
            <div className="p-1 px-1.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-inner flex flex-col items-center">
              <span className="text-[9px] uppercase font-bold text-sky-400 flex items-center gap-1">
                <Shield size={10} /> Броня
              </span>
              <span className="font-mono text-sm font-black text-sky-300">
                {stats.armor}
              </span>
              {equipArmor > 0 && (
                <span className="text-[8px] font-mono text-sky-400/80">+{equipArmor}</span>
              )}
            </div>

            {/* Attack / DPS rating */}
            <div className="p-1 px-1.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-inner flex flex-col items-center">
              <span className="text-[9px] uppercase font-bold text-amber-400 flex items-center gap-1">
                <Zap size={10} /> Атака
              </span>
              <span className="font-mono text-sm font-black text-amber-300">
                {Math.round(stats.damage * 1.25)}
              </span>
              <span className="text-[8px] font-mono text-amber-400/80">DPS</span>
            </div>
          </div>
        </div>

        {/* 2. ACTIVE SET BONUSES (COMPACT STRIP) */}
        {setSummary.length > 0 && (
          <div className="mx-3 mt-1.5 space-y-1">
            {setSummary.map(setObj => {
              const hasActive = setObj.activeBonuses.length > 0;
              return (
                <div 
                  key={setObj.setInfo.id}
                  className={`py-1 px-2.5 rounded-xl border transition-all text-xs flex items-center justify-between gap-2 ${
                    hasActive 
                      ? 'bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-950 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Crown size={12} className={hasActive ? 'text-amber-400' : 'text-slate-400'} />
                    <span className="font-bold text-amber-300 text-[11px] truncate">
                      {setObj.setInfo.name} ({setObj.count}/4):
                    </span>
                    <span className="text-[10px] text-slate-300 truncate">
                      {hasActive ? setObj.activeBonuses.join(' • ') : setObj.nextBonus}
                    </span>
                  </div>

                  {hasActive && (
                    <span className="text-[9px] font-black text-amber-400 bg-amber-950/80 px-1.5 py-0.2 rounded-full border border-amber-500/40 flex-shrink-0 flex items-center gap-0.5">
                      <Sparkles size={8} /> Активен
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 3. CENTRAL PAPERDOLL VIEWPORT («КУКЛА ПЕРСОНАЖА») */}
        {/* 
          Сетка вокруг персонажа:
          Левая колонка: Шлем, Нагрудник/Доспех, Поножи, Сапоги.
          Правая колонка: Основное оружие, Щит/Фонарь, Амулет, Кольцо.
          Полностью видимый силуэт героя в центре.
        */}
        <div className="relative mx-3 my-1.5 px-3 py-2 rounded-2xl bg-gradient-to-b from-slate-900 via-[#0a0f1d] to-[#060913] border border-slate-800/90 shadow-xl flex items-center justify-between gap-1">
          
          {/* Ambient Glow Background */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-48 h-48 rounded-full bg-gradient-to-tr from-amber-500/10 via-indigo-500/10 to-transparent blur-2xl" />
          </div>

          {/* LEFT COLUMN: Шлем, Нагрудник, Поножи, Сапоги */}
          <div className="flex flex-col gap-1.5 z-10">
            {renderSlot('head')}
            {renderSlot('chest')}
            {renderSlot('legs')}
            {renderSlot('boots')}
          </div>

          {/* CENTER: Hero Character Silhouette & Paperdoll SVG Model */}
          <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-1">
            <div className="relative w-32 h-44 sm:w-36 sm:h-48 flex items-center justify-center">
              
              {/* Pedestal platform under hero feet */}
              <div className="absolute bottom-1 w-24 h-7 rounded-full bg-gradient-to-r from-amber-500/20 via-indigo-500/20 to-amber-500/20 border border-amber-500/30 blur-[1px] shadow-[0_0_15px_rgba(245,158,11,0.2)]" />
              
              {/* Hero SVG Silhouette with Dynamic Equipped Armor/Weapon Sprites */}
              <svg 
                viewBox="0 0 160 220" 
                className="w-full h-full drop-shadow-[0_10px_18px_rgba(0,0,0,0.8)]"
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Aura glow behind hero */}
                <circle cx="80" cy="110" r="65" fill="url(#heroGlow)" opacity="0.35" />

                {/* Shadow on pedestal */}
                <ellipse cx="80" cy="195" rx="35" ry="12" fill="#000000" opacity="0.6" />

                {/* Cape / Cloak */}
                <path d="M55 70 L40 180 L80 170 L120 180 L105 70 Z" fill="#1e1b4b" opacity="0.85" />

                {/* Legs / Greaves */}
                <path d="M60 130 L55 190 L72 190 L74 130 Z" fill={state.equipment.legs ? '#334155' : '#1e293b'} />
                <path d="M86 130 L88 190 L105 190 L100 130 Z" fill={state.equipment.legs ? '#334155' : '#1e293b'} />
                {state.equipment.legs && (
                  <>
                    <rect x="56" y="145" width="16" height="4" rx="1" fill="#64748b" />
                    <rect x="88" y="145" width="16" height="4" rx="1" fill="#64748b" />
                  </>
                )}

                {/* Boots */}
                <path d="M52 182 L72 182 L70 195 L50 195 Z" fill={state.equipment.boots ? '#d97706' : '#0f172a'} />
                <path d="M88 182 L108 182 L110 195 L90 195 Z" fill={state.equipment.boots ? '#d97706' : '#0f172a'} />

                {/* Torso / Armor */}
                <path d="M55 65 L105 65 L98 135 L62 135 Z" fill={state.equipment.chest ? '#475569' : '#1e293b'} stroke="#64748b" strokeWidth="1.5" />
                {/* Chestplate emblem */}
                <polygon points="80,75 90,85 80,105 70,85" fill={state.equipment.chest ? '#f59e0b' : '#334155'} />

                {/* Left Arm & Shield/Lantern (Offhand) */}
                <path d="M102 68 L122 105 L112 115 L96 78 Z" fill="#334155" />
                {state.equipment.offhand && (
                  <g transform="translate(108, 90)">
                    <polygon points="0,0 22,-8 28,18 16,36 0,22" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
                    <circle cx="14" cy="14" r="5" fill="#fef08a" />
                    <line x1="14" y1="5" x2="14" y2="0" stroke="#fef08a" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="23" y1="14" x2="28" y2="14" stroke="#fef08a" strokeWidth="1.5" strokeLinecap="round" />
                  </g>
                )}

                {/* Right Arm & Weapon */}
                <path d="M58 68 L38 105 L48 115 L64 78 Z" fill="#334155" />
                {state.equipment.weapon && (
                  <g transform="translate(24, 70)">
                    <polygon points="12,0 16,-45 20,0 18,25 14,25" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
                    <line x1="16" y1="-40" x2="16" y2="10" stroke="#38bdf8" strokeWidth="1.5" />
                    <rect x="6" y="5" width="20" height="4" rx="1" fill="#f59e0b" />
                    <rect x="14" y="9" width="4" height="15" rx="1" fill="#78350f" />
                  </g>
                )}

                {/* Amulet sparkle */}
                {state.equipment.amulet && (
                  <circle cx="80" cy="72" r="3" fill="#a855f7" stroke="#e9d5ff" strokeWidth="1" />
                )}

                {/* Ring glint */}
                {state.equipment.ring && (
                  <circle cx="116" cy="112" r="2" fill="#f59e0b" />
                )}

                {/* Head & Helmet */}
                <circle cx="80" cy="45" r="16" fill="#fed7aa" />
                <path d="M68 46 Q80 72 92 46 Z" fill="#b45309" />
                <circle cx="75" cy="43" r="1.5" fill="#38bdf8" />
                <circle cx="85" cy="43" r="1.5" fill="#38bdf8" />

                {state.equipment.head ? (
                  <g>
                    <path d="M62 45 Q80 18 98 45 L95 35 Q80 12 65 35 Z" fill="#475569" stroke="#94a3b8" strokeWidth="1" />
                    <polygon points="80,12 85,2 75,2" fill="#f59e0b" />
                  </g>
                ) : (
                  <path d="M64 40 Q80 30 96 40 L94 34 Q80 26 66 34 Z" fill="#b45309" />
                )}

                <defs>
                  <radialGradient id="heroGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
                  </radialGradient>
                </defs>
              </svg>

              {/* Equipped count badge */}
              <div className="absolute -bottom-1.5 flex items-center">
                <span className="text-[9.5px] font-bold text-slate-300 bg-slate-900/95 px-2 py-0.2 rounded-full border border-slate-700 shadow">
                  {Object.values(state.equipment).filter(Boolean).length}/8 надето
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Основное оружие, Щит/Фонарь, Амулет, Кольцо */}
          <div className="flex flex-col gap-1.5 z-10">
            {renderSlot('weapon')}
            {renderSlot('offhand')}
            {renderSlot('amulet')}
            {renderSlot('ring')}
          </div>
        </div>
      </div>

      {/* ================= BOTTOM SECTION: INVENTORY BACKPACK (SCROLLS INDEPENDENTLY) ================= */}
      <div className="flex-1 min-h-0 flex flex-col bg-slate-950/80 border-t border-slate-800/90 rounded-t-3xl shadow-[0_-8px_20px_rgba(0,0,0,0.6)]">
        
        {/* Inventory Header & Quick Action Buttons */}
        <div className="p-3 pb-2 flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <Package size={15} className="text-amber-400" />
            <span className="text-xs font-black text-slate-200 uppercase tracking-wider">
              Рюкзак
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800">
              {state.inventory.length}
            </span>
          </div>

          {/* Quick Actions: Auto-Equip & Salvage */}
          <div className="flex items-center gap-1.5">
            <ThemedButton
              variant="secondary"
              size="sm"
              icon={<Wand2 size={12} className="text-amber-400" />}
              onClick={handleAutoEquip}
              title="Автоматически надеть лучшее снаряжение"
            >
              <span>Надеть лучшее</span>
            </ThemedButton>

            <ThemedButton
              variant="danger"
              size="sm"
              icon={<Trash2 size={12} />}
              onClick={handleSalvageCommons}
              title="Разобрать все обычные предметы на руду и металл"
            />
          </div>
        </div>

        {/* Inventory Category Filter Tabs */}
        <div className="px-3 pb-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-shrink-0">
          {[
            { id: 'all', label: 'Все' },
            { id: 'weapons', label: 'Оружие' },
            { id: 'armor', label: 'Доспехи' },
            { id: 'jewelry', label: 'Бижутерия' }
          ].map(tab => {
            const isActive = inventoryCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setInventoryCategory(tab.id as any)}
                className={`py-1 px-3 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex-shrink-0 ${
                  isActive
                    ? theme.buttons.variants.tabActive
                    : theme.buttons.variants.tab
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 
          CLEAN INVENTORY GRID (4x4 or 5x4):
          - NO text stats (+302HP, +13DMG, names) in cells!
          - Square aspect ratio cells.
          - ONLY item icon + rarity colored border.
          - Hover / tap opens ItemTooltip modal.
          - Independently scrollable!
        */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3.5 pt-1 pb-4 scrollbar-thin">
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
            {filteredInventory.map(item => {
              const rConf = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;
              const slotInfo = SLOT_INFO[item.slot] || { name: item.slot, icon: Shield };
              const SlotIcon = slotInfo.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    sound.playClick();
                    setSelectedInventoryItem(item);
                  }}
                  className={`aspect-square rounded-2xl bg-gradient-to-b ${rConf.bgGrad} border-2 ${rConf.border} ${rConf.glow} hover:border-amber-400 hover:scale-105 active:scale-95 flex items-center justify-center relative transition-all duration-150 cursor-pointer shadow-md group`}
                  title={`${item.name} (${rConf.label}) — нажмите для подробностей`}
                >
                  {/* Item Icon */}
                  <div className={`${rConf.text} transition-transform group-hover:scale-110`}>
                    <SlotIcon size={24} />
                  </div>

                  {/* Set Item indicator dot */}
                  {item.setId && (
                    <span 
                      className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.9)] border border-slate-950" 
                      title={`Сет: ${item.setName || item.setId}`}
                    />
                  )}

                  {/* Tier indicator in corner */}
                  <span className="absolute bottom-1 right-1 font-mono text-[8.5px] font-black text-slate-400 bg-slate-950/80 px-1 rounded">
                    Т{item.level || 1}
                  </span>
                </button>
              );
            })}

            {/* Empty grid slots to maintain the neat 4x4 / 5x4 RPG grid aesthetic */}
            {paddedGridSlots.map((_, idx) => (
              <div 
                key={`empty-slot-${idx}`}
                className="aspect-square rounded-2xl border border-dashed border-slate-800/80 bg-slate-900/30 flex items-center justify-center opacity-40"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-slate-700/60" />
              </div>
            ))}
          </div>

          {filteredInventory.length === 0 && (
            <div className="p-6 text-center text-slate-500 text-xs">
              <Package size={26} className="mx-auto text-slate-600 mb-2 opacity-50" />
              В этой категории нет предметов.
              <div className="text-[11px] text-slate-400 mt-1">
                Добывайте сундуки в Шахте или куйте снаряжение в Кузнице городка!
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= MODAL: ITEM TOOLTIP / POPUP ================= */}
      {/* 5A. Selected from Paperdoll Slot */}
      {selectedSlot && (
        <ItemTooltipModal
          item={state.equipment[selectedSlot]}
          emptySlot={selectedSlot}
          isEquipped={Boolean(state.equipment[selectedSlot])}
          allEquippedItems={state.equipment}
          inventoryMatches={getInventoryForSlot(selectedSlot)}
          initialReplaceMode={initialReplaceMode}
          onUnequip={(slot) => {
            dispatch({ type: 'UNEQUIP', slot });
            setSelectedSlot(null);
          }}
          onReplace={(slot) => {
            setInitialReplaceMode(true);
          }}
          onEquip={(it) => {
            dispatch({ type: 'EQUIP', item: it });
            setSelectedSlot(null);
          }}
          onClose={() => {
            setSelectedSlot(null);
            setInitialReplaceMode(false);
          }}
        />
      )}

      {/* 5B. Selected from Inventory Item */}
      {selectedInventoryItem && (
        <ItemTooltipModal
          item={selectedInventoryItem}
          isEquipped={false}
          equippedItemInSlot={state.equipment[selectedInventoryItem.slot]}
          allEquippedItems={state.equipment}
          onEquip={(it) => {
            dispatch({ type: 'EQUIP', item: it });
            setSelectedInventoryItem(null);
          }}
          onSalvage={(it) => {
            dispatch({ type: 'SALVAGE', item: it });
            setSelectedInventoryItem(null);
          }}
          onClose={() => setSelectedInventoryItem(null)}
        />
      )}

    </div>
  );
}

export default HeroScreen;
