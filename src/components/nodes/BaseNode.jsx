import { memo } from 'react';

const BaseNode = ({ 
  children, 
  title, 
  icon, 
  color = 'indigo',
  status = 'idle',
  isConnectable = true 
}) => {
  const colorVariants = {
    indigo: {
      border: 'border-indigo-500/50',
      activeBorder: 'border-indigo-400',
      bg: 'bg-indigo-500/10',
      glow: 'shadow-indigo-500/20',
      icon: 'text-indigo-400'
    },
    violet: {
      border: 'border-violet-500/50',
      activeBorder: 'border-violet-400',
      bg: 'bg-violet-500/10',
      glow: 'shadow-violet-500/20',
      icon: 'text-violet-400'
    },
    emerald: {
      border: 'border-emerald-500/50',
      activeBorder: 'border-emerald-400',
      bg: 'bg-emerald-500/10',
      glow: 'shadow-emerald-500/20',
      icon: 'text-emerald-400'
    },
    amber: {
      border: 'border-amber-500/50',
      activeBorder: 'border-amber-400',
      bg: 'bg-amber-500/10',
      glow: 'shadow-amber-500/20',
      icon: 'text-amber-400'
    },
    rose: {
      border: 'border-rose-500/50',
      activeBorder: 'border-rose-400',
      bg: 'bg-rose-500/10',
      glow: 'shadow-rose-500/20',
      icon: 'text-rose-400'
    },
    cyan: {
      border: 'border-cyan-500/50',
      activeBorder: 'border-cyan-400',
      bg: 'bg-cyan-500/10',
      glow: 'shadow-cyan-500/20',
      icon: 'text-cyan-400'
    },
    sky: {
      border: 'border-sky-500/50',
      activeBorder: 'border-sky-400',
      bg: 'bg-sky-500/10',
      glow: 'shadow-sky-500/20',
      icon: 'text-sky-400'
    }
  };

  const variant = colorVariants[color] || colorVariants.indigo;
  
  const statusStyles = {
    idle: '',
    loading: 'animate-pulse',
    success: 'ring-2 ring-emerald-500/50',
    error: 'ring-2 ring-rose-500/50'
  };

  return (
    <div 
      className={`
        min-w-[280px] rounded-xl border-2 
        ${variant.border} ${variant.bg}
        bg-[#16161f]/95 backdrop-blur-sm
        shadow-xl ${variant.glow}
        transition-all duration-200
        hover:${variant.activeBorder}
        ${statusStyles[status]}
      `}
    >
      {/* Header */}
      <div className={`
        flex items-center gap-2 px-4 py-3 
        border-b border-white/5
        ${variant.bg}
      `}>
        <span className={`text-lg ${variant.icon}`}>{icon}</span>
        <span className="font-medium text-sm text-slate-200 tracking-wide">
          {title}
        </span>
      </div>
      
      {/* Content */}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
};

export default memo(BaseNode);

