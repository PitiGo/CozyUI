import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow, useNodes } from '@xyflow/react';
import BaseNode from './BaseNode';
import { Cpu, Play, Loader2 } from 'lucide-react';
import { useStore } from '../../store/useStore.jsx';

const InferenceNode = ({ id, data, isConnectable }) => {
  const { updateNodeData } = useReactFlow();
  const nodes = useNodes();
  const { state, actions } = useStore();

  const handleChange = useCallback((field, value) => {
    updateNodeData(id, { [field]: value });
  }, [id, updateNodeData]);

  const handleGenerate = useCallback((e) => {
    e.stopPropagation(); // Prevent React Flow from intercepting the click
    console.log('🚀 Generate clicked!');
    console.log('Nodes:', nodes);
    
    // Find the prompt node
    const promptNode = nodes.find(n => n.type === 'promptNode');
    const modelNode = nodes.find(n => n.type === 'modelLoaderNode');
    const img2imgNode = nodes.find(n => n.type === 'img2imgNode');
    
    if (!promptNode) {
      alert('Please add a Text Prompt node and connect it');
      return;
    }
    
    if (!modelNode) {
      alert('Please add a Model Loader node and connect it');
      return;
    }

    const prompt = promptNode.data?.prompt;
    if (!prompt || prompt.trim() === '') {
      alert('Please enter a prompt in the Text Prompt node');
      return;
    }

    const selectedModel = modelNode.data?.selectedModel;
    if (!selectedModel) {
      alert('Please select a model in the Model Loader node');
      return;
    }

    // Check if image-to-image is being used
    const sourceImage = img2imgNode?.data?.imageUrl || null;
    const strength = img2imgNode?.data?.strength ?? 0.75;
    
    if (sourceImage) {
      console.log('🖼️ Image-to-Image mode detected');
    }

    // First load the model if not loaded
    if (state.model.status !== 'loaded' || state.model.id !== selectedModel.id) {
      console.log('Loading model:', selectedModel.repo);
      actions.loadModel(selectedModel.id, selectedModel.repo);
    }
    
    // Generate - the store will handle waiting for model load
    console.log('Starting generation with prompt:', prompt);
    actions.generate({
      prompt: prompt,
      negativePrompt: promptNode.data?.negativePrompt || '',
      steps: data.steps || 4,
      guidanceScale: data.guidanceScale || 1,
      width: data.width || 512,
      height: data.height || 512,
      seed: data.seed || -1,
      sourceImage: sourceImage, // Pass image for img2img
      strength: strength, // Pass strength for img2img
    });
  }, [nodes, data, state.model, actions]);

  const steps = data.steps || 20;
  const guidanceScale = data.guidanceScale || 7.5;
  const seed = data.seed || -1;
  const width = data.width || 512;
  const height = data.height || 512;
  const isGenerating = data.isGenerating || false;
  const progress = data.progress || 0;

  return (
    <BaseNode 
      title="Run Inference" 
      icon={<Cpu size={18} />}
      color="amber"
      status={isGenerating ? 'loading' : 'idle'}
    >
      {/* Input Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="prompt-in"
        style={{ top: '30%' }}
        isConnectable={isConnectable}
        className="!bg-indigo-500 !border-indigo-300"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="model-in"
        style={{ top: '70%' }}
        isConnectable={isConnectable}
        className="!bg-violet-500 !border-violet-300"
      />

      <div className="space-y-4">
        {/* Steps */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Steps
            </label>
            <span className="text-xs text-slate-500">{steps}</span>
          </div>
          <input
            type="range"
            min="1"
            max="50"
            value={steps}
            onChange={(e) => handleChange('steps', parseInt(e.target.value))}
            className="w-full h-1.5 bg-black/30 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 
              [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-amber-500 
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-amber-500/30"
          />
        </div>

        {/* Guidance Scale */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              CFG Scale
            </label>
            <span className="text-xs text-slate-500">{guidanceScale}</span>
          </div>
          <input
            type="range"
            min="1"
            max="20"
            step="0.5"
            value={guidanceScale}
            onChange={(e) => handleChange('guidanceScale', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-black/30 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 
              [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-amber-500 
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-amber-500/30"
          />
        </div>

        {/* Dimensions */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Width
            </label>
            <select
              value={width}
              onChange={(e) => handleChange('width', parseInt(e.target.value))}
              className="w-full px-2 py-1.5 bg-black/30 border border-white/10 rounded-lg
                text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
            >
              <option value={256}>256px</option>
              <option value={384}>384px</option>
              <option value={512}>512px</option>
              <option value={768}>768px</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Height
            </label>
            <select
              value={height}
              onChange={(e) => handleChange('height', parseInt(e.target.value))}
              className="w-full px-2 py-1.5 bg-black/30 border border-white/10 rounded-lg
                text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
            >
              <option value={256}>256px</option>
              <option value={384}>384px</option>
              <option value={512}>512px</option>
              <option value={768}>768px</option>
            </select>
          </div>
        </div>

        {/* Seed */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Seed (-1 = random)
          </label>
          <input
            type="number"
            value={seed}
            onChange={(e) => handleChange('seed', parseInt(e.target.value))}
            className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg
              text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        {/* Progress */}
        {isGenerating && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-amber-400">
              <Loader2 className="animate-spin" size={14} />
              <span>Generating... {progress}%</span>
            </div>
            <div className="h-1.5 bg-black/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className={`
            w-full py-2.5 rounded-lg font-medium text-sm
            flex items-center justify-center gap-2
            transition-all duration-200
            ${isGenerating 
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg hover:shadow-amber-500/30 hover:scale-[1.02]'}
          `}
        >
          {isGenerating ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              Processing...
            </>
          ) : (
            <>
              <Play size={16} />
              Generate
            </>
          )}
        </button>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="image-out"
        isConnectable={isConnectable}
        className="!bg-emerald-500 !border-emerald-300"
      />
    </BaseNode>
  );
};

export default memo(InferenceNode);

