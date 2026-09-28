/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

// ==========================================
// 1. THEME PRESETS & VISUAL TOKENS
// ==========================================

export type ThemeId = 'dark_fantasy' | 'runic_stone' | 'golden_citadel' | 'cyber_delve';

export type ButtonVariant = 
  | 'primary' 
  | 'secondary' 
  | 'danger' 
  | 'accent' 
  | 'ghost' 
  | 'tab' 
  | 'tabActive'
  | 'icon';

export type ButtonSize = 'sm' | 'md' | 'lg';

export type PanelVariant = 'modal' | 'card' | 'tooltip' | 'hud' | 'slot';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  
  // Font families & typography styles
  typography: {
    fontFamilyHeading: string;
    fontFamilyBody: string;
    fontFamilyMono: string;
    headingClass: string;
    bodyClass: string;
    monoClass: string;
  };

  // Button styles
  buttons: {
    base: string;
    variants: Record<ButtonVariant, string>;
    sizes: Record<ButtonSize, string>;
  };

  // Panels, Cards, Frames
  panels: Record<PanelVariant, string>;

  // Rarity color frames for gear and rewards
  rarity: Record<'common' | 'magic' | 'rare' | 'epic' | 'legendary', {
    border: string;
    badgeBg: string;
    glow: string;
    text: string;
    bgGrad: string;
  }>;

  // Background surfaces
  canvasBg: string;
  surfaceBg: string;
  borderDefault: string;
}

// ==========================================
// 2. THEME DEFINITIONS
// ==========================================

