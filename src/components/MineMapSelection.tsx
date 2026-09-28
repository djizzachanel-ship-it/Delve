import React from 'react';
import { PoEDelveMineMap, PoEDelveMineMapProps } from './PoEDelveMineMap';
import { DelveNode, DelveGridGraph } from '../game/delveGrid';
import { MineMapNode, MineMapGraph } from '../game/mapGenerator';
import { GameState } from '../types';

export { PoEDelveMineMap } from './PoEDelveMineMap';

export interface MineMapSelectionProps {
  state: GameState;
  onSelectNodeAndStart: (node: any) => void;
  onReturnToTown?: () => void;
  onBuyModule: (mod: 'searchlight' | 'turret' | 'magnet') => void;
  canAffordModule: (mod: 'searchlight' | 'turret' | 'magnet') => boolean;
  savedMap?: any;
  onUpdateMap?: (map: any) => void;
  savedGrid?: DelveGridGraph;
  onUpdateGrid?: (grid: DelveGridGraph) => void;
}

/**
 * MineMapSelection wraps PoEDelveMineMap providing backward and forward compatibility.
 */
export const MineMapSelection: React.FC<MineMapSelectionProps> = ({
  state,
  onSelectNodeAndStart,
  onReturnToTown,
  onBuyModule,
  canAffordModule,
  savedGrid,
  onUpdateGrid,
  savedMap,
  onUpdateMap
}) => {
  return (
    <PoEDelveMineMap
      state={state}
      onSelectNodeAndStart={onSelectNodeAndStart}
      onReturnToTown={onReturnToTown}
      onBuyModule={onBuyModule}
      canAffordModule={canAffordModule}
      savedGrid={savedGrid || savedMap}
      onUpdateGrid={onUpdateGrid || onUpdateMap}
    />
  );
};
