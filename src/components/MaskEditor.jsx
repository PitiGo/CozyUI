import { memo, useRef, useEffect, useState, useCallback } from 'react';
import { Brush, Eraser, RotateCcw, Download, Eye, EyeOff, ZoomIn, ZoomOut } from 'lucide-react';

/**
 * MaskEditor - Canvas-based mask painting tool for Inpainting
 * Allows users to paint white areas on a black background over an input image
 */
const MaskEditor = ({
  imageUrl,
  onMaskChange,
  initialMask = null,
  className = ''
}) => {
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('brush'); // 'brush' or 'eraser'
  const [brushSize, setBrushSize] = useState(30);
  const [showMask, setShowMask] = useState(true);
  const [opacity, setOpacity] = useState(0.7);
  const [cursorPos, setCursorPos] = useState(null);
  const imageRef = useRef(null);
  const lastPointRef = useRef(null);

  // Load image and initialize canvas
  useEffect(() => {
    if (!imageUrl || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Set canvas dimensions to match image
      canvas.width = img.width;
      canvas.height = img.height;

      imageRef.current = img;

      // Initialize with black background (no mask)
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // If there's an initial mask, load it
      if (initialMask) {
        const maskImg = new Image();
        maskImg.onload = () => {
          ctx.drawImage(maskImg, 0, 0);
        };
        maskImg.src = initialMask;
      }

      // Trigger initial mask change
      if (onMaskChange) {
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          onMaskChange(url);
        });
      }
    };

    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
  }, [imageUrl, initialMask]);

  // Get mouse position relative to canvas
  const getCanvasPoint = useCallback((e) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }, []);

  // Update overlay canvas to show current state
  const updateOverlay = useCallback(() => {
    const overlayCanvas = overlayCanvasRef.current;
    const maskCanvas = canvasRef.current;
    if (!overlayCanvas || !maskCanvas || !imageRef.current) return;

    const ctx = overlayCanvas.getContext('2d');

    // Clear overlay
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    // Draw base image
    ctx.drawImage(imageRef.current, 0, 0);

    // Draw mask overlay with opacity
    if (showMask) {
      ctx.globalAlpha = opacity;
      ctx.drawImage(maskCanvas, 0, 0);
      ctx.globalAlpha = 1;
    }
  }, [showMask, opacity]);

  // Drawing function
  const draw = useCallback((point) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    ctx.globalCompositeOperation = tool === 'brush' ? 'source-over' : 'destination-out';
    ctx.strokeStyle = 'white';
    ctx.fillStyle = 'white';
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (lastPointRef.current) {
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    } else {
      // Draw a dot if no previous point
      ctx.beginPath();
      ctx.arc(point.x, point.y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    lastPointRef.current = point;

    // IMMEDIATELY update the overlay for visual feedback
    updateOverlay();

    // Trigger mask change callback
    if (onMaskChange) {
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        onMaskChange(url);
      });
    }
  }, [tool, brushSize, onMaskChange, updateOverlay]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return; // Only left click
    setIsDrawing(true);
    const point = getCanvasPoint(e);
    if (point) {
      lastPointRef.current = null;
      draw(point);
    }
  }, [getCanvasPoint, draw]);

  const handleMouseMove = useCallback((e) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    // Update cursor position for visual indicator
    setCursorPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });

    // Draw if mouse is down
    if (isDrawing) {
      const point = getCanvasPoint(e);
      if (point) {
        draw(point);
      }
    }
  }, [isDrawing, getCanvasPoint, draw]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
    lastPointRef.current = null;
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDrawing(false);
    lastPointRef.current = null;
    setCursorPos(null); // Hide cursor indicator
  }, []);

  const handleMouseEnter = useCallback(() => {
    // Cursor indicator will be shown by handleMouseMove
  }, []);

  // Clear mask (reset to black)
  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // IMMEDIATELY update the overlay for visual feedback
    updateOverlay();

    if (onMaskChange) {
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        onMaskChange(url);
      });
    }
  }, [onMaskChange, updateOverlay]);

  // Download mask as PNG
  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'inpainting-mask.png';
      a.click();
      URL.revokeObjectURL(url);
    });
  }, []);

  // Redraw overlay canvas when mask visibility or opacity changes
  useEffect(() => {
    updateOverlay();
  }, [updateOverlay]);

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center justify-between bg-black/30 rounded-lg p-2">
        {/* Drawing Tools */}
        <div className="flex gap-1">
          <button
            onClick={() => setTool('brush')}
            className={`p-2 rounded-lg transition-all duration-200 ${tool === 'brush'
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/50 scale-110 ring-2 ring-purple-400/50'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-purple-300'
              }`}
            title="Brush (Paint mask)"
          >
            <Brush size={16} className={tool === 'brush' ? 'animate-pulse' : ''} />
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`p-2 rounded-lg transition-all duration-200 ${tool === 'eraser'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/50 scale-110 ring-2 ring-rose-400/50'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-rose-300'
              }`}
            title="Eraser (Remove mask)"
          >
            <Eraser size={16} className={tool === 'eraser' ? 'animate-pulse' : ''} />
          </button>
          <div className="w-px bg-white/10 mx-1" />
          <button
            onClick={handleClear}
            className="p-2 rounded-lg bg-white/5 text-slate-400 hover:bg-rose-500/30 hover:text-rose-300 hover:scale-110 transition-all duration-200 active:scale-95"
            title="Clear mask"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {/* Brush Size */}
        <div className="flex items-center gap-2 min-w-[120px]">
          <ZoomOut size={12} className="text-slate-500" />
          <input
            type="range"
            min="5"
            max="100"
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            className="flex-1 h-1.5 bg-black/30 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 
              [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-purple-500 
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
            title={`Brush size: ${brushSize}px`}
          />
          <ZoomIn size={12} className="text-slate-500" />
          <span className="text-xs text-slate-400 font-mono w-8 text-right">{brushSize}</span>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMask(!showMask)}
            className={`p-2 rounded-lg transition-all ${showMask
              ? 'bg-purple-500 text-white'
              : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            title={showMask ? 'Hide mask overlay' : 'Show mask overlay'}
          >
            {showMask ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          <button
            onClick={handleDownload}
            className="p-2 rounded-lg bg-white/5 text-slate-400 hover:bg-purple-500/20 hover:text-purple-400 transition-all"
            title="Download mask"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Opacity Control */}
      {showMask && (
        <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2">
          <label className="text-xs text-slate-400 min-w-[60px]">Opacity</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
            className="flex-1 h-1.5 bg-black/30 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 
              [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-purple-500 
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
          />
          <span className="text-xs text-slate-400 font-mono w-8 text-right">{Math.round(opacity * 100)}%</span>
        </div>
      )}

      {/* Canvas Container */}
      <div className="relative rounded-lg overflow-hidden bg-black/40 border border-white/10">
        <div className="relative w-full aspect-square">
          {/* Hidden mask canvas (actual drawing surface) */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 hidden"
          />

          {/* Visible overlay canvas (shows image + mask) */}
          <canvas
            ref={overlayCanvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onMouseEnter={handleMouseEnter}
            className="absolute inset-0 w-full h-full cursor-none"
            style={{ touchAction: 'none' }}
          />

          {/* Custom cursor indicator */}
          {cursorPos && (
            <div
              className="absolute pointer-events-none border-2 rounded-full transition-all"
              style={{
                left: cursorPos.x,
                top: cursorPos.y,
                width: brushSize,
                height: brushSize,
                transform: 'translate(-50%, -50%)',
                borderColor: tool === 'brush' ? '#a78bfa' : '#f87171',
                opacity: 0.8,
                boxShadow: tool === 'brush'
                  ? '0 0 10px rgba(167, 139, 250, 0.5)'
                  : '0 0 10px rgba(248, 113, 113, 0.5)'
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="w-1 h-1 rounded-full"
                  style={{
                    backgroundColor: tool === 'brush' ? '#a78bfa' : '#f87171'
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="text-xs text-slate-500 bg-black/20 rounded-lg p-2">
        <p><strong className="text-purple-400">Paint white areas</strong> to mark regions for inpainting.</p>
        <p className="mt-1">• Use <strong>Brush</strong> to add mask • <strong>Eraser</strong> to remove • <strong>Clear</strong> to reset</p>
      </div>
    </div>
  );
};

export default memo(MaskEditor);
