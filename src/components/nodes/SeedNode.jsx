import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import BaseNode from './BaseNode';
import { Dices, RefreshCw, Lock, Unlock } from 'lucide-react';

const SeedNode = ({ id, data, isConnectable, selected }) => {
  const { updateNodeData } = useReactFlow();

  const seed = data.seed ?? -1;
  const isLocked = data.isLocked ?? false;
  const lastUsedSeed = data.lastUsedSeed;

  const handleSeedChange = useCallback((value) => {
    const numValue = parseInt(value) || -1;
    updateNodeData(id, { seed: numValue });
  }, [id, updateNodeData]);

  const handleRandomize = useCallback(() => {
    const randomSeed = Math.floor(Math.random() * 2147483647);
    updateNodeData(id, { seed: randomSeed });
  }, [id, updateNodeData]);

  const handleToggleLock = useCallback(() => {
    updateNodeData(id, { isLocked: !isLocked });
  }, [id, isLocked, updateNodeData]);

  const handleUseLastSeed = useCallback(() => {
    if (lastUsedSeed !== undefined) {
      updateNodeData(id, { seed: lastUsedSeed });
    }
  }, [id, lastUsedSeed, updateNodeData]);

  return (
    <BaseNode 
      title="Seed" 
      icon={<Dices size={16} />}
      color="cyan"
      selected={selected}
      minWidth={180}
    >
      <div className="space-y-4">
        {/* Seed Input */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Seed Value
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={seed}
              onChange={(e) => handleSeedChange(e.target.value)}
              disabled={isLocked}
              className={`
                flex-1 px-3 py-2 bg-black/30 border border-white/10 rounded-lg
                text-sm text-slate-200 font-mono
                focus:outline-none focus:border-cyan-500/50
                ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              placeholder="-1 for random"
            />
            <button
              onClick={handleToggleLock}
              className={`
                p-2 rounded-lg border transition-all
                ${isLocked 
                  ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400' 
                  : 'bg-black/20 border-white/10 text-slate-400 hover:border-white/20'}
              `}
              title={isLocked ? 'Unlock seed' : 'Lock seed'}
            >
              {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleRandomize}
            disabled={isLocked}
            className={`
              flex-1 py-2 rounded-lg text-xs font-medium
              flex items-center justify-center gap-1.5
              transition-all
              ${isLocked 
                ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed' 
                : 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30'}
            `}
          >
            <RefreshCw size={12} />
            Randomize
          </button>
          
          {lastUsedSeed !== undefined && (
            <button
              onClick={handleUseLastSeed}
              disabled={isLocked}
              className={`
                flex-1 py-2 rounded-lg text-xs font-medium
                transition-all
                ${isLocked 
                  ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed' 
                  : 'bg-black/20 border border-white/10 text-slate-400 hover:border-white/20'}
              `}
            >
              Use Last
            </button>
          )}
        </div>

        {/* Info */}
        <div className="text-[10px] text-slate-600 space-y-1">
          <p>• <span className="text-slate-500">-1</span> = Random seed each generation</p>
          <p>• <span className="text-slate-500">Lock</span> = Keep same seed</p>
          {lastUsedSeed !== undefined && (
            <p>• Last used: <span className="text-cyan-400 font-mono">{lastUsedSeed}</span></p>
          )}
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="seed-out"
        isConnectable={isConnectable}
        className="!bg-cyan-500 !border-cyan-300"
      />
    </BaseNode>
  );
};

export default memo(SeedNode);

