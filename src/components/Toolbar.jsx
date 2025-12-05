import { memo, useState } from 'react';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Download,
  Upload,
  Settings,
  HelpCircle,
  Loader2,
  LayoutTemplate,
  ChevronDown,
  X
} from 'lucide-react';
import { useStore } from '../store/useStore.jsx';
import { presetWorkflows } from '../hooks/useWorkflow.jsx';

const Toolbar = ({ 
  onRunWorkflow, 
  onClearCanvas, 
  onExportWorkflow,
  onImportWorkflow,
  onLoadPreset
}) => {
  const { state } = useStore();
  const { model, generation } = state;
  const [showPresets, setShowPresets] = useState(false);
  
  const isModelLoaded = model.status === 'loaded';
  const isGenerating = generation.status === 'generating';

  return (
    <>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <div className="flex items-center gap-2 px-4 py-2 bg-[#12121a]/90 backdrop-blur-sm 
          border border-white/10 rounded-full shadow-2xl">
          
          {/* Run Button */}
          <button
            onClick={onRunWorkflow}
            disabled={isGenerating}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm
              transition-all duration-200
              ${!isGenerating
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg hover:shadow-emerald-500/30' 
                : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'}
            `}
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Play size={16} />
                Run Workflow
              </>
            )}
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-white/10" />

          {/* Stop Button */}
          <button
            disabled={!isGenerating}
            className={`
              p-2 rounded-full transition-colors
              ${isGenerating 
                ? 'text-rose-400 hover:bg-rose-500/20' 
                : 'text-slate-600 cursor-not-allowed'}
            `}
            title="Stop Generation"
          >
            <Square size={18} />
          </button>

          {/* Clear Canvas */}
          <button
            onClick={onClearCanvas}
            className="p-2 rounded-full text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            title="Reset Canvas"
          >
            <RotateCcw size={18} />
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-white/10" />

          {/* Presets */}
          <button
            onClick={() => setShowPresets(!showPresets)}
            className={`
              p-2 rounded-full transition-colors flex items-center gap-1
              ${showPresets 
                ? 'bg-indigo-500/20 text-indigo-400' 
                : 'text-slate-400 hover:bg-white/10 hover:text-white'}
            `}
            title="Workflow Presets"
          >
            <LayoutTemplate size={18} />
            <ChevronDown size={12} className={`transition-transform ${showPresets ? 'rotate-180' : ''}`} />
          </button>

          {/* Export */}
          <button
            onClick={onExportWorkflow}
            className="p-2 rounded-full text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            title="Export Workflow"
          >
            <Download size={18} />
          </button>

          {/* Import */}
          <button
            onClick={onImportWorkflow}
            className="p-2 rounded-full text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            title="Import Workflow"
          >
            <Upload size={18} />
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-white/10" />

          {/* Settings */}
          <button
            className="p-2 rounded-full text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            title="Settings"
          >
            <Settings size={18} />
          </button>

          {/* Help */}
          <button
            className="p-2 rounded-full text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            title="Help"
          >
            <HelpCircle size={18} />
          </button>
        </div>
      </div>

      {/* Presets Dropdown */}
      {showPresets && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-[#12121a]/95 backdrop-blur-sm border border-white/10 rounded-xl 
            shadow-2xl p-4 w-80">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-200">Workflow Presets</h3>
              <button 
                onClick={() => setShowPresets(false)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X size={14} className="text-slate-400" />
              </button>
            </div>
            
            <div className="space-y-2">
              {presetWorkflows.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    onLoadPreset?.(preset);
                    setShowPresets(false);
                  }}
                  className="w-full p-3 rounded-lg bg-white/5 border border-white/5 
                    hover:border-indigo-500/30 hover:bg-indigo-500/10
                    text-left transition-all group"
                >
                  <p className="text-sm font-medium text-slate-200 group-hover:text-indigo-300">
                    {preset.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {preset.description}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-2">
                    {preset.nodes.length} nodes • {preset.edges.length} connections
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default memo(Toolbar);