export const THEMES: Record<ThemeId, ThemeConfig> = {
  // --- THEME 1: DARK FANTASY (Classic RPG Delve) ---
  dark_fantasy: {
    id: 'dark_fantasy',
    name: 'Тёмное Фэнтези',
    description: 'Глубокий тёмный сланец, латунные и янтарные акценты, благородный RPG стиль.',
    typography: {
      fontFamilyHeading: 'system-ui, -apple-system, sans-serif',
      fontFamilyBody: 'system-ui, -apple-system, sans-serif',
      fontFamilyMono: 'ui-monospace, SFMono-Regular, monospace',
      headingClass: 'tracking-wider font-extrabold uppercase',
      bodyClass: 'tracking-normal text-slate-300 font-medium',
      monoClass: 'font-mono tabular-nums',
    },
    buttons: {
      base: 'inline-flex items-center justify-center font-bold tracking-wide transition-all duration-150 select-none cursor-pointer focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]',
      variants: {
        primary: 'bg-gradient-to-b from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 font-black border border-amber-300/80 shadow-[0_4px_14px_rgba(245,158,11,0.35)] hover:shadow-[0_6px_20px_rgba(245,158,11,0.45)]',
        secondary: 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-slate-500 shadow-sm',
        danger: 'bg-gradient-to-b from-rose-600 to-rose-800 hover:from-rose-500 hover:to-rose-700 text-white font-bold border border-rose-400/60 shadow-[0_4px_12px_rgba(225,29,72,0.3)]',
        accent: 'bg-gradient-to-b from-indigo-600 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 text-white font-bold border border-indigo-400/60 shadow-[0_4px_14px_rgba(99,102,241,0.35)]',
        ghost: 'bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-700/50',
        tab: 'bg-slate-900/70 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700',
        tabActive: 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.2)]',
        icon: 'p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80',
      },
      sizes: {
        sm: 'text-[11px] py-1 px-2.5 rounded-lg gap-1',
        md: 'text-xs py-2 px-3.5 rounded-xl gap-1.5',
        lg: 'text-sm py-2.5 px-4.5 rounded-2xl gap-2',
      }
    },
    panels: {
      modal: 'bg-[#0b101d]/95 border border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-xl',
      card: 'bg-slate-900/70 border border-slate-800/90 hover:border-slate-700/80 shadow-md backdrop-blur-sm',
      tooltip: 'bg-[#090d16]/98 border border-slate-700/90 shadow-[0_15px_35px_rgba(0,0,0,0.9)] backdrop-blur-md',
      hud: 'bg-slate-950/80 border border-slate-800/80 shadow-lg backdrop-blur-md',
      slot: 'bg-slate-950/90 border border-slate-800 hover:border-slate-600',
    },
    rarity: {
      common: {
        border: 'border-slate-700',
        badgeBg: 'bg-slate-800 text-slate-300 border-slate-700',
        glow: 'shadow-none',
        text: 'text-slate-200',
        bgGrad: 'from-slate-900 to-slate-950'
      },
      magic: {
        border: 'border-sky-500/70',
        badgeBg: 'bg-sky-950 text-sky-300 border-sky-600',
        glow: 'shadow-[0_0_15px_rgba(56,189,248,0.2)]',
        text: 'text-sky-300',
        bgGrad: 'from-sky-950/60 via-slate-900 to-slate-950'
      },
      rare: {
        border: 'border-amber-500/80',
        badgeBg: 'bg-amber-950 text-amber-300 border-amber-600',
        glow: 'shadow-[0_0_18px_rgba(245,158,11,0.25)]',
        text: 'text-amber-300',
        bgGrad: 'from-amber-950/60 via-slate-900 to-slate-950'
      },
      epic: {
        border: 'border-purple-500/80',
        badgeBg: 'bg-purple-950 text-purple-300 border-purple-600',
        glow: 'shadow-[0_0_22px_rgba(168,85,247,0.3)]',
        text: 'text-purple-300',
        bgGrad: 'from-purple-950/60 via-slate-900 to-slate-950'
      },
      legendary: {
        border: 'border-orange-500',
        badgeBg: 'bg-orange-950 text-orange-300 border-orange-500',
        glow: 'shadow-[0_0_28px_rgba(249,115,22,0.4)]',
        text: 'text-orange-400',
        bgGrad: 'from-orange-950/70 via-slate-900 to-slate-950'
      }
    },
    canvasBg: '#05070d',
    surfaceBg: '#0a0f1d',
    borderDefault: '#1e293b',
  },

  // --- THEME 2: RUNIC STONE (Heavy Chiseled Carved Dungeon) ---
  runic_stone: {
    id: 'runic_stone',
    name: 'Каменные Руны',
    description: 'Массивные вытесанные плиты, гравированные фаски, подземный дух гномов и шахтёров.',
    typography: {
      fontFamilyHeading: 'ui-serif, Georgia, serif',
      fontFamilyBody: 'system-ui, sans-serif',
      fontFamilyMono: 'ui-monospace, monospace',
      headingClass: 'tracking-widest font-black uppercase text-amber-100',
      bodyClass: 'tracking-tight text-stone-300 font-medium',
      monoClass: 'font-mono tabular-nums text-amber-200',
    },
    buttons: {
      base: 'inline-flex items-center justify-center font-black tracking-wider transition-all duration-150 select-none cursor-pointer focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-0.5',
      variants: {
        primary: 'bg-gradient-to-b from-stone-700 via-stone-800 to-stone-900 hover:from-stone-600 hover:to-stone-800 text-amber-200 font-black border-2 border-stone-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_0_#1c1917,0_6px_10px_rgba(0,0,0,0.6)] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.7)]',
        secondary: 'bg-gradient-to-b from-stone-800 to-stone-900 hover:from-stone-700 hover:to-stone-800 text-stone-200 border-2 border-stone-600/80 shadow-[0_3px_0_#1c1917,0_4px_8px_rgba(0,0,0,0.5)]',
        danger: 'bg-gradient-to-b from-red-800 to-stone-900 hover:from-red-700 hover:to-stone-800 text-red-200 font-bold border-2 border-red-600/80 shadow-[0_3px_0_#450a0a,0_4px_8px_rgba(0,0,0,0.5)]',
        accent: 'bg-gradient-to-b from-cyan-900 to-stone-900 hover:from-cyan-800 hover:to-stone-800 text-cyan-200 font-bold border-2 border-cyan-600/80 shadow-[0_3px_0_#083344,0_4px_8px_rgba(0,0,0,0.5)]',
        ghost: 'bg-stone-900/40 hover:bg-stone-800/80 text-stone-400 hover:text-stone-200 border border-stone-700/50',
        tab: 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-700',
        tabActive: 'bg-stone-800 text-amber-200 border-2 border-amber-500/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]',
        icon: 'p-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-stone-100 border-2 border-stone-700 shadow-[0_2px_0_#1c1917]',
      },
      sizes: {
        sm: 'text-[11px] py-1 px-2.5 rounded-md gap-1',
        md: 'text-xs py-1.5 px-3 rounded-lg gap-1.5',
        lg: 'text-sm py-2 px-4 rounded-xl gap-2',
      }
    },
    panels: {
      modal: 'bg-[#141210]/98 border-2 border-stone-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_20px_50px_rgba(0,0,0,0.95)]',
      card: 'bg-stone-900/90 border border-stone-700 shadow-[0_4px_0_#0c0a09,0_8px_16px_rgba(0,0,0,0.7)]',
      tooltip: 'bg-[#181512]/98 border-2 border-stone-600 shadow-[0_15px_35px_rgba(0,0,0,0.9)]',
      hud: 'bg-[#141210]/95 border-b-2 border-stone-700 shadow-md',
      slot: 'bg-stone-950 border-2 border-stone-700 hover:border-stone-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]',
    },
    rarity: {
      common: {
        border: 'border-stone-600',
        badgeBg: 'bg-stone-800 text-stone-300 border-stone-600',
        glow: 'shadow-none',
        text: 'text-stone-300',
        bgGrad: 'from-stone-900 to-stone-950'
      },
      magic: {
        border: 'border-cyan-600',
        badgeBg: 'bg-cyan-950 text-cyan-300 border-cyan-500',
        glow: 'shadow-[0_0_12px_rgba(6,182,212,0.25)]',
        text: 'text-cyan-300',
        bgGrad: 'from-cyan-950/70 via-stone-900 to-stone-950'
      },
      rare: {
        border: 'border-amber-500',
        badgeBg: 'bg-amber-950 text-amber-300 border-amber-500',
        glow: 'shadow-[0_0_16px_rgba(245,158,11,0.3)]',
        text: 'text-amber-300',
        bgGrad: 'from-amber-950/70 via-stone-900 to-stone-950'
      },
      epic: {
        border: 'border-fuchsia-600',
        badgeBg: 'bg-fuchsia-950 text-fuchsia-300 border-fuchsia-500',
        glow: 'shadow-[0_0_20px_rgba(217,70,239,0.35)]',
        text: 'text-fuchsia-300',
        bgGrad: 'from-fuchsia-950/70 via-stone-900 to-stone-950'
      },
      legendary: {
        border: 'border-red-500',
        badgeBg: 'bg-red-950 text-red-300 border-red-500',
        glow: 'shadow-[0_0_24px_rgba(239,68,68,0.4)]',
        text: 'text-red-400',
        bgGrad: 'from-red-950/70 via-stone-900 to-stone-950'
      }
    },
    canvasBg: '#090807',
    surfaceBg: '#141210',
    borderDefault: '#292524',
  },

  // --- THEME 3: GOLDEN CITADEL (High Fantasy / Gilded Brass) ---
  golden_citadel: {
    id: 'golden_citadel',
    name: 'Золотая Цитадель',
    description: 'Имперское золото, благородная бронза, мерцающие латунные филиграни.',
    typography: {
      fontFamilyHeading: 'Cinzel, Georgia, serif',
      fontFamilyBody: 'system-ui, sans-serif',
      fontFamilyMono: 'ui-monospace, monospace',
      headingClass: 'tracking-widest font-black uppercase text-amber-200',
      bodyClass: 'tracking-normal text-amber-100/90 font-medium',
      monoClass: 'font-mono tabular-nums text-yellow-300',
    },
    buttons: {
      base: 'inline-flex items-center justify-center font-bold tracking-wider transition-all duration-150 select-none cursor-pointer focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-95',
      variants: {
        primary: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 text-amber-950 font-black border border-yellow-200 shadow-[0_0_18px_rgba(245,158,11,0.5)]',
        secondary: 'bg-gradient-to-b from-[#1b1509] to-[#0d0a04] hover:bg-[#251e0e] text-amber-200 border border-amber-600/60 shadow-[0_2px_8px_rgba(0,0,0,0.7)]',
        danger: 'bg-gradient-to-b from-rose-900 to-rose-950 hover:from-rose-800 hover:to-rose-900 text-rose-200 font-bold border border-rose-500/70 shadow-[0_0_12px_rgba(244,63,94,0.3)]',
        accent: 'bg-gradient-to-b from-violet-900 to-[#120a1f] hover:from-violet-800 hover:to-violet-950 text-violet-200 font-bold border border-violet-500/70 shadow-[0_0_12px_rgba(139,92,246,0.3)]',
        ghost: 'bg-transparent hover:bg-amber-950/40 text-amber-400/80 hover:text-amber-200 border border-transparent hover:border-amber-600/30',
        tab: 'bg-[#151006] text-amber-400/70 hover:text-amber-200 border border-amber-800/40',
        tabActive: 'bg-amber-950/60 text-yellow-300 border border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.25)]',
        icon: 'p-2 rounded-xl bg-[#191307] hover:bg-[#261d0b] text-amber-300 border border-amber-600/50 shadow-sm',
      },
      sizes: {
        sm: 'text-[11px] py-1 px-2.5 rounded-lg gap-1',
        md: 'text-xs py-2 px-3.5 rounded-xl gap-1.5',
        lg: 'text-sm py-2.5 px-4.5 rounded-2xl gap-2',
      }
    },
    panels: {
      modal: 'bg-[#0f0c05]/98 border border-amber-600/70 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(245,158,11,0.15)] backdrop-blur-xl',
      card: 'bg-[#151006]/90 border border-amber-700/60 hover:border-amber-500/80 shadow-lg backdrop-blur-sm',
      tooltip: 'bg-[#0d0a04]/98 border border-amber-500/80 shadow-[0_15px_35px_rgba(0,0,0,0.9),0_0_20px_rgba(245,158,11,0.2)] backdrop-blur-md',
      hud: 'bg-[#0c0903]/90 border-b border-amber-700/50 shadow-md',
      slot: 'bg-[#0a0803] border border-amber-800/60 hover:border-amber-500/90 shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)]',
    },
    rarity: {
      common: {
        border: 'border-amber-800/60',
        badgeBg: 'bg-amber-950 text-amber-300 border-amber-800',
        glow: 'shadow-none',
        text: 'text-amber-200',
        bgGrad: 'from-[#191307] to-[#0a0803]'
      },
      magic: {
        border: 'border-sky-400',
        badgeBg: 'bg-sky-950 text-sky-200 border-sky-400',
        glow: 'shadow-[0_0_15px_rgba(56,189,248,0.3)]',
        text: 'text-sky-300',
        bgGrad: 'from-sky-950/70 via-[#151006] to-[#0a0803]'
      },
      rare: {
        border: 'border-yellow-400',
        badgeBg: 'bg-yellow-950 text-yellow-200 border-yellow-400',
        glow: 'shadow-[0_0_20px_rgba(250,204,21,0.4)]',
        text: 'text-yellow-300',
        bgGrad: 'from-amber-950/80 via-[#151006] to-[#0a0803]'
      },
      epic: {
        border: 'border-fuchsia-400',
        badgeBg: 'bg-fuchsia-950 text-fuchsia-200 border-fuchsia-400',
        glow: 'shadow-[0_0_25px_rgba(232,121,249,0.35)]',
        text: 'text-fuchsia-300',
        bgGrad: 'from-purple-950/80 via-[#151006] to-[#0a0803]'
      },
      legendary: {
        border: 'border-amber-300',
        badgeBg: 'bg-gradient-to-r from-amber-600 to-yellow-500 text-black border-yellow-200',
        glow: 'shadow-[0_0_30px_rgba(251,191,36,0.5)]',
        text: 'text-amber-300 font-black',
        bgGrad: 'from-amber-900/60 via-[#151006] to-[#0a0803]'
      }
    },
    canvasBg: '#050401',
    surfaceBg: '#0f0c05',
    borderDefault: '#451a03',
  },

  // --- THEME 4: CYBER DELVE (Techno-Abyssal Neon) ---
  cyber_delve: {
    id: 'cyber_delve',
    name: 'Кибер-Бездна',
    description: 'Высокотехнологичный неон, бирюзово-изумрудные визиры, тёмный углепластик.',
    typography: {
      fontFamilyHeading: 'ui-monospace, monospace',
      fontFamilyBody: 'system-ui, sans-serif',
      fontFamilyMono: 'ui-monospace, monospace',
      headingClass: 'tracking-widest font-black uppercase text-cyan-300',
      bodyClass: 'tracking-normal text-slate-300 font-medium',
      monoClass: 'font-mono tabular-nums text-emerald-400',
    },
    buttons: {
      base: 'inline-flex items-center justify-center font-mono font-bold tracking-wider transition-all duration-150 select-none cursor-pointer focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-95',
      variants: {
        primary: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black border border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.45)] hover:shadow-[0_0_25px_rgba(6,182,212,0.65)]',
        secondary: 'bg-slate-900/90 hover:bg-slate-800 text-cyan-300 border border-cyan-800/80 hover:border-cyan-500/80 shadow-[0_0_8px_rgba(6,182,212,0.15)]',
        danger: 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.3)]',
        accent: 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]',
        ghost: 'bg-transparent hover:bg-cyan-950/30 text-cyan-500/70 hover:text-cyan-300 border border-transparent hover:border-cyan-800/50',
        tab: 'bg-slate-900/70 text-slate-400 hover:text-cyan-300 border border-slate-800 hover:border-cyan-800',
        tabActive: 'bg-cyan-950/50 text-cyan-300 border border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]',
        icon: 'p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-cyan-700/60 shadow-[0_0_6px_rgba(6,182,212,0.2)]',
      },
      sizes: {
        sm: 'text-[11px] py-1 px-2.5 rounded-md gap-1',
        md: 'text-xs py-2 px-3 rounded-lg gap-1.5',
        lg: 'text-sm py-2.5 px-4 rounded-xl gap-2',
      }
    },
    panels: {
      modal: 'bg-[#050b14]/98 border border-cyan-500/50 shadow-[0_0_35px_rgba(6,182,212,0.25)] backdrop-blur-xl',
      card: 'bg-slate-900/80 border border-cyan-900/60 hover:border-cyan-600/70 shadow-[0_0_12px_rgba(6,182,212,0.1)] backdrop-blur-sm',
      tooltip: 'bg-[#03070e]/98 border border-cyan-400/70 shadow-[0_0_25px_rgba(6,182,212,0.3)] backdrop-blur-md',
      hud: 'bg-[#040812]/90 border-b border-cyan-800/50 shadow-[0_4px_15px_rgba(0,0,0,0.8)]',
      slot: 'bg-slate-950 border border-slate-800 hover:border-cyan-500 shadow-[inset_0_0_6px_rgba(6,182,212,0.1)]',
    },
    rarity: {
      common: {
        border: 'border-slate-700',
        badgeBg: 'bg-slate-800 text-slate-300 border-slate-600',
        glow: 'shadow-none',
        text: 'text-slate-300',
        bgGrad: 'from-slate-900 to-slate-950'
      },
      magic: {
        border: 'border-cyan-400',
        badgeBg: 'bg-cyan-950 text-cyan-300 border-cyan-400',
        glow: 'shadow-[0_0_15px_rgba(6,182,212,0.35)]',
        text: 'text-cyan-300',
        bgGrad: 'from-cyan-950/70 via-slate-900 to-slate-950'
      },
      rare: {
        border: 'border-emerald-400',
        badgeBg: 'bg-emerald-950 text-emerald-300 border-emerald-400',
        glow: 'shadow-[0_0_18px_rgba(16,185,129,0.35)]',
        text: 'text-emerald-300',
        bgGrad: 'from-emerald-950/70 via-slate-900 to-slate-950'
      },
      epic: {
        border: 'border-purple-400',
        badgeBg: 'bg-purple-950 text-purple-300 border-purple-400',
        glow: 'shadow-[0_0_22px_rgba(168,85,247,0.4)]',
        text: 'text-purple-300',
        bgGrad: 'from-purple-950/70 via-slate-900 to-slate-950'
      },
      legendary: {
        border: 'border-amber-400',
        badgeBg: 'bg-amber-950 text-amber-300 border-amber-400',
        glow: 'shadow-[0_0_26px_rgba(245,158,11,0.45)]',
        text: 'text-amber-300',
        bgGrad: 'from-amber-950/70 via-slate-900 to-slate-950'
      }
    },
    canvasBg: '#010307',
    surfaceBg: '#050b14',
    borderDefault: '#0e2439',
  }
};

