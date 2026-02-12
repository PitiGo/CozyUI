import { memo, useState, useCallback, useEffect } from 'react';
import {
  Image,
  Download,
  Trash2,
  Maximize2,
  X,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  GripVertical
} from 'lucide-react';

const Gallery = ({ images = [], onDelete, onClear }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [draggingId, setDraggingId] = useState(null);

  // Close lightbox on Escape key
  useEffect(() => {
    if (!selectedImage) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedImage(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage]);

  const handleDragStart = useCallback((e, image) => {
    setDraggingId(image.id);
    // Store image data for the Img2Img node
    e.dataTransfer.setData('application/gallery-image', JSON.stringify({
      url: image.url,
      name: `generated-${image.id}.png`,
      width: image.width || 512,
      height: image.height || 512,
      prompt: image.prompt
    }));
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
  }, []);

  const handleDownload = (image) => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = `cozyui-${image.id}.png`;
    link.click();
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (images.length === 0) {
    return (
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Image size={12} />
            Gallery
          </h3>
          <span className="text-xs text-slate-600">0 images</span>
        </div>
        <div className="text-center py-6 text-slate-600">
          <Image size={24} className="mx-auto mb-2 opacity-50" />
          <p className="text-xs">No images yet</p>
          <p className="text-xs text-slate-700">Generated images will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="border-t border-white/5">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
        >
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Image size={12} />
            Gallery
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
              {images.length}
            </span>
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </button>

        {/* Gallery Grid */}
        {isExpanded && (
          <div className="px-4 pb-4">
            {/* Actions */}
            {images.length > 0 && (
              <div className="flex justify-end mb-2">
                <button
                  onClick={onClear}
                  className="text-xs text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1"
                >
                  <Trash2 size={10} />
                  Clear all
                </button>
              </div>
            )}

            {/* Images Grid */}
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {images.map((image) => (
                <div
                  key={image.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, image)}
                  onDragEnd={handleDragEnd}
                  className={`
                    group relative aspect-square rounded-lg overflow-hidden 
                    border bg-black/30 cursor-grab active:cursor-grabbing
                    transition-all
                    ${draggingId === image.id
                      ? 'border-rose-500 opacity-50 scale-95'
                      : 'border-white/10 hover:border-rose-500/50'}
                  `}
                  onClick={() => setSelectedImage(image)}
                >
                  <img
                    src={image.url}
                    alt={image.prompt?.slice(0, 30) || 'Generated'}
                    className="w-full h-full object-cover pointer-events-none"
                  />

                  {/* Drag Indicator */}
                  <div className="absolute top-1 right-1 p-1 bg-black/60 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical size={12} className="text-white/70" />
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(image);
                      }}
                      className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                    >
                      <Download size={14} className="text-white" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete?.(image.id);
                      }}
                      className="p-1.5 bg-white/10 rounded-lg hover:bg-rose-500/50 transition-colors"
                    >
                      <Trash2 size={14} className="text-white" />
                    </button>
                  </div>

                  {/* Model Badge */}
                  {image.model && (
                    <div className="absolute top-1 left-1 text-[8px] font-semibold text-indigo-300 bg-indigo-500/40 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                      {image.model}
                    </div>
                  )}

                  {/* Time Badge */}
                  <div className="absolute bottom-1 left-1 text-[10px] text-white/70 bg-black/50 px-1 rounded flex items-center gap-0.5">
                    <Clock size={8} />
                    {formatTime(image.timestamp)}
                  </div>

                  {/* Drag hint tooltip */}
                  <div className="absolute bottom-1 right-1 text-[9px] text-rose-400/80 bg-black/60 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    Drag to node
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-[#12121a] rounded-xl overflow-hidden border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-3 right-3 z-10 p-2 bg-black/50 rounded-lg hover:bg-black/70 transition-colors"
            >
              <X size={18} className="text-white" />
            </button>

            {/* Image */}
            <img
              src={selectedImage.url}
              alt="Generated"
              className="max-h-[70vh] object-contain"
            />

            {/* Info Panel */}
            <div className="p-4 border-t border-white/10">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                    <Sparkles size={12} className="text-indigo-400" />
                    <span>Prompt</span>
                  </div>
                  <p className="text-sm text-slate-300 line-clamp-2">
                    {selectedImage.prompt || 'No prompt saved'}
                  </p>

                  {selectedImage.negativePrompt && (
                    <>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-3 mb-1">
                        <span>Negative</span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1">
                        {selectedImage.negativePrompt}
                      </p>
                    </>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleDownload(selectedImage)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm hover:bg-emerald-500/30 transition-colors"
                  >
                    <Download size={14} />
                    Download
                  </button>
                </div>
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
                {selectedImage.model && (
                  <span className="text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded-full font-medium">
                    {selectedImage.model}
                  </span>
                )}
                <span>{selectedImage.width}×{selectedImage.height}</span>
                <span>Seed: {selectedImage.seed || 'random'}</span>
                <span>{formatTime(selectedImage.timestamp)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default memo(Gallery);

