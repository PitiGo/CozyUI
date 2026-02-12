import { useEffect, useState, memo, useCallback, useRef } from 'react';
import {
  HardDrive,
  Trash2,
  X,
  RefreshCw,
  Database,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Cpu
} from 'lucide-react';
import { useStore } from '../store/useStore.jsx';
import { AVAILABLE_MODELS } from '../store/models.js';
import { opfsService } from '../services/opfsService.js';

const StorageManager = ({ isOpen, onClose }) => {
  const { state, actions } = useStore();
  const {
    cachedModels,
    browserCachedModels,
    storageUsed,
    storageQuota,
    browserCacheSize,
    isLoadingCache
  } = state.system;

  const [cachedModelsInfo, setCachedModelsInfo] = useState([]);
  const [isDeleting, setIsDeleting] = useState(null);
  const [isClearing, setIsClearing] = useState(false);

  // Use ref to avoid stale closure issues and infinite loops
  const actionsRef = useRef(actions);
  useEffect(() => {
    actionsRef.current = actions;
  });

  // Load detailed info about cached models
  const loadCachedModelsInfo = useCallback(async () => {
    try {
      const info = await opfsService.listCachedModels();
      setCachedModelsInfo(info);
    } catch (error) {
      console.error('Error loading cached models info:', error);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadCachedModelsInfo();
      actionsRef.current.refreshCacheStatus();
    }
  }, [isOpen, loadCachedModelsInfo]);

  const handleDeleteModel = async (modelId) => {
    setIsDeleting(modelId);
    try {
      await actions.deleteModelFromCache(modelId);
      await loadCachedModelsInfo();
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDeleteBrowserModel = async (modelName) => {
    setIsDeleting(modelName);
    try {
      await actions.deleteBrowserCachedModel(modelName);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to delete all cached models?')) return;

    setIsClearing(true);
    try {
      await actions.clearAllCache();
      await actions.clearAllBrowserCache();
      await loadCachedModelsInfo();
    } finally {
      setIsClearing(false);
    }
  };

  const handleRefresh = async () => {
    await actions.refreshCacheStatus();
    await loadCachedModelsInfo();
  };

  // Format bytes to human readable
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    if (!bytes || isNaN(bytes)) return 'Unknown';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Calculate usage percentage
  const usagePercent = storageQuota > 0 ? (storageUsed / storageQuota) * 100 : 0;

  // Total cached items
  const totalCachedItems = cachedModels.length + browserCachedModels.length;
  const totalCacheSize = browserCacheSize + (cachedModelsInfo.reduce((sum, m) => sum + (m.size || 0), 0));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#16161f] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <HardDrive size={20} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Storage Manager</h2>
              <p className="text-xs text-slate-500">Manage cached models</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Storage Usage Bar */}
        <div className="p-4 border-b border-white/5">
          <div className="flex justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1">
              <Database size={12} />
              Used: {formatBytes(storageUsed)}
            </span>
            <span>Quota: {formatBytes(storageQuota)}</span>
          </div>
          <div className="h-3 bg-black/50 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${usagePercent > 80
                ? 'bg-gradient-to-r from-rose-500 to-red-500'
                : usagePercent > 50
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                  : 'bg-gradient-to-r from-indigo-500 to-violet-500'
                }`}
              style={{ width: `${Math.min(100, usagePercent)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <p className="text-xs text-slate-500">
              {usagePercent.toFixed(1)}% used
            </p>
            {totalCacheSize > 0 && (
              <p className="text-xs text-emerald-400">
                Models: {formatBytes(totalCacheSize)}
              </p>
            )}
          </div>
        </div>

        {/* Models List */}
        <div className="p-4 max-h-80 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-300">Cached Models</h3>
            <button
              onClick={handleRefresh}
              disabled={isLoadingCache}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-slate-200"
              title="Refresh"
            >
              <RefreshCw size={14} className={isLoadingCache ? 'animate-spin' : ''} />
            </button>
          </div>

          {isLoadingCache ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-indigo-400" />
            </div>
          ) : totalCachedItems === 0 ? (
            <div className="text-center py-8">
              <Database size={32} className="mx-auto text-slate-600 mb-2" />
              <p className="text-sm text-slate-500">No cached models</p>
              <p className="text-xs text-slate-600 mt-1">
                Models will be saved automatically when loaded
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Browser Cache (Transformers.js) Models */}
              {browserCachedModels.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-wider">
                    <Cpu size={12} />
                    <span>Transformers.js (WebGPU)</span>
                  </div>

                  {browserCachedModels.map((model) => (
                    <div
                      key={model.name}
                      className="flex items-center justify-between p-3 bg-emerald-500/5 rounded-xl 
                        border border-emerald-500/10 hover:border-emerald-500/20 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                          <CheckCircle2 size={16} className="text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-200">
                            {model.name.split('/')[1] || model.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatBytes(model.totalSize)}
                            {model.files && ` • ${model.files.length} files`}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteBrowserModel(model.name)}
                        disabled={isDeleting === model.name}
                        className={`p-2 rounded-lg transition-all ${isDeleting === model.name
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'opacity-0 group-hover:opacity-100 hover:bg-rose-500/20 text-rose-400'
                          }`}
                        title="Delete from cache"
                      >
                        {isDeleting === model.name ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* OPFS Cache Models */}
              {cachedModels.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-wider">
                    <HardDrive size={12} />
                    <span>OPFS Storage</span>
                  </div>

                  {cachedModels.map((modelId) => {
                    const model = AVAILABLE_MODELS.find(m => m.id === modelId);
                    const cachedInfo = cachedModelsInfo.find(c => c.name.includes(model?.repo?.split('/')[1] || ''));

                    return (
                      <div
                        key={modelId}
                        className="flex items-center justify-between p-3 bg-white/5 rounded-xl 
                          border border-white/5 hover:border-white/10 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-violet-500/10 rounded-lg">
                            <CheckCircle2 size={16} className="text-violet-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-200">
                              {model?.name || modelId}
                            </p>
                            <p className="text-xs text-slate-500">
                              {cachedInfo ? formatBytes(cachedInfo.size) : model?.size || 'Unknown size'}
                              {cachedInfo?.fileCount && ` • ${cachedInfo.fileCount} files`}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteModel(modelId)}
                          disabled={isDeleting === modelId}
                          className={`p-2 rounded-lg transition-all ${isDeleting === modelId
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'opacity-0 group-hover:opacity-100 hover:bg-rose-500/20 text-rose-400'
                            }`}
                          title="Delete from cache"
                        >
                          {isDeleting === modelId ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/20">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {totalCachedItems} cached model{totalCachedItems !== 1 ? 's' : ''}
            </p>

            {totalCachedItems > 0 && (
              <button
                onClick={handleClearAll}
                disabled={isClearing}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium 
                  text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors"
              >
                {isClearing ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <AlertTriangle size={12} />
                )}
                Delete All
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(StorageManager);
