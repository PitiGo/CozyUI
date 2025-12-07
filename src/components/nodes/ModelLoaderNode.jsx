import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import BaseNode from './BaseNode';
import { Box, Loader2, AlertCircle, Cloud, Cpu, Zap } from 'lucide-react';
import { useStore, AVAILABLE_MODELS } from '../../store/useStore.jsx';

const ModelLoaderNode = ({ id, data, isConnectable, selected }) => {
  const { updateNodeData } = useReactFlow();
  const { state } = useStore();

  const handleModelSelect = useCallback((model) => {
    updateNodeData(id, { 
      selectedModel: model,
      modelStatus: 'idle'
    });
  }, [id, updateNodeData]);

  const selectedModel = data.selectedModel || AVAILABLE_MODELS[0];
  const modelStatus = data.modelStatus || 'idle';
  
  // Separate local and cloud models
  const localModels = AVAILABLE_MODELS.filter(m => m.engine === 'local');
  const cloudModels = AVAILABLE_MODELS.filter(m => m.engine === 'api');

  const isLocal = selectedModel.engine === 'local';

  const statusConfig = {
    idle: { 
      icon: isLocal ? <Cpu size={12} /> : <Cloud size={12} />, 
      text: 'Ready', 
      color: 'text-slate-400' 
    },
    loading: { 
      icon: <Loader2 className="animate-spin" size={12} />, 
      text: isLocal ? 'Downloading...' : 'Connecting...', 
      color: 'text-amber-400' 
    },
    loaded: { 
      icon: isLocal ? <Zap size={12} /> : <Cloud size={12} />, 
      text: isLocal ? 'Local Ready' : 'API Ready', 
      color: 'text-emerald-400' 
    },
    error: { 
      icon: <AlertCircle size={12} />, 
      text: 'Error', 
      color: 'text-rose-400' 
    }
  };

  const status = statusConfig[modelStatus];

  return (
    <BaseNode 
      title="Model" 
      icon={<Box size={16} />}
      color="violet"
      status={modelStatus === 'loading' ? 'loading' : 'idle'}
      selected={selected}
      minWidth={180}
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
        {/* Local Models (2025) */}
        <div className="flex-1 overflow-auto">
          <label className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider flex items-center gap-1 mb-1">
            <Cpu size={10} />
            Local WebGPU
          </label>
          <div className="space-y-1">
            {localModels.map((model) => (
              <button
                key={model.id}
                onClick={() => handleModelSelect(model)}
                className={`
                  w-full px-2 py-1.5 rounded text-left transition-all text-xs
                  ${selectedModel.id === model.id 
                    ? 'bg-emerald-500/30 border border-emerald-500/50 text-emerald-200' 
                    : 'bg-black/20 border border-white/5 hover:border-emerald-500/30 text-slate-300'}
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{model.name}</span>
                  {selectedModel.id === model.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  )}
                </div>
                <div className="text-[9px] text-slate-500">{model.description}</div>
              </button>
            ))}
          </div>

          {/* Cloud Models */}
          <label className="text-[10px] font-medium text-sky-400 uppercase tracking-wider flex items-center gap-1 mb-1 mt-2">
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
                    ? 'bg-sky-500/30 border border-sky-500/50 text-sky-200' 
                    : 'bg-black/20 border border-white/5 hover:border-sky-500/30 text-slate-300'}
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{model.name}</span>
                  {selectedModel.id === model.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
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
          <span className="truncate">{status.text}</span>
        </div>

        {/* Progress bar when loading */}
        {modelStatus === 'loading' && data.loadProgress !== undefined && (
          <div className="space-y-0.5">
            <div className="h-1 bg-black/30 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${isLocal ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-sky-500 to-indigo-500'}`}
                style={{ width: `${data.loadProgress}%` }}
              />
            </div>
            <p className="text-[9px] text-slate-500 text-center">{data.loadProgress}%</p>
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
