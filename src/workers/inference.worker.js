// Web Worker for AI Inference
// Uses Transformers.js v3 with WebGPU for local inference
// Falls back to Pollinations.ai API if WebGPU not available

import { pipeline, env } from '@huggingface/transformers';

// Configure Transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true; // Use browser cache for models

let currentModel = null;
let generator = null;
let webGPUAvailable = false;
let webGPUAdapter = null;

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
      webGPUAdapter = await navigator.gpu.requestAdapter();
      
      if (webGPUAdapter) {
        const info = await webGPUAdapter.requestAdapterInfo?.() || {};
        webGPUAvailable = true;
        
        self.postMessage({
          type: 'WEBGPU_STATUS',
          payload: { 
            supported: true, 
            info: `WebGPU Available: ${info.description || info.vendor || 'GPU Detected'}`,
            canRunLocal: true
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
        canRunLocal: false,
        fallback: 'Using API mode'
      }
    });
  } catch (error) {
    webGPUAvailable = false;
    self.postMessage({
      type: 'WEBGPU_STATUS',
      payload: { 
        supported: false, 
        reason: error.message,
        canRunLocal: false,
        fallback: 'Using API mode'
      }
    });
  }
}

async function loadModel(payload) {
  const { modelId, modelRepo, forceLocal = false } = payload;

  try {
    currentModel = {
      id: modelId,
      repo: modelRepo
    };

    // If WebGPU is available, try to load model locally
    if (webGPUAvailable || forceLocal) {
      await loadModelLocal(modelId, modelRepo);
    } else {
      await loadModelAPI(modelId, modelRepo);
    }

  } catch (error) {
    console.error('Model loading error:', error);
    self.postMessage({
      type: 'MODEL_ERROR',
      payload: { modelId, error: error.message }
    });
  }
}

async function loadModelLocal(modelId, modelRepo) {
  try {
    self.postMessage({
      type: 'MODEL_LOADING',
      payload: { 
        modelId, 
        progress: 5, 
        message: 'Initializing WebGPU pipeline...',
        mode: 'local'
      }
    });

    // Map model IDs to Hugging Face repos with quantized versions
    const modelMap = {
      'stable-diffusion-v1-5': 'Xenova/stable-diffusion-v1-5-onnx',
      'sd-turbo': 'Xenova/sdxl-turbo',
      'sdxl-turbo': 'Xenova/sdxl-turbo'
    };

    const hfModelId = modelMap[modelId] || 'Xenova/stable-diffusion-v1-5-onnx';

    console.log(`🚀 Loading model locally: ${hfModelId}`);

    // Create the text-to-image pipeline with WebGPU
    generator = await pipeline('text-to-image', hfModelId, {
      device: 'webgpu',
      dtype: 'fp16', // Use fp16 for better performance
      progress_callback: (progress) => {
        // progress has: status, file, progress (0-1), loaded, total
        let percentage = 5;
        
        if (progress.status === 'download') {
          // Downloading phase: 5-70%
          percentage = 5 + (progress.progress || 0) * 65;
        } else if (progress.status === 'init') {
          // Initialization phase: 70-90%
          percentage = 70 + (progress.progress || 0) * 20;
        } else if (progress.status === 'ready') {
          percentage = 100;
        }

        self.postMessage({
          type: 'MODEL_LOADING',
          payload: { 
            modelId, 
            progress: Math.round(percentage),
            message: progress.status === 'download' 
              ? `Downloading: ${progress.file || 'model files'}...`
              : progress.status === 'init'
              ? 'Compiling shaders (first time only)...'
              : 'Ready!',
            mode: 'local',
            details: progress
          }
        });
      }
    });

    self.postMessage({
      type: 'MODEL_LOADED',
      payload: { 
        modelId, 
        modelRepo: hfModelId,
        mode: 'local',
        message: '✅ Model loaded locally with WebGPU!'
      }
    });

  } catch (error) {
    console.error('Local model loading failed:', error);
    
    // Fallback to API mode
    console.log('⚠️ Falling back to API mode...');
    generator = null;
    await loadModelAPI(modelId, modelRepo);
  }
}

