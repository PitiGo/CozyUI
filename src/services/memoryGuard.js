/**
 * Memory Guard Service
 *
 * Monitors browser memory usage and provides warnings/blocks when loading
 * large AI models in the browser.
 *
 * IMPORTANT: WebGPU models load their weights into GPU VRAM, NOT the JS heap.
 * The JS heap is only used temporarily for download buffers and ONNX session
 * setup. So we should NOT compare full model size against jsHeapSizeLimit.
 *
 * Strategy:
 *   1. Read `performance.memory` (Chrome) for heap usage snapshots.
 *   2. Before loading a model, estimate the *JS heap overhead* (NOT the full
 *      model size — that goes to VRAM).
 *   3. Force-unload the current model and GC before loading a new one.
 *   4. Expose a reactive snapshot for the UI to display a memory indicator.
 *   5. Only block loading when heap is critically full; otherwise warn.
 *
 * JS heap overhead estimates during model loading:
 *   - sd-turbo:         ~800 MB  (download buffers + ONNX session init)
 *   - janus-pro-1b:     ~600 MB  (Transformers.js overhead)
 *   - local-super-res:  ~150 MB
 *
 * The actual model weights (~1.5-2.4 GB) live in GPU VRAM via WebGPU.
 */

// Approximate *JS heap* overhead per model during loading (bytes)
// These are much smaller than the full model because weights go to GPU VRAM.
const MODEL_HEAP_OVERHEAD = {
  'sd-turbo': 800 * 1024 ** 2,   // ~800 MB heap overhead
  'janus-pro-1b': 600 * 1024 ** 2,   // ~600 MB heap overhead
  'local-super-resolution': 150 * 1024 ** 2, // ~150 MB heap overhead
};

const SAFETY_HEADROOM = 256 * 1024 * 1024; // Keep 256 MB free for the browser/OS

/** Read memory snapshot from the browser (best-effort). */
export function getMemoryInfo() {
  const info = {
    totalJSHeap: 0,
    usedJSHeap: 0,
    heapLimit: 0,
    deviceMemoryGB: 0,
    available: 0,       // estimated free JS heap
    supported: false,
  };

  // Chrome-only: performance.memory
  if (performance?.memory) {
    info.totalJSHeap = performance.memory.totalJSHeapSize || 0;
    info.usedJSHeap = performance.memory.usedJSHeapSize || 0;
    info.heapLimit = performance.memory.jsHeapSizeLimit || 0;
    info.available = info.heapLimit - info.usedJSHeap;
    info.supported = true;
  }

  // navigator.deviceMemory (Chrome, Edge — in GB, rounded down)
  if (navigator.deviceMemory) {
    info.deviceMemoryGB = navigator.deviceMemory;
  }

  return info;
}

/**
 * Check if loading a model is safe given current memory.
 * Returns { safe: boolean, reason?: string, warning?: string, memoryInfo }
 */
export function canLoadModel(modelId) {
  const mem = getMemoryInfo();
  const requiredHeap = MODEL_HEAP_OVERHEAD[modelId] || 700 * 1024 ** 2; // default ~700 MB

  // If we can't measure memory at all, allow but warn
  if (!mem.supported && !mem.deviceMemoryGB) {
    return {
      safe: true,
      warning: 'Cannot measure available memory. Large models may cause the browser to slow down.',
      memoryInfo: mem,
    };
  }

  // Check JS heap limit (Chrome)
  if (mem.supported && mem.heapLimit > 0) {
    const freeHeap = mem.heapLimit - mem.usedJSHeap;

    // BLOCK: truly critical — less free heap than overhead + safety margin
    if (freeHeap < requiredHeap + SAFETY_HEADROOM) {
      const freeGB = (freeHeap / 1024 ** 3).toFixed(1);
      const neededGB = ((requiredHeap + SAFETY_HEADROOM) / 1024 ** 3).toFixed(1);
      return {
        safe: false,
        reason: `Low memory: ~${freeGB} GB free heap, need ~${neededGB} GB for loading overhead. Close other tabs or clear caches to free space.`,
        memoryInfo: mem,
      };
    }

    // WARN: getting tight but should work
    if (freeHeap < requiredHeap * 1.5 + SAFETY_HEADROOM) {
      const freeGB = (freeHeap / 1024 ** 3).toFixed(1);
      return {
        safe: true,
        warning: `Memory is tight (~${freeGB} GB free). Close other tabs for best performance.`,
        memoryInfo: mem,
      };
    }
  }

  // Check device memory — only block on very low-end devices
  if (mem.deviceMemoryGB > 0 && mem.deviceMemoryGB < 4) {
    return {
      safe: false,
      reason: `Your device reports ${mem.deviceMemoryGB} GB RAM. At least 4 GB is recommended for AI models.`,
      memoryInfo: mem,
    };
  }

  return { safe: true, memoryInfo: mem };
}

/** Format bytes as human-readable string. */
export function formatMemory(bytes) {
  if (!bytes || bytes <= 0) return '0 MB';
  if (bytes >= 1024 ** 3) return (bytes / 1024 ** 3).toFixed(1) + ' GB';
  return (bytes / 1024 ** 2).toFixed(0) + ' MB';
}

/**
 * Try to release memory aggressively:
 *   - Hint the GC (if available)
 *   - Wait a tick for deferred cleanup
 */
export async function releaseMemory() {
  // Hint GC in Chrome (only in some contexts)
  if (globalThis.gc) {
    try { globalThis.gc(); } catch { /* ignore */ }
  }
  // Yield to allow deferred cleanup
  await new Promise(r => setTimeout(r, 100));
}
