import { memo, useCallback, useState, useRef } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import BaseNode from './BaseNode';
import MaskEditor from '../MaskEditor';
import { Paintbrush, Upload, X, Maximize2, Minimize2 } from 'lucide-react';

/**
 * InpaintingNode - Node for inpainting with mask editor
 * Allows users to upload an image and paint a mask to define areas to regenerate
 */
const InpaintingNode = ({ id, data, isConnectable, selected }) => {
    const { updateNodeData } = useReactFlow();
    const fileInputRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isEditorExpanded, setIsEditorExpanded] = useState(false);

    // Handle image upload
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
                    originalHeight: img.height,
                    maskUrl: null // Reset mask when new image is loaded
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

    // Handle drag and drop
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
                    sourcePrompt: imageData.prompt,
                    maskUrl: null // Reset mask
                });
                return;
            } catch (err) {
                console.error('Failed to parse gallery image data:', err);
            }
        }

        // Handle file drop
        const file = e.dataTransfer.files?.[0];
        if (file) handleImageUpload(file);
    }, [handleImageUpload, id, updateNodeData]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
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
        if (e.currentTarget.contains(e.relatedTarget)) return;
        setIsDragging(false);
    }, []);

    const handleRemoveImage = useCallback(() => {
        updateNodeData(id, {
            imageUrl: null,
            imageName: null,
            originalWidth: null,
            originalHeight: null,
            maskUrl: null
        });
    }, [id, updateNodeData]);

    // Handle mask changes from the editor
    const handleMaskChange = useCallback((maskUrl) => {
        updateNodeData(id, { maskUrl });
    }, [id, updateNodeData]);

    const imageUrl = data.imageUrl;
    const maskUrl = data.maskUrl;

    return (
        <BaseNode
            title="Inpainting"
            icon={<Paintbrush size={16} />}
            color="violet"
            selected={selected}
            minWidth={isEditorExpanded ? 500 : 280}
            minHeight={isEditorExpanded ? 600 : 400}
        >
            {/* Input Handle - for prompt */}
            <Handle
                type="target"
                position={Position.Left}
                id="prompt-in"
                style={{ top: '20%' }}
                isConnectable={isConnectable}
                className="!bg-indigo-500 !border-indigo-300"
            />

            <div className="space-y-3">
                {/* Image Upload Area */}
                {!imageUrl ? (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        className={`
              relative aspect-square w-full rounded-lg overflow-hidden
              border-2 border-dashed transition-all cursor-pointer
              nodrag nopan
              ${isDragging
                                ? 'border-violet-400 bg-violet-500/20 scale-105 shadow-lg shadow-violet-500/30'
                                : 'border-white/20 hover:border-violet-400/50 bg-black/20'}
            `}
                    >
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                            <Upload size={32} className={`mb-2 ${isDragging ? 'text-violet-400 animate-bounce' : 'opacity-50'}`} />
                            <span className="text-sm text-center px-4">
                                {isDragging ? 'Drop image here!' : 'Upload image to inpaint'}
                            </span>
                            <span className="text-xs text-slate-600 mt-2">
                                Click, drag file, or from Gallery
                            </span>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Image Preview with Remove Button */}
                        <div className="relative rounded-lg overflow-hidden border border-white/10">
                            <img
                                src={imageUrl}
                                alt="Input"
                                className="w-full h-auto"
                            />
                            <button
                                onClick={handleRemoveImage}
                                className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-lg 
                  hover:bg-violet-500/80 transition-colors"
                            >
                                <X size={14} className="text-white" />
                            </button>
                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                                <p className="text-xs text-white truncate">{data.imageName}</p>
                                <p className="text-[10px] text-white/60">
                                    {data.originalWidth}×{data.originalHeight}
                                    {data.sourcePrompt && <span className="ml-1 text-violet-300">• from Gallery</span>}
                                </p>
                            </div>
                        </div>

                        {/* Expand/Collapse Editor Button */}
                        <button
                            onClick={() => setIsEditorExpanded(!isEditorExpanded)}
                            className="w-full flex items-center justify-center gap-2 py-2 px-3 
                bg-violet-500/10 hover:bg-violet-500/20 rounded-lg transition-all
                border border-violet-500/30 text-violet-400 text-sm font-medium"
                        >
                            {isEditorExpanded ? (
                                <>
                                    <Minimize2 size={14} />
                                    Collapse Mask Editor
                                </>
                            ) : (
                                <>
                                    <Maximize2 size={14} />
                                    Expand Mask Editor
                                </>
                            )}
                        </button>

                        {/* Mask Editor */}
                        {isEditorExpanded && (
                            <div className="nodrag nopan">
                                <MaskEditor
                                    imageUrl={imageUrl}
                                    onMaskChange={handleMaskChange}
                                    initialMask={maskUrl}
                                />
                            </div>
                        )}

                        {/* Mask Status Indicator */}
                        {!isEditorExpanded && (
                            <div className={`
                p-2 rounded-lg text-xs text-center
                ${maskUrl
                                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                                    : 'bg-black/20 text-slate-500 border border-white/10'}
              `}>
                                {maskUrl
                                    ? '✓ Mask created - Expand to edit'
                                    : 'No mask yet - Expand to create'}
                            </div>
                        )}
                    </>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                />

                {/* Instructions */}
                {!imageUrl && (
                    <div className="text-xs text-slate-600 bg-black/20 rounded-lg p-2">
                        <p className="font-semibold text-violet-400 mb-1">Inpainting workflow:</p>
                        <ol className="list-decimal list-inside space-y-0.5">
                            <li>Upload or drag an image</li>
                            <li>Paint mask over areas to regenerate</li>
                            <li>Connect prompt and generate</li>
                        </ol>
                    </div>
                )}
            </div>

            {/* Output Handle */}
            <Handle
                type="source"
                position={Position.Right}
                id="inpaint-out"
                isConnectable={isConnectable}
                className="!bg-violet-500 !border-violet-300"
            />
        </BaseNode>
    );
};

export default memo(InpaintingNode);