async function loadModelAPI(modelId, modelRepo) {
  self.postMessage({
    type: 'MODEL_LOADING',
    payload: { 
      modelId, 
      progress: 50,
      message: 'Using API mode...',
      mode: 'api'
    }
  });

  await new Promise(resolve => setTimeout(resolve, 300));
  
  self.postMessage({
    type: 'MODEL_LOADING',
    payload: { modelId, progress: 100, mode: 'api' }
  });

  self.postMessage({
    type: 'MODEL_LOADED',
    payload: { 
      modelId, 
      modelRepo,
      mode: 'api',
      message: 'Using Pollinations.ai API'
    }
  });
}

async function generate(payload) {
  const { 
    prompt, 
    negativePrompt = '', 
    steps = 20, 
    guidanceScale = 7.5,
    width = 512,
    height = 512,
    seed = -1
  } = payload;

  if (!currentModel) {
    self.postMessage({
      type: 'GENERATION_ERROR',
      payload: { error: 'No model loaded. Please load a model first.' }
    });
    return;
  }

  // If we have a local generator, use it
  if (generator) {
    await generateLocal(payload);
  } else {
    await generateAPI(payload);
  }
}

async function generateLocal(payload) {
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
      type: 'GENERATION_STARTED',
      payload: { prompt, mode: 'local' }
    });

    console.log('🎨 Generating locally with WebGPU...');
    console.log('Prompt:', prompt);
    console.log('Steps:', steps, 'CFG:', guidanceScale);

    // Generate the image using Transformers.js
    const result = await generator(prompt, {
      negative_prompt: negativePrompt || undefined,
      num_inference_steps: steps,
      guidance_scale: guidanceScale,
      width: width,
      height: height,
      seed: seed === -1 ? undefined : seed,
      callback: (info) => {
        // info contains: step, timestep, etc.
        const progress = ((info.step + 1) / steps) * 100;
        
        self.postMessage({
          type: 'GENERATION_PROGRESS',
          payload: { 
            step: info.step + 1, 
            totalSteps: steps, 
            progress: Math.round(progress),
            mode: 'local'
          }
        });
      }
    });

    // Convert result to blob URL
    let imageUrl;
    
    if (result.images && result.images[0]) {
      // If it's already a Blob
      if (result.images[0] instanceof Blob) {
        imageUrl = URL.createObjectURL(result.images[0]);
      } 
      // If it's a canvas or image data
      else if (result.images[0].toBlob) {
        const blob = await new Promise(resolve => result.images[0].toBlob(resolve, 'image/png'));
        imageUrl = URL.createObjectURL(blob);
      }
      // If it's raw data
      else if (result.images[0].data) {
        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        const imageData = new ImageData(
          new Uint8ClampedArray(result.images[0].data),
          width,
          height
        );
        ctx.putImageData(imageData, 0, 0);
        const blob = await canvas.convertToBlob({ type: 'image/png' });
        imageUrl = URL.createObjectURL(blob);
      }
    }

    if (!imageUrl) {
      throw new Error('Failed to process generated image');
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
        message: '🎉 Generated locally with WebGPU!'
      }
    });

  } catch (error) {
    console.error('Local generation error:', error);
    
    // If local fails, try API as fallback
    console.log('⚠️ Local generation failed, trying API fallback...');
    await generateAPI(payload);
  }
}

async function generateAPI(payload) {
  const { 
    prompt, 
    negativePrompt = '', 
    steps = 4, 
    guidanceScale = 1,
    width = 512,
    height = 512,
    seed = -1
  } = payload;

  try {
    self.postMessage({
      type: 'GENERATION_STARTED',
      payload: { prompt, mode: 'api' }
    });

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

    // Use Pollinations.ai API
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

    console.log('🌐 Generating via API:', url);

    // Fetch with retry logic
    let response;
    let lastError;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        response = await fetch(url);
        if (response.ok) break;
        
        if (response.status >= 500 && attempt < maxRetries) {
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
      payload: { imageUrl, mode: 'api' }
    });
    
  } catch (error) {
    console.error('API generation error:', error);
    self.postMessage({
      type: 'GENERATION_ERROR',
      payload: { error: error.message }
    });
  }
}
