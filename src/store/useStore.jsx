import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';

const StoreContext = createContext(null);

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

    return () => {
      worker.terminate();
    };
  }, []);

  // Actions
  const loadModel = useCallback((modelId, modelRepo) => {
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'LOAD_MODEL',
        payload: { modelId, modelRepo }
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

  const value = {
    state,
    dispatch,
    actions: {
      loadModel,
      generate,
      resetGeneration
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

