import { memo, useCallback, useEffect, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import BaseNode from './BaseNode';
import { Box, Loader2, AlertCircle, Cpu, CheckCircle2, Lock, RefreshCw, MemoryStick, Download, X, Trash2, HardDrive, CloudDownload, Zap } from 'lucide-react';
import { useStore, AVAILABLE_MODELS } from '../../store/useStore.jsx';
import { getMemoryInfo, formatMemory } from '../../services/memoryGuard.js';
import { cachedModelsRegistry } from '../../services/downloadPersistence.js';

const ModelLoaderNode = ({ id, data, isConnectable, selected }) => {
  const { updateNodeData } = useReactFlow();
  const { state, actions } = useStore();

  // Memory monitoring
  const [memInfo, setMemInfo] = useState(() => getMemoryInfo());
  useEffect(() => {
    const t = setInterval(() => setMemInfo(getMemoryInfo()), 5000);
    return () => clearInterval(t);
  }, []);

  // Interrupted download from previous session
  const interrupted = state.interruptedDownload;

  const handleModelSelect = useCallback((model) => {
    if (model.disabled) return;
    
    // Clear any interrupted download banner since user is starting a new load
    if (interrupted) {
      actions.dismissInterruptedDownload();
    }

    updateNodeData(id, { 
      selectedModel: model,
      modelStatus: 'loading',
      error: null,
    });

    // Load model via store (handles txt2img vs worker routing)
    actions.loadModel(model.id, model.repo, model.engine);
  }, [id, updateNodeData, actions, interrupted]);

  const selectedModel = data.selectedModel || AVAILABLE_MODELS[0];
  const modelStatus = data.modelStatus || 'idle';
  
  // Separate models by status
  const workingModels = AVAILABLE_MODELS.filter(m => m.status === 'working');
  const pendingModels = AVAILABLE_MODELS.filter(m => m.status === 'pending');

  // Listen to model loading state from store
  useEffect(() => {
    const storeModelId = state.model.id;
    if (!storeModelId) return;

    // If the store is loading/loaded a model different from the node's selection
    // (e.g. resumed download), sync the node to match
    // Model was reset (purge) — go back to idle
    if (state.model.status === 'idle' && !storeModelId) {
      updateNodeData(id, { modelStatus: 'idle', error: null, loadProgress: 0 });
      return;
    }

    if (storeModelId !== selectedModel.id) {
      const matchedModel = AVAILABLE_MODELS.find(m => m.id === storeModelId);
      if (matchedModel && state.model.status === 'loading') {
        updateNodeData(id, {
          selectedModel: matchedModel,
          modelStatus: 'loading',
          loadProgress: state.model.progress,
        });
        return;
      }
    }

    if (storeModelId === selectedModel.id) {
      if (state.model.status === 'loading') {
        updateNodeData(id, { 
          modelStatus: 'loading',
          loadProgress: state.model.progress
        });
      } else if (state.model.status === 'loaded') {
        updateNodeData(id, { 
          modelStatus: 'loaded',
          loadProgress: 100,
          error: null,
        });
      } else if (state.model.status === 'error') {
        updateNodeData(id, { 
          modelStatus: 'error',
          error: state.model.error
        });
      }
    }
  }, [state.model, selectedModel.id, id, updateNodeData]);

  // Detect if loading from cache (progress jumps fast or message says "ready")
  const isCacheLoad = modelStatus === 'loading' && (
    (state.model.message || '').includes('ready in') ||
    (state.model.progress > 50 && (state.model.bytesDownloaded === 0 || !state.model.bytesDownloaded))
  );

  const statusConfig = {
    idle: { 
      icon: <Cpu size={12} />, 
      text: 'Select a model', 
      color: 'text-slate-400' 
    },
    loading: { 
      icon: <Loader2 className="animate-spin" size={12} />, 
      text: isCacheLoad ? 'Loading from cache...' : 'Loading...', 
      color: 'text-amber-400' 
    },
    loaded: { 
      icon: <CheckCircle2 size={12} />, 
      text: 'Loaded (100% Local)', 
      color: 'text-emerald-400' 
    },
    error: { 
      icon: <AlertCircle size={12} />, 
      text: 'Error', 
      color: 'text-rose-400' 
    }
  };

  const status = statusConfig[modelStatus];

  return (
    <BaseNode 
      title="Model" 
      icon={<Box size={16} />}
      color="violet"
      status={modelStatus === 'loading' ? 'loading' : 'idle'}
      selected={selected}
      minWidth={160}
      minHeight={180}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="trigger-in"
        isConnectable={isConnectable}
        className="!bg-violet-500 !border-violet-300"
      />

      <div className="space-y-2 h-full flex flex-col">
        <div className="flex-1 overflow-auto">

          {/* ── Resume interrupted download banner ── */}
          {interrupted && modelStatus !== 'loading' && (
            <div className="mb-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-1.5">
              <div className="flex items-start justify-between gap-1">
                <div className="text-[10px] text-amber-300 font-medium flex items-center gap-1">
                  <Download size={10} />
                  Incomplete download detected
                </div>
                <button
                  onClick={() => actions.dismissInterruptedDownload()}
                  className="text-slate-500 hover:text-slate-300 transition-colors p-0.5"
                  title="Dismiss"
                >
                  <X size={10} />
                </button>
              </div>
              <div className="text-[9px] text-slate-400">
                <span className="text-amber-200 font-medium">
                  {AVAILABLE_MODELS.find(m => m.id === interrupted.modelId)?.name || interrupted.modelId}
                </span>
                {' '}was {interrupted.pct > 0 ? `${Math.round(interrupted.pct)}% downloaded` : 'started'}.
                Cached files will load instantly.
              </div>
              <button
                onClick={() => actions.resumeInterruptedDownload()}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md
                  bg-amber-500/20 border border-amber-500/40 text-amber-200
                  text-[10px] font-medium hover:bg-amber-500/30 transition-colors"
              >
                <RefreshCw size={10} />
                Resume download
              </button>
            </div>
          )}

          {/* ── Working Models ── */}
          {workingModels.length > 0 && (
            <>
              <label className="text-[10px] font-medium text-emerald-500 uppercase tracking-wider flex items-center gap-1 mb-1">
                <Cpu size={10} />
                100% Local · WebGPU
              </label>
              <div className="space-y-1.5">
                {workingModels.map((model) => {
                  const isSelected = selectedModel.id === model.id;
                  const isActive = isSelected && modelStatus === 'loaded';
                  const isLoading = isSelected && modelStatus === 'loading';
                  const isCached = cachedModelsRegistry.isCached(model.id);

                  // Determine visual state
                  let borderClass, bgClass, textClass;
                  if (isActive) {
                    borderClass = 'border-emerald-500/60';
                    bgClass = 'bg-emerald-500/15';
                    textClass = 'text-emerald-200';
                  } else if (isLoading) {
                    borderClass = 'border-amber-500/50';
                    bgClass = 'bg-amber-500/10';
                    textClass = 'text-amber-200';
                  } else if (isSelected) {
                    borderClass = 'border-violet-500/50';
                    bgClass = 'bg-violet-500/15';
                    textClass = 'text-violet-200';
                  } else {
                    borderClass = 'border-white/5 hover:border-white/20';
                    bgClass = 'bg-black/20';
                    textClass = 'text-slate-300';
                  }

                  return (
                    <button
                      key={model.id}
                      onClick={() => handleModelSelect(model)}
                      className={`w-full px-2.5 py-2 rounded-lg text-left transition-all text-xs border ${borderClass} ${bgClass} ${textClass}`}
                    >
                      {/* Row 1: Name + Status badge */}
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-[11px]">{model.name}</span>
                        {isActive ? (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-400 text-[8px] font-bold uppercase tracking-wider">
                            <Zap size={7} />
                            Active
                          </span>
                        ) : isLoading ? (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[8px] font-bold uppercase tracking-wider">
                            <Loader2 size={7} className="animate-spin" />
                            Loading
                          </span>
                        ) : isCached ? (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400 text-[8px] font-bold uppercase tracking-wider">
                            <HardDrive size={7} />
                            Cached
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/5 text-slate-500 text-[8px] font-bold uppercase tracking-wider">
                            <CloudDownload size={7} />
                            {model.size || 'Download'}
                          </span>
                        )}
                      </div>
                      {/* Row 2: Description */}
                      <div className="text-[9px] mt-0.5 flex items-center justify-between">
                        <span className={isActive ? 'text-emerald-400/70' : 'text-slate-500'}>
                          {isActive ? 'Ready to generate' : model.description}
                        </span>
                        {isCached && !isActive && !isLoading && (
                          <span className="text-sky-500/70 text-[8px]">instant load</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* ── Memory indicator ── */}
          {memInfo.supported && (
            <div className="mt-2 px-2 py-1 rounded bg-black/20 border border-white/5">
              <div className="flex items-center justify-between text-[9px]">
                <span className="flex items-center gap-1 text-slate-500">
                  <MemoryStick size={9} />
                  RAM
                </span>
                <span className={`font-mono ${
                  (memInfo.usedJSHeap / memInfo.heapLimit) > 0.8 ? 'text-rose-400' :
                  (memInfo.usedJSHeap / memInfo.heapLimit) > 0.6 ? 'text-amber-400' :
                  'text-slate-400'
                }`}>
                  {formatMemory(memInfo.usedJSHeap)} / {formatMemory(memInfo.heapLimit)}
                </span>
              </div>
              <div className="mt-1 h-1 bg-black/40 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    (memInfo.usedJSHeap / memInfo.heapLimit) > 0.8 ? 'bg-rose-500' :
                    (memInfo.usedJSHeap / memInfo.heapLimit) > 0.6 ? 'bg-amber-500' :
                    'bg-indigo-500'
                  }`}
                  style={{ width: `${Math.min(100, (memInfo.usedJSHeap / memInfo.heapLimit) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* ── Pending Models ── */}
          {pendingModels.length > 0 && (
            <>
              <label className="text-[10px] font-medium text-slate-600 uppercase tracking-wider flex items-center gap-1 mb-1 mt-2">
                <Lock size={10} />
                Pending
              </label>
              <div className="space-y-1">
                {pendingModels.map((model) => (
                  <div
                    key={model.id}
                    className="w-full px-2 py-1.5 rounded text-left text-xs bg-black/10 border border-white/5 opacity-50 cursor-not-allowed"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-500">{model.name}</span>
                      <span className="text-[8px] text-amber-600">Pending</span>
                    </div>
                    <div className="text-[9px] text-slate-600">{model.description}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Status */}
        <div className={`flex items-center gap-1.5 text-[10px] pt-1 border-t border-white/5 ${status.color}`}>
          {status.icon}
          <span className="truncate">{selectedModel.name} · {status.text}</span>
        </div>

        {/* Progress bar when loading */}
        {modelStatus === 'loading' && (
          <div className="space-y-1">
            <div className="h-1.5 bg-black/30 rounded-full overflow-hidden">
              {(() => {
                const pct = state.model.progress || data.loadProgress || 0;
                const hasKnownProgress = pct > 0 || (state.model.bytesDownloaded ?? 0) > 0;
                return hasKnownProgress ? (
                  <div
                    className="h-full transition-all duration-300 bg-gradient-to-r from-violet-500 to-indigo-500"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-r from-violet-500/80 to-indigo-500/80 animate-pulse rounded-full" />
                );
              })()}
            </div>
            <div className="text-[9px] text-slate-400 text-center space-y-0.5">
              {(() => {
                const downloaded = state.model.bytesDownloaded || 0;
                const total = state.model.totalBytesExpected || 0;
                const pct = state.model.progress || 0;
                const msg = (state.model.message || '').trim();
                const fmtMB = (bytes) => (bytes / 1024 / 1024).toFixed(1);
                const isFromCache = msg.includes('ready in') || (pct > 50 && downloaded === 0);

                if (isFromCache) {
                  return (
                    <div className="text-emerald-400">
                      {Math.round(pct)}% · Loading from cache...
                    </div>
                  );
                }
                if (msg.includes('Retrying') || msg.includes('Connection lost')) {
                  return <div className="text-amber-400">{msg}</div>;
                }
                if (downloaded > 0 && total > 0) {
                  return (
                    <>
                      <div className="font-mono text-slate-300">
                        {fmtMB(downloaded)} / {fmtMB(total)} MB
                      </div>
                      <div>{Math.round(pct)}%{msg ? ` · ${msg}` : ''}</div>
                    </>
                  );
                }
                if (downloaded > 0) {
                  return (
                    <>
                      <div className="font-mono text-slate-300">
                        {fmtMB(downloaded)} MB downloaded
                      </div>
                      <div>{Math.round(pct)}%{msg ? ` · ${msg}` : ''}</div>
                    </>
                  );
                }
                if (pct > 0) {
                  return <div>{Math.round(pct)}%{msg ? ` · ${msg}` : ' · Downloading...'}</div>;
                }
                return (
                  <div className="text-slate-300">
                    {msg || 'Preparing model...'}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Error message + Retry / Purge buttons */}
        {modelStatus === 'error' && (
          <div className="space-y-1.5">
            {data.error && (
              <div className="text-[9px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded px-2 py-1">
                {data.error}
              </div>
            )}
            <button
              onClick={() => handleModelSelect(selectedModel)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg
                bg-violet-500/20 border border-violet-500/30 text-violet-300
                text-[10px] font-medium hover:bg-violet-500/30 transition-colors"
            >
              <RefreshCw size={10} />
              Retry (cached files are preserved)
            </button>
            {/* Purge buttons — shown when error is memory-related or always useful */}
            <div className="flex gap-1.5">
              <button
                onClick={() => actions.purgeModelDownload(selectedModel.repo || selectedModel.id)}
                className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md
                  bg-rose-500/10 border border-rose-500/20 text-rose-400
                  text-[9px] font-medium hover:bg-rose-500/20 transition-colors"
                title="Delete this model's cached files to free space"
              >
                <Trash2 size={9} />
                Clear this model
              </button>
              <button
                onClick={() => actions.purgeAllDownloads()}
                className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md
                  bg-rose-500/10 border border-rose-500/20 text-rose-400
                  text-[9px] font-medium hover:bg-rose-500/20 transition-colors"
                title="Delete ALL cached model files to free space"
              >
                <Trash2 size={9} />
                Clear all caches
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="model-out"
        isConnectable={isConnectable}
        className="!bg-violet-500 !border-violet-300"
      />
    </BaseNode>
  );
};

export default memo(ModelLoaderNode);
