import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import BaseNode from './BaseNode';
import { Box, Loader2, AlertCircle, Cloud, Cpu, Lock } from 'lucide-react';
import { useStore, AVAILABLE_MODELS } from '../../store/useStore.jsx';

const ModelLoaderNode = ({ id, data, isConnectable, selected }) => {
  const { updateNodeData } = useReactFlow();
  const { state } = useStore();

  const handleModelSelect = useCallback((model) => {
    if (model.disabled) return;
    updateNodeData(id, { 
      selectedModel: model,
      modelStatus: 'idle'
    });
  }, [id, updateNodeData]);

  const selectedModel = data.selectedModel || AVAILABLE_MODELS[0];
  const modelStatus = data.modelStatus || 'idle';
  
  // Separate cloud and local models
  const cloudModels = AVAILABLE_MODELS.filter(m => m.engine === 'api');
  const localModels = AVAILABLE_MODELS.filter(m => m.engine === 'local');

  const statusConfig = {
    idle: { icon: <Cloud size={12} />, text: 'Ready', color: 'text-slate-400' },
    loading: { icon: <Loader2 className="animate-spin" size={12} />, text: 'Connecting...', color: 'text-amber-400' },
    loaded: { icon: <Cloud size={12} />, text: 'Connected', color: 'text-emerald-400' },
    error: { icon: <AlertCircle size={12} />, text: 'Error', color: 'text-rose-400' }
  };

  const status = statusConfig[modelStatus];

  return (
    <BaseNode 
      title="Model" 
      icon={<Box size={16} />}
      color="violet"
      status={modelStatus === 'loading' ? 'loading' : 'idle'}
      selected={selected}
      minWidth={160}
      minHeight={200}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="trigger-in"
        isConnectable={isConnectable}
        className="!bg-violet-500 !border-violet-300"
      />

      <div className="space-y-2 h-full flex flex-col">
        {/* Cloud Models */}
        <div className="flex-1 overflow-auto">
          <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-1">
            <Cloud size={10} />
            Cloud API
          </label>
          <div className="space-y-1">
            {cloudModels.map((model) => (
              <button
                key={model.id}
                onClick={() => handleModelSelect(model)}
                className={`
                  w-full px-2 py-1.5 rounded text-left transition-all text-xs
                  ${selectedModel.id === model.id 
                    ? 'bg-violet-500/30 border border-violet-500/50 text-violet-200' 
                    : 'bg-black/20 border border-white/5 hover:border-white/20 text-slate-300'}
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{model.name}</span>
                  {selectedModel.id === model.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                  )}
                </div>
                <div className="text-[9px] text-slate-500">{model.description}</div>
              </button>
            ))}
          </div>

          {/* Local Models */}
          <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-1 mt-2">
            <Cpu size={10} />
            Local GPU
          </label>
          <div className="space-y-1">
            {localModels.map((model) => (
              <button
                key={model.id}
                disabled={model.disabled}
                onClick={() => handleModelSelect(model)}
                className={`
                  w-full px-2 py-1.5 rounded text-left transition-all text-xs
                  ${model.disabled 
                    ? 'bg-black/10 border border-white/5 opacity-50 cursor-not-allowed' 
                    : selectedModel.id === model.id
                      ? 'bg-emerald-500/30 border border-emerald-500/50 text-emerald-200'
                      : 'bg-black/20 border border-white/5 hover:border-white/20 text-slate-300'}
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{model.name}</span>
                  {model.comingSoon && (
                    <span className="flex items-center gap-0.5 text-[8px] text-amber-400 bg-amber-500/20 px-1 py-0.5 rounded">
                      <Lock size={8} />
                      Soon
                    </span>
                  )}
                </div>
                <div className="text-[9px] text-slate-500">{model.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className={`flex items-center gap-1.5 text-[10px] pt-1 border-t border-white/5 ${status.color}`}>
          {status.icon}
          <span className="truncate">{selectedModel.name} • {status.text}</span>
        </div>

        {/* Progress bar when loading */}
        {modelStatus === 'loading' && data.loadProgress !== undefined && (
          <div className="h-1 bg-black/30 rounded-full overflow-hidden">
            <div 
              className="h-full transition-all duration-300 bg-gradient-to-r from-violet-500 to-indigo-500"
              style={{ width: `${data.loadProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="model-out"
        isConnectable={isConnectable}
        className="!bg-violet-500 !border-violet-300"
      />
    </BaseNode>
  );
};

export default memo(ModelLoaderNode);
