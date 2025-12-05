import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import BaseNode from './BaseNode';
import { Sparkles } from 'lucide-react';

const PromptNode = ({ id, data, isConnectable }) => {
  const { updateNodeData } = useReactFlow();

  const handlePromptChange = useCallback((e) => {
    updateNodeData(id, { prompt: e.target.value });
  }, [id, updateNodeData]);

  const handleNegativeChange = useCallback((e) => {
    updateNodeData(id, { negativePrompt: e.target.value });
  }, [id, updateNodeData]);

  return (
    <BaseNode 
      title="Text Prompt" 
      icon={<Sparkles size={18} />}
      color="indigo"
    >
      <div className="space-y-4">
        {/* Positive Prompt */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Prompt
          </label>
          <textarea
            value={data.prompt || ''}
            onChange={handlePromptChange}
            placeholder="A cyberpunk city at night, neon lights, rain..."
            className="
              w-full h-24 px-3 py-2 
              bg-black/30 border border-white/10 rounded-lg
              text-sm text-slate-200 placeholder:text-slate-600
              resize-none focus:outline-none focus:border-indigo-500/50
              transition-colors
            "
          />
        </div>

        {/* Negative Prompt */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Negative Prompt
          </label>
          <textarea
            value={data.negativePrompt || ''}
            onChange={handleNegativeChange}
            placeholder="blurry, low quality, distorted..."
            className="
              w-full h-16 px-3 py-2 
              bg-black/30 border border-white/10 rounded-lg
              text-sm text-slate-200 placeholder:text-slate-600
              resize-none focus:outline-none focus:border-rose-500/30
              transition-colors
            "
          />
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="prompt-out"
        isConnectable={isConnectable}
        className="!bg-indigo-500 !border-indigo-300"
      />
    </BaseNode>
  );
};

export default memo(PromptNode);

