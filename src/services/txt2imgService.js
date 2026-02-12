/**
 * Text-to-Image Service using web-txt2img (Direct API)
 *
 * Uses the top-level functions from web-txt2img instead of the WorkerClient,
 * because Vite's dev server doesn't resolve onnxruntime-web inside the nested
 * Web Worker that Txt2ImgWorkerClient spawns. The direct API still runs
 * WebGPU operations asynchronously so the main thread stays responsive.
 *
 * Download resilience:
 *   - web-txt2img caches each successfully-downloaded file individually via the
 *     Cache Storage API. If the connection drops mid-download, files already
 *     completed are served from cache on the next attempt (instant).
 *   - This service adds automatic retry with exponential backoff (up to 3
 *     retries) so transient network errors recover without user interaction.
 *
 * Supported models:
 *   - sd-turbo:      Single-step diffusion via ONNX Runtime Web + WebGPU (~2.4 GB)
 *   - janus-pro-1b:  Autoregressive multimodal via Transformers.js + WebGPU (~1.5 GB)
 */

import {
  loadModel as libLoadModel,
  generateImage as libGenerateImage,
  unloadModel as libUnloadModel,
  detectCapabilities as libDetectCapabilities,
  listSupportedModels as libListSupportedModels,
  isModelLoaded as libIsModelLoaded,
  purgeModelCache as libPurgeModelCache,
  purgeAllCaches as libPurgeAllCaches,
} from 'web-txt2img';
import { canLoadModel, releaseMemory, getMemoryInfo, formatMemory } from './memoryGuard.js';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000; // 2s, 4s, 8s

/** Checks whether an error looks like a network/connection failure. */
function isNetworkError(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network error') ||
    msg.includes('load failed') ||
    msg.includes('aborted') ||
    msg.includes('err_connection') ||
    msg.includes('err_internet') ||
    msg.includes('timeout')
  );
}

class Txt2ImgService {
  constructor() {
    this.currentModelId = null;
    this.isLoading = false;
    this.isGenerating = false;
  }

  // ── Detect capabilities ──────────────────────────────────────────────
  async detect() {
    try {
      return await libDetectCapabilities();
    } catch (error) {
      console.error('❌ Capability detection failed:', error);
      return { webgpu: false, shaderF16: false, wasm: false };
    }
  }

  // ── List available models ────────────────────────────────────────────
  listModels() {
    try {
      return libListSupportedModels();
    } catch (error) {
      console.error('❌ Failed to list models:', error);
      return [];
    }
  }

  // ── Internal: single attempt to load ─────────────────────────────────
  async _loadOnce(modelId, onProgress) {
    // Configure ONNX Runtime WASM paths and limit threads to save memory
    try {
      const ort = await import('onnxruntime-web');
      if (ort?.env?.wasm) {
        ort.env.wasm.wasmPaths = '/';
        // Limit WASM threads to reduce memory overhead (each thread allocates its own heap)
        ort.env.wasm.numThreads = Math.min(navigator.hardwareConcurrency || 4, 4);
      }
      // Disable WebGL fallback to save memory
      if (ort?.env?.webgl) {
        ort.env.webgl.pack = false;
      }
    } catch { /* ort may not be available for janus models */ }

    // Track timing to detect cache loads (files load in < 2s each from cache)
    let firstProgressTime = 0;
    let lastPct = 0; // eslint-disable-line no-unused-vars
    let likelyCached = false;

    const result = await libLoadModel(modelId, {
      backendPreference: ['webgpu', 'wasm'],
      wasmPaths: '/',
      onProgress: (progress) => {
        if (!onProgress) return;

        const pct = typeof progress.pct === 'number' ? progress.pct : 0;
        const msg = progress.message || '';
        const now = performance.now();

        if (!firstProgressTime && pct > 0) firstProgressTime = now;

        // Detect cache: large pct jump in under 3 seconds, or "ready in" in message
        if (firstProgressTime && !likelyCached) {
          const elapsed = now - firstProgressTime;
          if ((pct > 30 && elapsed < 3000) || msg.includes('ready in')) {
            likelyCached = true;
          }
        }
        lastPct = pct;

        // Enhance message for cache loads
        let displayMessage = msg || `Loading ${modelId}...`;
        if (likelyCached && !msg.includes('ready in')) {
          displayMessage = `Loading from cache... ${msg}`;
        }

        onProgress({
          phase: progress.phase || 'loading',
          pct,
          bytesDownloaded: progress.bytesDownloaded ?? 0,
          totalBytesExpected: progress.totalBytesExpected ?? 0,
          message: displayMessage,
        });
      },
    });

    if (result?.ok) {
      return result;
    }
    throw new Error(result?.message || `Failed to load model: ${modelId}`);
  }

