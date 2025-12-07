// Web Worker for AI Inference
// Text-to-Image: Pollinations.ai API (reliable, fast)
// Image Enhancement: Transformers.js with WebGPU (local super-resolution)
// Background Removal: Transformers.js with WebGPU (local RMBG-1.4)

import { pipeline, env } from '@huggingface/transformers';

// Configure Transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

let currentModel = null;
let img2imgPipeline = null; // For local image enhancement (super-resolution)
let bgRemovalPipeline = null; // For background removal
let webGPUAvailable = false;

// Message handler
self.onmessage = async (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'LOAD_MODEL':
      await loadModel(payload);
      break;
    case 'GENERATE':
      await generate(payload);
      break;
    case 'CHECK_WEBGPU':
      await checkWebGPU();
      break;
    case 'REMOVE_BACKGROUND':
      await removeBackground(payload);
      break;
    default:
      console.warn('Unknown message type:', type);
  }
};

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
              textToImage: 'api', // Via Pollinations.ai
              imageEnhancement: true // Local WebGPU super-resolution
            }
          }
        });
        return;
      }
    }
    
    webGPUAvailable = false;
    self.postMessage({
      type: 'WEBGPU_STATUS',
      payload: { 
        supported: false, 
        reason: 'WebGPU not available',
        features: {
          textToImage: 'api',
          imageEnhancement: false
        }
      }
    });
  } catch (error) {
    webGPUAvailable = false;
    self.postMessage({
      type: 'WEBGPU_STATUS',
      payload: { 
        supported: false, 
        reason: error.message
      }
    });
  }
}

async function loadModel(payload) {
  const { modelId, modelRepo, engine = 'api' } = payload;

  try {
    currentModel = {
      id: modelId,
      repo: modelRepo,
      engine: engine
    };

    console.log(`📦 Configuring model: ${modelId}`);

    self.postMessage({
      type: 'MODEL_LOADING',
      payload: { modelId, progress: 30, message: 'Connecting...' }
    });

    // Load local image enhancement pipeline (super-resolution)
    if (webGPUAvailable && !img2imgPipeline) {
      try {
        self.postMessage({
          type: 'MODEL_LOADING',
          payload: { modelId, progress: 50, message: 'Loading image enhancer...' }
        });

        img2imgPipeline = await pipeline('image-to-image', 'Xenova/swin2SR-classical-sr-x2-64', {
          device: 'webgpu',
          progress_callback: (progress) => {
            if (progress.status === 'progress' || progress.status === 'download') {
              const pct = 50 + Math.round((progress.progress || 0) * 0.4);
              self.postMessage({
                type: 'MODEL_LOADING',
                payload: { 
                  modelId, 
                  progress: pct,
                  message: `Loading enhancer: ${Math.round(progress.progress || 0)}%`
                }
              });
            }
          }
        });

        console.log('✅ Image enhancement ready (local WebGPU)');
      } catch (err) {
        console.warn('⚠️ Image enhancement not available:', err.message);
        img2imgPipeline = null;
      }
    }

    self.postMessage({
      type: 'MODEL_LOADING',
      payload: { modelId, progress: 100, message: 'Ready!' }
    });

    console.log(`✅ Ready! Model: ${modelId} | Enhancement: ${img2imgPipeline ? 'Local WebGPU' : 'N/A'}`);

    self.postMessage({
      type: 'MODEL_LOADED',
      payload: { 
        modelId, 
        modelRepo,
        engine: 'api',
        capabilities: {
          textToImage: 'api',
          imageEnhancement: img2imgPipeline ? 'local' : 'none'
        }
      }
    });

  } catch (error) {
    console.error('❌ Model config error:', error);
    self.postMessage({
      type: 'MODEL_ERROR',
      payload: { modelId, error: error.message }
    });
  }
}

async function generate(payload) {
  const { 
    prompt, 
    negativePrompt = '', 
    steps = 20, 
    guidanceScale = 7.5,
    width = 512,
    height = 512,
    seed = -1,
    sourceImage = null,
    strength = 0.75
  } = payload;

  if (!currentModel) {
    self.postMessage({
      type: 'GENERATION_ERROR',
      payload: { error: 'No model selected. Please select a model first.' }
    });
    return;
  }

  self.postMessage({
    type: 'GENERATION_STARTED',
    payload: { prompt }
  });

  // Image Enhancement mode (local WebGPU)
  if (sourceImage && img2imgPipeline) {
    console.log('🖼️ Image Enhancement mode (local WebGPU)');
    try {
      await enhanceImageLocally(sourceImage);
      return;
    } catch (err) {
      console.warn('⚠️ Local enhancement failed:', err.message);
    }
  }

  // Text-to-Image (API)
  console.log('🎨 Generating via Pollinations.ai API...');
  await generateViaAPI(payload);
}

