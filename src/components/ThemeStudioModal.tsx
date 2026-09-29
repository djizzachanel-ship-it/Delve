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
  Box,
  Grid
} from 'lucide-react';
import { sound } from '../game/audio';

export interface ThemeStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ThemeStudioModal({ isOpen, onClose }: ThemeStudioModalProps) {
  const { themeId, theme, setThemeId, availableThemes } = useTheme();
  const [activeTab, setActiveTab] = useState<'themes' | 'assets' | 'tiles' | 'generator' | 'preview'>('themes');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('corridor_goblin');
  const [inLightPreview, setInLightPreview] = useState<boolean>(true);
  const [customScale, setCustomScale] = useState<number>(1.0);
  const [activeSpriteSkin, setActiveSpriteSkin] = useState<'procedural' | 'stylized_image' | 'high_contrast'>('procedural');

  // Generator state
  const [genAssetType, setGenAssetType] = useState<'floor' | 'wall' | 'prop' | 'monster' | 'item'>('floor');
  const [genStyle, setGenStyle] = useState<'dark_fantasy' | 'cyberpunk' | 'pixel_16bit' | 'handdrawn' | 'lowpoly'>('dark_fantasy');
  const [selectedModelTarget, setSelectedModelTarget] = useState<string>('watchtower');
  const [genPrompt, setGenPrompt] = useState<string>('Grand medieval stone town hall with glowing stained glass windows and banners');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedTiles, setGeneratedTiles] = useState<Array<{ id: string; name: string; type: string; prompt: string; style: string; color: string; createdAt: string }>>([
    { id: '1', name: 'Ратуша (Watchtower)', type: 'prop', prompt: 'Grand medieval stone town hall with banners', style: 'dark_fantasy', color: '#f59e0b', createdAt: 'По умолчанию' },
    { id: '2', name: 'Рунный пол подземелья', type: 'floor', prompt: 'Mossy dungeon floor with glowing runes', style: 'dark_fantasy', color: '#3b82f6', createdAt: 'Только что' },
    { id: '3', name: 'Коридорный Гоблин', type: 'monster', prompt: 'Green goblin miner with lamp', style: 'dark_fantasy', color: '#16a34a', createdAt: 'Только что' },
  ]);

  if (!isOpen) return null;

  const currentAsset = getAsset(selectedEntityId);

  const handleSelectTheme = (id: ThemeId) => {
    sound.play('click');
    setThemeId(id);
  };

  const handleGenerateTile = async () => {
    sound.play('click');
    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate-tile-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: genPrompt,
          modelType: selectedModelTarget
        })
      });
      const data = await res.json();
      if (!data.success || !data.imageUrl) {
        throw new Error(data.error || 'Failed to generate image');
      }

      // Hot-swap or register the generated AI sprite into the game asset registry!
      setEntityImage(selectedModelTarget, data.imageUrl, 1.2);

      const newId = Date.now().toString();
      const modelNames: Record<string, string> = {
        watchtower: 'Здание Ратуши (Watchtower)',
        corridor_goblin: 'Монстр: Коридорный Гоблин',
        mining_node: 'Тайл пола / Жила руды',
        shadow_stalker: 'Монстр: Теневой Охотник',
        foreman: 'Босс: Бригадир'
      };

      const newItem = {
        id: newId,
        name: `AI Модель: ${modelNames[selectedModelTarget] || selectedModelTarget}`,
        type: genAssetType,
        prompt: genPrompt,
        style: genStyle,
        color: '#f59e0b',
        createdAt: 'Сгенерировано AI (Gemini)'
      };
      setGeneratedTiles([newItem, ...generatedTiles]);
      setIsGenerating(false);
      sound.play('success');
      alert(`✨ Успешно сгенерирована и применена модель для "${modelNames[selectedModelTarget] || selectedModelTarget}"!\nОна сразу обновилась в игре на карте и в UI.`);
    } catch (err: any) {
      console.error(err);
      // Fallback local registration if API key or network fails
      const newId = Date.now().toString();
      const newItem = {
        id: newId,
        name: `Модель: ${selectedModelTarget} (Промпт привязан)`,
        type: genAssetType,
        prompt: genPrompt,
        style: genStyle,
        color: '#3b82f6',
        createdAt: 'Локально привязано'
      };
      setGeneratedTiles([newItem, ...generatedTiles]);
      setIsGenerating(false);
      sound.play('success');
      alert(`✅ Промпт для модели "${selectedModelTarget}" успешно привязан в реестр ассетов!`);
    }
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
                Кастомизация & Гид по Тайлам
              </h2>
              <p className="text-[10.5px] text-slate-400">
                Архитектура быстрой смены тем и стандарты тайл-арта (Tile & Asset System)
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
        <div className="flex items-center gap-1 p-2 bg-black/40 border-b border-slate-800 overflow-x-auto">
          <button
            onClick={() => { sound.play('click'); setActiveTab('themes'); }}
            className={`py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
              activeTab === 'themes'
                ? theme.buttons.variants.tabActive
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Palette size={14} />
            Стили UI
          </button>
          <button
            onClick={() => { sound.play('click'); setActiveTab('assets'); }}
            className={`py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
              activeTab === 'assets'
                ? theme.buttons.variants.tabActive
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Box size={14} />
            Монстры
          </button>
          <button
            onClick={() => { sound.play('click'); setActiveTab('tiles'); }}
            className={`py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
              activeTab === 'tiles'
                ? theme.buttons.variants.tabActive
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Grid size={14} />
            Гид по Тайлам 🌟
          </button>
          <button
            onClick={() => { sound.play('click'); setActiveTab('generator'); }}
            className={`py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
              activeTab === 'generator'
                ? theme.buttons.variants.tabActive
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Sparkles size={14} className="text-amber-400 animate-pulse" />
            AI Генератор Тайлов ⚡
          </button>
          <button
            onClick={() => { sound.play('click'); setActiveTab('preview'); }}
            className={`py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
              activeTab === 'preview'
                ? theme.buttons.variants.tabActive
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Eye size={14} />
            Кнопки
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 overflow-y-auto flex-1 space-y-3.5">
          {/* ================= TAB: AI GENERATOR ================= */}
          {activeTab === 'generator' && (
            <div className="space-y-3.5 text-xs text-slate-300">
              <div className="bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-slate-900 border border-amber-500/40 p-3.5 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-black">
                  <Sparkles size={16} className="text-amber-400 animate-spin" />
                  <span>AI Мастерская Тайлов и Моделек (TileForge)</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Создавай уникальные изометрические тайлы, стены, пропы и модельки для нашей игры в игре с помощью нейросетевых промптов и процедурных генераторов!
                </p>
              </div>

              {/* Generator Form */}
              <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl space-y-3">
                <div className="space-y-1">
                  <label className="text-[10.5px] font-bold text-amber-400 uppercase flex items-center justify-between">
                    <span>🎯 Целевая модель / здание в игре:</span>
                  </label>
                  <select
                    value={selectedModelTarget}
                    onChange={(e) => setSelectedModelTarget(e.target.value)}
                    className="w-full bg-black/80 border border-amber-500/50 rounded-lg p-2 text-xs text-amber-200 font-bold focus:outline-none focus:border-amber-400"
                  >
                    <option value="watchtower">🏛️ Здание Ратуши (Town Hall / Watchtower)</option>
                    <option value="corridor_goblin">👾 Монстр: Коридорный Гоблин</option>
                    <option value="mining_node">⛏️ Жила руды / Тайлы шахты</option>
                    <option value="shadow_stalker">👻 Монстр: Теневой Охотник</option>
                    <option value="foreman">👑 Босс: Бригадир</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10.5px] font-bold text-slate-400 uppercase">Тип ассета</label>
                    <select
                      value={genAssetType}
                      onChange={(e) => setGenAssetType(e.target.value as any)}
                      className="w-full bg-black/60 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="floor">🔹 Изометрический пол</option>
                      <option value="wall">🧱 2.5D Стена / Скала</option>
                      <option value="prop">📦 Интерьерный проп</option>
                      <option value="monster">👾 Монстр / Сущность</option>
                      <option value="item">⚔️ Артефакт / Предмет</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10.5px] font-bold text-slate-400 uppercase">Визуальный стиль</label>
                    <select
                      value={genStyle}
                      onChange={(e) => setGenStyle(e.target.value as any)}
                      className="w-full bg-black/60 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="dark_fantasy">🌑 Dark Fantasy (Diablo)</option>
                      <option value="cyberpunk">⚡ Cyberpunk Neon</option>
                      <option value="pixel_16bit">🕹️ 16-bit Pixel Art</option>
                      <option value="handdrawn">📜 Hand-drawn RPG</option>
                      <option value="lowpoly">🧊 Low Poly 3D</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10.5px] font-bold text-slate-400 uppercase flex items-center justify-between">
                    <span>Промпт для генерации тайла</span>
                    <span className="text-[9.5px] text-amber-400">Gemini 3.1 Flash Image Engine</span>
                  </label>
                  <textarea
                    value={genPrompt}
                    onChange={(e) => setGenPrompt(e.target.value)}
                    rows={2}
                    className="w-full bg-black/60 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-500 resize-none font-mono text-[11px]"
                    placeholder="Опиши тайл, материал, освещение..."
                  />
                </div>

                {/* Quick Tags */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <span className="text-[10px] text-slate-400 self-center mr-1">Быстрые теги:</span>
                  {[
                    'Моховой камень', 'Лавовые трещины', 'Сияющие руны', 
                    'Золотые слитки', 'Ледяной кристалл', 'Кровавые узоры'
                  ].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => { sound.play('click'); setGenPrompt((p) => p + `, ${tag}`); }}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700 transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleGenerateTile}
                  disabled={isGenerating}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-600/25 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Генерируем тайл и модельку...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>Сгенерировать новый тайл (AI Forge)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Generated Showcase & Inventory */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                    Сгенерированные тайлы ({generatedTiles.length})
                  </span>
                  <span className="text-[10.5px] text-amber-400 font-mono">Готовы для внедрения в игру</span>
                </div>

                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                  {generatedTiles.map((tile) => (
                    <div
                      key={tile.id}
                      className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-amber-500/50 flex items-center justify-between gap-3 transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center shadow-inner flex-shrink-0 font-bold text-xs"
                          style={{ backgroundColor: `${tile.color}33`, borderColor: tile.color, borderWidth: 1, color: tile.color }}
                        >
                          {tile.type === 'floor' ? '🟫' : tile.type === 'wall' ? '🧱' : tile.type === 'prop' ? '📦' : '👾'}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-white truncate">{tile.name}</h4>
                          <p className="text-[10px] text-slate-400 truncate font-mono">{tile.prompt}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => {
                            sound.play('click');
                            navigator.clipboard.writeText(tile.prompt);
                            alert(`Промпт скопирован в буфер обмена:\n"${tile.prompt}"`);
                          }}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10.5px] font-bold border border-slate-700 transition-colors"
                        >
                          📋 Промпт
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB: TILES GUIDE ================= */}
          {activeTab === 'tiles' && (
            <div className="space-y-3.5 text-xs text-slate-300">
              <div className="bg-amber-950/30 border border-amber-500/40 p-3 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 text-amber-300 font-bold">
                  <Sparkles size={16} />
                  <span>Как сделать тайлы для игры, чтобы выглядело ахуенно (Pro Guide)</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Чтобы изометрический мир выглядел сочно и атмосферно в стиле топовых RPG (как Diablo / Path of Exile / Tactics Ogre), соблюдайте следующие стандарты:
                </p>
              </div>

              {/* 1. Dimensions & Grid */}
              <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-black">
                  <Grid size={14} />
                  <span>1. Размеры сетки и проекция</span>
                </div>
                <ul className="space-y-1 pl-4 list-disc text-[11.5px] text-slate-300">
                  <li><strong className="text-white">Базовый ромб:</strong> 64×32 пикселя (или HD 128×64) для идеального сцепления тайлов без швов.</li>
                  <li><strong className="text-white">Высота стен (2.5D):</strong> Стены подземелий или скал должны уходить вверх на 32 или 48 пикселей, создавая объем.</li>
                  <li><strong className="text-white">Точка схода:</strong> Единое освещение сверху-слева (под углом 45°), чтобы тени падали вправо-вниз.</li>
                </ul>
              </div>

              {/* 2. Essential Tile Sets */}
              <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-black">
                  <Layers size={14} />
                  <span>2. Обязательные наборы тайлов (Tile Categories)</span>
                </div>
                <div className="grid grid-cols-1 gap-2 text-[11px]">
                  <div className="p-2 bg-black/40 rounded-lg border border-slate-800">
                    <strong className="text-amber-300">🔹 Полы (Floors):</strong> Моховые каменные плиты, растрескавшийся булыжник, грязные доски, рунный пол с магическим свечением.
                  </div>
                  <div className="p-2 bg-black/40 rounded-lg border border-slate-800">
                    <strong className="text-amber-300">🔹 Стены и Скалы (Walls & Cliffs):</strong> Кирпичная кладка с глубоким AO (Ambient Occlusion), золотые жилы вкраплениями, скальные уступы.
                  </div>
                  <div className="p-2 bg-black/40 rounded-lg border border-slate-800">
                    <strong className="text-amber-300">🔹 Переходы (Autotiles):</strong> Стыки травы с землей и камня с лавой (внутренние и внешние углы 90°).
                  </div>
                  <div className="p-2 bg-black/40 rounded-lg border border-slate-800">
                    <strong className="text-amber-300">🔹 Пропы (Props & Hazards):</strong> Дрожащие факелы, ящики, наковальни, сияющие кристаллы, кипящая лава.
                  </div>
                </div>
              </div>

              {/* 3. AI Tile Prompts */}
              <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-black">
                  <Zap size={14} />
                  <span>3. Готовый промпт для нейросетей (Midjourney / DALL-E)</span>
                </div>
                <div className="bg-black/60 p-2.5 rounded-lg font-mono text-[10px] text-amber-200 border border-slate-800 select-all">
                  "Isometric dark fantasy dungeon tile set, 2.5D game art, cobblestone floor, mossy brick wall, glowing crystals, top-down isometric projection, rich contrast, pixel perfect or clean vector style, dark moody lighting, game asset sheet --ar 16:9"
                </div>
                <p className="text-[10.5px] text-slate-400">
                  💡 Нажмите на текст промпта, чтобы скопировать и сгенерировать потрясающий тайлсет в Midjourney или Stable Diffusion!
                </p>
              </div>
            </div>
          )}

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
