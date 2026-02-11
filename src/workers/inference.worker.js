// Web Worker for AI Inference
// Image Enhancement: Transformers.js with WebGPU (local super-resolution)
// Background Removal: Transformers.js with WebGPU (local RMBG-1.4)
// Note: Text-to-image is handled by txt2imgService (web-txt2img) on the main thread

import { pipeline, env } from '@huggingface/transformers';

// Configure Transformers.js
env.allowLocalModels = true;
env.useBrowserCache = true;
env.allowRemoteModels = true;

let img2imgPipeline = null;
let bgRemovalPipeline = null;
let webGPUAvailable = false;

// Message handler
self.onmessage = async (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'CHECK_WEBGPU':
      await checkWebGPU();
      break;
    case 'LOAD_MODEL':
      await loadEnhancementModel(payload);
      break;
    case 'GENERATE':
      await enhanceImage(payload);
      break;
    case 'REMOVE_BACKGROUND':
      await removeBackground(payload);
      break;
    default:
      console.warn('Unknown message type:', type);
  }
};

// ========== WebGPU Detection ==========
async function checkWebGPU() {
  try {
    if (typeof navigator !== 'undefined' && navigator.gpu) {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) {
        const info = await adapter.requestAdapterInfo?.() || {};
        webGPUAvailable = true;
        self.postMessage({
          type: 'WEBGPU_STATUS',
          payload: {
            supported: true,
            info: `WebGPU: ${info.description || info.vendor || 'GPU Detected'}`,
            features: {
              textToImage: 'local',
              imageEnhancement: true,
              backgroundRemoval: true,
            }
          }
        });
        return;
      }
    }
    webGPUAvailable = false;
    self.postMessage({
      type: 'WEBGPU_STATUS',
      payload: { supported: false, reason: 'WebGPU not available' }
    });
  } catch (error) {
    webGPUAvailable = false;
    self.postMessage({
      type: 'WEBGPU_STATUS',
      payload: { supported: false, reason: error.message }
    });
  }
}

// ========== Image Enhancement (Super-Resolution) ==========
async function loadEnhancementModel(payload) {
  const { modelId, modelRepo } = payload;

  try {
    self.postMessage({
      type: 'MODEL_LOADING',
      payload: { modelId, progress: 10, message: 'Loading enhancement model...' }
    });

    if (!img2imgPipeline) {
      img2imgPipeline = await pipeline('image-to-image', modelRepo || 'Xenova/swin2SR-classical-sr-x2-64', {
        device: webGPUAvailable ? 'webgpu' : 'wasm',
        progress_callback: (progress) => {
          if (progress.status === 'progress' || progress.status === 'download') {
            const pct = 10 + Math.round((progress.progress || 0) * 0.8);
            self.postMessage({
              type: 'MODEL_LOADING',
              payload: {
                modelId,
                progress: pct,
                message: `Downloading: ${Math.round(progress.progress || 0)}%`
              }
            });
          }
        }
      });
    }

    self.postMessage({
      type: 'MODEL_LOADING',
      payload: { modelId, progress: 100, message: 'Ready!' }
    });
    self.postMessage({
      type: 'MODEL_LOADED',
      payload: { modelId, modelRepo, engine: 'local-enhance' }
    });
  } catch (error) {
    console.error('Failed to load enhancement model:', error);
    self.postMessage({
      type: 'MODEL_ERROR',
      payload: { modelId, error: error.message }
    });
  }
}

async function enhanceImage(payload) {
  const { sourceImage } = payload;

  if (!sourceImage) {
    self.postMessage({
      type: 'GENERATION_ERROR',
      payload: { error: 'No source image provided for enhancement.' }
    });
    return;
  }

  if (!img2imgPipeline) {
    self.postMessage({
      type: 'GENERATION_ERROR',
      payload: { error: 'Enhancement model not loaded.' }
    });
    return;
  }

  self.postMessage({ type: 'GENERATION_STARTED', payload: { prompt: 'Image Enhancement' } });

  try {
    let imageBlob;
    if (sourceImage.startsWith('data:') || sourceImage.startsWith('blob:')) {
      const response = await fetch(sourceImage);
      imageBlob = await response.blob();
    } else {
      throw new Error('Unsupported image format');
    }

    self.postMessage({ type: 'GENERATION_PROGRESS', payload: { progress: 40 } });

    const result = await img2imgPipeline(imageBlob);

    self.postMessage({ type: 'GENERATION_PROGRESS', payload: { progress: 90 } });

    const imageUrl = await resultToUrl(result);

    self.postMessage({ type: 'GENERATION_PROGRESS', payload: { progress: 100 } });
    self.postMessage({
      type: 'GENERATION_COMPLETE',
      payload: { imageUrl, mode: 'local', info: 'Enhanced 2x with WebGPU' }
    });
  } catch (error) {
    console.error('Enhancement error:', error);
    self.postMessage({
      type: 'GENERATION_ERROR',
      payload: { error: error.message }
    });
  }
}

