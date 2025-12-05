// Web Worker for AI Inference
// Uses Transformers.js v3 with WebGPU for local AI inference
// Falls back to Pollinations.ai API if local fails

import { pipeline, env } from '@huggingface/transformers';

// Configure Transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

let currentModel = null;
let text2imgPipeline = null;
let img2imgPipeline = null;
let webGPUAvailable = false;
let localTextToImageAvailable = false;

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
              textToImage: true,  // Available in transformers.js v3!
              imageToImage: true  // Available!
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
          textToImage: false,
          imageToImage: false
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

    self.postMessage({
      type: 'MODEL_LOADING',
      payload: { modelId, progress: 10, message: 'Initializing...' }
    });

    // Try to initialize pipelines if WebGPU available
    if (webGPUAvailable) {
      // Try text-to-image pipeline first
      try {
        self.postMessage({
          type: 'MODEL_LOADING',
          payload: { modelId, progress: 20, message: 'Loading text-to-image pipeline (this may take a while)...' }
        });

        // Use a small/quantized model for text-to-image
        // Note: This downloads ~2GB, so it's optional
        text2imgPipeline = await pipeline('text-to-image', 'onnx-community/stable-diffusion-3.5-medium', {
          device: 'webgpu',
          dtype: 'fp16',
          progress_callback: (progress) => {
            if (progress.status === 'download' || progress.status === 'progress') {
              const pct = 20 + (progress.progress || 0) * 40;
              self.postMessage({
                type: 'MODEL_LOADING',
                payload: { 
                  modelId, 
                  progress: Math.round(pct),
                  message: `Downloading text-to-image: ${progress.file || 'model'}... ${Math.round((progress.progress || 0) * 100)}%`
                }
              });
            }
          }
        });

        localTextToImageAvailable = true;
        console.log('✅ Text-to-image pipeline loaded locally with WebGPU!');
      } catch (pipelineError) {
        console.warn('⚠️ Local text-to-image failed, will use API:', pipelineError.message);
        text2imgPipeline = null;
        localTextToImageAvailable = false;
      }

      // Try image-to-image pipeline
      try {
        self.postMessage({
          type: 'MODEL_LOADING',
          payload: { modelId, progress: 70, message: 'Loading image enhancement pipeline...' }
        });

        img2imgPipeline = await pipeline('image-to-image', 'Xenova/swin2SR-classical-sr-x2-64', {
          device: 'webgpu',
          progress_callback: (progress) => {
            if (progress.status === 'download') {
              const pct = 70 + (progress.progress || 0) * 20;
              self.postMessage({
                type: 'MODEL_LOADING',
                payload: { 
                  modelId, 
                  progress: Math.round(pct),
                  message: `Downloading image enhancer: ${progress.file || 'model'}...`
                }
              });
            }
          }
        });

        console.log('✅ Image-to-image pipeline loaded locally');
      } catch (pipelineError) {
        console.warn('Image-to-image pipeline failed:', pipelineError.message);
        img2imgPipeline = null;
      }
    }

    self.postMessage({
      type: 'MODEL_LOADING',
      payload: { modelId, progress: 100 }
    });

    self.postMessage({
      type: 'MODEL_LOADED',
      payload: { 
        modelId, 
        modelRepo,
        capabilities: {
          textToImage: localTextToImageAvailable ? 'local' : 'api',
          imageToImage: img2imgPipeline ? 'local' : 'api'
        }
      }
    });

  } catch (error) {
    console.error('Model loading error:', error);
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
    sourceImage = null, // Base64 or URL for img2img
    strength = 0.75
  } = payload;

  if (!currentModel) {
    self.postMessage({
      type: 'GENERATION_ERROR',
      payload: { error: 'No model loaded. Please load a model first.' }
    });
    return;
  }

  self.postMessage({
    type: 'GENERATION_STARTED',
    payload: { prompt }
  });

  // Try local WebGPU generation first if available
  if (localTextToImageAvailable && text2imgPipeline) {
    try {
      console.log('🚀 Attempting local WebGPU text-to-image generation...');
      await generateLocally(payload);
      return;
    } catch (localError) {
      console.warn('⚠️ Local generation failed, falling back to API:', localError.message);
    }
  }

  // Fallback to API
  console.log('🌐 Using Pollinations.ai API for generation...');
  await generateViaAPI(payload);
}

