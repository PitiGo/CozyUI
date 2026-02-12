import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import BaseNode from './BaseNode';
import { Image, Download, Maximize2 } from 'lucide-react';

const ImageDisplayNode = ({ data, isConnectable, selected }) => {
  const imageUrl = data.imageUrl;
  const isLoading = data.isLoading || false;
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });

  // Track real image dimensions via img element's onLoad handler
  const handleImageLoad = (e) => {
    setDimensions({ w: e.target.naturalWidth, h: e.target.naturalHeight });
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `cozyui-${Date.now()}.png`;
    link.click();
  };

  const handleFullscreen = () => {
    if (!imageUrl) return;
    window.open(imageUrl, '_blank');
  };

  return (
    <BaseNode
      title="Output"
      icon={<Image size={16} />}
      color="emerald"
      selected={selected}
      minWidth={200}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="image-in"
        isConnectable={isConnectable}
        className="!bg-emerald-500 !border-emerald-300"
      />

      <div className="space-y-3">
        {/* Image Preview */}
        <div
          className={`
            relative aspect-square w-full rounded-lg overflow-hidden
            border border-white/10 bg-black/30
            ${isLoading ? 'shimmer' : ''}
          `}
        >
          {imageUrl ? (
            <>
              <img
                src={imageUrl}
                alt="Generated"
                className="w-full h-full object-cover"
                onLoad={handleImageLoad}
              />
              {/* Overlay buttons */}
              <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100
                transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={handleFullscreen}
                  className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                >
                  <Maximize2 size={18} className="text-white" />
                </button>
                <button
                  onClick={handleDownload}
                  className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                >
                  <Download size={18} className="text-white" />
                </button>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
              <Image size={32} className="mb-2 opacity-50" />
              <span className="text-xs">Waiting for image...</span>
            </div>
          )}
        </div>

        {/* Image Info */}
        {imageUrl && dimensions.w > 0 && (
          <div className="flex justify-between text-xs text-slate-500">
            <span>{dimensions.w} × {dimensions.h}</span>
            <span>PNG</span>
          </div>
        )}

        {/* Action Buttons */}
        {imageUrl && (
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="flex-1 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30
                text-emerald-400 text-xs font-medium
                hover:bg-emerald-500/30 transition-colors
                flex items-center justify-center gap-1.5"
            >
              <Download size={14} />
              Download
            </button>
          </div>
        )}
      </div>
    </BaseNode>
  );
};

export default memo(ImageDisplayNode);

