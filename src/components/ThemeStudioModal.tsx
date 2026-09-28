/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useTheme, THEMES, ThemeId, ThemedButton, getThemedButtonClass, getThemedPanelClass } from '../theme';
import { ASSET_REGISTRY, EntityVisual, setEntityImage, registerAsset, getAsset, renderGoblinCanvas } from '../assetRegistry';
import { 
  Palette, 
  X, 
  Check, 
  Sparkles, 
  Layers, 
  Sliders, 
  Image as ImageIcon, 
  Zap, 
  Eye, 
  RefreshCw,
  Box
} from 'lucide-react';
import { sound } from '../game/audio';

export interface ThemeStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ThemeStudioModal({ isOpen, onClose }: ThemeStudioModalProps) {
  const { themeId, theme, setThemeId, availableThemes } = useTheme();
  const [activeTab, setActiveTab] = useState<'themes' | 'assets' | 'preview'>('themes');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('corridor_goblin');
  const [inLightPreview, setInLightPreview] = useState<boolean>(true);
  const [customScale, setCustomScale] = useState<number>(1.0);
  const [activeSpriteSkin, setActiveSpriteSkin] = useState<'procedural' | 'stylized_image' | 'high_contrast'>('procedural');

  if (!isOpen) return null;

  const currentAsset = getAsset(selectedEntityId);

  const handleSelectTheme = (id: ThemeId) => {
    sound.play('click');
    setThemeId(id);
  };

