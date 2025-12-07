import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { modelDownloader } from '../services/modelDownloader.js';
import { opfsService, browserCacheService } from '../services/opfsService.js';

const StoreContext = createContext(null);

// Available models list (exported for use in components)
// 2025 Update: Local WebGPU generation with Janus multimodal models
export const AVAILABLE_MODELS = [
  // === LOCAL WEBGPU MODELS (2025 - Janus Multimodal) ===
  {
    id: 'janus-1.3b',
    name: 'Janus 1.3B',
    repo: 'onnx-community/Janus-1.3B-ONNX',
    engine: 'local',
    description: '🖥️ Best local quality',
    size: '~800MB',
    modelType: 'janus'
  },
  // === CLOUD API MODELS ===
  {
    id: 'flux',
    name: 'Flux (Cloud)',
    repo: 'flux',
    engine: 'api',
    description: '☁️ Best quality'
  },
  {
    id: 'turbo',
    name: 'Turbo (Cloud)',
    repo: 'turbo',
    engine: 'api',
    description: '☁️ Fastest API'
  },
  {
    id: 'flux-realism',
    name: 'Realism (Cloud)',
    repo: 'flux-realism',
    engine: 'api',
    description: '☁️ Photorealistic'
  },
  {
    id: 'flux-anime',
    name: 'Anime (Cloud)',
    repo: 'flux-anime',
    engine: 'api',
    description: '☁️ Anime style'
  }
];

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
    error: null
  },
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
          status: 'loading',
          progress: action.payload.progress
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
    
    default:
      return state;
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const workerRef = useRef(null);

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
          // You could dispatch this to show a toast notification
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

    return () => {
      worker.terminate();
    };
  }, []);

  // Actions
  const loadModel = useCallback((modelId, modelRepo, engine = 'api') => {
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'LOAD_MODEL',
        payload: { modelId, modelRepo, engine }
      });
    }
  }, []);

  const generate = useCallback((config) => {
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'GENERATE',
        payload: config
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

  const value = {
    state,
    dispatch,
    actions: {
      loadModel,
      generate,
      resetGeneration,
      refreshCacheStatus,
      deleteModelFromCache,
      clearAllCache,
      deleteBrowserCachedModel,
      clearAllBrowserCache
    }
  };

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

