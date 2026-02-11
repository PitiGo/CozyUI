/**
 * Global toast event emitter.
 * Allows any component/service to trigger toasts without prop drilling.
 *
 * Usage:
 *   import { globalToast } from '../utils/globalToast';
 *   globalToast.error('Something went wrong');
 *   globalToast.success('Model loaded!');
 */

const listeners = new Set();

function emit(type, message, duration) {
  listeners.forEach(fn => fn(type, message, duration));
}

export const globalToast = {
  success: (msg, duration) => emit('success', msg, duration),
  error: (msg, duration) => emit('error', msg, duration),
  info: (msg, duration) => emit('info', msg, duration),
  loading: (msg) => emit('loading', msg, null),

  /** Subscribe to toast events. Returns unsubscribe function. */
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }
};
