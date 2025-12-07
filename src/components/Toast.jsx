import { memo, useEffect, useState, useCallback, useRef } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  X,
  Loader2
} from 'lucide-react';

const toastTypes = {
  success: {
    icon: CheckCircle2,
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    iconColor: 'text-emerald-400'
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-rose-500/20',
    border: 'border-rose-500/30',
    text: 'text-rose-400',
    iconColor: 'text-rose-400'
  },
  info: {
    icon: Info,
    bg: 'bg-indigo-500/20',
    border: 'border-indigo-500/30',
    text: 'text-indigo-400',
    iconColor: 'text-indigo-400'
  },
  loading: {
    icon: Loader2,
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    iconColor: 'text-amber-400'
  }
};

const Toast = ({ id, type = 'info', message, duration = 4000, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const onCloseRef = useRef(onClose);
  const idRef = useRef(id);
  
  // Keep refs updated
  onCloseRef.current = onClose;
  idRef.current = id;

  const config = toastTypes[type] || toastTypes.info;
  const Icon = config.icon;

  const handleClose = useCallback(() => {
    setIsLeaving(true);
    setTimeout(() => {
      onCloseRef.current?.(idRef.current);
    }, 200);
  }, []);

  useEffect(() => {
    // Enter animation on next frame
    const raf = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    // Auto dismiss
    if (duration && type !== 'loading') {
      const timer = setTimeout(handleClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, type, handleClose]);

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm
        shadow-lg shadow-black/20
        transition-all duration-200 ease-out
        ${config.bg} ${config.border}
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <Icon 
        size={18} 
        className={`${config.iconColor} ${type === 'loading' ? 'animate-spin' : ''} shrink-0`} 
      />
      <p className={`text-sm ${config.text} flex-1`}>{message}</p>
      {type !== 'loading' && (
        <button
          onClick={handleClose}
          className="p-1 hover:bg-white/10 rounded transition-colors"
        >
          <X size={14} className="text-slate-400" />
        </button>
      )}
    </div>
  );
};

// Toast Container - renders all toasts
export const ToastContainer = ({ toasts = [], onClose }) => {
  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast {...toast} onClose={onClose} />
        </div>
      ))}
    </div>
  );
};

export default memo(Toast);
