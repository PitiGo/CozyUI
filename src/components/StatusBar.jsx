import { memo } from 'react';
import { useStore } from '../store/useStore.jsx';
import { useWebGPU } from '../hooks/useWebGPU.jsx';
import { 
  Cpu, 
  Cloud, 
  Activity,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';

const StatusBar = () => {
  const { state } = useStore();
  const { model, generation } = state;
  const webgpu = useWebGPU();

  const getModelStatus = () => {
    switch (model.status) {
      case 'loading':
        return (
          <span className="flex items-center gap-1.5 text-amber-400">
            <Loader2 size={12} className="animate-spin" />
            Connecting...
          </span>
        );
      case 'loaded':
        return (
          <span className="flex items-center gap-1.5 text-emerald-400">
            <Cloud size={12} />
            {model.id || 'Ready'}
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1.5 text-rose-400">
            <AlertCircle size={12} />
            Error
          </span>
        );
      default:
        return (
          <span className="text-slate-500">
            No model
          </span>
        );
    }
  };

  const getGenerationStatus = () => {
    switch (generation.status) {
      case 'generating':
        return (
          <span className="flex items-center gap-1.5 text-amber-400">
            <Activity size={12} className="animate-pulse" />
            Generating ({generation.progress}%)
          </span>
        );
      case 'complete':
        return (
          <span className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 size={12} />
            Done
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1.5 text-rose-400">
            <AlertCircle size={12} />
            Failed
          </span>
        );
      default:
        return (
          <span className="text-slate-500">
            Ready
          </span>
        );
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 h-8 z-10
      bg-[#0d0d12]/90 backdrop-blur-sm border-t border-white/5
      flex items-center justify-between px-4 text-xs">
      
      {/* Left side */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Cpu size={12} className={webgpu.supported ? 'text-emerald-400' : 'text-slate-500'} />
          <span className={webgpu.supported ? 'text-emerald-400' : 'text-slate-400'}>
            {webgpu.supported ? 'WebGPU ✓' : 'CPU'}
          </span>
        </div>
        
        <div className="w-px h-4 bg-white/10" />
        
        <div className="flex items-center gap-1.5">
          {getModelStatus()}
        </div>
      </div>

      {/* Center - Generation Status */}
      <div className="flex items-center gap-1.5">
        {getGenerationStatus()}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4 text-slate-500">
        <span className="text-[10px]">Pollinations.ai + WebGPU Enhancement</span>
      </div>
    </div>
  );
};

export default memo(StatusBar);