  // ── Load a model (with memory check + auto-retry) ────────────────────
  async loadModel(modelId, onProgress) {
    if (this.isLoading) {
      throw new Error('A model is already being loaded. Please wait.');
    }

    this.isLoading = true;

    try {
      // ── Step 1: ALWAYS unload the previous model first to free RAM ──
      if (this.currentModelId && this.currentModelId !== modelId) {
        console.log(`🔄 Unloading previous model to free memory: ${this.currentModelId}`);
        onProgress?.({ phase: 'unloading', pct: 0, message: `Unloading ${this.currentModelId} to free memory...` });
        try { await libUnloadModel(this.currentModelId); } catch { /* ignore */ }
        this.currentModelId = null;
        // Give the browser time to reclaim memory
        await releaseMemory();
        console.log('♻️ Memory released after unload');
      }

      // If same model is already loaded, skip
      if (this.currentModelId === modelId && libIsModelLoaded(modelId)) {
        console.log(`✅ Model ${modelId} already loaded`);
        return { ok: true, message: 'Already loaded' };
      }

      // ── Step 2: Check memory before loading ──
      const memCheck = canLoadModel(modelId);
      const memInfo = getMemoryInfo();

      if (memInfo.supported) {
        console.log(`💾 Memory: ${formatMemory(memInfo.usedJSHeap)} used / ${formatMemory(memInfo.heapLimit)} limit (${formatMemory(memInfo.available)} free)`);
      }

      if (!memCheck.safe) {
        console.error(`❌ Memory guard: ${memCheck.reason}`);
        throw new Error(memCheck.reason);
      }

      if (memCheck.warning) {
        console.warn(`⚠️ Memory warning: ${memCheck.warning}`);
        onProgress?.({ phase: 'loading', pct: 0, message: memCheck.warning });
        // Small pause so user sees the warning
        await new Promise(r => setTimeout(r, 1500));
      }

      console.log(`📦 Loading model: ${modelId} (100% local, WebGPU)`);

      let lastError = null;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
            console.log(`🔄 Retry ${attempt}/${MAX_RETRIES} in ${delay / 1000}s... (cached files will load instantly)`);
            onProgress?.({
              phase: 'retrying',
              pct: 0,
              bytesDownloaded: 0,
              totalBytesExpected: 0,
              message: `Connection lost. Retrying (${attempt}/${MAX_RETRIES})... cached files are preserved.`,
            });
            await new Promise(r => setTimeout(r, delay));
          }

          const result = await this._loadOnce(modelId, onProgress);
          this.currentModelId = modelId;
          console.log(`✅ Model ${modelId} loaded! Backend: ${result.backendUsed || 'unknown'}`);
          return result;

        } catch (error) {
          lastError = error;
          console.warn(`⚠️ Load attempt ${attempt + 1} failed:`, error.message);

          // Only retry on network-type errors; other errors (e.g. backend not
          // available) are not transient and should fail immediately.
          if (!isNetworkError(error) || attempt >= MAX_RETRIES) {
            break;
          }
        }
      }

      // All retries exhausted
      console.error(`❌ Failed to load model ${modelId} after ${MAX_RETRIES + 1} attempts:`, lastError);
      this.currentModelId = null;
      throw lastError;

    } finally {
      this.isLoading = false;
    }
  }

  // ── Generate an image ────────────────────────────────────────────────
  async generate({ prompt, seed = -1, width = 512, height = 512 }, onProgress) {
    if (!this.currentModelId) {
      throw new Error('No model loaded. Please load a model first.');
    }
    if (this.isGenerating) {
      throw new Error('A generation is already in progress.');
    }

    this.isGenerating = true;

    try {
      const actualSeed = seed === -1 ? Math.floor(Math.random() * 2147483647) : seed;

      console.log(`🎨 Generating: "${prompt.substring(0, 60)}..." | Seed: ${actualSeed}`);

      const result = await libGenerateImage({
        model: this.currentModelId,
        prompt,
        seed: actualSeed,
        width: width || 512,
        height: height || 512,
        onProgress: (event) => {
          if (onProgress) {
            onProgress({
              phase: event.phase || 'generating',
              pct: typeof event.pct === 'number' ? event.pct : 0,
              message: event.message || 'Generating...',
            });
          }
        },
      });

      if (result.ok) {
        const imageUrl = URL.createObjectURL(result.blob);
        console.log(`✅ Generated in ${Math.round(result.timeMs)}ms (100% local)`);
        return {
          imageUrl,
          seed: actualSeed,
          timeMs: result.timeMs,
          mode: 'local',
          model: this.currentModelId,
        };
      } else {
        throw new Error(result.message || 'Generation failed');
      }
    } catch (error) {
      console.error('❌ Generation failed:', error);
      throw error;
    } finally {
      this.isGenerating = false;
    }
  }

  // ── Unload current model ─────────────────────────────────────────────
  async unload() {
    if (!this.currentModelId) return;
    try {
      await libUnloadModel(this.currentModelId);
      this.currentModelId = null;
    } catch { /* ignore */ }
  }

  // ── Purge cached model data ──────────────────────────────────────────
  async purge(modelId) {
    try {
      await libPurgeModelCache(modelId);
    } catch { /* ignore */ }
  }

  async purgeAll() {
    try {
      await libPurgeAllCaches();
    } catch { /* ignore */ }
  }

  // ── Destroy (full cleanup) ───────────────────────────────────────────
  async destroy() {
    if (this.currentModelId) {
      try { await libUnloadModel(this.currentModelId); } catch { /* ignore */ }
    }
    this.currentModelId = null;
    this.isLoading = false;
    this.isGenerating = false;
    // Try to reclaim memory
    await releaseMemory();
  }
}

// Export singleton
export const txt2imgService = new Txt2ImgService();