// ========== Background Removal ==========
async function removeBackground(payload) {
  const { imageData, callbackId } = payload;

  try {
    if (!bgRemovalPipeline) {
      self.postMessage({
        type: 'BG_REMOVAL_PROGRESS',
        payload: { progress: 10, message: 'Loading model...' }
      });

      bgRemovalPipeline = await pipeline('image-segmentation', 'briaai/RMBG-1.4', {
        device: webGPUAvailable ? 'webgpu' : 'wasm',
        progress_callback: (progress) => {
          if (progress.status === 'progress' || progress.status === 'download') {
            const pct = 10 + Math.round((progress.progress || 0) * 0.5);
            self.postMessage({
              type: 'BG_REMOVAL_PROGRESS',
              payload: { progress: pct, message: `Downloading: ${Math.round(progress.progress || 0)}%` }
            });
          }
        }
      });
    }

    self.postMessage({ type: 'BG_REMOVAL_PROGRESS', payload: { progress: 60, message: 'Processing...' } });

    const result = await bgRemovalPipeline(imageData);

    self.postMessage({ type: 'BG_REMOVAL_PROGRESS', payload: { progress: 75, message: 'Applying mask...' } });

    let maskData;
    if (Array.isArray(result) && result.length > 0) {
      maskData = result[0].mask;
    } else if (result?.mask) {
      maskData = result.mask;
    } else {
      maskData = result;
    }

    const imageUrl = await applyMaskToImage(imageData, maskData);

    self.postMessage({ type: 'BG_REMOVAL_PROGRESS', payload: { progress: 100, message: 'Done!' } });
    self.postMessage({ type: 'BG_REMOVAL_COMPLETE', payload: { imageUrl, callbackId } });
  } catch (error) {
    console.error('Background removal error:', error);
    self.postMessage({
      type: 'BG_REMOVAL_ERROR',
      payload: { error: error.message, callbackId }
    });
  }
}

// ========== Helpers ==========
async function resultToUrl(result) {
  if (result instanceof Blob) return URL.createObjectURL(result);
  if (result?.images?.[0]) {
    const img = result.images[0];
    return img instanceof Blob ? URL.createObjectURL(img) : img;
  }
  if (result?.image) {
    const img = result.image;
    return img instanceof Blob ? URL.createObjectURL(img) : img;
  }
  if (typeof result === 'string') return result;
  throw new Error('Unexpected result format');
}

async function applyMaskToImage(originalImageData, maskData) {
  const originalImg = await loadImage(originalImageData);
  const canvas = new OffscreenCanvas(originalImg.width, originalImg.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(originalImg, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  let maskCanvas, maskCtx, maskPixels;

  if (maskData.toCanvas) {
    maskCanvas = maskData.toCanvas();
    maskCtx = maskCanvas.getContext('2d');
    maskPixels = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data;
  } else if (maskData instanceof ImageBitmap) {
    maskCanvas = new OffscreenCanvas(maskData.width, maskData.height);
    maskCtx = maskCanvas.getContext('2d');
    maskCtx.drawImage(maskData, 0, 0);
    maskPixels = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data;
  } else if (maskData.data) {
    maskPixels = maskData.data;
  } else {
    throw new Error('Unknown mask format');
  }

  if (maskCanvas && (maskCanvas.width !== canvas.width || maskCanvas.height !== canvas.height)) {
    const scaled = new OffscreenCanvas(canvas.width, canvas.height);
    const sCtx = scaled.getContext('2d');
    sCtx.drawImage(maskCanvas, 0, 0, canvas.width, canvas.height);
    maskPixels = sCtx.getImageData(0, 0, canvas.width, canvas.height).data;
  }

  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i + 3] = maskPixels[i];
  }

  ctx.putImageData(imageData, 0, 0);
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return URL.createObjectURL(blob);
}

function loadImage(src) {
  return fetch(src).then(r => r.blob()).then(b => createImageBitmap(b));
}