async function generateLocally(payload) {
  const { 
    prompt, 
    negativePrompt = '', 
    steps = 20, 
    guidanceScale = 7.5,
    width = 512,
    height = 512,
    seed = -1
  } = payload;

  try {
    self.postMessage({
      type: 'GENERATION_PROGRESS',
      payload: { step: 0, totalSteps: steps, progress: 0, mode: 'local' }
    });

    const actualSeed = seed === -1 ? Math.floor(Math.random() * 2147483647) : seed;
    
    console.log(`🖼️ Generating locally: "${prompt}" (${width}x${height}, ${steps} steps, seed: ${actualSeed})`);

    const result = await text2imgPipeline(prompt, {
      negative_prompt: negativePrompt,
      num_inference_steps: steps,
      guidance_scale: guidanceScale,
      width,
      height,
      seed: actualSeed,
      callback: (info) => {
        if (info.step !== undefined) {
          const progress = Math.round((info.step / steps) * 100);
          self.postMessage({
            type: 'GENERATION_PROGRESS',
            payload: { 
              step: info.step, 
              totalSteps: steps, 
              progress,
              mode: 'local'
            }
          });
        }
      }
    });

    // Convert result to blob URL
    let imageUrl;
    if (result.images && result.images[0]) {
      const image = result.images[0];
      if (image instanceof Blob) {
        imageUrl = URL.createObjectURL(image);
      } else if (image.toBlob) {
        const blob = await image.toBlob();
        imageUrl = URL.createObjectURL(blob);
      } else if (typeof image === 'string' && image.startsWith('data:')) {
        imageUrl = image;
      } else {
        // Canvas or ImageData
        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        ctx.putImageData(image, 0, 0);
        const blob = await canvas.convertToBlob({ type: 'image/png' });
        imageUrl = URL.createObjectURL(blob);
      }
    } else if (result instanceof Blob) {
      imageUrl = URL.createObjectURL(result);
    } else {
      throw new Error('Unexpected result format from pipeline');
    }

    self.postMessage({
      type: 'GENERATION_PROGRESS',
      payload: { step: steps, totalSteps: steps, progress: 100, mode: 'local' }
    });

    self.postMessage({
      type: 'GENERATION_COMPLETE',
      payload: { 
        imageUrl, 
        mode: 'local',
        info: '✨ Generated 100% locally with WebGPU!'
      }
    });

    console.log('✅ Local generation complete!');
    
  } catch (error) {
    console.error('Local generation error:', error);
    throw error; // Re-throw to trigger API fallback
  }
}

async function generateViaAPI(payload) {
  const { 
    prompt, 
    negativePrompt = '', 
    width = 512,
    height = 512,
    seed = -1,
    sourceImage = null,
    strength = 0.75
  } = payload;

  try {
    // Progress simulation
    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      const increment = currentProgress < 50 ? 12 : currentProgress < 80 ? 8 : 3;
      currentProgress = Math.min(90, currentProgress + increment);
      
      self.postMessage({
        type: 'GENERATION_PROGRESS',
        payload: { 
          step: Math.floor(currentProgress / 10), 
          totalSteps: 10, 
          progress: currentProgress,
          mode: 'api'
        }
      });
    }, 400);

    // Build Pollinations.ai URL
    const actualSeed = seed === -1 ? Math.floor(Math.random() * 2147483647) : seed;
    
    const modelMap = {
      'stable-diffusion-v1-5': 'flux',
      'sd-turbo': 'turbo', 
      'sdxl-turbo': 'flux'
    };
    const pollinationsModel = modelMap[currentModel.id] || 'flux';
    
    const encodedPrompt = encodeURIComponent(prompt);
    const encodedNegative = negativePrompt ? encodeURIComponent(negativePrompt) : '';
    
    let url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${actualSeed}&model=${pollinationsModel}&nologo=true`;
    
    if (encodedNegative) {
      url += `&negative=${encodedNegative}`;
    }

    console.log('🌐 Generating via Pollinations.ai:', url);

    // Fetch with retry logic
    let response;
    let lastError;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        response = await fetch(url);
        if (response.ok) break;
        
        if (response.status >= 500 && attempt < maxRetries) {
          console.warn(`API Error ${response.status}, retrying (${attempt}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          continue;
        }
        throw new Error(`API Error: ${response.status}`);
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          continue;
        }
        throw error;
      }
    }
    
    clearInterval(progressInterval);

    if (!response || !response.ok) {
      throw lastError || new Error('Failed after multiple retries');
    }

    const blob = await response.blob();
    const imageUrl = URL.createObjectURL(blob);

    self.postMessage({
      type: 'GENERATION_PROGRESS',
      payload: { step: 10, totalSteps: 10, progress: 100, mode: 'api' }
    });

    self.postMessage({
      type: 'GENERATION_COMPLETE',
      payload: { 
        imageUrl, 
        mode: 'api',
        info: 'Generated via Pollinations.ai (text-to-image not yet available locally)'
      }
    });
    
  } catch (error) {
    console.error('API generation error:', error);
    self.postMessage({
      type: 'GENERATION_ERROR',
      payload: { error: error.message }
    });
  }
}

// Future: Local image-to-image processing
async function processImageLocally(imageData, options) {
  if (!img2imgPipeline) {
    throw new Error('Image-to-image pipeline not loaded');
  }

  try {
    console.log('🖼️ Processing image locally with WebGPU...');
    
    const result = await img2imgPipeline(imageData);
    
    // Convert result to blob URL
    if (result instanceof Blob) {
      return URL.createObjectURL(result);
    }
    
    return result;
  } catch (error) {
    console.error('Local image processing error:', error);
    throw error;
  }
}
