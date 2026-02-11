/**
 * Download Persistence Service
 *
 * Persists download state to localStorage so that if the user closes the tab
 * mid-download, the app can detect the interrupted download on next visit
 * and offer to resume it.
 *
 * How it works:
 *   1. When a model download starts → save { modelId, modelRepo, engine, startedAt, status: 'downloading' }
 *   2. Progress updates → save latest progress snapshot (pct, bytes, message)
 *   3. When complete → clear the entry (or mark as 'complete')
 *   4. On app startup → check if there's a 'downloading' entry (meaning tab was closed mid-download)
 *      → offer the user to resume
 *
 * Because `web-txt2img` caches each fully-downloaded file in the Cache Storage API,
 * resuming simply means calling `loadModel()` again — already-cached files load
 * instantly and only the remaining files are downloaded.
 *
 * localStorage key: 'cozyui_download_state'
 */

const STORAGE_KEY = 'cozyui_download_state';

/**
 * @typedef {Object} DownloadState
 * @property {string} modelId       - e.g. 'sd-turbo'
 * @property {string} modelRepo     - e.g. 'sd-turbo' (web-txt2img model ID)
 * @property {string} engine        - e.g. 'local-txt2img'
 * @property {'downloading'|'complete'|'error'} status
 * @property {number} pct           - last known progress percentage
 * @property {number} bytesDownloaded
 * @property {number} totalBytesExpected
 * @property {string} message       - last progress message
 * @property {number} startedAt     - timestamp (ms)
 * @property {number} updatedAt     - timestamp (ms)
 */

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable – silently ignore
  }
}

export const downloadPersistence = {
  /**
   * Call when a download starts.
   */
  markStarted({ modelId, modelRepo, engine }) {
    write({
      modelId,
      modelRepo,
      engine,
      status: 'downloading',
      pct: 0,
      bytesDownloaded: 0,
      totalBytesExpected: 0,
      message: '',
      startedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },

  /**
   * Call periodically during download to persist latest progress.
   * Throttled internally to avoid hammering localStorage.
   */
  _lastWrite: 0,
  updateProgress({ pct, bytesDownloaded, totalBytesExpected, message }) {
    const now = Date.now();
    // Throttle to once every 2 seconds to reduce writes
    if (now - this._lastWrite < 2000) return;
    this._lastWrite = now;

    const current = read();
    if (!current || current.status !== 'downloading') return;

    write({
      ...current,
      pct: pct ?? current.pct,
      bytesDownloaded: bytesDownloaded ?? current.bytesDownloaded,
      totalBytesExpected: totalBytesExpected ?? current.totalBytesExpected,
      message: message ?? current.message,
      updatedAt: now,
    });
  },

  /**
   * Call when download completes successfully. Clears the entry.
   */
  markComplete() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  },

  /**
   * Call when download fails with an error.
   * Keeps the entry so we can offer to resume.
   */
  markError(errorMessage) {
    const current = read();
    if (!current) return;
    write({
      ...current,
      status: 'error',
      message: errorMessage || 'Download interrupted',
      updatedAt: Date.now(),
    });
  },

  /**
   * Check if there is an interrupted download from a previous session.
   * Returns the download state or null.
   * @returns {DownloadState|null}
   */
  getInterruptedDownload() {
    const state = read();
    if (!state) return null;

    // Only return if it was actively downloading or errored
    if (state.status === 'downloading' || state.status === 'error') {
      return state;
    }
    return null;
  },

  /**
   * Manually clear the persisted state (user dismissed the resume prompt).
   */
  clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════
// Cached Models Registry
// Tracks which models have been fully downloaded (persists across sessions).
// This lets the UI distinguish "not downloaded" vs "cached on disk".
// ═══════════════════════════════════════════════════════════════════════

const CACHED_MODELS_KEY = 'cozyui_cached_models';

function readCachedSet() {
  try {
    const raw = localStorage.getItem(CACHED_MODELS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function writeCachedSet(set) {
  try {
    localStorage.setItem(CACHED_MODELS_KEY, JSON.stringify([...set]));
  } catch { /* ignore */ }
}

export const cachedModelsRegistry = {
  /** Mark a model as fully downloaded / cached. */
  markCached(modelId) {
    const set = readCachedSet();
    set.add(modelId);
    writeCachedSet(set);
  },

  /** Remove a model from the cached registry (after purge). */
  removeCached(modelId) {
    const set = readCachedSet();
    set.delete(modelId);
    writeCachedSet(set);
  },

  /** Clear the entire registry (after purge all). */
  clearAll() {
    try { localStorage.removeItem(CACHED_MODELS_KEY); } catch { /* ignore */ }
  },

  /** Check if a specific model is marked as cached. */
  isCached(modelId) {
    return readCachedSet().has(modelId);
  },

  /** Get set of all cached model IDs. */
  getAll() {
    return readCachedSet();
  },
};
