import { memo, useState } from 'react';
import { 
  Sparkles, 
  Box, 
  Cpu, 
  Image, 
  Layers,
  Zap,
  Github,
  Info,
  CheckCircle2,
  XCircle,
  Loader2,
  Keyboard,
  ImagePlus,
  Dices,
  Maximize,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useWebGPU } from '../hooks/useWebGPU.jsx';
import Gallery from './Gallery.jsx';

const nodeCategories = [
  {
    name: 'Basic',
    expanded: true,
    nodes: [
      {
        type: 'promptNode',
        label: 'Text Prompt',
        icon: Sparkles,
        color: 'indigo',
        description: 'Input your image description'
      },
      {
        type: 'modelLoaderNode',
        label: 'Model Loader',
        icon: Box,
        color: 'violet',
        description: 'Select and load AI model'
      },
      {
        type: 'inferenceNode',
        label: 'Run Inference',
        icon: Cpu,
        color: 'amber',
        description: 'Configure and generate'
      },
      {
        type: 'imageDisplayNode',
        label: 'Image Output',
        icon: Image,
        color: 'emerald',
        description: 'View generated image'
      }
    ]
  },
  {
    name: 'Advanced',
    expanded: true,
    nodes: [
      {
        type: 'img2imgNode',
        label: 'Image to Image',
        icon: ImagePlus,
        color: 'rose',
        description: 'Transform existing images'
      },
      {
        type: 'seedNode',
        label: 'Seed Generator',
        icon: Dices,
        color: 'cyan',
        description: 'Control randomness'
      },
      {
        type: 'imageResizeNode',
        label: 'Image Resize',
        icon: Maximize,
        color: 'sky',
        description: 'Change output dimensions'
      }
    ]
  }
];

const colorClasses = {
  indigo: 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/30',
  violet: 'bg-violet-500/20 border-violet-500/30 text-violet-400 hover:bg-violet-500/30',
  amber: 'bg-amber-500/20 border-amber-500/30 text-amber-400 hover:bg-amber-500/30',
  emerald: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30',
  rose: 'bg-rose-500/20 border-rose-500/30 text-rose-400 hover:bg-rose-500/30',
  cyan: 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30',
  sky: 'bg-sky-500/20 border-sky-500/30 text-sky-400 hover:bg-sky-500/30'
};

const Sidebar = ({ onDragStart, galleryImages = [], onDeleteImage, onClearGallery }) => {
  const webgpu = useWebGPU();
  const [expandedCategories, setExpandedCategories] = useState({ Basic: true, Advanced: true });

  const handleDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
    if (onDragStart) onDragStart(nodeType);
  };

  const toggleCategory = (categoryName) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };

  return (
    <aside className="w-72 h-full bg-[#0d0d12] border-r border-white/5 flex flex-col">
      {/* Logo Header */}
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 
            flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Layers size={22} className="text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-lg text-white tracking-tight" 
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              CozyUI
            </h1>
            <p className="text-xs text-slate-500">AI Studio</p>
          </div>
        </div>
      </div>

      {/* WebGPU Status */}
      <div className="px-5 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Zap size={14} className={
            webgpu.checking ? 'text-amber-400 animate-pulse' :
            webgpu.supported ? 'text-emerald-400' : 'text-rose-400'
          } />
          <span className="text-xs text-slate-400">WebGPU Status:</span>
          {webgpu.checking ? (
            <span className="text-xs text-amber-400 flex items-center gap-1">
              <Loader2 size={10} className="animate-spin" />
              Checking...
            </span>
          ) : webgpu.supported ? (
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <CheckCircle2 size={10} />
              Available
            </span>
          ) : (
            <span className="text-xs text-rose-400 flex items-center gap-1">
              <XCircle size={10} />
              Not Available
            </span>
          )}
        </div>
      </div>

      {/* Nodes Panel */}
      <div className="flex-1 overflow-y-auto p-5">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Available Nodes
        </h2>
        
        <div className="space-y-4">
          {nodeCategories.map((category) => (
            <div key={category.name}>
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.name)}
                className="w-full flex items-center gap-2 mb-2 text-xs font-semibold text-slate-400 
                  hover:text-slate-300 transition-colors"
              >
                {expandedCategories[category.name] ? (
                  <ChevronDown size={12} />
                ) : (
                  <ChevronRight size={12} />
                )}
                {category.name}
                <span className="text-slate-600 font-normal">({category.nodes.length})</span>
              </button>
              
              {/* Category Nodes */}
              {expandedCategories[category.name] && (
                <div className="space-y-2 ml-1">
                  {category.nodes.map((node) => (
                    <div
                      key={node.type}
                      draggable
                      onDragStart={(e) => handleDragStart(e, node.type)}
                      className={`
                        p-3 rounded-lg border cursor-grab active:cursor-grabbing
                        transition-all duration-200 select-none
                        ${colorClasses[node.color]}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <node.icon size={18} />
                        <div>
                          <p className="text-sm font-medium text-slate-200">{node.label}</p>
                          <p className="text-xs text-slate-500">{node.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 rounded-lg bg-white/5 border border-white/5">
          <div className="flex items-start gap-2">
            <Info size={14} className="text-slate-500 mt-0.5 shrink-0" />
            <div className="text-xs text-slate-500 space-y-1">
              <p><strong className="text-slate-400">Drag & Drop</strong> nodes to the canvas</p>
              <p><strong className="text-slate-400">Connect</strong> outputs → inputs</p>
              <p><strong className="text-slate-400">Configure</strong> each node's settings</p>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="mt-4 p-4 rounded-lg bg-white/5 border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Keyboard size={12} className="text-slate-500" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Shortcuts</span>
          </div>
          <div className="text-xs text-slate-500 space-y-1">
            <p><kbd className="px-1.5 py-0.5 bg-black/30 rounded text-slate-400">⌘/Ctrl + Enter</kbd> Generate</p>
            <p><kbd className="px-1.5 py-0.5 bg-black/30 rounded text-slate-400">⌘/Ctrl + R</kbd> Reset</p>
          </div>
        </div>
      </div>

      {/* Gallery */}
      <Gallery 
        images={galleryImages}
        onDelete={onDeleteImage}
        onClear={onClearGallery}
      />

      {/* Footer */}
      <div className="p-4 border-t border-white/5">
        <a 
          href="https://github.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          <Github size={14} />
          <span>Open Source on GitHub</span>
        </a>
      </div>
    </aside>
  );
};

export default memo(Sidebar);

