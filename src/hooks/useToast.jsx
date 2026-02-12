import { useState, useCallback } from 'react';

let toastId = 0;

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const MAX_TOASTS = 5;

  const addToast = useCallback((type, message, duration = 4000) => {
    const id = ++toastId;
    const toast = { id, type, message, duration };

    setToasts(prev => {
      const next = [...prev, toast];
      // Limit max visible toasts — auto-dismiss oldest
      return next.length > MAX_TOASTS ? next.slice(-MAX_TOASTS) : next;
    });

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((message, duration) => {
    return addToast('success', message, duration);
  }, [addToast]);

  const error = useCallback((message, duration) => {
    return addToast('error', message, duration);
  }, [addToast]);

  const info = useCallback((message, duration) => {
    return addToast('info', message, duration);
  }, [addToast]);

  const loading = useCallback((message) => {
    return addToast('loading', message, null); // No auto-dismiss
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    info,
    loading
  };
}

