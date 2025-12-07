import { memo, useCallback, useState, useRef } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import BaseNode from './BaseNode';
import { ImagePlus, Upload, X, Sliders } from 'lucide-react';

const Img2ImgNode = ({ id, data, isConnectable, selected }) => {
  const { updateNodeData } = useReactFlow();
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleImageUpload = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        updateNodeData(id, {
          imageUrl: e.target.result,
          imageName: file.name,
          originalWidth: img.width,
          originalHeight: img.height
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }, [id, updateNodeData]);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  }, [handleImageUpload]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    // Check if it's from the gallery
    const galleryData = e.dataTransfer.getData('application/gallery-image');
    if (galleryData) {
      try {
        const imageData = JSON.parse(galleryData);
        updateNodeData(id, {
          imageUrl: imageData.url,
          imageName: imageData.name || 'Gallery Image',
          originalWidth: imageData.width || 512,
          originalHeight: imageData.height || 512,
          sourcePrompt: imageData.prompt // Store original prompt for reference
        });
        return;
      } catch (err) {
        console.error('Failed to parse gallery image data:', err);
      }
    }
    
    // Otherwise handle as file drop
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageUpload(file);
  }, [handleImageUpload, id, updateNodeData]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    // Check if it's a gallery image or file
    if (e.dataTransfer.types.includes('application/gallery-image') || 
        e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
      setIsDragging(true);
    }
  }, []);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're actually leaving the drop zone
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  }, []);

  const handleRemoveImage = useCallback(() => {
    updateNodeData(id, {
      imageUrl: null,
      imageName: null,
      originalWidth: null,
      originalHeight: null
    });
  }, [id, updateNodeData]);

  const handleStrengthChange = useCallback((value) => {
    updateNodeData(id, { strength: value });
  }, [id, updateNodeData]);

  const imageUrl = data.imageUrl;
  const strength = data.strength ?? 0.75;

  return (
    <BaseNode 
      title="Img2Img" 
      icon={<ImagePlus size={16} />}
      color="rose"
      selected={selected}
      minWidth={200}
    >
      {/* Input Handle - for prompt */}
      <Handle
        type="target"
        position={Position.Left}
        id="prompt-in"
        style={{ top: '30%' }}
        isConnectable={isConnectable}
        className="!bg-indigo-500 !border-indigo-300"
      />

      <div className="space-y-4">
        {/* Image Upload Area */}
        <div
          onClick={() => !imageUrl && fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          className={`
            relative aspect-square w-full rounded-lg overflow-hidden
            border-2 border-dashed transition-all cursor-pointer
            nodrag nopan
            ${isDragging 
              ? 'border-rose-400 bg-rose-500/20 scale-105 shadow-lg shadow-rose-500/30' 
              : imageUrl 
                ? 'border-transparent' 
                : 'border-white/20 hover:border-rose-400/50 bg-black/20'}
          `}
        >
          {imageUrl ? (
            <>
              <img 
                src={imageUrl} 
                alt="Input" 
                className="w-full h-full object-cover"
              />
              {/* Remove button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveImage();
                }}
                className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-lg 
                  hover:bg-rose-500/80 transition-colors"
              >
                <X size={14} className="text-white" />
              </button>
              {/* Image info */}
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-xs text-white truncate">{data.imageName}</p>
                <p className="text-[10px] text-white/60">
                  {data.originalWidth}×{data.originalHeight}
                  {data.sourcePrompt && <span className="ml-1 text-rose-300">• from Gallery</span>}
                </p>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
              <Upload size={28} className={`mb-2 ${isDragging ? 'text-rose-400 animate-bounce' : 'opacity-50'}`} />
              <span className="text-xs text-center px-4">
                {isDragging ? 'Drop image here!' : 'Click, drag file, or from Gallery'}
              </span>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Denoising Strength */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Sliders size={10} />
              Denoising Strength
            </label>
            <span className="text-xs text-rose-400 font-mono">{strength.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={strength}
            onChange={(e) => handleStrengthChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-black/30 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 
              [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-rose-500 
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-rose-500/30"
          />
          <p className="text-[10px] text-slate-600">
            Low = subtle changes, High = more creative
          </p>
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="image-out"
        isConnectable={isConnectable}
        className="!bg-rose-500 !border-rose-300"
      />
    </BaseNode>
  );
};

export default memo(Img2ImgNode);

