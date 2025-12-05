import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import BaseNode from './BaseNode';
import { Maximize, Link, Unlink } from 'lucide-react';

const PRESET_SIZES = [
  { label: '256×256', width: 256, height: 256 },
  { label: '384×384', width: 384, height: 384 },
  { label: '512×512', width: 512, height: 512 },
  { label: '768×768', width: 768, height: 768 },
  { label: '512×768', width: 512, height: 768 },
  { label: '768×512', width: 768, height: 512 },
];

const ImageResizeNode = ({ id, data, isConnectable }) => {
  const { updateNodeData } = useReactFlow();

  const width = data.width ?? 512;
  const height = data.height ?? 512;
  const keepAspectRatio = data.keepAspectRatio ?? false;
  const originalAspect = data.originalAspect ?? 1;

  const handleWidthChange = useCallback((value) => {
    const newWidth = parseInt(value) || 512;
    if (keepAspectRatio) {
      const newHeight = Math.round(newWidth / originalAspect);
      updateNodeData(id, { width: newWidth, height: newHeight });
    } else {
      updateNodeData(id, { width: newWidth });
    }
  }, [id, keepAspectRatio, originalAspect, updateNodeData]);

  const handleHeightChange = useCallback((value) => {
    const newHeight = parseInt(value) || 512;
    if (keepAspectRatio) {
      const newWidth = Math.round(newHeight * originalAspect);
      updateNodeData(id, { width: newWidth, height: newHeight });
    } else {
      updateNodeData(id, { height: newHeight });
    }
  }, [id, keepAspectRatio, originalAspect, updateNodeData]);

  const handlePresetSelect = useCallback((preset) => {
    updateNodeData(id, { 
      width: preset.width, 
      height: preset.height,
      originalAspect: preset.width / preset.height
    });
  }, [id, updateNodeData]);

  const handleToggleAspectRatio = useCallback(() => {
    updateNodeData(id, { 
      keepAspectRatio: !keepAspectRatio,
      originalAspect: width / height
    });
  }, [id, keepAspectRatio, width, height, updateNodeData]);

  return (
    <BaseNode 
      title="Image Resize" 
      icon={<Maximize size={18} />}
      color="sky"
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="image-in"
        isConnectable={isConnectable}
        className="!bg-sky-500 !border-sky-300"
      />

      <div className="space-y-4">
        {/* Preset Sizes */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Presets
          </label>
          <div className="grid grid-cols-3 gap-1">
            {PRESET_SIZES.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePresetSelect(preset)}
                className={`
                  px-2 py-1.5 rounded text-[10px] font-medium transition-all
                  ${width === preset.width && height === preset.height
                    ? 'bg-sky-500/30 border border-sky-500/50 text-sky-300'
                    : 'bg-black/20 border border-white/5 text-slate-400 hover:border-white/20'}
                `}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Size */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Custom Size
            </label>
            <button
              onClick={handleToggleAspectRatio}
              className={`
                p-1 rounded transition-all
                ${keepAspectRatio 
                  ? 'text-sky-400' 
                  : 'text-slate-500 hover:text-slate-400'}
              `}
              title={keepAspectRatio ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
            >
              {keepAspectRatio ? <Link size={14} /> : <Unlink size={14} />}
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-slate-500 mb-1 block">Width</label>
              <input
                type="number"
                value={width}
                onChange={(e) => handleWidthChange(e.target.value)}
                min={64}
                max={2048}
                step={64}
                className="w-full px-2 py-1.5 bg-black/30 border border-white/10 rounded-lg
                  text-xs text-slate-200 font-mono
                  focus:outline-none focus:border-sky-500/50"
              />
            </div>
            
            <span className="text-slate-500 mt-4">×</span>
            
            <div className="flex-1">
              <label className="text-[10px] text-slate-500 mb-1 block">Height</label>
              <input
                type="number"
                value={height}
                onChange={(e) => handleHeightChange(e.target.value)}
                min={64}
                max={2048}
                step={64}
                className="w-full px-2 py-1.5 bg-black/30 border border-white/10 rounded-lg
                  text-xs text-slate-200 font-mono
                  focus:outline-none focus:border-sky-500/50"
              />
            </div>
          </div>
        </div>

        {/* Output Info */}
        <div className="text-[10px] text-slate-600 bg-black/20 rounded-lg p-2">
          Output: <span className="text-sky-400 font-mono">{width}×{height}</span>
          <span className="text-slate-500 ml-2">
            ({(width * height / 1000000).toFixed(2)} MP)
          </span>
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="size-out"
        isConnectable={isConnectable}
        className="!bg-sky-500 !border-sky-300"
      />
    </BaseNode>
  );
};

export default memo(ImageResizeNode);

