import { createContext, useContext, useReducer, useCallback, useEffect, useRef, useMemo } from 'react';
/* eslint-disable react-refresh/only-export-components */
import { modelDownloader } from '../services/modelDownloader.js';
import { opfsService, browserCacheService } from '../services/opfsService.js';
import { txt2imgService } from '../services/txt2imgService.js';
import { globalToast } from '../utils/globalToast.js';
import { downloadPersistence, cachedModelsRegistry } from '../services/downloadPersistence.js';
import { releaseMemory } from '../services/memoryGuard.js';

const StoreContext = createContext(null);

import { AVAILABLE_MODELS } from './models.js';



const initialState = {
  // WebGPU status
  webgpu: {
    supported: null,
    checking: true,
    info: null
  },
  // Model state
  model: {
    id: null,
    repo: null,
    status: 'idle', // idle, loading, loaded, error
    progress: 0,
    message: '',
    bytesDownloaded: 0,
    totalBytesExpected: 0,
    error: null
  },
  // Interrupted download from previous session (populated on startup)
  interruptedDownload: null,
  // Generation state
  generation: {
    status: 'idle', // idle, generating, complete, error
    progress: 0,
    imageUrl: null,
    error: null
  },
  // System/Cache state
  system: {
    cachedModels: [], // Array of model IDs that are cached (OPFS)
    browserCachedModels: [], // Array of models cached by Transformers.js (Browser Cache API)
    storageUsed: 0,
    storageQuota: 0,
    browserCacheSize: 0,
    isLoadingCache: true
  },
  // Worker reference
  worker: null
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_WEBGPU_STATUS':
      return {
        ...state,
        webgpu: {
          supported: action.payload.supported,
          checking: false,
          info: action.payload.info || action.payload.reason
        }
      };

    case 'MODEL_LOADING':
      return {
        ...state,
        model: {
          ...state.model,
          id: action.payload.modelId ?? state.model.id,
          status: 'loading',
          progress: action.payload.progress,
          message: action.payload.message ?? state.model.message ?? '',
          bytesDownloaded: action.payload.bytesDownloaded ?? state.model.bytesDownloaded ?? 0,
          totalBytesExpected: action.payload.totalBytesExpected ?? state.model.totalBytesExpected ?? 0,
        }
      };

    case 'MODEL_LOADED':
      return {
        ...state,
        model: {
          id: action.payload.modelId,
          repo: action.payload.modelRepo,
          status: 'loaded',
          progress: 100,
          error: null
        }
      };

    case 'MODEL_ERROR':
      return {
        ...state,
        model: {
          ...state.model,
          status: 'error',
          error: action.payload.error
        }
      };

    case 'GENERATION_STARTED':
      // Revoke previous blob URL to free memory before new generation
      if (state.generation.imageUrl && state.generation.imageUrl.startsWith('blob:')) {
        try { URL.revokeObjectURL(state.generation.imageUrl); } catch { /* ignore */ }
      }
      return {
        ...state,
        generation: {
          status: 'generating',
          progress: 0,
          imageUrl: null,
          error: null
        }
      };

    case 'GENERATION_PROGRESS':
      return {
        ...state,
        generation: {
          ...state.generation,
          progress: action.payload.progress
        }
      };

    case 'GENERATION_COMPLETE':
      // Revoke previous blob URL to prevent memory leak
      if (state.generation.imageUrl && state.generation.imageUrl.startsWith('blob:')) {
        try { URL.revokeObjectURL(state.generation.imageUrl); } catch { /* ignore */ }
      }
      return {
        ...state,
        generation: {
          status: 'complete',
          progress: 100,
          imageUrl: action.payload.imageUrl,
          error: null
        }
      };

    case 'GENERATION_ERROR':
      return {
        ...state,
        generation: {
          ...state.generation,
          status: 'error',
          error: action.payload.error
        }
      };

    case 'RESET_GENERATION':
      // Revoke previous blob URL to free memory
      if (state.generation.imageUrl && state.generation.imageUrl.startsWith('blob:')) {
        try { URL.revokeObjectURL(state.generation.imageUrl); } catch { /* ignore */ }
      }
      return {
        ...state,
        generation: {
          status: 'idle',
          progress: 0,
          imageUrl: null,
          error: null
        }
      };

    case 'SET_WORKER':
      return {
        ...state,
        worker: action.payload
      };

    case 'UPDATE_CACHE_STATUS':
      return {
        ...state,
        system: {
          ...state.system,
          cachedModels: action.payload.cachedModels ?? state.system.cachedModels,
          browserCachedModels: action.payload.browserCachedModels ?? state.system.browserCachedModels,
          storageUsed: action.payload.storageUsed ?? state.system.storageUsed,
          storageQuota: action.payload.storageQuota ?? state.system.storageQuota,
          browserCacheSize: action.payload.browserCacheSize ?? state.system.browserCacheSize,
          isLoadingCache: false
        }
      };

    case 'SET_CACHE_LOADING':
      return {
        ...state,
        system: {
          ...state.system,
          isLoadingCache: action.payload
        }
      };

    case 'SET_INTERRUPTED_DOWNLOAD':
      return {
        ...state,
        interruptedDownload: action.payload,
      };

    case 'CLEAR_INTERRUPTED_DOWNLOAD':
      return {
        ...state,
        interruptedDownload: null,
      };

    case 'MODEL_RESET':
      return {
        ...state,
        model: { ...initialState.model },
      };

    default:
      return state;
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const workerRef = useRef(null);
  const stateRef = useRef(state);

  // Keep state ref updated (React 19 compliant)
  useEffect(() => {
    stateRef.current = state;
  });
  const bgRemovalCallbacksRef = useRef({});
  const bgRemovalIdRef = useRef(0);

  // Initialize worker
  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/inference.worker.js', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (event) => {
      const { type, payload } = event.data;

      switch (type) {
        case 'WEBGPU_STATUS':
          dispatch({ type: 'SET_WEBGPU_STATUS', payload });
          break;
        case 'MODEL_LOADING':
          dispatch({ type: 'MODEL_LOADING', payload });
          break;
        case 'MODEL_LOADED':
          dispatch({ type: 'MODEL_LOADED', payload });
          break;
        case 'MODEL_ERROR':
          dispatch({ type: 'MODEL_ERROR', payload });
          break;
        case 'GENERATION_STARTED':
          dispatch({ type: 'GENERATION_STARTED', payload });
          break;
        case 'GENERATION_PROGRESS':
          dispatch({ type: 'GENERATION_PROGRESS', payload });
          break;
        case 'GENERATION_COMPLETE':
          dispatch({ type: 'GENERATION_COMPLETE', payload });
          break;
        case 'GENERATION_ERROR':
          dispatch({ type: 'GENERATION_ERROR', payload });
          break;
        case 'GENERATION_WARNING':
          // Show warning but don't block generation
          console.warn('⚠️ Generation warning:', payload?.message || payload);
          break;
        case 'BG_REMOVAL_PROGRESS':
          // Could dispatch to show progress if needed
          console.log('🔄 BG Removal:', payload.message, payload.progress + '%');
          break;
        case 'BG_REMOVAL_COMPLETE':
          if (payload.callbackId && bgRemovalCallbacksRef.current[payload.callbackId]) {
            bgRemovalCallbacksRef.current[payload.callbackId]({ imageUrl: payload.imageUrl });
            delete bgRemovalCallbacksRef.current[payload.callbackId];
          }
          break;
        case 'BG_REMOVAL_ERROR':
          if (payload.callbackId && bgRemovalCallbacksRef.current[payload.callbackId]) {
            bgRemovalCallbacksRef.current[payload.callbackId]({ error: payload.error });
            delete bgRemovalCallbacksRef.current[payload.callbackId];
          }
          break;
        default:
          console.log('Unknown worker message:', type);
      }
    };

    workerRef.current = worker;
    dispatch({ type: 'SET_WORKER', payload: worker });

    // Check WebGPU support
    worker.postMessage({ type: 'CHECK_WEBGPU' });

    // Check cached models on startup
    const checkCacheStatus = async () => {
      try {
        // Check OPFS cache
        const cachedIds = await modelDownloader.checkCachedModels(AVAILABLE_MODELS);
        const storageInfo = await opfsService.getStorageUsage();

        // Check Browser Cache (Transformers.js)
        const browserCachedModels = await browserCacheService.listCachedModels();
        const browserCacheSize = await browserCacheService.getTotalCacheSize();

        dispatch({
          type: 'UPDATE_CACHE_STATUS',
          payload: {
            cachedModels: cachedIds,
            browserCachedModels,
            storageUsed: storageInfo.used,
            storageQuota: storageInfo.quota,
            browserCacheSize
          }
        });
      } catch (error) {
        console.error('Error checking cache status:', error);
        dispatch({ type: 'SET_CACHE_LOADING', payload: false });
      }
    };

    checkCacheStatus();

    // Check for interrupted downloads from previous session
    const interrupted = downloadPersistence.getInterruptedDownload();
    if (interrupted) {
      console.log(`⚠️ Found interrupted download: ${interrupted.modelId} (${interrupted.pct}% done)`);
      dispatch({ type: 'SET_INTERRUPTED_DOWNLOAD', payload: interrupted });
    }

    return () => {
      worker.terminate();
      txt2imgService.destroy();
    };
  }, []);

  // Actions
  const loadModel = useCallback(async (modelId, modelRepo, engine = 'local-txt2img') => {
    // ── Local text-to-image via web-txt2img ──
    if (engine === 'local-txt2img') {
      // Only reset to 0 if no progress is already shown (avoids flashing 0% on resume)
      const cur = stateRef.current.model;
      const isResuming = cur.id === modelId && cur.status === 'loading' && cur.progress > 0;
      if (!isResuming) {
        // Full reset — clears bytes/message from any previous model
        dispatch({
          type: 'MODEL_LOADING',
          payload: {
            modelId,
            progress: 0,
            message: '',
            bytesDownloaded: 0,
            totalBytesExpected: 0,
          }
        });
      }

      // Persist that a download is in progress (survives tab close)
      downloadPersistence.markStarted({ modelId, modelRepo, engine });

      try {
        await txt2imgService.loadModel(modelRepo, (progress) => {
          dispatch({
            type: 'MODEL_LOADING',
            payload: {
              modelId,
              progress: progress.pct || 0,
              message: progress.message || '',
              bytesDownloaded: progress.bytesDownloaded || 0,
              totalBytesExpected: progress.totalBytesExpected || 0,
            }
          });
          // Persist progress snapshot (throttled internally)
          downloadPersistence.updateProgress({
            pct: progress.pct || 0,
            bytesDownloaded: progress.bytesDownloaded || 0,
            totalBytesExpected: progress.totalBytesExpected || 0,
            message: progress.message || '',
          });
        });

        // Download complete — clear persistence & mark as cached
        downloadPersistence.markComplete();
        cachedModelsRegistry.markCached(modelId);

        dispatch({
          type: 'MODEL_LOADED',
          payload: { modelId, modelRepo, engine: 'local-txt2img' }
        });
      } catch (error) {
        // Don't replace loading state with error when user double-clicks "already loading"
        const isAlreadyLoading = /already being loaded|please wait/i.test(error.message);
        if (isAlreadyLoading) {
          globalToast.info('Model is already loading, please wait.');
          return;
        }
        // Persist the error so we can offer resume on next visit
        downloadPersistence.markError(error.message);
        dispatch({
          type: 'MODEL_ERROR',
          payload: { modelId, error: error.message }
        });
      }
      return;
    }

    // ── Local enhancement / bg-removal via existing worker ──
    if (engine === 'local-enhance' && workerRef.current) {
      workerRef.current.postMessage({
        type: 'LOAD_MODEL',
        payload: { modelId, modelRepo, engine: 'local' }
      });
      return;
    }

    // ── Pending models – show info ──
    if (engine === 'pending') {
      dispatch({
        type: 'MODEL_ERROR',
        payload: { modelId, error: 'This model is not available yet. Please use SD-Turbo or Janus-Pro.' }
      });
      return;
    }

    // Fallback to worker
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'LOAD_MODEL',
        payload: { modelId, modelRepo, engine }
      });
    }
  }, []);

  const generate = useCallback(async (config) => {
    // Find the selected model to determine engine
    const selectedModel = AVAILABLE_MODELS.find(m => m.id === config.modelId) || null;
    const engine = selectedModel?.engine || 'local-txt2img';

    // ── Local text-to-image via web-txt2img ──
    if (engine === 'local-txt2img' || txt2imgService.currentModelId) {
      dispatch({ type: 'GENERATION_STARTED', payload: { prompt: config.prompt } });

      try {
        const result = await txt2imgService.generate(
          {
            prompt: config.prompt,
            seed: config.seed ?? -1,
            width: config.width ?? 512,
            height: config.height ?? 512,
          },
          (progress) => {
            dispatch({
              type: 'GENERATION_PROGRESS',
              payload: { progress: progress.pct || 0 }
            });
          }
        );

        dispatch({
          type: 'GENERATION_COMPLETE',
          payload: {
            imageUrl: result.imageUrl,
            mode: 'local',
            model: result.model,
            seed: result.seed,
          }
        });
      } catch (error) {
        dispatch({
          type: 'GENERATION_ERROR',
          payload: { error: error.message }
        });
      }
      return;
    }

    // ── Fallback to existing worker ──
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'GENERATE',
        payload: config
      });
    }
  }, []);

  // Background removal action
  const removeBackground = useCallback((imageData, callback) => {
    if (workerRef.current) {
      const callbackId = ++bgRemovalIdRef.current;
      bgRemovalCallbacksRef.current[callbackId] = callback;

      workerRef.current.postMessage({
        type: 'REMOVE_BACKGROUND',
        payload: { imageData, callbackId }
      });
    }
  }, []);

  const resetGeneration = useCallback(() => {
    dispatch({ type: 'RESET_GENERATION' });
  }, []);

  // Refresh cache status
  const refreshCacheStatus = useCallback(async () => {
    dispatch({ type: 'SET_CACHE_LOADING', payload: true });

    try {
      // Check OPFS cache
      const cachedIds = await modelDownloader.checkCachedModels(AVAILABLE_MODELS);
      const storageInfo = await opfsService.getStorageUsage();

      // Check Browser Cache (Transformers.js)
      const browserCachedModels = await browserCacheService.listCachedModels();
      const browserCacheSize = await browserCacheService.getTotalCacheSize();

      dispatch({
        type: 'UPDATE_CACHE_STATUS',
        payload: {
          cachedModels: cachedIds,
          browserCachedModels,
          storageUsed: storageInfo.used,
          storageQuota: storageInfo.quota,
          browserCacheSize
        }
      });
    } catch (error) {
      console.error('Error refreshing cache status:', error);
      dispatch({ type: 'SET_CACHE_LOADING', payload: false });
    }
  }, []);

  // Delete a cached model
  const deleteModelFromCache = useCallback(async (modelId) => {
    const model = AVAILABLE_MODELS.find(m => m.id === modelId);
    if (!model) return false;

    const success = await modelDownloader.deleteModel(model.repo);

    if (success) {
      // Refresh cache status after deletion
      await refreshCacheStatus();
    }

    return success;
  }, [refreshCacheStatus]);

  // Clear all cached models (OPFS)
  const clearAllCache = useCallback(async () => {
    const success = await opfsService.clearAll();

    if (success) {
      await refreshCacheStatus();
    }

    return success;
  }, [refreshCacheStatus]);

  // Delete a model from browser cache (Transformers.js)
  const deleteBrowserCachedModel = useCallback(async (modelName) => {
    const success = await browserCacheService.deleteModel(modelName);

    if (success) {
      await refreshCacheStatus();
    }

    return success;
  }, [refreshCacheStatus]);

  // Clear all browser cached models (Transformers.js)
  const clearAllBrowserCache = useCallback(async () => {
    const success = await browserCacheService.clearAll();

    if (success) {
      await refreshCacheStatus();
    }

    return success;
  }, [refreshCacheStatus]);

  // Resume an interrupted download from a previous session
  const resumeInterruptedDownload = useCallback(async () => {
    const interrupted = downloadPersistence.getInterruptedDownload();
    if (!interrupted) return;
    dispatch({ type: 'CLEAR_INTERRUPTED_DOWNLOAD' });

    // Pre-populate the UI with the last known progress so it doesn't flash "0%"
    dispatch({
      type: 'MODEL_LOADING',
      payload: {
        modelId: interrupted.modelId,
        progress: interrupted.pct || 0,
        message: 'Resuming download — cached files will load instantly...',
        bytesDownloaded: interrupted.bytesDownloaded || 0,
        totalBytesExpected: interrupted.totalBytesExpected || 0,
      }
    });

    // Resume the download (cached files will load instantly from Cache Storage)
    await loadModel(interrupted.modelId, interrupted.modelRepo, interrupted.engine);
  }, [loadModel]);

  // Dismiss the interrupted download prompt
  const dismissInterruptedDownload = useCallback(() => {
    downloadPersistence.clear();
    dispatch({ type: 'CLEAR_INTERRUPTED_DOWNLOAD' });
  }, []);

  // Purge a specific model's cached download files (web-txt2img Cache Storage)
  const purgeModelDownload = useCallback(async (modelId) => {
    try {
      // Unload if it's the active model
      if (txt2imgService.currentModelId === modelId) {
        await txt2imgService.unload();
      }
      await txt2imgService.purge(modelId);
      downloadPersistence.clear();
      cachedModelsRegistry.removeCached(modelId);
      await releaseMemory();
      dispatch({ type: 'MODEL_RESET' });
      globalToast.success(`Cache for "${modelId}" cleared. Memory freed.`);
      await refreshCacheStatus();
    } catch (err) {
      console.error('Error purging model cache:', err);
      globalToast.error('Failed to clear cache: ' + err.message);
    }
  }, [refreshCacheStatus]);

  // Purge ALL web-txt2img cached downloads + unload current model
  const purgeAllDownloads = useCallback(async () => {
    try {
      await txt2imgService.destroy();
      await txt2imgService.purgeAll();
      downloadPersistence.clear();
      cachedModelsRegistry.clearAll();
      await releaseMemory();
      dispatch({ type: 'MODEL_RESET' });
      globalToast.success('All download caches cleared. Memory freed.');
      await refreshCacheStatus();
    } catch (err) {
      console.error('Error purging all caches:', err);
      globalToast.error('Failed to clear caches: ' + err.message);
    }
  }, [refreshCacheStatus]);

  const value = useMemo(() => ({
    state,
    dispatch,
    actions: {
      loadModel,
      generate,
      removeBackground,
      resetGeneration,
      refreshCacheStatus,
      deleteModelFromCache,
      clearAllCache,
      deleteBrowserCachedModel,
      clearAllBrowserCache,
      resumeInterruptedDownload,
      dismissInterruptedDownload,
      purgeModelDownload,
      purgeAllDownloads,
    }
  }), [
    state,
    loadModel,
    generate,
    removeBackground,
    resetGeneration,
    refreshCacheStatus,
    deleteModelFromCache,
    clearAllCache,
    deleteBrowserCachedModel,
    clearAllBrowserCache,
    resumeInterruptedDownload,
    dismissInterruptedDownload,
    purgeModelDownload,
    purgeAllDownloads,
  ]);

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}