// ==========================================
// 3. REACT CONTEXT & ACTIVE THEME STORE
// ==========================================

const LOCAL_STORAGE_THEME_KEY = 'delve_rpg_active_theme';

const initialThemeId: ThemeId = (typeof window !== 'undefined' && (localStorage.getItem(LOCAL_STORAGE_THEME_KEY) as ThemeId)) || 'dark_fantasy';

interface ThemeContextValue {
  themeId: ThemeId;
  theme: ThemeConfig;
  setThemeId: (id: ThemeId) => void;
  availableThemes: ThemeConfig[];
}

export const ThemeContext = createContext<ThemeContextValue>({
  themeId: initialThemeId,
  theme: THEMES[initialThemeId] || THEMES.dark_fantasy,
  setThemeId: () => {},
  availableThemes: Object.values(THEMES),
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(initialThemeId);

  const setThemeId = (id: ThemeId) => {
    if (THEMES[id]) {
      setThemeIdState(id);
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_THEME_KEY, id);
      }
    }
  };

  const theme = THEMES[themeId] || THEMES.dark_fantasy;

  // Apply theme tokens to document body / CSS variables
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--theme-bg-canvas', theme.canvasBg);
      document.documentElement.style.setProperty('--theme-bg-surface', theme.surfaceBg);
      document.documentElement.style.setProperty('--theme-border-default', theme.borderDefault);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{
      themeId,
      theme,
      setThemeId,
      availableThemes: Object.values(THEMES)
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// ==========================================
// 4. THEMED UI HELPER FUNCTIONS & COMPONENTS
// ==========================================

/**
 * Returns complete Tailwind class string for a button based on the active theme
 */
export function getThemedButtonClass(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  themeOrId: ThemeConfig | ThemeId = 'dark_fantasy',
  extraClasses = ''
): string {
  const activeTheme = typeof themeOrId === 'string' ? (THEMES[themeOrId] || THEMES.dark_fantasy) : themeOrId;
  const base = activeTheme.buttons.base;
  const variantClass = activeTheme.buttons.variants[variant] || activeTheme.buttons.variants.primary;
  const sizeClass = activeTheme.buttons.sizes[size] || activeTheme.buttons.sizes.md;
  return `${base} ${variantClass} ${sizeClass} ${extraClasses}`.trim();
}

/**
 * Returns complete Tailwind class string for a panel/card
 */
export function getThemedPanelClass(
  variant: PanelVariant = 'card',
  themeOrId: ThemeConfig | ThemeId = 'dark_fantasy',
  extraClasses = ''
): string {
  const activeTheme = typeof themeOrId === 'string' ? (THEMES[themeOrId] || THEMES.dark_fantasy) : themeOrId;
  const panelClass = activeTheme.panels[variant] || activeTheme.panels.card;
  return `${panelClass} ${extraClasses}`.trim();
}

/**
 * Reusable Themed Button Component that automatically consumes ThemeContext
 */
export interface ThemedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const ThemedButton: React.FC<ThemedButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className = '',
  disabled,
  onClick,
  ...props
}) => {
  const { theme } = useTheme();
  const classes = getThemedButtonClass(variant as ButtonVariant, size as ButtonSize, theme, className);

  return (
    <button
      className={classes}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {icon && <span className="inline-flex shrink-0 items-center justify-center">{icon}</span>}
      {children}
    </button>
  );
};

/**
 * Reusable Themed Panel Container
 */
export interface ThemedPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: PanelVariant;
  children?: React.ReactNode;
}

export const ThemedPanel: React.FC<ThemedPanelProps> = ({
  variant = 'card',
  children,
  className = '',
  ...props
}) => {
  const { theme } = useTheme();
  const classes = getThemedPanelClass(variant as PanelVariant, theme, className);

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};
