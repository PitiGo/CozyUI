import { memo } from 'react';
import { useStore } from '../store/useStore.jsx';
import { useWebGPU } from '../hooks/useWebGPU.jsx';
import { 
  Cpu, 
  HardDrive, 
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
            Loading model ({model.progress}%)
          </span>
        );
      case 'loaded':
        return (
          <span className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 size={12} />
            Model loaded
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1.5 text-rose-400">
            <AlertCircle size={12} />
            Load failed
          </span>
        );
      default:
        return (
          <span className="text-slate-500">
            No model loaded
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
            Complete
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
          <Cpu size={12} className={webgpu.supported ? 'text-emerald-400' : 'text-rose-400'} />
          <span className="text-slate-400">
            {webgpu.supported ? 'WebGPU' : 'CPU Fallback'}
          </span>
        </div>
        
        <div className="w-px h-4 bg-white/10" />
        
        <div className="flex items-center gap-1.5">
          <HardDrive size={12} className="text-slate-400" />
          {getModelStatus()}
        </div>
      </div>

      {/* Center - Generation Status */}
      <div className="flex items-center gap-1.5">
        {getGenerationStatus()}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4 text-slate-500">
        <span>v0.1.0 MVP</span>
      </div>
    </div>
  );
};

export default memo(StatusBar);