// ========== API GENERATION (Pollinations.ai) ==========
async function generateViaAPI(payload) {
  const { 
    prompt, 
    negativePrompt = '', 
    width = 512,
    height = 512,
    seed = -1
  } = payload;

  try {
    // Progress simulation
    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      currentProgress = Math.min(85, currentProgress + 8);
      self.postMessage({
        type: 'GENERATION_PROGRESS',
        payload: { progress: currentProgress, mode: 'api' }
      });
    }, 500);

    // Calculate seed
    const actualSeed = seed === -1 ? Math.floor(Math.random() * 2147483647) : seed;
    
    // Use the model ID for Pollinations
    const model = currentModel.repo || currentModel.id || 'flux';
    
    // Build URL
    const encodedPrompt = encodeURIComponent(prompt);
    let url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${actualSeed}&model=${model}&nologo=true`;
    
    if (negativePrompt) {
      url += `&negative=${encodeURIComponent(negativePrompt)}`;
    }

    console.log(`🎨 API: ${model} | ${width}x${height} | Seed: ${actualSeed}`);

    // Fetch with retry
    let response;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        response = await fetch(url);
        if (response.ok) break;
        
        if (response.status >= 500 && attempt < maxRetries) {
          console.warn(`⚠️ API Error ${response.status}, retry ${attempt}/${maxRetries}...`);
          await new Promise(r => setTimeout(r, 2000 * attempt));
          continue;
        }
        throw new Error(`API Error: ${response.status}`);
      } catch (err) {
        if (attempt === maxRetries) throw err;
        await new Promise(r => setTimeout(r, 2000 * attempt));
      }
    }
    
    clearInterval(progressInterval);

    if (!response?.ok) {
      throw new Error('Generation failed after retries');
    }

    const blob = await response.blob();
    const imageUrl = URL.createObjectURL(blob);

    self.postMessage({
      type: 'GENERATION_PROGRESS',
      payload: { progress: 100, mode: 'api' }
    });

    self.postMessage({
      type: 'GENERATION_COMPLETE',
      payload: { 
        imageUrl, 
        mode: 'api',
        model: model,
        seed: actualSeed
      }
    });
    
  } catch (error) {
    console.error('❌ API Error:', error);
    self.postMessage({
      type: 'GENERATION_ERROR',
      payload: { error: error.message }
    });
  }
}

// ========== LOCAL IMAGE ENHANCEMENT (Super-Resolution) ==========
async function enhanceImageLocally(imageData) {
  if (!img2imgPipeline) {
    throw new Error('Enhancement pipeline not loaded');
  }

  try {
    console.log('✨ Enhancing image locally with WebGPU...');
    
    let imageBlob;
    if (imageData.startsWith('data:') || imageData.startsWith('blob:')) {
      const response = await fetch(imageData);
      imageBlob = await response.blob();
    } else {
      throw new Error('Unsupported image format');
    }

    self.postMessage({
      type: 'GENERATION_PROGRESS',
      payload: { progress: 30, mode: 'local' }
    });

    const result = await img2imgPipeline(imageBlob);
    
    self.postMessage({
      type: 'GENERATION_PROGRESS',
      payload: { progress: 90, mode: 'local' }
    });

    // Convert result to URL
    let imageUrl;
    if (result instanceof Blob) {
      imageUrl = URL.createObjectURL(result);
    } else if (result?.images?.[0]) {
      const img = result.images[0];
      imageUrl = img instanceof Blob ? URL.createObjectURL(img) : img;
    } else if (typeof result === 'string') {
      imageUrl = result;
    } else {
      throw new Error('Unexpected result format');
    }

    self.postMessage({
      type: 'GENERATION_PROGRESS',
      payload: { progress: 100, mode: 'local' }
    });

    self.postMessage({
      type: 'GENERATION_COMPLETE',
      payload: { 
        imageUrl, 
        mode: 'local',
        info: '✨ Enhanced 2x with WebGPU'
      }
    });

    console.log('✅ Enhancement complete!');
    
  } catch (error) {
    console.error('❌ Enhancement error:', error);
    throw error;
  }
}

// ========== BACKGROUND REMOVAL (Local WebGPU) ==========
async function removeBackground(payload) {
  const { imageData, callbackId } = payload;

  try {
    console.log('✂️ Removing background locally with WebGPU...');

    // Load pipeline if not already loaded
    if (!bgRemovalPipeline) {
      console.log('📦 Loading background removal model (RMBG-1.4)...');
      
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
              payload: { 
                progress: pct,
                message: `Downloading: ${Math.round(progress.progress || 0)}%`
              }
            });
          }
        }
      });

      console.log('✅ Background removal model loaded!');
    }

    self.postMessage({
      type: 'BG_REMOVAL_PROGRESS',
      payload: { progress: 60, message: 'Processing image...' }
    });

    // Get the mask from the model
    const result = await bgRemovalPipeline(imageData);

    self.postMessage({
      type: 'BG_REMOVAL_PROGRESS',
      payload: { progress: 75, message: 'Applying mask...' }
    });

    // The result is an array with mask data - we need to apply it to the original
    let maskData;
    if (Array.isArray(result) && result.length > 0) {
      maskData = result[0].mask;
    } else if (result?.mask) {
      maskData = result.mask;
    } else {
      maskData = result;
    }

    // Apply the mask to the original image to create transparency
    const imageUrl = await applyMaskToImage(imageData, maskData);

    self.postMessage({
      type: 'BG_REMOVAL_PROGRESS',
      payload: { progress: 100, message: 'Done!' }
    });

    self.postMessage({
      type: 'BG_REMOVAL_COMPLETE',
      payload: { 
        imageUrl,
        callbackId
      }
    });

    console.log('✅ Background removal complete!');

  } catch (error) {
    console.error('❌ Background removal error:', error);
    self.postMessage({
      type: 'BG_REMOVAL_ERROR',
      payload: { 
        error: error.message,
        callbackId
      }
    });
  }
}

// Apply mask to original image to create transparent PNG
async function applyMaskToImage(originalImageData, maskData) {
  // Create canvas for the original image
  const originalImg = await loadImage(originalImageData);
  const canvas = new OffscreenCanvas(originalImg.width, originalImg.height);
  const ctx = canvas.getContext('2d');
  
  // Draw original image
  ctx.drawImage(originalImg, 0, 0);
  
  // Get original image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  // Get mask as ImageData
  let maskCanvas, maskCtx, maskPixels;
  
  if (maskData.toCanvas) {
    // RawImage from transformers.js
    maskCanvas = maskData.toCanvas();
    maskCtx = maskCanvas.getContext('2d');
    const maskImageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    maskPixels = maskImageData.data;
  } else if (maskData instanceof ImageBitmap) {
    maskCanvas = new OffscreenCanvas(maskData.width, maskData.height);
    maskCtx = maskCanvas.getContext('2d');
    maskCtx.drawImage(maskData, 0, 0);
    const maskImageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    maskPixels = maskImageData.data;
  } else if (maskData.data) {
    // Already ImageData-like
    maskPixels = maskData.data;
  } else {
    throw new Error('Unknown mask format');
  }

  // Scale mask if needed
  if (maskCanvas && (maskCanvas.width !== canvas.width || maskCanvas.height !== canvas.height)) {
    const scaledMask = new OffscreenCanvas(canvas.width, canvas.height);
    const scaledCtx = scaledMask.getContext('2d');
    scaledCtx.drawImage(maskCanvas, 0, 0, canvas.width, canvas.height);
    const scaledData = scaledCtx.getImageData(0, 0, canvas.width, canvas.height);
    maskPixels = scaledData.data;
  }

  // Apply mask as alpha channel
  // Mask is grayscale - white (255) = foreground, black (0) = background
  for (let i = 0; i < pixels.length; i += 4) {
    const maskIndex = i;
    // Use the red channel of the mask (grayscale, so R=G=B)
    const alpha = maskPixels[maskIndex]; // 0-255
    pixels[i + 3] = alpha; // Set alpha channel
  }

  // Put modified image data back
  ctx.putImageData(imageData, 0, 0);

  // Convert to blob
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return URL.createObjectURL(blob);
}

// Helper to load image from data URL
function loadImage(src) {
  return new Promise((resolve, reject) => {
    // In a worker, we need to use fetch + createImageBitmap
    fetch(src)
      .then(res => res.blob())
      .then(blob => createImageBitmap(blob))
      .then(resolve)
      .catch(reject);
  });
}
