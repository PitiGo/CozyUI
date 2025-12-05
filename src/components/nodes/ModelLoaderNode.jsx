import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import BaseNode from './BaseNode';
import { Box, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const AVAILABLE_MODELS = [
  {
    id: 'stable-diffusion-v1-5',
    name: 'Stable Diffusion 1.5',
    repo: 'Xenova/stable-diffusion-v1-5',
    size: '~1.7GB',
    description: 'Standard quality, good performance'
  },
  {
    id: 'sd-turbo',
    name: 'SD Turbo',
    repo: 'Xenova/sd-turbo',
    size: '~1.5GB',
    description: 'Fast generation, fewer steps'
  },
  {
    id: 'sdxl-turbo',
    name: 'SDXL Turbo',
    repo: 'Xenova/sdxl-turbo',
    size: '~2.5GB',
    description: 'High quality, 1024px output'
  }
];

const ModelLoaderNode = ({ id, data, isConnectable }) => {
  const { updateNodeData } = useReactFlow();

  const handleModelSelect = useCallback((model) => {
    updateNodeData(id, { 
      selectedModel: model,
      modelStatus: 'idle'
    });
  }, [id, updateNodeData]);

  const selectedModel = data.selectedModel || AVAILABLE_MODELS[0];
  const modelStatus = data.modelStatus || 'idle';

  const statusConfig = {
    idle: { icon: null, text: 'Ready to load', color: 'text-slate-500' },
    loading: { icon: <Loader2 className="animate-spin" size={14} />, text: 'Loading...', color: 'text-amber-400' },
    loaded: { icon: <CheckCircle2 size={14} />, text: 'Model loaded', color: 'text-emerald-400' },
    error: { icon: <AlertCircle size={14} />, text: 'Load failed', color: 'text-rose-400' }
  };

  const status = statusConfig[modelStatus];

  return (
    <BaseNode 
      title="Model Loader" 
      icon={<Box size={18} />}
      color="violet"
      status={modelStatus === 'loading' ? 'loading' : 'idle'}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="trigger-in"
        isConnectable={isConnectable}
        className="!bg-violet-500 !border-violet-300"
      />

      <div className="space-y-4">
        {/* Model Selection */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Select Model
          </label>
          <div className="space-y-2">
            {AVAILABLE_MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => handleModelSelect(model)}
                className={`
                  w-full p-3 rounded-lg border text-left transition-all
                  ${selectedModel.id === model.id 
                    ? 'bg-violet-500/20 border-violet-500/50' 
                    : 'bg-black/20 border-white/5 hover:border-white/20'}
                `}
              >
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-slate-200">
                    {model.name}
                  </span>
                  <span className="text-xs text-slate-500">{model.size}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{model.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className={`flex items-center gap-2 text-xs ${status.color}`}>
          {status.icon}
          <span>{status.text}</span>
        </div>

        {/* Progress bar when loading */}
        {modelStatus === 'loading' && data.loadProgress !== undefined && (
          <div className="space-y-1">
            <div className="h-1.5 bg-black/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-300"
                style={{ width: `${data.loadProgress}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 text-right">{data.loadProgress}%</p>
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

