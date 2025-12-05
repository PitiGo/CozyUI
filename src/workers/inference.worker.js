// Web Worker for AI Inference
// Uses Transformers.js v3 with WebGPU for local AI inference
// Falls back to Pollinations.ai API if local fails

import { pipeline, env } from '@huggingface/transformers';

// Configure Transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

let currentModel = null;
let img2imgPipeline = null; // For image-to-image transformations (local WebGPU)
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
              textToImage: false,  // NOT available in transformers.js v3.8.1
              imageToImage: true   // Available!
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
      // NOTE: text-to-image pipeline is NOT available in transformers.js v3.8.1
      // It's not in the supported pipelines list, so we skip local loading
      // and will use API fallback for text-to-image generation
      // Only image-to-image pipeline works locally

      // Try image-to-image pipeline (this DOES work locally)
      try {
        self.postMessage({
          type: 'MODEL_LOADING',
          payload: { modelId, progress: 50, message: 'Loading image enhancement pipeline...' }
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
          textToImage: 'api', // Always API - pipeline not available in transformers.js v3.8.1
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

  // Check if this is image-to-image mode
  if (sourceImage) {
    console.log('🖼️ Image-to-Image mode detected');
    
    // Try local processing first if pipeline is available
    // Note: Current pipeline is for super-resolution/enhancement, not prompt-based img2img
    if (img2imgPipeline && webGPUAvailable) {
      try {
        console.log('🚀 Attempting local WebGPU image enhancement (super-resolution)...');
        console.log('⚠️ Note: Local pipeline enhances image quality but does not apply prompts');
        await processImageLocally(sourceImage, { prompt, strength });
        return;
      } catch (localError) {
        console.warn('⚠️ Local image processing failed:', localError.message);
      }
    }
    
    // Pollinations.ai API doesn't support image-to-image with source images
    // For now, we'll generate text-to-image and inform the user
    console.warn('⚠️ Image-to-Image with prompts is not yet supported via API');
    console.log('🌐 Generating text-to-image instead (source image will be ignored)...');
    self.postMessage({
      type: 'GENERATION_WARNING',
      payload: { 
        message: 'Image-to-Image with prompts is not yet supported. Generating text-to-image instead. The local pipeline can enhance images but does not apply prompts.',
        mode: 'api'
      }
    });
    await generateViaAPI({ ...payload, sourceImage: null }); // Remove sourceImage for API
  } else {
    // Text-to-image mode - always use API
    // NOTE: text-to-image pipeline is NOT available in transformers.js v3.8.1
    console.log('🌐 Using Pollinations.ai API for text-to-image generation...');
    await generateViaAPI(payload);
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

// Local image-to-image processing (super-resolution/enhancement)
async function processImageLocally(imageData, options) {
  if (!img2imgPipeline) {
    throw new Error('Image-to-image pipeline not loaded');
  }

  try {
    console.log('🖼️ Processing image locally with WebGPU...');
    
    // Convert base64 or URL to ImageData/Blob for the pipeline
    let imageBlob;
    if (imageData.startsWith('data:')) {
      // Base64 data URL
      const response = await fetch(imageData);
      imageBlob = await response.blob();
    } else if (imageData.startsWith('blob:')) {
      // Blob URL
      const response = await fetch(imageData);
      imageBlob = await response.blob();
    } else {
      throw new Error('Unsupported image format');
    }

    self.postMessage({
      type: 'GENERATION_PROGRESS',
      payload: { step: 0, totalSteps: 10, progress: 20, mode: 'local' }
    });

    // Process with the pipeline (this is for super-resolution/enhancement)
    const result = await img2imgPipeline(imageBlob);
    
    self.postMessage({
      type: 'GENERATION_PROGRESS',
      payload: { step: 10, totalSteps: 10, progress: 100, mode: 'local' }
    });

    // Convert result to blob URL
    // The pipeline can return different formats depending on the model
    let imageUrl;
    
    console.log('Pipeline result type:', typeof result, result);
    
    if (result instanceof Blob) {
      imageUrl = URL.createObjectURL(result);
    } else if (result instanceof ImageData) {
      // Convert ImageData to Blob via Canvas
      const canvas = new OffscreenCanvas(result.width, result.height);
      const ctx = canvas.getContext('2d');
      ctx.putImageData(result, 0, 0);
      const blob = await canvas.convertToBlob({ type: 'image/png' });
      imageUrl = URL.createObjectURL(blob);
    } else if (result instanceof HTMLImageElement || result instanceof Image) {
      // Convert Image to Blob via Canvas
      const canvas = new OffscreenCanvas(result.width, result.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(result, 0, 0);
      const blob = await canvas.convertToBlob({ type: 'image/png' });
      imageUrl = URL.createObjectURL(blob);
    } else if (result.images && result.images[0]) {
      const image = result.images[0];
      if (image instanceof Blob) {
        imageUrl = URL.createObjectURL(image);
      } else if (image instanceof ImageData) {
        const canvas = new OffscreenCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');
        ctx.putImageData(image, 0, 0);
        const blob = await canvas.convertToBlob({ type: 'image/png' });
        imageUrl = URL.createObjectURL(blob);
      } else if (typeof image === 'string' && image.startsWith('data:')) {
        imageUrl = image; // Already a data URL
      } else {
        console.warn('Unexpected image format in result.images[0]:', typeof image, image);
        throw new Error(`Unexpected image format: ${typeof image}`);
      }
    } else if (typeof result === 'string' && result.startsWith('data:')) {
      imageUrl = result; // Already a data URL
    } else {
      console.error('Unexpected result format:', typeof result, result);
      throw new Error(`Unexpected result format from pipeline: ${typeof result}. Expected Blob, ImageData, Image, or {images: [...]}`);
    }

    self.postMessage({
      type: 'GENERATION_COMPLETE',
      payload: { 
        imageUrl, 
        mode: 'local',
        info: '✨ Enhanced locally with WebGPU!'
      }
    });

    console.log('✅ Local image processing complete!');
    
  } catch (error) {
    console.error('Local image processing error:', error);
    throw error;
  }
}
