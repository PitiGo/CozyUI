// Web Worker for AI Inference
// Text-to-Image: Pollinations.ai API (reliable, fast)
// Image Enhancement: Transformers.js with WebGPU (local)

import { pipeline, env } from '@huggingface/transformers';

// Configure Transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

let currentModel = null;
let img2imgPipeline = null; // For local image enhancement (super-resolution)
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
              imageEnhancement: true // Local WebGPU
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
  const { modelId, modelRepo } = payload;

  try {
    currentModel = {
      id: modelId,
      repo: modelRepo
    };

    console.log(`📦 Configuring model: ${modelId}`);

    self.postMessage({
      type: 'MODEL_LOADING',
      payload: { modelId, progress: 30, message: 'Connecting to API...' }
    });

    // Optionally load local image enhancement pipeline
    if (webGPUAvailable && !img2imgPipeline) {
      try {
        self.postMessage({
          type: 'MODEL_LOADING',
          payload: { modelId, progress: 50, message: 'Loading image enhancer...' }
        });

        img2imgPipeline = await pipeline('image-to-image', 'Xenova/swin2SR-classical-sr-x2-64', {
          device: 'webgpu',
          progress_callback: (progress) => {
            if (progress.status === 'download') {
              const pct = 50 + (progress.progress || 0) * 40;
              self.postMessage({
                type: 'MODEL_LOADING',
                payload: { 
                  modelId, 
                  progress: Math.round(pct),
                  message: `Downloading enhancer: ${progress.file || ''}...`
                }
              });
            }
          }
        });

        console.log('✅ Image enhancement pipeline ready');
      } catch (err) {
        console.warn('⚠️ Image enhancement not available:', err.message);
        img2imgPipeline = null;
      }
    }

    self.postMessage({
      type: 'MODEL_LOADING',
      payload: { modelId, progress: 100, message: 'Ready!' }
    });

    console.log(`✅ Ready! Model: ${modelId} | Enhancement: ${img2imgPipeline ? 'Local' : 'N/A'}`);

    self.postMessage({
      type: 'MODEL_LOADED',
      payload: { 
        modelId, 
        modelRepo,
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

  // Image Enhancement mode (local)
  if (sourceImage && img2imgPipeline) {
    console.log('🖼️ Image Enhancement mode (local WebGPU)');
    try {
      await enhanceImageLocally(sourceImage);
      return;
    } catch (err) {
      console.warn('⚠️ Local enhancement failed:', err.message);
    }
  }

  // Text-to-Image mode (API)
  console.log('🌐 Generating via Pollinations.ai API...');
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
    
    // Use the model ID directly for Pollinations
    const model = currentModel.repo || currentModel.id || 'flux';
    
    // Build URL
    const encodedPrompt = encodeURIComponent(prompt);
    let url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${actualSeed}&model=${model}&nologo=true`;
    
    if (negativePrompt) {
      url += `&negative=${encodeURIComponent(negativePrompt)}`;
    }

    console.log(`🌐 API: ${model} | Size: ${width}x${height} | Seed: ${actualSeed}`);

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

// ========== LOCAL IMAGE ENHANCEMENT ==========
async function enhanceImageLocally(imageData) {
  if (!img2imgPipeline) {
    throw new Error('Enhancement pipeline not loaded');
  }

  try {
    console.log('✨ Enhancing image locally...');
    
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
        info: '✨ Enhanced with WebGPU'
      }
    });

    console.log('✅ Enhancement complete!');
    
  } catch (error) {
    console.error('❌ Enhancement error:', error);
    throw error;
  }
}