  const handleSkinChange = (skinType: 'procedural' | 'stylized_image' | 'high_contrast') => {
    sound.play('click');
    setActiveSpriteSkin(skinType);

    if (skinType === 'stylized_image') {
      // Hot-swap monster to use an image sprite definition (with fallback)
      setEntityImage('corridor_goblin', '/assets/monsters/goblin.png', 1.2);
    } else if (skinType === 'high_contrast') {
      // Custom scaled high-contrast procedural render
      const orig = getAsset('corridor_goblin');
      registerAsset('corridor_goblin', {
        ...orig,
        type: 'canvas',
        scale: 1.35,
        render: orig.type === 'canvas' ? orig.render : renderGoblinCanvas,
      });
    } else {
      // Reset to default procedural
      const orig = getAsset('corridor_goblin');
      registerAsset('corridor_goblin', {
        ...orig,
        type: 'canvas',
        scale: 1.0,
        render: orig.type === 'canvas' ? orig.render : renderGoblinCanvas,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-lg rounded-2xl flex flex-col max-h-[85vh] overflow-hidden ${theme.panels.modal}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Palette size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-100 uppercase tracking-wider">
                Кастомизация & Реестр Ассетов
              </h2>
              <p className="text-[10.5px] text-slate-400">
                Архитектура быстрой смены тем и моделей (Theme & Asset System)
              </p>
            </div>
          </div>
          <button
            onClick={() => { sound.play('click'); onClose(); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-2.5 bg-black/40 border-b border-slate-800">
          <button
            onClick={() => { sound.play('click'); setActiveTab('themes'); }}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'themes'
                ? theme.buttons.variants.tabActive
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Palette size={14} />
            Стили UI (Темы)
          </button>
          <button
            onClick={() => { sound.play('click'); setActiveTab('assets'); }}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'assets'
                ? theme.buttons.variants.tabActive
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Box size={14} />
            Реестр Монстров & 2D/3D
          </button>
          <button
            onClick={() => { sound.play('click'); setActiveTab('preview'); }}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'preview'
                ? theme.buttons.variants.tabActive
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Eye size={14} />
            Тест Кнопок
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 overflow-y-auto flex-1 space-y-3.5">
          {/* ================= TAB 1: THEMES ================= */}
          {activeTab === 'themes' && (
            <div className="space-y-3">
              <div className="text-[11.5px] text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                💡 Смена темы в <code className="text-amber-300 font-mono">theme.ts</code> централизованно меняет форму кнопок, фаски, цвета рамок и типографику во всей игре без изменения логики!
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {availableThemes.map((t) => {
                  const isSelected = t.id === themeId;
                  return (
                    <div
                      key={t.id}
                      onClick={() => handleSelectTheme(t.id)}
                      className={`p-3 rounded-xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                        isSelected 
                          ? 'border-amber-400 bg-amber-950/20 shadow-[0_0_15px_rgba(245,158,11,0.25)]' 
                          : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-black ${isSelected ? 'text-amber-300' : 'text-slate-200'}`}>
                            {t.name}
                          </span>
                          {isSelected && (
                            <span className="p-0.5 rounded-full bg-amber-500 text-slate-950">
                              <Check size={12} strokeWidth={3} />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-tight mb-2.5">
                          {t.description}
                        </p>
                      </div>

                      {/* Mini preview buttons in theme style */}
                      <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/80">
                        <button className={getThemedButtonClass('primary', 'sm', t)}>
                          Основная
                        </button>
                        <button className={getThemedButtonClass('secondary', 'sm', t)}>
                          Вторая
                        </button>
                        <button className={getThemedButtonClass('danger', 'sm', t)}>
                          Опасная
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= TAB 2: ASSETS REGISTRY ================= */}
          {activeTab === 'assets' && (
            <div className="space-y-3.5">
              <div className="text-[11.5px] text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                ⚔️ Реестр <code className="text-amber-300 font-mono">assetRegistry.ts</code> сопоставляет сущностям (Goblin, Boss, Tower) их визуальные ассеты (Canvas, Image PNG, 3D). Замена визуала монстра занимает 10 секунд!
              </div>

              {/* Entity Selector Pills */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Выберите объект из реестра:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(ASSET_REGISTRY).map((id) => {
                    const isSelected = selectedEntityId === id;
                    return (
                      <button
                        key={id}
                        onClick={() => { sound.play('click'); setSelectedEntityId(id); }}
                        className={`py-1 px-2.5 rounded-lg text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                            : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        {ASSET_REGISTRY[id].name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Entity Preview Card */}
              <div className="p-3.5 rounded-2xl bg-black/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative p-2 rounded-xl bg-slate-900/90 border border-slate-700/80 shadow-inner flex items-center justify-center">
                    <EntityVisual 
                      entityId={selectedEntityId} 
                      size={64} 
                      inLight={inLightPreview}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-200">
                        {currentAsset.name}
                      </span>
                      <span className="text-[9.5px] uppercase font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-600/40">
                        {currentAsset.type}
                      </span>
                    </div>
                    <p className="text-[10.5px] font-mono text-slate-400 mt-0.5">
                      ID: {currentAsset.id} · Масштаб: {currentAsset.scale || 1}x
                    </p>
                    <p className="text-[10.5px] text-slate-500">
                      Категория: {currentAsset.category}
                    </p>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                  <button
                    onClick={() => setInLightPreview(!inLightPreview)}
                    className="py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Zap size={13} className={inLightPreview ? 'text-amber-400' : 'text-slate-500'} />
                    {inLightPreview ? 'Освещён (В свете)' : 'Во тьме (В тени)'}
                  </button>

                  <div className="text-[10px] text-slate-400 text-center">
                    Отображается в шахте и бою
                  </div>
                </div>
              </div>

              {/* 10-Second Skin Swap Showcase */}
              <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                <span className="text-[11px] font-bold text-slate-300 block mb-2">
                  Быстрая смена скина гоблина (Тест изоляции графики):
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => handleSkinChange('procedural')}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all text-center ${
                      activeSpriteSkin === 'procedural'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    1. Вектор (Canvas)
                  </button>
                  <button
                    onClick={() => handleSkinChange('stylized_image')}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all text-center ${
                      activeSpriteSkin === 'stylized_image'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    2. Спрайт (Image)
                  </button>
                  <button
                    onClick={() => handleSkinChange('high_contrast')}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all text-center ${
                      activeSpriteSkin === 'high_contrast'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    3. Увеличенный (1.35x)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 3: BUTTON PREVIEW ================= */}
          {activeTab === 'preview' && (
            <div className="space-y-3">
              <div className="text-[11.5px] text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                🎨 Проверьте, как активная тема <span className="text-amber-300 font-bold">«{theme.name}»</span> влияет на все типы кнопок:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
                  <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                    Основные Варианты:
                  </span>
                  <div className="flex flex-col gap-2">
                    <ThemedButton variant="primary" size="md">
                      Кнопка действия (Primary)
                    </ThemedButton>
                    <ThemedButton variant="secondary" size="md">
                      Вспомогательная (Secondary)
                    </ThemedButton>
                    <ThemedButton variant="accent" size="md">
                      Акцент / Ковка (Accent)
                    </ThemedButton>
                    <ThemedButton variant="danger" size="md">
                      Опасное действие (Danger)
                    </ThemedButton>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
                  <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                    Табы, Размеры и Иконки:
                  </span>
                  <div className="flex flex-col gap-2">
                    <ThemedButton variant="primary" size="lg">
                      Большая кнопка (LG)
                    </ThemedButton>
                    <div className="flex items-center gap-2">
                      <ThemedButton variant="primary" size="sm">
                        Малая (SM)
                      </ThemedButton>
                      <ThemedButton variant="secondary" size="sm">
                        Фильтр
                      </ThemedButton>
                      <ThemedButton variant="ghost" size="sm">
                        Тихая
                      </ThemedButton>
                    </div>
                    <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-slate-800">
                      <ThemedButton variant="tabActive" size="sm" className="flex-1">
                        Активный Таб
                      </ThemedButton>
                      <ThemedButton variant="tab" size="sm" className="flex-1">
                        Неактивный Таб
                      </ThemedButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-black/50 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Активна тема: <strong className="text-amber-300">{theme.name}</strong>
          </span>
          <ThemedButton
            variant="primary"
            size="sm"
            onClick={() => { sound.play('click'); onClose(); }}
          >
            Готово
          </ThemedButton>
        </div>
      </div>
    </div>
  );
}
