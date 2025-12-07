import { memo, useCallback, useState, useRef, useEffect } from 'react';
import { Handle, Position, useReactFlow, useEdges } from '@xyflow/react';
import BaseNode from './BaseNode';
import { Scissors, Upload, X, Loader2, Download } from 'lucide-react';
import { useStore } from '../../store/useStore.jsx';

const BackgroundRemovalNode = ({ id, data, isConnectable, selected }) => {
  const { updateNodeData } = useReactFlow();
  const edges = useEdges();
  const { actions } = useStore();
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const lastProcessedInputRef = useRef(null);
  const isManualUploadRef = useRef(false);

  const handleImageUpload = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return;

    isManualUploadRef.current = true;
    const reader = new FileReader();
    reader.onload = (e) => {
      updateNodeData(id, {
        inputImage: e.target.result,
        outputImage: null,
        imageName: file.name
      });
      // Reset flag after processing would have started
      setTimeout(() => { isManualUploadRef.current = false; }, 500);
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
    
    isManualUploadRef.current = true;
    
    // Check if it's from the gallery
    const galleryData = e.dataTransfer.getData('application/gallery-image');
    if (galleryData) {
      try {
        const imageData = JSON.parse(galleryData);
        updateNodeData(id, {
          inputImage: imageData.url,
          outputImage: null, // Reset output when input changes
          imageName: imageData.name || 'Gallery Image'
        });
        // Reset flag after processing would have started
        setTimeout(() => { isManualUploadRef.current = false; }, 500);
        return;
      } catch (err) {
        console.error('Failed to parse gallery image data:', err);
      }
    }
    
    // Otherwise handle as file drop
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageUpload(file);
  }, [handleImageUpload, id, updateNodeData]);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('application/gallery-image') || 
        e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

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

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the drop zone
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  }, []);

  const handleRemoveBackground = useCallback(async (autoProcess = false) => {
    if (!data.inputImage || isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      // Call the worker to remove background
      actions.removeBackground(data.inputImage, (result) => {
        if (result.error) {
          console.error('Background removal failed:', result.error);
          if (!autoProcess) {
            alert('Background removal failed: ' + result.error);
          }
        } else {
          updateNodeData(id, {
            outputImage: result.imageUrl
          });
        }
        setIsProcessing(false);
      });
    } catch (err) {
      console.error('Error:', err);
      setIsProcessing(false);
    }
  }, [data.inputImage, isProcessing, actions, id, updateNodeData]);

  // Auto-process when inputImage changes from a connection
  useEffect(() => {
    // Check if there's an incoming connection
    const hasIncomingConnection = edges.some(e => e.target === id && e.targetHandle === 'image-in');
    
    // If there's a connection and inputImage changed, it's from a connection (not manual)
    if (hasIncomingConnection && data.inputImage && data.inputImage !== lastProcessedInputRef.current) {
      // Reset manual flag since this is from a connection
      isManualUploadRef.current = false;
    }
    
    // Only auto-process if:
    // 1. There's an incoming connection
    // 2. inputImage exists and changed
    // 3. Not already processing
    if (hasIncomingConnection && 
        data.inputImage && 
        data.inputImage !== lastProcessedInputRef.current &&
        !isProcessing) {
      
      const currentInputImage = data.inputImage; // Capture current value
      
      // Use a small delay to ensure state is stable
      const timeoutId = setTimeout(() => {
        // Double-check manual flag (should be false for connections)
        if (isManualUploadRef.current) {
          console.log('⏭️ Skipping auto-process (manual upload detected)');
          return;
        }
        
        // Verify inputImage still exists and matches what we captured
        if (!data.inputImage || data.inputImage !== currentInputImage) {
          // Input changed during delay, skip
          return;
        }
        
        console.log('🔄 Auto-processing background removal from connected node');
        lastProcessedInputRef.current = currentInputImage;
        handleRemoveBackground(true);
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [data.inputImage, edges, id, isProcessing, handleRemoveBackground]);

  const handleClear = useCallback(() => {
    lastProcessedInputRef.current = null;
    updateNodeData(id, {
      inputImage: null,
      outputImage: null,
      imageName: null
    });
  }, [id, updateNodeData]);

  const handleDownload = useCallback(() => {
    if (!data.outputImage) return;
    const link = document.createElement('a');
    link.href = data.outputImage;
    link.download = `no-bg-${Date.now()}.png`;
    link.click();
  }, [data.outputImage]);

  return (
    <BaseNode 
      title="Remove BG" 
      icon={<Scissors size={16} />}
      color="rose"
      selected={selected}
      minWidth={200}
      minHeight={150}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="image-in"
        isConnectable={isConnectable}
        className="!bg-rose-500 !border-rose-300"
      />

      <div className="space-y-2">
        {/* Upload Area */}
        {!data.inputImage ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              aspect-video w-full rounded-lg border-2 border-dashed
              flex flex-col items-center justify-center cursor-pointer
              transition-all
              ${isDragging 
                ? 'border-rose-500 bg-rose-500/10 scale-[1.02]' 
                : 'border-white/10 hover:border-rose-500/50 hover:bg-rose-500/5'}
            `}
          >
            <Upload size={24} className={`mb-1 transition-colors ${isDragging ? 'text-rose-400' : 'text-slate-500'}`} />
            <span className={`text-xs transition-colors ${isDragging ? 'text-rose-400' : 'text-slate-500'}`}>
              {isDragging ? 'Drop image here' : 'Drop image or click'}
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Before/After Preview */}
            <div className="grid grid-cols-2 gap-1">
              {/* Input */}
              <div 
                className="relative"
                onDrop={handleDrop}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <div className="text-[9px] text-slate-500 mb-0.5">Input</div>
                <div className={`
                  aspect-square rounded overflow-hidden border bg-black/30
                  relative group
                  ${isDragging ? 'border-rose-500 ring-2 ring-rose-500/50' : 'border-white/10'}
                `}>
                  <img 
                    src={data.inputImage} 
                    alt="Input" 
                    className="w-full h-full object-cover"
                  />
                  {isDragging && (
                    <div className="absolute inset-0 bg-rose-500/20 flex items-center justify-center">
                      <span className="text-xs text-rose-300 font-medium">Drop to replace</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Output */}
              <div className="relative">
                <div className="text-[9px] text-slate-500 mb-0.5">Output</div>
                <div 
                  className="aspect-square rounded overflow-hidden border border-white/10"
                  style={{
                    backgroundImage: 'linear-gradient(45deg, #1a1a2e 25%, transparent 25%), linear-gradient(-45deg, #1a1a2e 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1a1a2e 75%), linear-gradient(-45deg, transparent 75%, #1a1a2e 75%)',
                    backgroundSize: '8px 8px',
                    backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
                  }}
                >
                  {data.outputImage ? (
                    <img 
                      src={data.outputImage} 
                      alt="Output" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-[10px] text-slate-600">No output</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-1">
              <button
                onClick={handleRemoveBackground}
                disabled={isProcessing}
                className={`
                  flex-1 py-1.5 rounded text-xs font-medium
                  flex items-center justify-center gap-1
                  transition-all
                  ${isProcessing 
                    ? 'bg-rose-500/20 text-rose-300 cursor-wait' 
                    : 'bg-rose-500/30 border border-rose-500/50 text-rose-300 hover:bg-rose-500/40'}
                `}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Scissors size={12} />
                    Remove BG
                  </>
                )}
              </button>
              
              {data.outputImage && (
                <button
                  onClick={handleDownload}
                  className="p-1.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30"
                  title="Download"
                >
                  <Download size={12} />
                </button>
              )}
              
              <button
                onClick={handleClear}
                className="p-1.5 rounded bg-black/20 border border-white/10 text-slate-400 hover:bg-white/10"
                title="Clear"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Info */}
        <div className="text-[9px] text-slate-600 text-center">
          🖥️ Local WebGPU • RMBG-1.4
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

export default memo(BackgroundRemovalNode);

